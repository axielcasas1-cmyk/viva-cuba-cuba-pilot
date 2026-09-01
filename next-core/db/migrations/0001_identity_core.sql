CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dx text NOT NULL UNIQUE CHECK (dx ~ '^DX-[A-Z0-9]{8}$'),
  label text NOT NULL CHECK (char_length(label) BETWEEN 2 AND 80),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REVOKED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id uuid NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  client_device_id text NOT NULL,
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 120),
  fingerprint_hash text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REVOKED')),
  trusted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS devices_identity_status_idx ON devices(identity_id,status);
CREATE UNIQUE INDEX IF NOT EXISTS devices_identity_client_idx ON devices(identity_id,client_device_id);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id uuid NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REVOKED','EXPIRED')),
  aal smallint NOT NULL DEFAULT 1 CHECK (aal IN (1,2)),
  aal2_expires_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS sessions_identity_status_idx ON sessions(identity_id,status);
CREATE INDEX IF NOT EXISTS sessions_device_status_idx ON sessions(device_id,status);

CREATE TABLE IF NOT EXISTS recovery_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id uuid NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('USER_RECOVERY','OWNER_RECOVERY')),
  salt text NOT NULL,
  digest text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ROTATED','REVOKED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS recovery_identity_status_idx ON recovery_secrets(identity_id,purpose,status);
CREATE UNIQUE INDEX IF NOT EXISTS recovery_one_active_idx ON recovery_secrets(identity_id,purpose) WHERE status='ACTIVE';

CREATE TABLE IF NOT EXISTS owner_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_identity_id uuid NOT NULL REFERENCES identities(id),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUPERSEDED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  superseded_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS owner_policy_one_active_idx ON owner_policy ((status)) WHERE status='ACTIVE';

CREATE TABLE IF NOT EXISTS owner_admin_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_policy_id uuid NOT NULL REFERENCES owner_policy(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REVOKED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE(owner_policy_id,device_id)
);

CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id uuid NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE,
  public_key bytea NOT NULL,
  counter bigint NOT NULL DEFAULT 0 CHECK (counter >= 0),
  transports text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REVOKED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS webauthn_identity_status_idx ON webauthn_credentials(identity_id,status);

CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id uuid REFERENCES identities(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('REGISTER','AUTHENTICATE','OWNER_SETUP','OWNER_RECOVERY')),
  challenge_hash text NOT NULL UNIQUE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS webauthn_challenge_expiry_idx ON webauthn_challenges(expires_at) WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lookup_hash text NOT NULL UNIQUE,
  code_salt text NOT NULL,
  code_digest text NOT NULL,
  label text,
  status text NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED','USED','REVOKED','EXPIRED')),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_by_identity_id uuid REFERENCES identities(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invitations_status_expiry_idx ON invitations(status,expires_at);

CREATE TABLE IF NOT EXISTS audit_events (
  id bigserial PRIMARY KEY,
  actor_identity_id uuid REFERENCES identities(id),
  kind text NOT NULL,
  result text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_actor_created_idx ON audit_events(actor_identity_id,created_at DESC);
CREATE INDEX IF NOT EXISTS audit_kind_created_idx ON audit_events(kind,created_at DESC);
