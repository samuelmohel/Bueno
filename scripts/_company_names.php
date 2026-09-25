<?php
/**
 * Bueno Freight OS — company name helpers, shared by the consignee tools.
 *
 * A consignee is joined to their trips, deals and invoices by company name,
 * so how that name is spelled is load-bearing. These two functions are the
 * whole of the subtlety, and both scripts must agree on them or the report
 * will list a name the merge cannot find.
 */

declare(strict_types=1);

/**
 * A comparison key that survives how the name was typed.
 *
 * SQL TRIM removes ordinary spaces and nothing else, so LOWER(TRIM(col))
 * treats a value carrying a non-breaking space, a tab, or two spaces between
 * words as a different company from the same words typed normally — while the
 * two print identically. This collapses all of it.
 */
function company_key(?string $s): string
{
    $s = (string) $s;
    $s = str_replace(["\u{00A0}", "\u{200B}", "\u{FEFF}", "\t", "\r", "\n"], ' ', $s);
    $s = preg_replace('/\s+/u', ' ', $s) ?? $s;
    return strtolower(trim($s));
}

/**
 * Render a name so invisible differences can be seen.
 *
 * Without this, two names that differ only by a non-breaking space print the
 * same and there is no way to tell why the system treats them as separate
 * companies.
 */
function reveal(string $name): string
{
    $marks = [
        "\t"       => '<TAB>',
        "\n"       => '<NEWLINE>',
        "\r"       => '<CR>',
        "\u{00A0}" => '<NBSP>',
        "\u{200B}" => '<ZWSP>',
        "\u{FEFF}" => '<BOM>',
    ];

    $out = '';
    $flagged = false;
    foreach (preg_split('//u', $name, -1, PREG_SPLIT_NO_EMPTY) ?: [] as $ch) {
        if (isset($marks[$ch])) {
            $out .= $marks[$ch];
            $flagged = true;
            continue;
        }
        $out .= $ch;
    }

    if (str_contains($name, '  ') || $name !== trim($name)) {
        $flagged = true;
    }

    return $out . sprintf(' [%d chars]', mb_strlen($name))
        . ($flagged ? '   <-- hidden whitespace' : '');
}

/**
 * Every distinct company name stored across the collections, with row counts.
 *
 * @return array<string, array<string,int>> name => [collection => count]
 */
function distinct_company_names(PDO $pdo, array $sources): array
{
    $found = [];
    foreach ($sources as $label => [$table, $column]) {
        try {
            $rows = $pdo->query(
                "SELECT `$column` AS name, COUNT(*) AS n FROM `$table`
                  WHERE `$column` IS NOT NULL AND `$column` <> ''
                  GROUP BY `$column`"
            )->fetchAll();
        } catch (Throwable $e) {
            continue;
        }
        foreach ($rows as $r) {
            $found[(string) $r['name']][$label] = (int) $r['n'];
        }
    }
    ksort($found);
    return $found;
}
