import {
  extractInvitePayload,
  generateDx,
  isValidInvite,
  isValidRoom,
  parseInviteHash,
} from './lib/core.mjs';

const PROFILE_KEY = 'vc_cuba_pilot_profile_v1';
const pending = { invite: '', room: '' };
let deferredInstallPrompt = null;

const $ = (id) => document.getElementById(id);
const activationView = $('activationView');
const appView = $('appView');
const inviteCode = $('inviteCode');
const displayName = $('displayName');
const inviteDetected = $('inviteDetected');
const errorBox = $('errorBox');
const callError = $('callError');

function setHidden(el, hidden) {
  el.classList.toggle('hidden', hidden);
}

function showError(message) {
  errorBox.textContent = message;
  setHidden(errorBox, !message);
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const profile = JSON.parse(raw);
    if (!profile?.name || !profile?.dx || !isValidInvite(profile?.invite || '')) return null;
    return profile;
  } catch {
    return null;
  }
}

function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function renderProfile(profile) {
  $('profileName').textContent = profile.name;
  $('profileDx').textContent = profile.dx;
  $('profileInvite').textContent = profile.invite;
  activationView.classList.add('hidden');
  appView.classList.remove('hidden');
  callError.classList.add('hidden');
  $('joinCall').disabled = !isValidRoom(profile.room || '');
  if (!isValidRoom(profile.room || '')) {
    $('joinCall').title = 'Esta activación no contiene una sala de videollamada. Pide al administrador el enlace completo.';
  }
}

function renderActivation() {
  activationView.classList.remove('hidden');
  appView.classList.add('hidden');
}

function captureHash() {
  const payload = parseInviteHash(location.hash);
  if (!payload.invite) return;
  pending.invite = payload.invite;
  pending.room = payload.room;
  inviteCode.value = payload.invite;
  inviteDetected.classList.remove('hidden');
  history.replaceState(null, '', `${location.pathname}${location.search}`);
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
    version: '0.1.0',
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
  callError.classList.add('hidden');
  const profile = loadProfile();
  if (!profile || !isValidRoom(profile.room || '')) {
    callError.textContent = 'Este registro no tiene una sala válida. Abre el enlace completo enviado por el administrador.';
    callError.classList.remove('hidden');
    return;
  }
  if (!navigator.onLine) {
    callError.textContent = 'No hay conexión a internet. Tu registro sigue guardado; vuelve a intentar cuando regrese la red.';
    callError.classList.remove('hidden');
    return;
  }
  window.open(`https://meet.jit.si/${encodeURIComponent(profile.room)}`, '_blank', 'noopener,noreferrer');
});

$('resetPilot').addEventListener('click', () => {
  if (!confirm('¿Borrar el registro piloto guardado en este dispositivo?')) return;
  localStorage.removeItem(PROFILE_KEY);
  location.reload();
});

function updateNetwork() {
  const online = navigator.onLine;
  $('networkText').textContent = online ? 'Conexión disponible' : 'Sin conexión · shell disponible';
  $('networkDot').classList.toggle('offline', !online);
}

window.addEventListener('online', updateNetwork);
window.addEventListener('offline', updateNetwork);

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  $('installApp').classList.remove('hidden');
});

$('installApp').addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  $('installApp').classList.add('hidden');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

captureHash();
updateNetwork();
const existing = loadProfile();
if (existing) renderProfile(existing);
else renderActivation();
