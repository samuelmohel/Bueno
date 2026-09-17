-- ---------------------------------------------------------------------------
-- 005 — Email log table, and the rebranding as a one-off data fix
--
-- The legacy-name rewriting (Lafarge/Dangote/Purechem/BUA -> current client
-- names) was executing on EVERY request: as a regex pass over raw JSON on each
-- localStorage read in the browser, and as a block of UPDATE statements in
-- db.php::initTables() on every single API call. It is a data migration, so it
-- runs once, here.
--
-- The old rules also contradicted each other — db.php mapped Dangote to DASCO
-- while users.php mapped Dangote to Purechem, which db.php then mapped to
-- APMT — so the result depended on which endpoint you happened to hit. These
-- are applied in a single consistent order.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bueno_email_logs (
    id          VARCHAR(100) NOT NULL PRIMARY KEY,
    recipient   VARCHAR(255) NOT NULL,
    subject     VARCHAR(255) NOT NULL,
    mailType    VARCHAR(100),
    status      VARCHAR(50),
    createdAt   VARCHAR(32),
    payloadText TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_email_logs_created ON bueno_email_logs (createdAt);

-- Huaxin (HBM) — absorbs the former Lafarge and Dangote cement references.
UPDATE bueno_users
   SET companyName = 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)'
 WHERE companyName LIKE '%Lafarge%' OR companyName LIKE '%Dangote%';

UPDATE bueno_deals
   SET company = 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)'
 WHERE company LIKE '%Lafarge%' OR company LIKE '%Dangote%';

UPDATE bueno_trips
   SET company = 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)'
 WHERE company LIKE '%Lafarge%' OR company LIKE '%Dangote%';

UPDATE bueno_invoices
   SET companyName = 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)'
 WHERE companyName LIKE '%Lafarge%' OR companyName LIKE '%Dangote%';

UPDATE bueno_negotiations
   SET companyName = 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)'
 WHERE companyName LIKE '%Lafarge%' OR companyName LIKE '%Dangote%';

-- APM Terminals — absorbs the former Purechem references.
UPDATE bueno_users      SET companyName = 'APM Terminals Ltd (APMT)' WHERE companyName LIKE '%Purechem%';
UPDATE bueno_deals      SET company     = 'APM Terminals Ltd (APMT)' WHERE company     LIKE '%Purechem%';
UPDATE bueno_trips      SET company     = 'APM Terminals Ltd (APMT)' WHERE company     LIKE '%Purechem%';
UPDATE bueno_invoices   SET companyName = 'APM Terminals Ltd (APMT)' WHERE companyName LIKE '%Purechem%';
UPDATE bueno_negotiations SET companyName = 'APM Terminals Ltd (APMT)' WHERE companyName LIKE '%Purechem%';

-- DASCO — absorbs the former BUA references.
UPDATE bueno_users      SET companyName = 'DASCO Industries Ltd' WHERE companyName LIKE '%BUA%';
UPDATE bueno_deals      SET company     = 'DASCO Industries Ltd' WHERE company     LIKE '%BUA%';
UPDATE bueno_trips      SET company     = 'DASCO Industries Ltd' WHERE company     LIKE '%BUA%';
UPDATE bueno_invoices   SET companyName = 'DASCO Industries Ltd' WHERE companyName LIKE '%BUA%';
UPDATE bueno_negotiations SET companyName = 'DASCO Industries Ltd' WHERE companyName LIKE '%BUA%';

-- Cargo descriptions.
UPDATE bueno_deals SET cargoType = 'Huaxin Portland Cement (50kg)' WHERE cargoType LIKE '%Elephant%';
UPDATE bueno_trips SET cargoType = 'Huaxin Portland Cement (50kg bags)' WHERE cargoType LIKE '%Elephant%';

-- Contact addresses on legacy domains.
UPDATE bueno_users SET email = 'logistics@hbm.ng'   WHERE email LIKE '%lafarge%' OR email LIKE '%dangote%';
UPDATE bueno_users SET email = 'rail@apmt.com'      WHERE email LIKE '%purechem%';
UPDATE bueno_users SET email = 'logistics@dasco.ng' WHERE email LIKE '%buacement%';
