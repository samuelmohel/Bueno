-- ---------------------------------------------------------------------------
-- 004 — Optimistic concurrency and query indexes
--
-- Two problems this addresses.
--
-- 1. Lost updates. The client POSTed the ENTIRE trips array on every change,
--    and the server REPLACEd all of it. Two cargo officers working different
--    trips would each send their own 5-second-stale snapshot, and whoever
--    saved last silently erased the other's work. Per-record writes plus a
--    version column make a conflicting write detectable instead of silent.
--
-- 2. Every list query was a full table scan with no index, and the client
--    re-fetched all seven collections every 5 seconds per open tab.
--    updated_at makes delta sync possible; the indexes make it cheap.
--
-- Additive only: no existing column is altered or dropped.
-- ---------------------------------------------------------------------------

ALTER TABLE bueno_trips        ADD COLUMN updated_at VARCHAR(32) DEFAULT NULL;
ALTER TABLE bueno_trips        ADD COLUMN version INT NOT NULL DEFAULT 1;
ALTER TABLE bueno_deals        ADD COLUMN updated_at VARCHAR(32) DEFAULT NULL;
ALTER TABLE bueno_deals        ADD COLUMN version INT NOT NULL DEFAULT 1;
ALTER TABLE bueno_invoices     ADD COLUMN updated_at VARCHAR(32) DEFAULT NULL;
ALTER TABLE bueno_invoices     ADD COLUMN version INT NOT NULL DEFAULT 1;
ALTER TABLE bueno_fund_requests ADD COLUMN updated_at VARCHAR(32) DEFAULT NULL;
ALTER TABLE bueno_fund_requests ADD COLUMN version INT NOT NULL DEFAULT 1;
ALTER TABLE bueno_wagons       ADD COLUMN updated_at VARCHAR(32) DEFAULT NULL;
ALTER TABLE bueno_wagons       ADD COLUMN version INT NOT NULL DEFAULT 1;
ALTER TABLE bueno_trip_costs   ADD COLUMN updated_at VARCHAR(32) DEFAULT NULL;
ALTER TABLE bueno_negotiations ADD COLUMN updated_at VARCHAR(32) DEFAULT NULL;
ALTER TABLE bueno_client_requests ADD COLUMN updated_at VARCHAR(32) DEFAULT NULL;
ALTER TABLE bueno_notifications   ADD COLUMN updated_at VARCHAR(32) DEFAULT NULL;

-- Delta-sync and scoping indexes.
CREATE INDEX idx_trips_updated   ON bueno_trips (updated_at);
CREATE INDEX idx_trips_status    ON bueno_trips (status);
CREATE INDEX idx_trips_company   ON bueno_trips (company);
CREATE INDEX idx_trips_origin    ON bueno_trips (origin);
CREATE INDEX idx_trips_dest      ON bueno_trips (destination);

CREATE INDEX idx_deals_updated   ON bueno_deals (updated_at);
CREATE INDEX idx_deals_company   ON bueno_deals (company);
CREATE INDEX idx_deals_status    ON bueno_deals (status);

CREATE INDEX idx_invoices_updated ON bueno_invoices (updated_at);
CREATE INDEX idx_invoices_company ON bueno_invoices (companyName);
CREATE INDEX idx_invoices_trip    ON bueno_invoices (tripId);
CREATE INDEX idx_invoices_status  ON bueno_invoices (status);

CREATE INDEX idx_funds_updated   ON bueno_fund_requests (updated_at);
CREATE INDEX idx_funds_stage     ON bueno_fund_requests (stage);
CREATE INDEX idx_funds_status    ON bueno_fund_requests (status);
CREATE INDEX idx_funds_station   ON bueno_fund_requests (station);

CREATE INDEX idx_wagons_updated  ON bueno_wagons (updated_at);
CREATE INDEX idx_wagons_status   ON bueno_wagons (status);
CREATE INDEX idx_wagons_station  ON bueno_wagons (currentStation);

CREATE INDEX idx_costs_trip      ON bueno_trip_costs (tripId);
CREATE INDEX idx_gps_trip        ON bueno_gps_logs (tripId);
CREATE INDEX idx_gps_timestamp   ON bueno_gps_logs (timestamp);
CREATE INDEX idx_users_email     ON bueno_users (email);
CREATE INDEX idx_users_role      ON bueno_users (role);
CREATE INDEX idx_users_station   ON bueno_users (assignedStation);
