-- 009 — Account invitations
--
-- Provisioning an account produced a one-time password shown to the
-- administrator, to be relayed to the new user by hand. That works, but it
-- puts a credential in a chat message or a phone call, and it stalls
-- onboarding whenever the administrator is not the one sitting with the
-- person.
--
-- An invitation replaces that relay: the new user gets a link, follows it, and
-- sets their own password. What travels by email is a single-use token that
-- expires, not a credential that does not.
--
-- Only the HASH of the token is stored, for the same reason session tokens are
-- hashed: a leaked database should not hand over working invitations. The
-- token itself exists in the email and nowhere else.

CREATE TABLE IF NOT EXISTS bueno_invitations (
    token_hash  VARCHAR(64)  NOT NULL PRIMARY KEY,
    user_id     VARCHAR(100) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    created_at  VARCHAR(32)  NOT NULL,
    expires_at  VARCHAR(32)  NOT NULL,
    used_at     VARCHAR(32)  DEFAULT NULL,
    created_by  VARCHAR(100) DEFAULT NULL,
    -- Whether the invitation email was accepted by the mail transport. An
    -- administrator needs to know a delivery failed, rather than waiting for
    -- someone who was never written to.
    mail_status VARCHAR(32)  DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Superseding an outstanding invitation means finding it by account.
CREATE INDEX idx_invitations_user    ON bueno_invitations (user_id);
-- Expired and used rows are swept periodically.
CREATE INDEX idx_invitations_expires ON bueno_invitations (expires_at);
