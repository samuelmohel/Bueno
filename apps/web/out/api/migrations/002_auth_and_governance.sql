-- ---------------------------------------------------------------------------
-- 002 — Authentication, sessions, audit, and rate limiting
--
-- Adds the infrastructure required to move authorization from the browser to
-- the server. Purely additive: no existing column is altered or dropped, so
-- this is safe to apply to a live database.
--
-- Existing plaintext PINs are left in place by this migration; 003 hashes them
-- so that every current user keeps working through the cutover.
-- ---------------------------------------------------------------------------

-- Credential and lockout state on the existing users table.
ALTER TABLE bueno_users ADD COLUMN password_hash VARCHAR(255) DEFAULT NULL;
ALTER TABLE bueno_users ADD COLUMN must_change_credentials INT NOT NULL DEFAULT 0;
ALTER TABLE bueno_users ADD COLUMN failed_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE bueno_users ADD COLUMN locked_until VARCHAR(32) DEFAULT NULL;
ALTER TABLE bueno_users ADD COLUMN last_login_at VARCHAR(32) DEFAULT NULL;
ALTER TABLE bueno_users ADD COLUMN token_version INT NOT NULL DEFAULT 1;
ALTER TABLE bueno_users ADD COLUMN updated_at VARCHAR(32) DEFAULT NULL;

-- Server-side sessions.
--
-- Tokens are opaque random values; only their SHA-256 hash is stored, so a
-- database disclosure does not hand an attacker usable sessions. Keeping
-- sessions server-side (rather than self-contained JWTs) is what makes
-- instant revocation possible on logout, deactivation, or credential reset.
CREATE TABLE IF NOT EXISTS bueno_sessions (
    token_hash  VARCHAR(64)  NOT NULL PRIMARY KEY,
    user_id     VARCHAR(100) NOT NULL,
    issued_at   VARCHAR(32)  NOT NULL,
    expires_at  VARCHAR(32)  NOT NULL,
    last_seen   VARCHAR(32)  NOT NULL,
    ip          VARCHAR(64),
    user_agent  VARCHAR(255),
    revoked_at  VARCHAR(32) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tamper-evident record of privileged actions.
CREATE TABLE IF NOT EXISTS bueno_audit_log (
    id          VARCHAR(100) NOT NULL PRIMARY KEY,
    occurred_at VARCHAR(32)  NOT NULL,
    actor_id    VARCHAR(100),
    actor_role  VARCHAR(100),
    action      VARCHAR(100) NOT NULL,
    entity      VARCHAR(100),
    entity_id   VARCHAR(200),
    outcome     VARCHAR(32)  NOT NULL DEFAULT 'SUCCESS',
    ip          VARCHAR(64),
    detail      TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fixed-window rate limit counters.
CREATE TABLE IF NOT EXISTS bueno_rate_limits (
    bucket       VARCHAR(191) NOT NULL PRIMARY KEY,
    hits         INT NOT NULL DEFAULT 0,
    window_start VARCHAR(32)  NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes supporting the hot lookups introduced above.
CREATE INDEX idx_sessions_user     ON bueno_sessions (user_id);
CREATE INDEX idx_sessions_expires  ON bueno_sessions (expires_at);
CREATE INDEX idx_audit_occurred    ON bueno_audit_log (occurred_at);
CREATE INDEX idx_audit_actor       ON bueno_audit_log (actor_id);
CREATE INDEX idx_audit_entity      ON bueno_audit_log (entity, entity_id);
