import { buildInviteMessage, buildInviteUrl, generateRoomId } from './lib/core.mjs';
import { claimGlobalOwner, issueGlobalInvitation, logoutGlobal, whoAmI } from './lib/desaplicaxi-api.mjs';

const OWNER_TOKEN_KEY = 'vc_dx_owner_session_v1';
const OWNER_PERSIST_KEY = 'vc_owner_persistent_v1';
const OWNER_SESSION_KEY = 'vc_owner_session_v1';
const OWNER_INVITES_KEY = 'vc_owner_invites_v1';
let currentGlobalInvite = null;
let ownerActionBusy = false;

const $ = (id) => document.getElementById(id);

function ownerError(message) {
  const box = $('ownerGateError');
  if (!box) return;
  box.textContent = message;
  box.classList.toggle('hidden', !message);
}

function setOwnerCompatUnlocked() {
  localStorage.setItem(OWNER_PERSIST_KEY, 'unlocked');
  sessionStorage.setItem(OWNER_SESSION_KEY, 'unlocked');
}

function clearOwnerCompat() {
  localStorage.removeItem(OWNER_PERSIST_KEY);
  sessionStorage.removeItem(OWNER_SESSION_KEY);
}

function ownerRoute() {
  const url = new URL(location.href);
  url.searchParams.set('mode', 'owner');
  url.hash = 'owner';
  return `${url.pathname}${url.search}${url.hash}`;
}

function publicBaseUrl() {
  return new URL('./', `${location.origin}${location.pathname}`).toString();
}

function configureGateCopy() {
  const input = $('ownerSecret');
  if (!input) return;
  const label = document.querySelector('label[for="ownerSecret"]');
  if (label) label.textContent = 'Código de vinculación OWNER global';
  input.placeholder = 'SETUP-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
  input.autocomplete = 'one-time-code';
  const title = $('ownerGateTitle');
  if (title) title.textContent = 'Vincular Identity Command Center';
  const button = $('unlockOwner');
  if (button) button.textContent = 'VINCULAR / ENTRAR COMO OWNER';
}

function ensureOwnerConfirmation() {
  let sheet = $('dxOwnerConfirmation');
  if (sheet) return sheet;
  sheet = document.createElement('section');
  sheet.id = 'dxOwnerConfirmation';
  sheet.className = 'dx-owner-confirm hidden';
  sheet.innerHTML = `
    <div class="dx-owner-card">
      <p class="eyebrow">OWNER GLOBAL · DESAPLICAXI</p>
      <h2>Command Center vinculado</h2>
      <p>Guarda la VCR. Este código no volverá a mostrarse.</p>
      <div><span>DX OWNER</span><strong id="dxOwnerConfirmId"></strong></div>
      <div><span>VCR OWNER</span><code id="dxOwnerConfirmVcr"></code></div>
      <button id="dxOwnerCopyVcr" class="secondary big" type="button">COPIAR VCR</button>
      <button id="dxOwnerEnter" class="primary big" type="button">ENTRAR AL COMMAND CENTER</button>
    </div>`;
  const style = document.createElement('style');
  style.textContent = `
    .dx-owner-confirm{position:fixed;inset:0;z-index:2147483550;background:rgba(1,5,12,.9);display:grid;place-items:center;padding:18px;backdrop-filter:blur(12px)}
    .dx-owner-confirm.hidden{display:none}.dx-owner-card{width:min(560px,100%);background:#07131d;border:1px solid rgba(39,210,255,.45);border-radius:22px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.55)}
    .dx-owner-card>div{display:grid;gap:6px;margin:14px 0;padding:14px;border-radius:14px;background:rgba(255,255,255,.045)}.dx-owner-card code{overflow-wrap:anywhere}.dx-owner-card button{width:100%;margin-top:10px}`;
  document.head.append(style);
  document.body.append(sheet);
  return sheet;
}

function showOwnerClaim(result) {
  const sheet = ensureOwnerConfirmation();
  $('dxOwnerConfirmId').textContent = result.dx;
  $('dxOwnerConfirmVcr').textContent = result.recoveryKey;
  sheet.classList.remove('hidden');
  $('dxOwnerCopyVcr').onclick = async () => {
    try {
      await navigator.clipboard.writeText(result.recoveryKey);
      $('dxOwnerCopyVcr').textContent = 'VCR COPIADA';
    } catch {
      window.prompt('Copia y guarda tu VCR OWNER:', result.recoveryKey);
    }
  };
  $('dxOwnerEnter').onclick = () => {
    $('dxOwnerConfirmVcr').textContent = '••••••••••••••';
    sheet.classList.add('hidden');
    setOwnerCompatUnlocked();
    location.href = ownerRoute();
  };
}

async function validateOwnerToken(token) {
  if (!token) return false;
  try {
    const identity = await whoAmI(token);
    return Boolean(identity?.roles?.includes?.('owner'));
  } catch {
    return false;
  }
}

async function handleOwnerUnlock(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
  if (ownerActionBusy) return;
  ownerActionBusy = true;
  ownerError('');
  const button = $('unlockOwner');
  if (button) { button.disabled = true; button.textContent = 'VALIDANDO DESAPLICAXI…'; }
  try {
    const existing = localStorage.getItem(OWNER_TOKEN_KEY);
    if (existing && await validateOwnerToken(existing)) {
      setOwnerCompatUnlocked();
      location.href = ownerRoute();
      return;
    }
    localStorage.removeItem(OWNER_TOKEN_KEY);
    clearOwnerCompat();
    const setup = $('ownerSecret')?.value.trim().toUpperCase() || '';
    if (!/^SETUP-[A-Z0-9]{20,64}$/.test(setup)) {
      ownerError('Pega el código SETUP de vinculación OWNER global.');
      return;
    }
    const result = await claimGlobalOwner(setup);
    localStorage.setItem(OWNER_TOKEN_KEY, result.sessionToken);
    if ($('ownerSecret')) $('ownerSecret').value = '';
    showOwnerClaim(result);
  } catch (error) {
    ownerError(error?.message === 'DESAPLICAXI_TIMEOUT'
      ? 'DESAPLICAXI tardó demasiado en responder. Reintenta cuando mejore la conexión.'
      : 'El código SETUP es inválido, ya fue usado o venció.');
  } finally {
    ownerActionBusy = false;
    if (button) { button.disabled = false; button.textContent = 'VINCULAR / ENTRAR COMO OWNER'; }
  }
}

function saveInviteLocal(invite) {
  let items = [];
  try { items = JSON.parse(localStorage.getItem(OWNER_INVITES_KEY) || '[]'); } catch {}
  if (!Array.isArray(items)) items = [];
  items.unshift(invite);
  localStorage.setItem(OWNER_INVITES_KEY, JSON.stringify(items.slice(0, 40)));
}

function setInviteButtons(enabled) {
  ['copyCode', 'copyLink', 'shareInvite', 'copyMessage', 'openHostRoom'].forEach((id) => {
    const el = $(id);
    if (el) el.disabled = !enabled;
  });
}

async function handleGlobalInvite(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
  if (ownerActionBusy) return;
  const token = localStorage.getItem(OWNER_TOKEN_KEY);
  if (!token || !(await validateOwnerToken(token))) {
    clearOwnerCompat();
    ownerError('La sesión OWNER global no es válida. Vuelve a vincular el Command Center.');
    location.href = ownerRoute();
    return;
  }
  ownerActionBusy = true;
  const button = $('generateInvite');
  if (button) { button.disabled = true; button.textContent = 'GENERANDO INVITACIÓN GLOBAL…'; }
  setInviteButtons(false);
  try {
    const issued = await issueGlobalInvitation(token, 'VIVA CUBA OWNER');
    const room = generateRoomId();
    const link = buildInviteUrl(publicBaseUrl(), issued.code, room);
    currentGlobalInvite = {
      code: issued.code,
      room,
      link,
      createdAt: new Date().toISOString(),
      expiresAt: issued.expiresAt,
      status: 'issued-global',
    };
    $('generatedCode').textContent = currentGlobalInvite.code;
    $('generatedRoom').textContent = room;
    $('generatedLink').textContent = link;
    saveInviteLocal(currentGlobalInvite);
    setInviteButtons(true);
    const status = $('ownerStatus');
    if (status) {
      status.textContent = 'Invitación global emitida por DESAPLICAXI';
      status.classList.remove('hidden');
    }
  } catch {
    const status = $('ownerStatus');
    if (status) {
      status.textContent = 'No se pudo emitir la invitación global. No se generó ningún VCM local falso.';
      status.classList.remove('hidden');
    }
  } finally {
    ownerActionBusy = false;
    if (button) { button.disabled = false; button.textContent = 'GENERAR NUEVA INVITACIÓN'; }
  }
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); }
  catch { window.prompt('Copia este contenido:', text); }
}

function interceptInviteAction(id, fn) {
  $(id)?.addEventListener('click', (event) => {
    if (!currentGlobalInvite) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    fn(currentGlobalInvite);
  }, { capture: true });
}

$('unlockOwner')?.addEventListener('click', handleOwnerUnlock, { capture: true });
$('ownerSecret')?.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  handleOwnerUnlock(event);
}, { capture: true });
$('generateInvite')?.addEventListener('click', handleGlobalInvite, { capture: true });

interceptInviteAction('copyCode', (invite) => copy(invite.code));
interceptInviteAction('copyLink', (invite) => copy(invite.link));
interceptInviteAction('copyMessage', (invite) => copy(buildInviteMessage(invite.code, invite.link)));
interceptInviteAction('shareInvite', async (invite) => {
  const text = buildInviteMessage(invite.code, invite.link);
  if (navigator.share) {
    try { await navigator.share({ title: 'Invitación VIVA CUBA', text, url: invite.link }); return; }
    catch (error) { if (error?.name === 'AbortError') return; }
  }
  await copy(text);
});
interceptInviteAction('openHostRoom', (invite) => {
  window.open(`https://meet.jit.si/${encodeURIComponent(invite.room)}`, '_blank', 'noopener,noreferrer');
});

$('exitOwner')?.addEventListener('click', () => {
  const token = localStorage.getItem(OWNER_TOKEN_KEY);
  setTimeout(() => {
    if (localStorage.getItem(OWNER_PERSIST_KEY) === 'unlocked') return;
    localStorage.removeItem(OWNER_TOKEN_KEY);
    if (token) logoutGlobal(token).catch(() => {});
  }, 0);
}, { capture: true });

configureGateCopy();
const existingToken = localStorage.getItem(OWNER_TOKEN_KEY);
if (!existingToken) {
  clearOwnerCompat();
} else {
  validateOwnerToken(existingToken).then((ok) => {
    if (!ok) {
      localStorage.removeItem(OWNER_TOKEN_KEY);
      clearOwnerCompat();
      if (new URLSearchParams(location.search).get('mode') === 'owner' || location.hash.toLowerCase() === '#owner') {
        location.reload();
      }
    }
  });
}
