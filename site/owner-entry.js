import './owner-user.js';
import './call.js';
import './version.js';

const OWNER_PERSIST_KEY = 'vc_owner_persistent_v1';
const OWNER_SESSION_KEY = 'vc_owner_session_v1';
const OWNER_MODE_PARAM = 'mode';
const ownerButton = document.getElementById('openOwnerPortal');
const generateInvite = document.getElementById('generateInvite');
const activationView = document.getElementById('activationView');
const appView = document.getElementById('appView');
const ownerGate = document.getElementById('ownerGate');
const ownerView = document.getElementById('ownerView');
const exitOwner = document.getElementById('exitOwner');
const ownerActionIds = ['copyCode', 'copyLink', 'shareInvite', 'copyMessage', 'openHostRoom'];

function setOwnerActionsEnabled(enabled) {
  ownerActionIds.forEach((id) => {
    const button = document.getElementById(id);
    if (button) button.disabled = !enabled;
  });
}

function hide(el) { el?.classList.add('hidden'); }
function show(el) { el?.classList.remove('hidden'); }

function isExplicitOwnerRoute() {
  const params = new URLSearchParams(location.search);
  return params.get(OWNER_MODE_PARAM) === 'owner' || location.hash.toLowerCase() === '#owner';
}

function setOwnerUrl() {
  const url = new URL(location.href);
  url.searchParams.set(OWNER_MODE_PARAM, 'owner');
  url.hash = 'owner';
  history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

function setPublicUrl() {
  const url = new URL(location.href);
  url.searchParams.delete(OWNER_MODE_PARAM);
  url.hash = '';
  history.replaceState(null, '', `${url.pathname}${url.search}`);
}

function showOwnerViewDirect() {
  hide(activationView);
  hide(appView);
  hide(ownerGate);
  show(ownerView);
  setOwnerUrl();
}

function showOwnerGateDirect() {
  hide(activationView);
  hide(appView);
  hide(ownerView);
  show(ownerGate);
  setOwnerUrl();
  const secret = document.getElementById('ownerSecret');
  if (secret) {
    secret.value = '';
    queueMicrotask(() => secret.focus());
  }
}

function ownerIsPersisted() {
  return localStorage.getItem(OWNER_PERSIST_KEY) === 'unlocked';
}

function persistOwnerIfUnlocked() {
  if (sessionStorage.getItem(OWNER_SESSION_KEY) !== 'unlocked') return;
  localStorage.setItem(OWNER_PERSIST_KEY, 'unlocked');
}

function invitationFlowIsActive() {
  const detected = document.getElementById('inviteDetected');
  return Boolean(detected && !detected.classList.contains('hidden'));
}

function restoreExplicitOwnerRoute() {
  const hash = location.hash.toLowerCase();
  if (hash.startsWith('#invite=') || hash.startsWith('#call=') || invitationFlowIsActive()) return;
  if (!isExplicitOwnerRoute()) return;

  if (ownerIsPersisted()) {
    sessionStorage.setItem(OWNER_SESSION_KEY, 'unlocked');
    showOwnerViewDirect();
    return;
  }

  showOwnerGateDirect();
}

function openOwnerRoute() {
  if (ownerIsPersisted()) {
    sessionStorage.setItem(OWNER_SESSION_KEY, 'unlocked');
    showOwnerViewDirect();
    return;
  }
  showOwnerGateDirect();
}

function loadOptionalStickerModules() {
  return Promise.allSettled([
    import('./stickers-entry.js'),
    import('./owner-stickers.js'),
  ]).then((results) => {
    const failed = results.filter((result) => result.status === 'rejected');
    if (failed.length) console.warn('VIVA CUBA: stickers opcionales no disponibles; acceso principal continúa operativo.');
    return results;
  });
}

ownerButton?.addEventListener('click', openOwnerRoute);

generateInvite?.addEventListener('click', () => {
  queueMicrotask(() => {
    const generatedCode = document.getElementById('generatedCode')?.textContent?.trim();
    setOwnerActionsEnabled(Boolean(generatedCode && generatedCode !== '—'));
  });
});

if (ownerView) {
  const observer = new MutationObserver(() => {
    if (!ownerView.classList.contains('hidden')) persistOwnerIfUnlocked();
  });
  observer.observe(ownerView, { attributes: true, attributeFilter: ['class'] });
  if (!ownerView.classList.contains('hidden')) persistOwnerIfUnlocked();
}

if (exitOwner) {
  exitOwner.textContent = 'CERRAR SESIÓN OWNER';
  exitOwner.addEventListener('click', (event) => {
    const confirmed = window.confirm('¿Cerrar la sesión OWNER persistente en este dispositivo?');
    if (!confirmed) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    localStorage.removeItem(OWNER_PERSIST_KEY);
    sessionStorage.removeItem(OWNER_SESSION_KEY);
    setPublicUrl();
  }, { capture: true });
}

setOwnerActionsEnabled(false);
restoreExplicitOwnerRoute();

if ('requestIdleCallback' in window) {
  window.requestIdleCallback(() => loadOptionalStickerModules(), { timeout: 2200 });
} else {
  window.setTimeout(() => loadOptionalStickerModules(), 700);
}
