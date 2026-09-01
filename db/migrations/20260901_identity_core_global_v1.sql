-- VIVA CUBA + DESAPLICAXI Identity Core Global v1
-- Custom session-token authority for the static Mother PWA.
-- Raw VCM/VCR/session credentials are returned once and persisted only as SHA-256 hashes.

BEGIN;

ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS code_hash text;
ALTER TABLE public.invitations ALTER COLUMN code DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS invitations_code_hash_uidx
  ON public.invitations(code_hash) WHERE code_hash IS NOT NULL;

ALTER TABLE public.recovery_secrets ADD COLUMN IF NOT EXISTS secret_hash text;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS token_hash text;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS expires_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_hash_uidx
  ON public.sessions(token_hash) WHERE token_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.identity_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id uuid NOT NULL REFERENCES public.identities(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(identity_id, role)
);
ALTER TABLE public.identity_roles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.identity_roles FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.identity_core_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.identity_core_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.identity_core_config FROM anon, authenticated;

INSERT INTO public.identity_core_config(key, value)
VALUES ('owner_secret_hash', 'a4ffc408125afa303614e60848bfc306e14030b44f328681f49d5945dd7166e7')
ON CONFLICT (key) DO NOTHING;

-- Migrate any legacy plaintext invitation rows, then erase plaintext.
UPDATE public.invitations
SET code_hash = encode(digest(upper(trim(code)), 'sha256'), 'hex'), code = NULL
WHERE code IS NOT NULL AND code_hash IS NULL;

CREATE OR REPLACE FUNCTION public.vc_hash_secret(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE STRICT
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT encode(digest(p_value, 'sha256'), 'hex')
$$;

CREATE OR REPLACE FUNCTION public.vc_safe_token(p_chars integer)
RETURNS text
LANGUAGE sql
VOLATILE STRICT
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT upper(substr(translate(encode(gen_random_bytes(greatest(8, p_chars)), 'hex'), '01', 'GH'), 1, p_chars))
$$;

CREATE OR REPLACE FUNCTION public.vc_new_dx()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_dx text;
BEGIN
  LOOP
    v_dx := 'DX-' || public.vc_safe_token(8);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.identities WHERE dx = v_dx);
  END LOOP;
  RETURN v_dx;
END;
$$;

CREATE OR REPLACE FUNCTION public.vc_new_vcm()
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT 'VCM-' || public.vc_safe_token(4) || '-' || public.vc_safe_token(4) || '-' || public.vc_safe_token(4) || '-' || public.vc_safe_token(4)
$$;

CREATE OR REPLACE FUNCTION public.vc_new_vcr()
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT 'VCR-' || public.vc_safe_token(5) || '-' || public.vc_safe_token(5) || '-' || public.vc_safe_token(5)
$$;

CREATE OR REPLACE FUNCTION public.vc_new_session_token()
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT 'VCS-' || encode(gen_random_bytes(32), 'hex')
$$;

CREATE OR REPLACE FUNCTION public.vc_session_identity(p_session_token text)
RETURNS uuid
LANGUAGE sql
STABLE STRICT
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT s.identity_id
  FROM public.sessions s
  WHERE s.token_hash = public.vc_hash_secret(trim(p_session_token))
    AND s.revoked = false
    AND s.expires_at > now()
  ORDER BY s.created_at DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.vc_has_identity_role(p_identity uuid, p_role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE STRICT
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.identity_roles r
    WHERE r.identity_id = p_identity AND r.role = p_role
  )
$$;

CREATE OR REPLACE FUNCTION public.vc_record_attempt(p_bucket text, p_kind text, p_success boolean)
RETURNS void
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  INSERT INTO public.auth_attempts(bucket, kind, success)
  VALUES (left(p_bucket, 120), left(p_kind, 40), p_success)
$$;

CREATE OR REPLACE FUNCTION public.vc_enforce_rate_limit(
  p_bucket text,
  p_kind text,
  p_max integer DEFAULT 8,
  p_minutes integer DEFAULT 15
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.auth_attempts
  WHERE bucket = left(p_bucket, 120)
    AND kind = left(p_kind, 40)
    AND success = false
    AND created_at >= now() - make_interval(mins => p_minutes);
  IF v_count >= p_max THEN
    RAISE EXCEPTION 'RATE_LIMITED';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.vc_bootstrap_owner(
  p_owner_secret text,
  p_display_name text,
  p_device_label text DEFAULT 'Dispositivo OWNER',
  p_platform text DEFAULT '',
  p_user_agent text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_expected text;
  v_identity public.identities%ROWTYPE;
  v_device public.devices%ROWTYPE;
  v_vcr text;
  v_session text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.identity_roles WHERE role = 'owner') THEN
    RAISE EXCEPTION 'OWNER_ALREADY_BOOTSTRAPPED';
  END IF;
  IF char_length(trim(coalesce(p_display_name,''))) < 1 OR char_length(p_display_name) > 60 THEN
    RAISE EXCEPTION 'INVALID_DISPLAY_NAME';
  END IF;

  SELECT value INTO v_expected FROM public.identity_core_config WHERE key = 'owner_secret_hash';
  IF v_expected IS NULL OR public.vc_hash_secret(upper(trim(p_owner_secret))) <> v_expected THEN
    RAISE EXCEPTION 'OWNER_SECRET_INVALID';
  END IF;

  INSERT INTO public.identities(user_id, dx, display_name, plan, state)
  VALUES (gen_random_uuid(), public.vc_new_dx(), trim(p_display_name), 'FREE', 'ACTIVE')
  RETURNING * INTO v_identity;

  INSERT INTO public.identity_roles(identity_id, role) VALUES (v_identity.id, 'owner'), (v_identity.id, 'user');

  v_vcr := public.vc_new_vcr();
  INSERT INTO public.recovery_secrets(identity_id, secret_hash, active)
  VALUES (v_identity.id, public.vc_hash_secret(upper(v_vcr)), true);

  INSERT INTO public.devices(identity_id, label, platform, user_agent)
  VALUES (v_identity.id, left(coalesce(p_device_label,'Dispositivo OWNER'),80), left(coalesce(p_platform,''),120), left(coalesce(p_user_agent,''),400))
  RETURNING * INTO v_device;

  v_session := public.vc_new_session_token();
  INSERT INTO public.sessions(identity_id, device_id, token_hash, expires_at)
  VALUES (v_identity.id, v_device.id, public.vc_hash_secret(v_session), now() + interval '30 days');

  INSERT INTO public.audit_events(actor_identity, action, target, meta)
  VALUES (v_identity.id, 'core.bootstrap_owner', v_identity.dx, jsonb_build_object('device_id', v_device.id));

  RETURN jsonb_build_object(
    'dx', v_identity.dx,
    'displayName', v_identity.display_name,
    'plan', v_identity.plan,
    'recoveryKey', v_vcr,
    'sessionToken', v_session,
    'sessionExpiresAt', now() + interval '30 days'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.vc_issue_invitations(
  p_session_token text,
  p_count integer DEFAULT 1,
  p_label text DEFAULT '',
  p_expires_hours integer DEFAULT 168
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor uuid;
  v_code text;
  v_result jsonb := '[]'::jsonb;
  v_expires timestamptz;
  i integer;
BEGIN
  v_actor := public.vc_session_identity(p_session_token);
  IF v_actor IS NULL OR NOT public.vc_has_identity_role(v_actor, 'owner') THEN
    RAISE EXCEPTION 'OWNER_SESSION_REQUIRED';
  END IF;
  IF p_count < 1 OR p_count > 50 THEN RAISE EXCEPTION 'INVALID_COUNT'; END IF;
  IF p_expires_hours < 1 OR p_expires_hours > 720 THEN RAISE EXCEPTION 'INVALID_EXPIRY'; END IF;
  v_expires := now() + make_interval(hours => p_expires_hours);

  FOR i IN 1..p_count LOOP
    LOOP
      v_code := public.vc_new_vcm();
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.invitations WHERE code_hash = public.vc_hash_secret(v_code)
      );
    END LOOP;
    INSERT INTO public.invitations(code, code_hash, label, state, created_by, expires_at)
    VALUES (NULL, public.vc_hash_secret(v_code), left(coalesce(p_label,''),120), 'ISSUED', v_actor, v_expires);
    v_result := v_result || jsonb_build_array(jsonb_build_object('code', v_code, 'expiresAt', v_expires));
  END LOOP;

  INSERT INTO public.audit_events(actor_identity, action, target, meta)
  VALUES (v_actor, 'invitation.batch_issued', 'invitations', jsonb_build_object('count', p_count));
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.vc_activate_invitation(
  p_code text,
  p_display_name text,
  p_device_label text DEFAULT 'Dispositivo',
  p_platform text DEFAULT '',
  p_user_agent text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_code text := upper(trim(p_code));
  v_hash text;
  v_inv public.invitations%ROWTYPE;
  v_identity public.identities%ROWTYPE;
  v_device public.devices%ROWTYPE;
  v_vcr text;
  v_session text;
BEGIN
  IF v_code !~ '^VCM-[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){3}$' THEN
    RAISE EXCEPTION 'INVITATION_INVALID';
  END IF;
  IF char_length(trim(coalesce(p_display_name,''))) < 1 OR char_length(p_display_name) > 60 THEN
    RAISE EXCEPTION 'INVALID_DISPLAY_NAME';
  END IF;
  v_hash := public.vc_hash_secret(v_code);
  PERFORM public.vc_enforce_rate_limit(left(v_hash,24), 'activation', 8, 15);

  SELECT * INTO v_inv
  FROM public.invitations
  WHERE code_hash = v_hash AND state = 'ISSUED'
  FOR UPDATE;

  IF NOT FOUND OR (v_inv.expires_at IS NOT NULL AND v_inv.expires_at <= now()) THEN
    PERFORM public.vc_record_attempt(left(v_hash,24), 'activation', false);
    RAISE EXCEPTION 'INVITATION_INVALID_OR_USED';
  END IF;

  UPDATE public.invitations SET state = 'CONSUMING' WHERE id = v_inv.id AND state = 'ISSUED';
  IF NOT FOUND THEN
    PERFORM public.vc_record_attempt(left(v_hash,24), 'activation', false);
    RAISE EXCEPTION 'INVITATION_INVALID_OR_USED';
  END IF;

  INSERT INTO public.identities(user_id, dx, display_name, plan, state)
  VALUES (gen_random_uuid(), public.vc_new_dx(), trim(p_display_name), 'FREE', 'ACTIVE')
  RETURNING * INTO v_identity;
  INSERT INTO public.identity_roles(identity_id, role) VALUES (v_identity.id, 'user');

  v_vcr := public.vc_new_vcr();
  INSERT INTO public.recovery_secrets(identity_id, secret_hash, active)
  VALUES (v_identity.id, public.vc_hash_secret(upper(v_vcr)), true);

  INSERT INTO public.devices(identity_id, label, platform, user_agent)
  VALUES (v_identity.id, left(coalesce(p_device_label,'Dispositivo'),80), left(coalesce(p_platform,''),120), left(coalesce(p_user_agent,''),400))
  RETURNING * INTO v_device;

  v_session := public.vc_new_session_token();
  INSERT INTO public.sessions(identity_id, device_id, token_hash, expires_at)
  VALUES (v_identity.id, v_device.id, public.vc_hash_secret(v_session), now() + interval '30 days');

  UPDATE public.invitations
  SET state = 'USED', used_by_identity = v_identity.id, used_at = now()
  WHERE id = v_inv.id;

  PERFORM public.vc_record_attempt(left(v_hash,24), 'activation', true);
  INSERT INTO public.audit_events(actor_identity, action, target, meta)
  VALUES (v_identity.id, 'identity.activated', v_identity.dx, jsonb_build_object('invitation_id', v_inv.id));

  RETURN jsonb_build_object(
    'dx', v_identity.dx,
    'displayName', v_identity.display_name,
    'plan', v_identity.plan,
    'recoveryKey', v_vcr,
    'sessionToken', v_session,
    'sessionExpiresAt', now() + interval '30 days'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.vc_recover_identity(
  p_dx text,
  p_recovery_key text,
  p_device_label text DEFAULT 'Dispositivo recuperado',
  p_platform text DEFAULT '',
  p_user_agent text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_dx text := upper(trim(p_dx));
  v_identity public.identities%ROWTYPE;
  v_secret public.recovery_secrets%ROWTYPE;
  v_device public.devices%ROWTYPE;
  v_next_vcr text;
  v_session text;
BEGIN
  PERFORM public.vc_enforce_rate_limit(v_dx, 'recovery', 6, 15);
  SELECT * INTO v_identity FROM public.identities WHERE dx = v_dx AND state = 'ACTIVE';
  IF NOT FOUND THEN
    PERFORM public.vc_record_attempt(v_dx, 'recovery', false);
    RAISE EXCEPTION 'RECOVERY_INVALID';
  END IF;

  SELECT * INTO v_secret
  FROM public.recovery_secrets
  WHERE identity_id = v_identity.id
    AND active = true
    AND secret_hash = public.vc_hash_secret(upper(trim(p_recovery_key)))
  FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM public.vc_record_attempt(v_dx, 'recovery', false);
    RAISE EXCEPTION 'RECOVERY_INVALID';
  END IF;

  UPDATE public.recovery_secrets
  SET active = false, rotated_at = now()
  WHERE id = v_secret.id AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'RECOVERY_ALREADY_ROTATED'; END IF;

  v_next_vcr := public.vc_new_vcr();
  INSERT INTO public.recovery_secrets(identity_id, secret_hash, active)
  VALUES (v_identity.id, public.vc_hash_secret(upper(v_next_vcr)), true);

  INSERT INTO public.devices(identity_id, label, platform, user_agent)
  VALUES (v_identity.id, left(coalesce(p_device_label,'Dispositivo recuperado'),80), left(coalesce(p_platform,''),120), left(coalesce(p_user_agent,''),400))
  RETURNING * INTO v_device;

  v_session := public.vc_new_session_token();
  INSERT INTO public.sessions(identity_id, device_id, token_hash, expires_at)
  VALUES (v_identity.id, v_device.id, public.vc_hash_secret(v_session), now() + interval '30 days');

  PERFORM public.vc_record_attempt(v_dx, 'recovery', true);
  INSERT INTO public.audit_events(actor_identity, action, target, meta)
  VALUES (v_identity.id, 'identity.recovered', v_dx, jsonb_build_object('device_id', v_device.id));

  RETURN jsonb_build_object(
    'dx', v_identity.dx,
    'displayName', v_identity.display_name,
    'plan', v_identity.plan,
    'recoveryKey', v_next_vcr,
    'sessionToken', v_session,
    'sessionExpiresAt', now() + interval '30 days'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.vc_session_state(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_identity_id uuid;
  v_identity public.identities%ROWTYPE;
  v_session_id uuid;
BEGIN
  SELECT s.id, s.identity_id INTO v_session_id, v_identity_id
  FROM public.sessions s
  WHERE s.token_hash = public.vc_hash_secret(trim(p_session_token))
    AND s.revoked = false AND s.expires_at > now()
  ORDER BY s.created_at DESC LIMIT 1;
  IF v_identity_id IS NULL THEN RETURN jsonb_build_object('active', false); END IF;

  UPDATE public.sessions SET last_seen_at = now() WHERE id = v_session_id;
  UPDATE public.identities SET last_seen_at = now() WHERE id = v_identity_id;
  SELECT * INTO v_identity FROM public.identities WHERE id = v_identity_id;

  RETURN jsonb_build_object(
    'active', true,
    'dx', v_identity.dx,
    'displayName', v_identity.display_name,
    'plan', v_identity.plan,
    'state', v_identity.state,
    'owner', public.vc_has_identity_role(v_identity_id, 'owner')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.vc_revoke_session(p_session_token text, p_target_session uuid)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor uuid;
BEGIN
  v_actor := public.vc_session_identity(p_session_token);
  IF v_actor IS NULL THEN RAISE EXCEPTION 'SESSION_INVALID'; END IF;
  UPDATE public.sessions SET revoked = true
  WHERE id = p_target_session AND identity_id = v_actor AND revoked = false;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.vc_hash_secret(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vc_safe_token(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vc_new_dx() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vc_new_vcm() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vc_new_vcr() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vc_new_session_token() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vc_has_identity_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vc_record_attempt(text,text,boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vc_enforce_rate_limit(text,text,integer,integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.vc_session_identity(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vc_bootstrap_owner(text,text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vc_issue_invitations(text,integer,text,integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vc_activate_invitation(text,text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vc_recover_identity(text,text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vc_session_state(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vc_revoke_session(text,uuid) TO anon, authenticated;

COMMIT;
