-- ---------------------------------------------------------------------------
-- 014 — Wagon tare weight, and seal verification at discharge
--
-- Two gaps on the documents a claim is settled from.
--
-- TARE. The manifest computed gross train weight as net plus 22.5 tonnes per
-- wagon, a constant applied to every vehicle on the network whatever it was.
-- Gross weight is what axle-load limits are checked against and what a
-- weighbridge dispute turns on, so a figure that is right only for whichever
-- wagon class happens to weigh 22.5t is worse than no figure. Tare belongs to
-- the individual wagon and is read off its own data panel.
--
-- SEALS. Migration-era code generated seal numbers; the application now
-- captures the number applied at loading. Capturing it is half a control: a
-- seal is tamper evidence, and evidence means comparing the seal that arrives
-- against the one that was fitted. These columns record that comparison at
-- discharge, so "the seal was intact" becomes a recorded observation by a
-- named officer rather than an assumption printed on a manifest.
-- ---------------------------------------------------------------------------

-- Tare, and the capacity figures that go with it, on the wagon itself.
ALTER TABLE bueno_wagons ADD COLUMN tareTonnes DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE bueno_wagons ADD COLUMN maxGrossTonnes DECIMAL(10,2) DEFAULT NULL;

-- Seal verification, per trip. Stored on the trip rather than the wagon
-- because it is an observation about one journey, not a property of the
-- vehicle; the per-wagon detail lives in the wagon logs JSON alongside the
-- rest of the tally.
ALTER TABLE bueno_trips ADD COLUMN sealAuditText TEXT DEFAULT NULL;
ALTER TABLE bueno_trips ADD COLUMN sealsVerifiedAt VARCHAR(32) DEFAULT NULL;
ALTER TABLE bueno_trips ADD COLUMN sealsVerifiedBy VARCHAR(191) DEFAULT NULL;

-- How many wagons arrived with a seal that did not match the one fitted.
-- Counted rather than derived at read time, because this is the figure an
-- insurer asks for and it should not depend on parsing a JSON blob.
ALTER TABLE bueno_trips ADD COLUMN sealsBrokenCount INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_trips_seals_broken ON bueno_trips (sealsBrokenCount);
