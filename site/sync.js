import { APP_VERSION, applyVersion } from './version.js';
import {
  appendReleaseAudit,
  normalizeRelease,
  reloadGuardKey,
  shouldUpdate,
} from './lib/release-core.mjs';

const RELEASE_URL = './release.json';
const CHECK_MS = 30_000;
const PENDING_RETRY_MS = 3_000;
let checking = false;
let pendingRelease = null;

function clientMeta(event, targetVersion = '', reason = '', result = '') {
  let timezone = '';
  try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch {}
  return {
    at: new Date().toISOString(),
    event,
    currentVersion: APP_VERSION,
    targetVersion,
    online: navigator.onLine,
    timezone,
    language: navigator.language || '',
    reason,
    result,
  };
}

function audit(event, targetVersion = '', reason = '', result = '') {
  try { appendReleaseAudit(localStorage, clientMeta(event, targetVersion, reason, result)); } catch {}
}

function emitStatus(state, targetVersion = '') {
  const labels = {
    checking: `MADRE v${APP_VERSION} · comprobando sincronización…`,
    synced: `MADRE v${APP_VERSION} · sincronizada`,
    offline: `MADRE v${APP_VERSION} · sin conexión · reanudará al volver`,
    pending: `MADRE v${APP_VERSION} · actualización ${targetVersion} pendiente`,
    applying: `MADRE v${APP_VERSION} → v${targetVersion} · actualizando…`,
    guarded: `MADRE v${APP_VERSION} · convergencia protegida`,
    ahead: `MADRE v${APP_VERSION} · cliente más reciente que el manifiesto`,
    error: `MADRE v${APP_VERSION} · sincronización reintentará`,
  };
  const text = labels[state] || `MADRE v${APP_VERSION}`;
  applyVersion(text);
  window.dispatchEvent(new CustomEvent('viva:release-status', {
    detail: { state, currentVersion: APP_VERSION, targetVersion, text },
  }));
}

function callIsActive() {
  return document.getElementById('callOverlay')?.classList.contains('vc-call-open') === true;
}

function updateBlockedByUi() {
  if (callIsActive()) return true;
  if (document.querySelector('[data-viva-block-update="true"]')) return true;
  return false;
}

async function refreshServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration().catch(() => null);
  if (!registration) return;

  let controllerChanged = false;
  const changed = new Promise((resolve) => {
    const timer = window.setTimeout(resolve, 2500);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      controllerChanged = true;
      window.clearTimeout(timer);
      resolve();
    }, { once: true });
  });

  await registration.update().catch(() => null);
  if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  await changed;
  if (!controllerChanged && registration.installing) {
    await new Promise((resolve) => window.setTimeout(resolve, 250));
  }
}

async function applyPendingRelease() {
  const release = pendingRelease;
  if (!release) return;
  if (!navigator.onLine || updateBlockedByUi()) {
    emitStatus('pending', release.version);
    return;
  }

  const guard = reloadGuardKey(release.version);
  if (sessionStorage.getItem(guard) === '1') {
    audit('release_loop_guard', release.version, 'reload-already-attempted', 'blocked');
    emitStatus('guarded', release.version);
    return;
  }

  sessionStorage.setItem(guard, '1');
  audit('release_apply', release.version, 'mother-release-detected', 'started');
  emitStatus('applying', release.version);
  await refreshServiceWorker();

  const next = new URL(window.location.href);
  next.searchParams.set('vcv', release.version);
  next.searchParams.delete('vc_update');
  window.location.replace(next.toString());
}

async function fetchRelease() {
  const url = new URL(RELEASE_URL, window.location.href);
  url.searchParams.set('_vc_check', Date.now().toString(36));
  const response = await fetch(url.toString(), {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { 'Cache-Control': 'no-cache' },
  });
  if (!response.ok) throw new Error(`RELEASE_HTTP_${response.status}`);
  return normalizeRelease(await response.json());
}

export async function checkMotherRelease(trigger = 'manual') {
  if (checking) return;
  if (!navigator.onLine) {
    emitStatus('offline');
    return;
  }

  checking = true;
  emitStatus('checking');
  try {
    const release = await fetchRelease();
    audit('release_check', release.version, trigger, 'ok');

    if (release.version === APP_VERSION) {
      pendingRelease = null;
      sessionStorage.removeItem(reloadGuardKey(release.version));
      emitStatus('synced', release.version);
      return;
    }

    if (shouldUpdate(APP_VERSION, release)) {
      pendingRelease = release;
      emitStatus('pending', release.version);
      await applyPendingRelease();
      return;
    }

    emitStatus('ahead', release.version);
  } catch (error) {
    audit('release_check', '', trigger, String(error?.message || error), 'error');
    emitStatus('error');
  } finally {
    checking = false;
  }
}

window.addEventListener('online', () => void checkMotherRelease('online'));
window.addEventListener('focus', () => void checkMotherRelease('focus'));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void checkMotherRelease('visible');
});
window.addEventListener('viva:release-check', () => void checkMotherRelease('event'));

window.setInterval(() => void checkMotherRelease('interval'), CHECK_MS);
window.setInterval(() => { if (pendingRelease) void applyPendingRelease(); }, PENDING_RETRY_MS);
window.setTimeout(() => void checkMotherRelease('startup'), 600);
