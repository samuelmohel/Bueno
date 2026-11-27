<?php
/**
 * 013 — Seed the chart of accounts
 *
 * The accounts the platform already posts against, lifted from the array
 * StateEngine was holding in the browser so that an existing deployment's
 * screens keep showing the accounts their users recognise.
 *
 * Balances are deliberately NOT carried over. The seeded array shipped with
 * figures on it -- 35,000,000 in consignee advances, 6,800,000 in salaries --
 * which were illustrative, not anybody's books. Importing them would open a
 * real ledger with invented opening balances, and every statement drawn from
 * it afterwards would be wrong by exactly that amount.
 *
 * Every account therefore opens at zero. An accountant sets real opening
 * balances by posting an opening journal entry, which is both the correct
 * procedure and leaves an audit record of who asserted what.
 *
 * Skips any account code already present, so this is safe to re-run and will
 * not disturb a deployment that has started keeping books.
 */

declare(strict_types=1);

return static function (PDO $pdo): void {
    $now = gmdate('Y-m-d\TH:i:s\Z');

    // code, name, type, subType, description
    $accounts = [
        // ── Assets ──────────────────────────────────────────────────────────
        ['1010', 'Cash at Hand (Petty Cash)',                  'ASSET', 'Current Assets',     'Siding floats and small disbursements'],
        ['1020', 'Bank — Operations Account',                  'ASSET', 'Current Assets',     'Main operating account'],
        ['1030', 'Bank — Collections Account',                 'ASSET', 'Current Assets',     'Consignee remittances received'],
        ['1110', 'Trade Debtors (Consignee Receivables)',      'ASSET', 'Current Assets',     'Freight invoiced and not yet settled'],
        ['1120', 'Other Receivables & Staff Advances',         'ASSET', 'Current Assets',     'Advances issued against requisitions'],
        ['1210', 'Rolling Stock (Wagons)',                     'ASSET', 'Fixed Assets',       'Owned wagons at cost'],
        ['1220', 'Locomotives & Haulage Equipment',            'ASSET', 'Fixed Assets',       'Owned traction at cost'],
        ['1290', 'Accumulated Depreciation',                   'ASSET', 'Fixed Assets',       'Contra-asset; credit balance expected'],

        // ── Liabilities ─────────────────────────────────────────────────────
        ['2010', 'Trade Creditors',                            'LIABILITY', 'Current Liabilities', 'Amounts owed to suppliers and hauliers'],
        ['2020', 'Accrued Operating Expenses',                 'LIABILITY', 'Current Liabilities', 'Incurred and not yet invoiced'],
        ['2030', 'Payroll & Statutory Deductions Payable',     'LIABILITY', 'Current Liabilities', 'PAYE, pension and salary accruals'],
        ['2040', 'Consignee Advance Deposits & Retainers',     'LIABILITY', 'Current Liabilities', 'Prepaid freight held prior to dispatch'],
        ['2050', 'VAT Payable',                                'LIABILITY', 'Current Liabilities', 'Output tax collected and due'],
        ['2110', 'Equipment Financing & Term Loans',           'LIABILITY', 'Long-term Liabilities', 'Borrowings beyond twelve months'],

        // ── Equity ──────────────────────────────────────────────────────────
        ['3010', 'Share Capital',                              'EQUITY', 'Capital',            'Issued capital'],
        ['3020', 'Retained Earnings',                          'EQUITY', 'Capital',            'Accumulated results of prior periods'],
        ['3030', 'Current Year Earnings',                      'EQUITY', 'Capital',            'Result for the period in progress'],

        // ── Revenue ─────────────────────────────────────────────────────────
        ['4010', 'Freight Haulage Revenue',                    'REVENUE', 'Operating Revenue', 'Rail freight billed to consignees'],
        ['4020', 'Demurrage & Detention Income',               'REVENUE', 'Operating Revenue', 'Charged for wagons held beyond free time'],
        ['4030', 'Terminal Handling & Storage Income',         'REVENUE', 'Operating Revenue', 'Yard handling and storage'],
        ['4900', 'Other Income',                               'REVENUE', 'Other Revenue',     'Incidental receipts'],

        // ── Expenses ────────────────────────────────────────────────────────
        ['5010', 'Haulage & Traction Costs',                   'EXPENSE', 'Cost of Sales',     'Locomotive hire, track access and traction'],
        ['5020', 'Feeder Trucking & Last-Mile Costs',          'EXPENSE', 'Cost of Sales',     'Road legs feeding and clearing the siding'],
        ['5030', 'Loading & Discharge Labour',                 'EXPENSE', 'Cost of Sales',     'Gangs and plant at both ends'],
        ['5040', 'Cargo Damage, Shortage & Claims',            'EXPENSE', 'Cost of Sales',     'Burst bags, shortages and settlements'],
        ['6010', 'Terminal Management & Staff Salaries',       'EXPENSE', 'Operating Expenses (SG&A)', 'Station officers, dispatchers, finance'],
        ['6020', 'Fuel, Power & Utilities',                    'EXPENSE', 'Operating Expenses (SG&A)', 'Diesel, electricity and water'],
        ['6030', 'Repairs & Maintenance',                      'EXPENSE', 'Operating Expenses (SG&A)', 'Rolling stock and siding upkeep'],
        ['6040', 'Insurance',                                  'EXPENSE', 'Operating Expenses (SG&A)', 'Cargo, fleet and liability cover'],
        ['6050', 'Office, Communications & Administration',    'EXPENSE', 'Operating Expenses (SG&A)', 'General administrative running costs'],
        ['6060', 'Professional & Regulatory Fees',             'EXPENSE', 'Operating Expenses (SG&A)', 'Legal, audit and licensing'],
        ['6070', 'Depreciation Expense',                       'EXPENSE', 'Operating Expenses (SG&A)', 'Periodic charge on fixed assets'],
        ['7010', 'Bank Charges & Finance Costs',               'EXPENSE', 'Finance Costs',     'Interest, commission and transfer fees'],
    ];

    $existing = [];
    foreach ($pdo->query('SELECT code FROM bueno_chart_of_accounts')->fetchAll(PDO::FETCH_COLUMN) as $c) {
        $existing[(string) $c] = true;
    }

    $insert = $pdo->prepare(
        'INSERT INTO bueno_chart_of_accounts
            (id, code, name, type, subType, openingBalance, description, isEnabled,
             createdAt, createdBy, updated_at, version)
         VALUES (?, ?, ?, ?, ?, 0, ?, 1, ?, ?, ?, 1)'
    );

    $added = 0;
    foreach ($accounts as [$code, $name, $type, $subType, $description]) {
        if (isset($existing[$code])) {
            continue;
        }
        $insert->execute([
            'acc_' . $code,
            $code,
            $name,
            $type,
            $subType,
            $description,
            $now,
            'migration 013',
            $now,
        ]);
        $added++;
    }

    error_log("[bueno][migration 013] seeded {$added} ledger account(s)");
    echo "         seeded {$added} ledger account(s), all opening at zero\n";
    if ($added > 0) {
        echo "         set real opening balances by posting an opening journal entry\n";
    }
};
