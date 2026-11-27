-- ---------------------------------------------------------------------------
-- 010 — Company registry
--
-- Until now a consignee was linked to their freight by their company NAME
-- matching the company name stored on each trip, deal and invoice.
--
-- That is the deepest structural fault in the platform:
--
--   - Renaming an organisation detaches its entire history. "HBM Nig Plc"
--     becoming "Huaxin Building Materials Nigeria Plc" silently empties the
--     customer's portal, and nothing says why.
--   - The same organisation recorded two ways is two organisations. There is
--     already a merge-company-name.php script and a check-consignee-links.php
--     report in scripts/ precisely because this happens in practice.
--   - Row-level security depends on string comparison. We compare case- and
--     whitespace-insensitively to narrow the gap, which means the scope
--     clause cannot use an index, and it still cannot survive a rename or a
--     punctuation difference.
--
-- This introduces a stable id that records point at instead. Additive only:
-- every company column stays exactly where it is, carrying the display name,
-- so nothing breaks while call sites migrate. 011 backfills the ids.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bueno_companies (
    id            VARCHAR(100) NOT NULL PRIMARY KEY,

    -- What the organisation is called today. Changing this is a rename, and
    -- a rename no longer detaches anything.
    name          VARCHAR(191) NOT NULL,

    -- Lowercased, trimmed, punctuation-folded form of the name, used to find
    -- an existing company when one is referred to by name. UNIQUE, so the
    -- registry cannot grow two rows for the same organisation.
    matchKey      VARCHAR(191) NOT NULL,

    -- Set when this row has been merged into another. The row is kept rather
    -- than deleted so historic references still resolve, and reads follow
    -- mergedIntoId to the surviving company.
    mergedIntoId  VARCHAR(100) DEFAULT NULL,

    status        VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    isExternal    INT NOT NULL DEFAULT 1,

    rcNumber      VARCHAR(100) DEFAULT NULL,
    industry      VARCHAR(100) DEFAULT NULL,
    contactName   VARCHAR(191) DEFAULT NULL,
    contactEmail  VARCHAR(191) DEFAULT NULL,
    contactPhone  VARCHAR(32)  DEFAULT NULL,
    address       VARCHAR(255) DEFAULT NULL,

    createdAt     VARCHAR(32) DEFAULT NULL,
    createdBy     VARCHAR(191) DEFAULT NULL,
    updated_at    VARCHAR(32) DEFAULT NULL,
    version       INT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_matchkey ON bueno_companies (matchKey);
CREATE INDEX IF NOT EXISTS idx_companies_merged ON bueno_companies (mergedIntoId);
CREATE INDEX IF NOT EXISTS idx_companies_status ON bueno_companies (status);

-- The stable reference, added everywhere a company name is currently stored.
ALTER TABLE bueno_users           ADD COLUMN companyId VARCHAR(100) DEFAULT NULL;
ALTER TABLE bueno_trips           ADD COLUMN companyId VARCHAR(100) DEFAULT NULL;
ALTER TABLE bueno_deals           ADD COLUMN companyId VARCHAR(100) DEFAULT NULL;
ALTER TABLE bueno_invoices        ADD COLUMN companyId VARCHAR(100) DEFAULT NULL;
ALTER TABLE bueno_client_requests ADD COLUMN companyId VARCHAR(100) DEFAULT NULL;

-- Scoping reads every one of these on every request a consignee makes.
CREATE INDEX IF NOT EXISTS idx_users_companyid    ON bueno_users (companyId);
CREATE INDEX IF NOT EXISTS idx_trips_companyid    ON bueno_trips (companyId);
CREATE INDEX IF NOT EXISTS idx_deals_companyid    ON bueno_deals (companyId);
CREATE INDEX IF NOT EXISTS idx_invoices_companyid ON bueno_invoices (companyId);
CREATE INDEX IF NOT EXISTS idx_creq_companyid     ON bueno_client_requests (companyId);
