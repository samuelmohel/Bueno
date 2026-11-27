-- ---------------------------------------------------------------------------
-- 012 — Double-entry accounting ledger
--
-- The accounting module had no server side at all. The chart of accounts,
-- the general journal and the bank accounts were read from localStorage
-- against a seeded array in StateEngine.ts:
--
--     getChartOfAccounts() { return this.readStorage('bueno_chart_of_accounts',
--                                                     SEED_CHART_OF_ACCOUNTS); }
--
-- So the books existed only in whichever browser last touched them. They did
-- not sync between users, two accountants each had their own, clearing site
-- data destroyed them, and the Financial Statements screen reported on them
-- as though they were the company's accounts.
--
-- Three tables, and one invariant worth stating plainly: an entry's debits
-- must equal its credits, and a posted entry is never edited. Accounting
-- corrections are made by posting a reversal, so the ledger stays an
-- append-only record of what was asserted and when. journal.php enforces
-- both; this schema makes the shape they need.
--
-- Account balances are DERIVED from the lines rather than stored, so a
-- balance can never drift away from the entries that produced it. Only the
-- opening balance is held on the account.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bueno_chart_of_accounts (
    id              VARCHAR(100) NOT NULL PRIMARY KEY,

    -- The code accountants actually cite: 1110, 4010, 6010.
    code            VARCHAR(32) NOT NULL,
    name            VARCHAR(191) NOT NULL,

    -- ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE. Decides which side
    -- increases the account, so it is not a free-text label.
    type            VARCHAR(32) NOT NULL,
    subType         VARCHAR(100) DEFAULT NULL,

    openingBalance  DECIMAL(18,2) NOT NULL DEFAULT 0,
    description     VARCHAR(255) DEFAULT NULL,

    -- Disabled rather than deleted: an account cited by a posted entry must
    -- keep resolving for ever.
    isEnabled       INT NOT NULL DEFAULT 1,

    createdAt       VARCHAR(32) DEFAULT NULL,
    createdBy       VARCHAR(191) DEFAULT NULL,
    updated_at      VARCHAR(32) DEFAULT NULL,
    version         INT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE UNIQUE INDEX IF NOT EXISTS idx_coa_code ON bueno_chart_of_accounts (code);
CREATE INDEX IF NOT EXISTS idx_coa_type ON bueno_chart_of_accounts (type);


CREATE TABLE IF NOT EXISTS bueno_journal_entries (
    id             VARCHAR(100) NOT NULL PRIMARY KEY,
    entryNumber    VARCHAR(64) NOT NULL,

    -- The date the transaction belongs to, which is not necessarily the day
    -- it was keyed in.
    entryDate      VARCHAR(32) NOT NULL,
    narration      VARCHAR(500) NOT NULL,
    reference      VARCHAR(191) DEFAULT NULL,

    -- What this entry is about, where it came from. Lets an invoice or a
    -- trip show its own ledger postings.
    sourceType     VARCHAR(50) DEFAULT NULL,
    sourceId       VARCHAR(100) DEFAULT NULL,
    companyId      VARCHAR(100) DEFAULT NULL,

    -- POSTED | REVERSED. There is no DRAFT: an entry exists once it is
    -- posted, and nothing else is in the ledger.
    status         VARCHAR(32) NOT NULL DEFAULT 'POSTED',

    -- Set on both sides of a reversal, so the pair is always traceable.
    reversesId     VARCHAR(100) DEFAULT NULL,
    reversedById   VARCHAR(100) DEFAULT NULL,
    reversalReason VARCHAR(500) DEFAULT NULL,

    totalDebit     DECIMAL(18,2) NOT NULL DEFAULT 0,
    totalCredit    DECIMAL(18,2) NOT NULL DEFAULT 0,

    postedBy       VARCHAR(191) DEFAULT NULL,
    postedById     VARCHAR(100) DEFAULT NULL,
    postedAt       VARCHAR(32) DEFAULT NULL,
    createdAt      VARCHAR(32) DEFAULT NULL,
    updated_at     VARCHAR(32) DEFAULT NULL,
    version        INT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_number ON bueno_journal_entries (entryNumber);
CREATE INDEX IF NOT EXISTS idx_journal_date ON bueno_journal_entries (entryDate);
CREATE INDEX IF NOT EXISTS idx_journal_source ON bueno_journal_entries (sourceType, sourceId);
CREATE INDEX IF NOT EXISTS idx_journal_company ON bueno_journal_entries (companyId);
CREATE INDEX IF NOT EXISTS idx_journal_status ON bueno_journal_entries (status);


CREATE TABLE IF NOT EXISTS bueno_journal_lines (
    id          VARCHAR(100) NOT NULL PRIMARY KEY,
    entryId     VARCHAR(100) NOT NULL,
    lineNo      INT NOT NULL DEFAULT 1,

    accountId   VARCHAR(100) NOT NULL,
    -- Denormalised so a historic entry still prints correctly if an account
    -- is later renamed. The id remains the link.
    accountCode VARCHAR(32) DEFAULT NULL,
    accountName VARCHAR(191) DEFAULT NULL,

    description VARCHAR(500) DEFAULT NULL,

    -- Exactly one of these is non-zero on any line.
    debit       DECIMAL(18,2) NOT NULL DEFAULT 0,
    credit      DECIMAL(18,2) NOT NULL DEFAULT 0,

    createdAt   VARCHAR(32) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX IF NOT EXISTS idx_lines_entry ON bueno_journal_lines (entryId);
CREATE INDEX IF NOT EXISTS idx_lines_account ON bueno_journal_lines (accountId);


CREATE TABLE IF NOT EXISTS bueno_bank_accounts (
    id               VARCHAR(100) NOT NULL PRIMARY KEY,
    bankName         VARCHAR(191) NOT NULL,
    accountName      VARCHAR(191) DEFAULT NULL,

    -- Last four digits only. A full account number has no operational use on
    -- a reconciliation screen and is worth not holding.
    accountNumberTail VARCHAR(8) DEFAULT NULL,

    currency         VARCHAR(8) NOT NULL DEFAULT 'NGN',

    -- The account in the chart this bank account posts to, so a reconciliation
    -- can be compared against the ledger rather than against a loose number.
    ledgerAccountId  VARCHAR(100) DEFAULT NULL,

    statementBalance DECIMAL(18,2) NOT NULL DEFAULT 0,
    statementDate    VARCHAR(32) DEFAULT NULL,

    status           VARCHAR(32) NOT NULL DEFAULT 'PENDING_REVIEW',
    lastReconciledAt VARCHAR(32) DEFAULT NULL,
    lastReconciledBy VARCHAR(191) DEFAULT NULL,

    createdAt        VARCHAR(32) DEFAULT NULL,
    updated_at       VARCHAR(32) DEFAULT NULL,
    version          INT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX IF NOT EXISTS idx_bank_status ON bueno_bank_accounts (status);
