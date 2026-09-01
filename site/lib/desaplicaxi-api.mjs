const API_URL = 'https://c--3a979bdd-c400-4762-992d-6168e30ae209-prod.lovable.cloud';
const PUBLISHABLE_KEY = 'sb_publishable_li2NGEbuo4JQevFpNRlWvg_vm7DK1hi';
const DEFAULT_TIMEOUT_MS = 12000;

function clean(value, max = 400) {
  return String(value ?? '').trim().slice(0, max);
}

async function rpc(name, payload = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_URL}/rest/v1/rpc/${encodeURIComponent(name)}`, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-store',
      headers: {
        apikey: PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text || null; }
    if (!response.ok) {
      const message = body?.message || body?.error || `RPC ${name} falló (${response.status})`;
      throw new Error(message);
    }
    return body;
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('DESAPLICAXI_TIMEOUT');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function deviceMeta() {
  return {
    p_device_label: clean(navigator.userAgentData?.platform || navigator.platform || 'Navegador', 80),
    p_platform: clean(navigator.userAgentData?.platform || navigator.platform || '', 120),
    p_user_agent: clean(navigator.userAgent || '', 400),
  };
}

export function activateGlobalInvitation(code, displayName) {
  return rpc('dx_activate_invitation', {
    p_code: clean(code, 64).toUpperCase(),
    p_display_name: clean(displayName, 60),
    ...deviceMeta(),
  });
}

export function recoverGlobalIdentity(dx, recoveryKey) {
  return rpc('dx_recover_identity', {
    p_dx: clean(dx, 32).toUpperCase(),
    p_recovery_key: clean(recoveryKey, 80).toUpperCase(),
    ...deviceMeta(),
  });
}

export function whoAmI(sessionToken) {
  return rpc('dx_whoami', { p_token: clean(sessionToken, 128) }, 8000);
}

export function logoutGlobal(sessionToken) {
  return rpc('dx_logout', { p_token: clean(sessionToken, 128) }, 8000);
}
