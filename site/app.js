import {
  buildInviteMessage,
  buildInviteUrl,
  extractInvitePayload,
  generateDx,
  generateInviteCode,
  generateRoomId,
  isOwnerRoute,
  isValidInvite,
  isValidOwnerSecret,
  isValidRoom,
  parseInviteHash,
} from './lib/core.mjs';

const PROFILE_KEY = 'vc_cuba_pilot_profile_v1';
const OWNER_SESSION_KEY = 'vc_owner_session_v1';
const OWNER_INVITES_KEY = 'vc_owner_invites_v1';
const OWNER_AUDIT_KEY = 'vc_owner_audit_v1';
const OWNER_SECRET_HASH = 'a4ffc408125afa303614e60848bfc306e14030b44f328681f49d5945dd7166e7';
const MAX_HISTORY = 40;
const pending = { invite: '', room: '' };
let deferredInstallPrompt = null;
let currentOwnerInvite = null;

const $ = (id) => document.getElementById(id);
const activationView = $('activationView');
const appView = $('appView');
const ownerGate = $('ownerGate');
const ownerView = $('ownerView');
const inviteCode = $('inviteCode');
const displayName = $('displayName');
const inviteDetected = $('inviteDetected');
const errorBox = $('errorBox');
const callError = $('callError');
const ownerGateError = $('ownerGateError');

function setHidden(el, hidden) {
  el.classList.toggle('hidden', hidden);
}

function hideAllViews() {
  setHidden(activationView, true);
  setHidden(appView, true);
  setHidden(ownerGate, true);
  setHidden(ownerView, true);
}

function showError(message) {
  errorBox.textContent = message;
  setHidden(errorBox, !message);
}

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadProfile() {
  const profile = loadJson(PROFILE_KEY, null);
  if (!profile?.name || !profile?.dx || !isValidInvite(profile?.invite || '')) return null;
  return profile;
}

function saveProfile(profile) {
  saveJson(PROFILE_KEY, profile);
}

function renderProfile(profile) {
  $('profileName').textContent = profile.name;
  $('profileDx').textContent = profile.dx;
  $('profileInvite').textContent = profile.invite;
  hideAllViews();
  setHidden(appView, false);
  setHidden(callError, true);
  $('joinCall').disabled = !isValidRoom(profile.room || '');
  $('joinCall').title = isValidRoom(profile.room || '')
    ? ''
    : 'Esta activación no contiene una sala de videollamada. Pide al administrador el enlace completo.';
}

function renderActivation() {
  hideAllViews();
  setHidden(activationView, false);
}

function renderUserRoot() {
  const profile = loadProfile();
  if (profile) renderProfile(profile);
  else renderActivation();
}

function captureInviteHash() {
  const payload = parseInviteHash(location.hash);
  if (!payload.invite) return false;
  pending.invite = payload.invite;
  pending.room = payload.room;
  inviteCode.value = payload.invite;
  setHidden(inviteDetected, false);
  history.replaceState(null, '', `${location.pathname}${location.search}`);
  return true;
}

function parseManualInput(value) {
  const payload = extractInvitePayload(value);
  if (payload.invite) {
    pending.invite = payload.invite;
    inviteCode.value = payload.invite;
  }
  if (payload.room) pending.room = payload.room;
  return payload;
}

function publicBaseUrl() {
  return new URL('./', `${location.origin}${location.pathname}`).toString();
}

function ownerStatus(message) {
  $('ownerStatus').textContent = message;
  setHidden($('ownerStatus'), false);
  setTimeout(() => setHidden($('ownerStatus'), true), 1800);
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    if (successMessage) ownerStatus(successMessage);
  } catch {
    window.prompt('Copia este contenido:', text);
  }
}

function loadOwnerInvites() {
  const items = loadJson(OWNER_INVITES_KEY, []);
  return Array.isArray(items) ? items : [];
}

function saveOwnerInvites(items) {
  saveJson(OWNER_INVITES_KEY, items.slice(0, MAX_HISTORY));
}

function loadOwnerAudit() {
  const items = loadJson(OWNER_AUDIT_KEY, []);
  return Array.isArray(items) ? items : [];
}

function auditOwner(action, result = 'success', detail = '') {
  const items = loadOwnerAudit();
  items.unshift({ action, result, detail, at: new Date().toISOString() });
  saveJson(OWNER_AUDIT_KEY, items.slice(0, MAX_HISTORY));
  renderOwnerAudit();
}

function formatTime(value) {
  try {
    return new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

function renderInviteHistory() {
  const root = $('inviteHistory');
  root.textContent = '';
  const items = loadOwnerInvites();
  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Todavía no has generado invitaciones en este dispositivo.';
    root.append(empty);
    return;
  }

  items.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'history-item';

    const meta = document.createElement('div');
    const code = document.createElement('strong');
    code.textContent = item.code;
    const detail = document.createElement('span');
    detail.textContent = `${formatTime(item.createdAt)} · ${item.status === 'revoked-local' ? 'REVOCADA LOCALMENTE' : 'EMITIDA'}`;
    meta.append(code, detail);

    const actions = document.createElement('div');
    actions.className = 'history-actions';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'secondary compact';
    copy.textContent = 'COPIAR LINK';
    copy.addEventListener('click', () => copyText(item.link, 'Enlace copiado'));
    actions.append(copy);

    if (item.status !== 'revoked-local') {
      const revoke = document.createElement('button');
      revoke.type = 'button';
      revoke.className = 'danger-ghost compact';
      revoke.textContent = 'MARCAR REVOCADA';
      revoke.addEventListener('click', () => revokeLocalInvite(item.code));
      actions.append(revoke);
    }

    card.append(meta, actions);
    root.append(card);
  });
}

function renderOwnerAudit() {
  const root = $('ownerAudit');
  if (!root) return;
  root.textContent = '';
  const items = loadOwnerAudit();
  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Sin actividad OWNER registrada en este dispositivo.';
    root.append(empty);
    return;
  }
  items.slice(0, 15).forEach((item) => {
    const row = document.createElement('div');
    row.className = 'audit-row';
    const action = document.createElement('strong');
    action.textContent = item.action;
    const detail = document.createElement('span');
    detail.textContent = `${formatTime(item.at)} · ${item.result}${item.detail ? ` · ${item.detail}` : ''}`;
    row.append(action, detail);
    root.append(row);
  });
}

function revokeLocalInvite(code) {
  const items = loadOwnerInvites().map((item) => item.code === code ? { ...item, status: 'revoked-local' } : item);
  saveOwnerInvites(items);
  auditOwner('invite.mark-revoked-local', 'success', code);
  renderInviteHistory();
  ownerStatus('Invitación marcada como revocada localmente');
}

function generateOwnerInvite() {
  const code = generateInviteCode();
  const room = generateRoomId();
  const link = buildInviteUrl(publicBaseUrl(), code, room);
  currentOwnerInvite = { code, room, link, createdAt: new Date().toISOString(), status: 'issued' };
  $('generatedCode').textContent = code;
  $('generatedRoom').textContent = room;
  $('generatedLink').textContent = link;

  const items = loadOwnerInvites();
  items.unshift(currentOwnerInvite);
  saveOwnerInvites(items);
  auditOwner('invite.generate', 'success', code);
  renderInviteHistory();
  ownerStatus('Nueva invitación generada');
}

function updateOwnerState() {
  const profile = loadProfile();
  $('ownerNetwork').textContent = navigator.onLine ? 'ONLINE' : 'OFFLINE';
  $('ownerPwa').textContent = (window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true) ? 'INSTALADA / STANDALONE' : 'NAVEGADOR';
  $('ownerUserProfile').textContent = profile ? `${profile.dx} · ${profile.name}` : 'SIN PERFIL USER LOCAL';
  $('moduleIdentities').textContent = profile ? `1 perfil local · ${profile.dx}` : '0 perfiles locales';
  $('moduleDevice').textContent = navigator.userAgentData?.platform || navigator.platform || 'Navegador web';
  $('modulePresence').textContent = navigator.onLine ? 'ONLINE · LOCAL' : 'OFFLINE · LOCAL';
}

function renderOwner() {
  hideAllViews();
  setHidden(ownerView, false);
  updateOwnerState();
  renderInviteHistory();
  renderOwnerAudit();
}

function showOwnerGate() {
  hideAllViews();
  setHidden(ownerGate, false);
  ownerGateError.textContent = '';
  setHidden(ownerGateError, true);
  $('ownerSecret').value = '';
  $('ownerSecret').focus();
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function unlockOwner() {
  const secret = $('ownerSecret').value.trim().toUpperCase();
  if (!isValidOwnerSecret(secret)) {
    ownerGateError.textContent = 'Formato de clave OWNER no válido.';
    setHidden(ownerGateError, false);
    return;
  }
  const digest = await sha256Hex(secret);
  if (digest !== OWNER_SECRET_HASH) {
    ownerGateError.textContent = 'Clave OWNER incorrecta.';
    setHidden(ownerGateError, false);
    return;
  }
  sessionStorage.setItem(OWNER_SESSION_KEY, 'unlocked');
  auditOwner('owner.unlock');
  renderOwner();
}

$('pasteInvite').addEventListener('click', async () => {
  showError('');
  try {
    const text = await navigator.clipboard.readText();
    const payload = parseManualInput(text);
    if (!payload.invite) showError('No encontré un código VCM válido. Mantén pulsada la casilla y pega el código manualmente.');
  } catch {
    showError('El navegador no permitió leer el portapapeles. Mantén pulsada la casilla de código y selecciona Pegar.');
    inviteCode.focus();
  }
});

inviteCode.addEventListener('input', () => {
  const payload = parseManualInput(inviteCode.value);
  if (!payload.invite) pending.invite = inviteCode.value.trim().toUpperCase();
});

$('activateButton').addEventListener('click', () => {
  showError('');
  const payload = parseManualInput(inviteCode.value);
  const code = payload.invite || pending.invite || inviteCode.value.trim().toUpperCase();
  const name = displayName.value.trim();

  if (!isValidInvite(code)) {
    showError('El código de invitación no tiene un formato válido. Revisa el enlace o vuelve a pegar el código.');
    return;
  }
  if (name.length < 2) {
    showError('Escribe tu nombre para continuar.');
    displayName.focus();
    return;
  }

  const profile = {
    name,
    dx: generateDx(),
    invite: code,
    room: payload.room || pending.room || '',
    activatedAt: new Date().toISOString(),
    version: '0.2.0',
  };
  saveProfile(profile);
  renderProfile(profile);
});

$('copyDx').addEventListener('click', async () => {
  const profile = loadProfile();
  if (!profile) return;
  try {
    await navigator.clipboard.writeText(profile.dx);
    $('copyDx').textContent = 'COPIADO';
    setTimeout(() => { $('copyDx').textContent = 'COPIAR DX'; }, 1200);
  } catch {
    window.prompt('Copia tu DX:', profile.dx);
  }
});

$('joinCall').addEventListener('click', () => {
  setHidden(callError, true);
  const profile = loadProfile();
  if (!profile || !isValidRoom(profile.room || '')) {
    callError.textContent = 'Este registro no tiene una sala válida. Abre el enlace completo enviado por el administrador.';
    setHidden(callError, false);
    return;
  }
  if (!navigator.onLine) {
    callError.textContent = 'No hay conexión a internet. Tu registro sigue guardado; vuelve a intentar cuando regrese la red.';
    setHidden(callError, false);
    return;
  }
  window.open(`https://meet.jit.si/${encodeURIComponent(profile.room)}`, '_blank', 'noopener,noreferrer');
});

$('resetPilot').addEventListener('click', () => {
  if (!confirm('¿Borrar el registro piloto guardado en este dispositivo?')) return;
  localStorage.removeItem(PROFILE_KEY);
  location.reload();
});

$('unlockOwner').addEventListener('click', unlockOwner);
$('ownerSecret').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') unlockOwner();
});
$('cancelOwner').addEventListener('click', renderUserRoot);
$('exitOwner').addEventListener('click', () => {
  auditOwner('owner.lock');
  sessionStorage.removeItem(OWNER_SESSION_KEY);
  currentOwnerInvite = null;
  renderUserRoot();
});

$('generateInvite').addEventListener('click', generateOwnerInvite);
$('copyCode').addEventListener('click', () => currentOwnerInvite && copyText(currentOwnerInvite.code, 'Código copiado'));
$('copyLink').addEventListener('click', () => currentOwnerInvite && copyText(currentOwnerInvite.link, 'Enlace copiado'));
$('copyMessage').addEventListener('click', () => {
  if (!currentOwnerInvite) return;
  copyText(buildInviteMessage(currentOwnerInvite.code, currentOwnerInvite.link), 'Mensaje completo copiado');
});
$('shareInvite').addEventListener('click', async () => {
  if (!currentOwnerInvite) return;
  const text = buildInviteMessage(currentOwnerInvite.code, currentOwnerInvite.link);
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Invitación VIVA CUBA', text, url: currentOwnerInvite.link });
      auditOwner('invite.share', 'success', currentOwnerInvite.code);
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }
  await copyText(text, 'Mensaje copiado para compartir');
  auditOwner('invite.share-fallback', 'success', currentOwnerInvite.code);
});
$('openHostRoom').addEventListener('click', () => {
  if (!currentOwnerInvite) return;
  auditOwner('call.open-host', 'success', currentOwnerInvite.room);
  window.open(`https://meet.jit.si/${encodeURIComponent(currentOwnerInvite.room)}`, '_blank', 'noopener,noreferrer');
});

function updateNetwork() {
  const online = navigator.onLine;
  $('networkText').textContent = online ? 'Conexión disponible' : 'Sin conexión · shell disponible';
  $('networkDot').classList.toggle('offline', !online);
  if (!ownerView.classList.contains('hidden')) updateOwnerState();
}

window.addEventListener('online', updateNetwork);
window.addEventListener('offline', updateNetwork);

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  setHidden($('installApp'), false);
});

$('installApp').addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  setHidden($('installApp'), true);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

const ownerRequested = isOwnerRoute(location.hash);
if (ownerRequested) {
  history.replaceState(null, '', `${location.pathname}${location.search}`);
} else {
  captureInviteHash();
}
updateNetwork();

if (ownerRequested) {
  if (sessionStorage.getItem(OWNER_SESSION_KEY) === 'unlocked') renderOwner();
  else showOwnerGate();
} else {
  renderUserRoot();
}
