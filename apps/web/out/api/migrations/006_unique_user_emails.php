<?php
/**
 * 006 — Make sign-in identities unique
 *
 * Migration 005 rewrote legacy company names onto canonical addresses:
 *
 *   UPDATE bueno_users SET email = 'logistics@hbm.ng'
 *    WHERE email LIKE '%lafarge%' OR email LIKE '%dangote%';
 *
 * Two different people matched that clause, so two accounts ended up sharing
 * one sign-in address. Authentication looks an account up by email and takes
 * the first row, which means one of those people can no longer sign in at all,
 * and neither can tell which account they are using. Nothing in the schema
 * prevented it: the email column had an ordinary index, not a unique one.
 *
 * This keeps the account that can actually be signed into, moves the others
 * aside under a distinguishable address rather than deleting them — they own
 * trips, deals and audit history — and then adds the constraint that stops it
 * happening again.
 *
 * Also raises the database's own default character set to utf8mb4. Every table
 * declares utf8mb4 explicitly so existing data is unaffected, but the database
 * default was latin1_swedish_ci, which means any table created later without an
 * explicit charset would silently mangle the naira sign and accented names.
 */

declare(strict_types=1);

return static function (PDO $pdo): void {
    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    $now    = gmdate('Y-m-d\TH:i:s\Z');

    // ── Normalise blanks to NULL first ──────────────────────────────────────
    //
    // A unique index permits any number of NULLs but only one empty string. An
    // account with no address recorded means "unknown", which is what NULL is
    // for — and without this, two such rows would abort the index creation
    // below and take the whole deployment down with it.

    $pdo->exec("UPDATE bueno_users SET email = NULL WHERE email = ''");

    // Addresses are compared case-insensitively at sign-in, so 'Desk@hbm.ng'
    // and 'desk@hbm.ng' are the same identity and must collide here too.
    $pdo->exec('UPDATE bueno_users SET email = LOWER(TRIM(email)) WHERE email IS NOT NULL');

    // ── Find addresses claimed by more than one account ─────────────────────

    $dupes = $pdo->query(
        "SELECT email
           FROM bueno_users
          WHERE email IS NOT NULL AND email <> ''
          GROUP BY email
         HAVING COUNT(*) > 1"
    )->fetchAll(PDO::FETCH_COLUMN);

    $rename = $pdo->prepare(
        'UPDATE bueno_users
            SET email = ?, status = ?, must_change_credentials = 1
          WHERE id = ?'
    );

    foreach ($dupes as $email) {
        // Order of preference for which account keeps the address:
        //   1. it has a usable credential at all
        //   2. it has signed in more recently
        //   3. lowest id, so the result is deterministic
        $rows = $pdo->prepare(
            "SELECT id, password_hash, last_login_at
               FROM bueno_users
              WHERE email = ?
              ORDER BY CASE WHEN password_hash IS NULL OR password_hash = '' THEN 1 ELSE 0 END,
                       last_login_at DESC,
                       id ASC"
        );
        $rows->execute([$email]);
        $accounts = $rows->fetchAll();

        // The first is the keeper; every other one is moved aside.
        $suffix = 1;
        foreach (array_slice($accounts, 1) as $account) {
            $suffix++;
            $at = strpos($email, '@');
            $moved = $at === false
                ? $email . '+duplicate' . $suffix
                : substr($email, 0, $at) . '+duplicate' . $suffix . substr($email, $at);

            // Suspended, not deleted: the account owns records and audit
            // history, and an administrator needs to decide who this is.
            $rename->execute([$moved, 'SUSPENDED', $account['id']]);

            error_log(sprintf(
                '[bueno][migration 006] duplicate sign-in address "%s" — account %s moved to "%s" and suspended',
                $email,
                (string) $account['id'],
                $moved
            ));
        }
    }

    // ── Prevent a recurrence ────────────────────────────────────────────────
    //
    // If any duplicate survived the pass above this will fail, and the
    // migration runner will stop the deployment rather than leave the
    // constraint off and the problem unrecorded.

    $indexExists = false;
    if ($driver === 'mysql') {
        $indexExists = (bool) $pdo->query(
            "SELECT COUNT(*) FROM information_schema.statistics
              WHERE table_schema = DATABASE()
                AND table_name   = 'bueno_users'
                AND index_name   = 'uq_users_email'"
        )->fetchColumn();
    } else {
        $indexExists = (bool) $pdo->query(
            "SELECT COUNT(*) FROM sqlite_master
              WHERE type = 'index' AND name = 'uq_users_email'"
        )->fetchColumn();
    }

    if (!$indexExists) {
        $pdo->exec('CREATE UNIQUE INDEX uq_users_email ON bueno_users (email)');
    }

    // ── Database-level character set ────────────────────────────────────────
    //
    // Best effort: a shared-hosting account may not hold ALTER on the database
    // itself. Failing here would block a deployment over something that
    // affects no existing row, so it is logged instead.

    if ($driver === 'mysql') {
        try {
            $current = $pdo->query(
                "SELECT default_character_set_name
                   FROM information_schema.schemata
                  WHERE schema_name = DATABASE()"
            )->fetchColumn();

            if ($current !== 'utf8mb4') {
                $name = $pdo->query('SELECT DATABASE()')->fetchColumn();
                $pdo->exec(
                    'ALTER DATABASE `' . str_replace('`', '', (string) $name) . '` '
                    . 'CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
                );
            }
        } catch (Throwable $e) {
            error_log(
                '[bueno][migration 006] could not raise the database default charset to utf8mb4: '
                . $e->getMessage()
                . ' — existing tables are unaffected (each declares utf8mb4), but ask your host to '
                . 'run: ALTER DATABASE <name> CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
            );
        }
    }

    unset($now);
};
