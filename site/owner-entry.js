import './owner-user.js';

const OWNER_PERSIST_KEY = 'vc_owner_persistent_v1';
const OWNER_SESSION_KEY = 'vc_owner_session_v1';
const ownerButton = document.getElementById('openOwnerPortal');
const generateInvite = document.getElementById('generateInvite');
const ownerView = document.getElementById('ownerView');
const exitOwner = document.getElementById('exitOwner');
const ownerActionIds = ['copyCode', 'copyLink', 'shareInvite', 'copyMessage', 'openHostRoom'];

function setOwnerActionsEnabled(enabled) {
  ownerActionIds.forEach((id) => {
    const button = document.getElementById(id);
    if (button) button.disabled = !enabled;
  });
}

function openOwnerRoute() {
  const target = `${location.pathname}${location.search}#owner`;
  history.replaceState(null, '', target);
  location.reload();
}

function ownerIsPersisted() {
  return localStorage.getItem(OWNER_PERSIST_KEY) === 'unlocked';
}

function persistOwnerIfUnlocked() {
  if (sessionStorage.getItem(OWNER_SESSION_KEY) !== 'unlocked') return;
  localStorage.setItem(OWNER_PERSIST_KEY, 'unlocked');
}

function restorePersistentOwner() {
  if (!ownerIsPersisted()) return;
  if (location.hash.toLowerCase().startsWith('#invite=')) return;

  if (sessionStorage.getItem(OWNER_SESSION_KEY) !== 'unlocked') {
    sessionStorage.setItem(OWNER_SESSION_KEY, 'unlocked');
  }

  if (location.hash.toLowerCase() !== '#owner') {
    const target = `${location.pathname}${location.search}#owner`;
    history.replaceState(null, '', target);
    location.reload();
    return;
  }

  if (ownerView?.classList.contains('hidden')) {
    location.reload();
  }
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
  }, { capture: true });
}

setOwnerActionsEnabled(false);
restorePersistentOwner();
