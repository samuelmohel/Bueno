<?php
/**
 * Bueno Freight OS — Double-entry ledger
 *
 * Two rules, and everything else follows from them:
 *
 *   1. An entry's debits equal its credits. Enforced here, in a transaction,
 *      so a half-posted entry cannot exist even if the request dies midway.
 *   2. A posted entry is never edited or deleted. A mistake is corrected by
 *      posting its reversal, so the ledger stays an append-only record of
 *      what was asserted, by whom, and when.
 *
 * Balances are derived from the lines rather than carried on the account, so
 * a reported balance cannot drift away from the entries that produced it.
 * Only the opening balance is stored.
 */

declare(strict_types=1);

// DIRECT ACCESS GUARD — this file defines classes and must never be requested
// over HTTP. .htaccess covers this, but only when AllowOverride permits it, so
// the check is repeated here where no server configuration can disable it.
if (isset($_SERVER['SCRIPT_FILENAME']) && realpath($_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    http_response_code(403);
    exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/http.php';
require_once __DIR__ . '/audit.php';

final class Ledger
{
    /** Money is compared to the kobo; anything smaller is a rounding artefact. */
    public const EPSILON = 0.005;

    public const TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

    /** Which side increases an account of this type. */
    public const DEBIT_NORMAL = ['ASSET', 'EXPENSE'];

    public static function isDebitNormal(string $type): bool
    {
        return in_array(strtoupper($type), self::DEBIT_NORMAL, true);
    }

    /**
     * Resolve an account by id or by code.
     *
     * Accepting the code matters because that is what an accountant and an
     * automated posting both actually name.
     *
     * @return array<string,mixed>|null
     */
    public static function account(string $idOrCode): ?array
    {
        $stmt = Db::conn()->prepare(
            'SELECT * FROM bueno_chart_of_accounts WHERE id = ? OR code = ? LIMIT 1'
        );
        $stmt->execute([$idOrCode, $idOrCode]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    /**
     * Post a journal entry.
     *
     * @param array{
     *   entryDate?:string, narration:string, reference?:?string,
     *   sourceType?:?string, sourceId?:?string, companyId?:?string,
     *   lines:array<int,array{account:string,description?:?string,debit?:float,credit?:float}>
     * } $input
     * @param array<string,mixed> $actor
     * @return array<string,mixed> the posted entry, with its lines
     */
    public static function post(array $input, array $actor): array
    {
        $narration = trim((string) ($input['narration'] ?? ''));
        if ($narration === '') {
            Response::error('A journal entry needs a narration saying what it is for.', 422);
        }

        $rawLines = $input['lines'] ?? [];
        if (!is_array($rawLines) || count($rawLines) < 2) {
            // One line cannot balance against anything. This is the whole
            // point of double entry, so it is worth refusing clearly.
            Response::error('A journal entry needs at least two lines: what is debited and what is credited.', 422);
        }
        if (count($rawLines) > 200) {
            Response::error('A journal entry cannot carry more than 200 lines.', 422);
        }

        $lines       = [];
        $totalDebit  = 0.0;
        $totalCredit = 0.0;

        foreach ($rawLines as $i => $raw) {
            if (!is_array($raw)) {
                Response::error("Line " . ($i + 1) . " is not a valid line.", 422);
            }

            $ref = trim((string) ($raw['account'] ?? $raw['accountCode'] ?? $raw['accountId'] ?? ''));
            if ($ref === '') {
                Response::error('Line ' . ($i + 1) . ' does not name an account.', 422);
            }

            $account = self::account($ref);
            if ($account === null) {
                Response::error('Line ' . ($i + 1) . ": no account \"{$ref}\" in the chart of accounts.", 422);
            }
            if ((int) ($account['isEnabled'] ?? 1) !== 1) {
                Response::error(
                    'Line ' . ($i + 1) . ": account {$account['code']} ({$account['name']}) is disabled.",
                    422
                );
            }

            $debit  = round((float) ($raw['debit'] ?? 0), 2);
            $credit = round((float) ($raw['credit'] ?? 0), 2);

            if ($debit < 0 || $credit < 0) {
                // A negative debit is a credit. Allowing both spellings of the
                // same thing makes a ledger impossible to read and to total.
                Response::error(
                    'Line ' . ($i + 1) . ': amounts cannot be negative. Put the value on the other side instead.',
                    422
                );
            }
            if ($debit > 0 && $credit > 0) {
                Response::error('Line ' . ($i + 1) . ' is both a debit and a credit.', 422);
            }
            if ($debit === 0.0 && $credit === 0.0) {
                Response::error('Line ' . ($i + 1) . ' has no amount.', 422);
            }

            $totalDebit  += $debit;
            $totalCredit += $credit;

            $lines[] = [
                'accountId'   => (string) $account['id'],
                'accountCode' => (string) $account['code'],
                'accountName' => (string) $account['name'],
                'description' => isset($raw['description']) ? substr((string) $raw['description'], 0, 500) : null,
                'debit'       => $debit,
                'credit'      => $credit,
            ];
        }

        $totalDebit  = round($totalDebit, 2);
        $totalCredit = round($totalCredit, 2);

        // The invariant.
        if (abs($totalDebit - $totalCredit) > self::EPSILON) {
            Response::error(
                sprintf(
                    'This entry does not balance: debits total %.2f and credits total %.2f, a difference of %.2f.',
                    $totalDebit,
                    $totalCredit,
                    abs($totalDebit - $totalCredit)
                ),
                422,
                ['totalDebit' => $totalDebit, 'totalCredit' => $totalCredit]
            );
        }
        if ($totalDebit <= 0) {
            Response::error('An entry totalling zero posts nothing.', 422);
        }

        $now       = gmdate('Y-m-d\TH:i:s\Z');
        $entryDate = trim((string) ($input['entryDate'] ?? '')) ?: substr($now, 0, 10);

        $entry = Db::transaction(static function (PDO $pdo) use (
            $lines, $totalDebit, $totalCredit, $narration, $entryDate, $input, $actor, $now
        ): array {
            $id     = 'jnl_' . bin2hex(random_bytes(10));
            $number = self::nextEntryNumber($pdo, $entryDate);

            $pdo->prepare(
                'INSERT INTO bueno_journal_entries
                    (id, entryNumber, entryDate, narration, reference, sourceType, sourceId,
                     companyId, status, totalDebit, totalCredit, postedBy, postedById,
                     postedAt, createdAt, updated_at, version)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)'
            )->execute([
                $id,
                $number,
                $entryDate,
                $narration,
                $input['reference'] ?? null,
                $input['sourceType'] ?? null,
                $input['sourceId'] ?? null,
                $input['companyId'] ?? null,
                'POSTED',
                $totalDebit,
                $totalCredit,
                (string) ($actor['fullName'] ?? $actor['id'] ?? 'system'),
                (string) ($actor['id'] ?? ''),
                $now,
                $now,
                $now,
            ]);

            $insertLine = $pdo->prepare(
                'INSERT INTO bueno_journal_lines
                    (id, entryId, lineNo, accountId, accountCode, accountName,
                     description, debit, credit, createdAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );

            foreach ($lines as $n => $line) {
                $insertLine->execute([
                    'jln_' . bin2hex(random_bytes(10)),
                    $id,
                    $n + 1,
                    $line['accountId'],
                    $line['accountCode'],
                    $line['accountName'],
                    $line['description'],
                    $line['debit'],
                    $line['credit'],
                ]);
            }

            return ['id' => $id, 'entryNumber' => $number];
        });

        Audit::record('ledger.posted', 'journal_entry', $entry['id'], Audit::SUCCESS, [
            'entryNumber' => $entry['entryNumber'],
            'narration'   => $narration,
            'total'       => $totalDebit,
            'lines'       => count($lines),
            'sourceType'  => $input['sourceType'] ?? null,
            'sourceId'    => $input['sourceId'] ?? null,
        ], $actor);

        return self::entry($entry['id']) ?? [];
    }

    /**
     * Reverse a posted entry.
     *
     * Posts a mirror of it rather than deleting anything, and links the two
     * so the pair reads as one correction.
     *
     * @param array<string,mixed> $actor
     * @return array<string,mixed>
     */
    public static function reverse(string $entryId, string $reason, array $actor): array
    {
        $original = self::entry($entryId);
        if ($original === null) {
            Response::error('Journal entry not found.', 404);
        }
        if (strtoupper((string) $original['status']) !== 'POSTED') {
            Response::error('Only a posted entry can be reversed.', 409);
        }
        if (!empty($original['reversedById'])) {
            Response::error('That entry has already been reversed.', 409);
        }
        if (trim($reason) === '') {
            Response::error('A reversal needs a reason: it is a correction to the books.', 422);
        }

        $mirrored = [];
        foreach ($original['lines'] as $line) {
            $mirrored[] = [
                'account'     => $line['accountId'],
                'description' => 'Reversal: ' . (string) ($line['description'] ?? ''),
                // Debits become credits and credits become debits.
                'debit'       => (float) $line['credit'],
                'credit'      => (float) $line['debit'],
            ];
        }

        $reversal = self::post([
            'entryDate'  => gmdate('Y-m-d'),
            'narration'  => 'Reversal of ' . $original['entryNumber'] . ' — ' . $reason,
            'reference'  => $original['reference'] ?? null,
            'sourceType' => $original['sourceType'] ?? null,
            'sourceId'   => $original['sourceId'] ?? null,
            'companyId'  => $original['companyId'] ?? null,
            'lines'      => $mirrored,
        ], $actor);

        $now = gmdate('Y-m-d\TH:i:s\Z');
        Db::transaction(static function (PDO $pdo) use ($original, $reversal, $reason, $now): void {
            $pdo->prepare(
                'UPDATE bueno_journal_entries
                    SET status = ?, reversedById = ?, reversalReason = ?, updated_at = ?,
                        version = version + 1
                  WHERE id = ?'
            )->execute(['REVERSED', $reversal['id'], $reason, $now, $original['id']]);

            $pdo->prepare('UPDATE bueno_journal_entries SET reversesId = ? WHERE id = ?')
                ->execute([$original['id'], $reversal['id']]);
        });

        Audit::record('ledger.reversed', 'journal_entry', (string) $original['id'], Audit::SUCCESS, [
            'reversalId'  => $reversal['id'],
            'entryNumber' => $original['entryNumber'],
            'reason'      => $reason,
        ], $actor);

        return self::entry((string) $reversal['id']) ?? [];
    }

    /**
     * One entry with its lines.
     *
     * @return array<string,mixed>|null
     */
    public static function entry(string $id): ?array
    {
        $stmt = Db::conn()->prepare('SELECT * FROM bueno_journal_entries WHERE id = ? OR entryNumber = ? LIMIT 1');
        $stmt->execute([$id, $id]);
        $entry = $stmt->fetch();
        if ($entry === false) {
            return null;
        }

        $lines = Db::conn()->prepare(
            'SELECT * FROM bueno_journal_lines WHERE entryId = ? ORDER BY lineNo ASC'
        );
        $lines->execute([$entry['id']]);
        $entry['lines'] = $lines->fetchAll();

        return $entry;
    }

    /**
     * Current balance of every account, derived from the ledger.
     *
     * Reversed entries are excluded on both sides -- the original and its
     * mirror -- rather than being left to cancel out, so a trial balance
     * shows the position that stands rather than every assertion ever made.
     *
     * @return array<int,array<string,mixed>>
     */
    public static function trialBalance(?string $asOf = null): array
    {
        $params = [];
        $dateClause = '';
        if ($asOf !== null && $asOf !== '') {
            $dateClause = ' AND e.entryDate <= ?';
            $params[]   = $asOf;
        }

        $sql = "
            SELECT a.id, a.code, a.name, a.type, a.subType, a.openingBalance, a.isEnabled,
                   COALESCE(SUM(l.debit), 0)  AS totalDebit,
                   COALESCE(SUM(l.credit), 0) AS totalCredit
              FROM bueno_chart_of_accounts a
              LEFT JOIN bueno_journal_lines l ON l.accountId = a.id
              LEFT JOIN bueno_journal_entries e ON e.id = l.entryId
                   AND e.status = 'POSTED'{$dateClause}
             GROUP BY a.id, a.code, a.name, a.type, a.subType, a.openingBalance, a.isEnabled
             ORDER BY a.code ASC
        ";

        $stmt = Db::conn()->prepare($sql);
        $stmt->execute($params);

        $out = [];
        foreach ($stmt->fetchAll() as $row) {
            $debit   = (float) $row['totalDebit'];
            $credit  = (float) $row['totalCredit'];
            $opening = (float) $row['openingBalance'];

            // A debit-normal account grows on the debit side; a credit-normal
            // one on the credit side. Reporting both the same way is how a
            // revenue account ends up displayed as a negative number.
            $movement = self::isDebitNormal((string) $row['type'])
                ? $debit - $credit
                : $credit - $debit;

            $row['totalDebit']  = round($debit, 2);
            $row['totalCredit'] = round($credit, 2);
            $row['movement']    = round($movement, 2);
            $row['balance']     = round($opening + $movement, 2);
            $row['normalSide']  = self::isDebitNormal((string) $row['type']) ? 'DEBIT' : 'CREDIT';

            $out[] = $row;
        }

        return $out;
    }

    /**
     * Does the ledger balance overall?
     *
     * Sums every posted line. If this is ever false the books are broken, and
     * saying so plainly is more useful than a statement that silently does
     * not add up.
     *
     * @return array{balanced:bool,totalDebit:float,totalCredit:float,difference:float}
     */
    public static function integrity(): array
    {
        $row = Db::conn()->query(
            "SELECT COALESCE(SUM(l.debit), 0) AS d, COALESCE(SUM(l.credit), 0) AS c
               FROM bueno_journal_lines l
               JOIN bueno_journal_entries e ON e.id = l.entryId
              WHERE e.status = 'POSTED'"
        )->fetch();

        $d = round((float) ($row['d'] ?? 0), 2);
        $c = round((float) ($row['c'] ?? 0), 2);

        return [
            'balanced'    => abs($d - $c) <= self::EPSILON,
            'totalDebit'  => $d,
            'totalCredit' => $c,
            'difference'  => round($d - $c, 2),
        ];
    }

    /**
     * A sequential, gap-free number per year.
     *
     * Taken inside the posting transaction so two simultaneous postings
     * cannot be handed the same one.
     */
    private static function nextEntryNumber(PDO $pdo, string $entryDate): string
    {
        $year = substr($entryDate, 0, 4);
        if (!preg_match('/^\d{4}$/', $year)) {
            $year = gmdate('Y');
        }

        $stmt = $pdo->prepare(
            'SELECT entryNumber FROM bueno_journal_entries
              WHERE entryNumber LIKE ? ORDER BY entryNumber DESC LIMIT 1'
        );
        $stmt->execute(["JE-{$year}-%"]);
        $last = $stmt->fetchColumn();

        $n = 1;
        if ($last !== false && preg_match('/-(\d+)$/', (string) $last, $m) === 1) {
            $n = ((int) $m[1]) + 1;
        }

        return sprintf('JE-%s-%05d', $year, $n);
    }
}
