-- 008 — Store the commercial terms a deal actually carries
--
-- bueno_deals held eleven columns. The application's deal object has closer to
-- thirty: a monthly master contract knows how many trips it is spread across,
-- how much tonnage each tranche carries, how many have gone, what the agreed
-- tariff is and what the payment terms are.
--
-- None of that had anywhere to go. The endpoint validates against a whitelist
-- and drops everything else, so a contract saved successfully would come back
-- from the next poll with its entire structure missing — and the tranche
-- dispatch feature, which reads totalPlannedTrips and trancheTonnage, would
-- have nothing to work from.
--
-- Money and tonnage are DECIMAL rather than the VARCHAR the original columns
-- used. Storing a tariff as text invites string comparison and silent
-- truncation in any report that later tries to sum it.

ALTER TABLE bueno_deals ADD COLUMN dealType             VARCHAR(50)    DEFAULT NULL;
ALTER TABLE bueno_deals ADD COLUMN companyName          VARCHAR(255)   DEFAULT NULL;

-- Contract structure.
ALTER TABLE bueno_deals ADD COLUMN totalPlannedTrips    INT            DEFAULT NULL;
ALTER TABLE bueno_deals ADD COLUMN dispatchedTripsCount INT            NOT NULL DEFAULT 0;
ALTER TABLE bueno_deals ADD COLUMN completedTripsCount  INT            NOT NULL DEFAULT 0;
ALTER TABLE bueno_deals ADD COLUMN trancheTonnage       DECIMAL(18,2)  DEFAULT NULL;
ALTER TABLE bueno_deals ADD COLUMN remainingTonnage     DECIMAL(18,2)  DEFAULT NULL;
ALTER TABLE bueno_deals ADD COLUMN cadence              VARCHAR(100)   DEFAULT NULL;
ALTER TABLE bueno_deals ADD COLUMN contractMonth        VARCHAR(20)    DEFAULT NULL;

-- Cargo description.
ALTER TABLE bueno_deals ADD COLUMN unitOfMeasure        VARCHAR(100)   DEFAULT NULL;
ALTER TABLE bueno_deals ADD COLUMN wagonType            VARCHAR(100)   DEFAULT NULL;
ALTER TABLE bueno_deals ADD COLUMN gauge                VARCHAR(50)    DEFAULT NULL;

-- Commercial terms, set by finance when the deal is costed.
ALTER TABLE bueno_deals ADD COLUMN tariffRatePerTon     DECIMAL(18,2)  DEFAULT NULL;
ALTER TABLE bueno_deals ADD COLUMN totalContractValue   DECIMAL(18,2)  DEFAULT NULL;
ALTER TABLE bueno_deals ADD COLUMN budgetExpensePerTrip DECIMAL(18,2)  DEFAULT NULL;
ALTER TABLE bueno_deals ADD COLUMN paymentTerms         VARCHAR(50)    DEFAULT NULL;
ALTER TABLE bueno_deals ADD COLUMN financeStatus        VARCHAR(50)    DEFAULT NULL;
ALTER TABLE bueno_deals ADD COLUMN costedBy             VARCHAR(255)   DEFAULT NULL;
ALTER TABLE bueno_deals ADD COLUMN costedAt             VARCHAR(64)    DEFAULT NULL;

-- No new indexes here: migration 004 already covers company, status and
-- updated_at, which are what the listing and scoping queries filter on.
