import { activateGlobalInvitation, recoverGlobalIdentity, whoAmI } from './lib/desaplicaxi-api.mjs';

const PROFILE_KEY = 'vc_cuba_pilot_profile_v1';
const SESSION_KEY = 'vc_dx_session_v1';
const RECOVERY_UI_ID = 'dxRecoveryPanel';
let activationBusy = false;

const $ = (id) => document.getElementById(id);

function loadProfileRaw() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null'); } catch { return null; }
}

function saveGlobalProfile({ dx, displayName, invite = '', room = '' }) {
  const profile = {
    name: displayName,
    dx,
    invite,
    room,
    activatedAt: new Date().toISOString(),
    version: '0.9.0-global',
    backend: 'desaplicaxi-global',
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

function showView(id) {
  ['activationView', 'appView', 'ownerGate', 'ownerView'].forEach((viewId) => {
    const el = $(viewId);
    if (el) el.classList.toggle('hidden', viewId !== id);
  });
}

function renderGlobalHome(profile) {
  if (!profile?.dx) return;
  if ($('profileName')) $('profileName').textContent = profile.name || 'VIVA CUBA';
  if ($('profileDx')) $('profileDx').textContent = profile.dx;
  if ($('profileInvite')) $('profileInvite').textContent = profile.invite || 'RECUPERADA · DESAPLICAXI';
  showView('appView');
  const join = $('joinCall');
  if (join && !profile.room) {
    join.disabled = true;
    join.title = 'Esta identidad recuperada no tiene una sala activa. Recibe o crea una nueva invitación de llamada.';
  }
}

function setActivationError(message) {
  const box = $('errorBox');
  if (!box) return;
  box.textContent = message;
  box.classList.toggle('hidden', !message);
}

function ensureConfirmationSheet() {
  let sheet = $('dxActivationConfirmation');
  if (sheet) return sheet;
  sheet = document.createElement('section');
  sheet.id = 'dxActivationConfirmation';
  sheet.className = 'dx-confirmation hidden';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.innerHTML = `
    <div class="dx-confirm-card">
      <p class="eyebrow">ACCESO ACTIVADO · DESAPLICAXI</p>
      <h2>Ya estás dentro de VIVA CUBA</h2>
      <p>Tu identidad global quedó vinculada a este dispositivo.</p>
      <div class="dx-confirm-field"><span>DX</span><strong id="dxConfirmId"></strong></div>
      <div class="dx-confirm-field"><span>Clave de recuperación VCR · guárdala ahora</span><code id="dxConfirmRecovery"></code></div>
      <p class="microcopy">La VCR se muestra una sola vez. DESAPLICAXI guarda únicamente su hash.</p>
      <button id="dxCopyRecovery" class="secondary big" type="button">Copiar clave</button>
      <button id="dxEnterApp" class="primary big" type="button">Entrar a VIVA CUBA</button>
    </div>`;
  const style = document.createElement('style');
  style.textContent = `
    .dx-confirmation{position:fixed;inset:0;z-index:2147483500;background:rgba(1,5,12,.88);display:grid;place-items:center;padding:18px;backdrop-filter:blur(12px)}
    .dx-confirmation.hidden{display:none}.dx-confirm-card{width:min(560px,100%);background:#07131d;border:1px solid rgba(39,210,255,.45);border-radius:22px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.55)}
    .dx-confirm-card h2{margin:.25rem 0 1rem}.dx-confirm-field{display:grid;gap:6px;margin:14px 0;padding:14px;border-radius:14px;background:rgba(255,255,255,.045)}
    .dx-confirm-field code{overflow-wrap:anywhere;font-size:.95rem}.dx-confirm-card button{width:100%;margin-top:10px}`;
  document.head.append(style);
  document.body.append(sheet);
  return sheet;
}

function showActivationConfirmation(result, profile) {
  const sheet = ensureConfirmationSheet();
  $('dxConfirmId').textContent = result.dx;
  $('dxConfirmRecovery').textContent = result.recoveryKey;
  sheet.classList.remove('hidden');

  $('dxCopyRecovery').onclick = async () => {
    try {
      await navigator.clipboard.writeText(result.recoveryKey);
      $('dxCopyRecovery').textContent = 'Clave copiada';
    } catch {
      window.prompt('Copia y guarda tu clave VCR:', result.recoveryKey);
    }
  };
  $('dxEnterApp').onclick = () => {
    $('dxConfirmRecovery').textContent = '••••••••••••••';
    sheet.classList.add('hidden');
    renderGlobalHome(profile);
  };
}

function ensureRecoveryUi() {
  if ($(RECOVERY_UI_ID) || !$('activationView')) return;
  const open = document.createElement('button');
  open.id = 'openDxRecovery';
  open.type = 'button';
  open.className = 'secondary big';
  open.textContent = 'RECUPERAR IDENTIDAD';

  const panel = document.createElement('div');
  panel.id = RECOVERY_UI_ID;
  panel.className = 'hidden';
  panel.innerHTML = `
    <hr />
    <p class="eyebrow">DESAPLICAXI · RECUPERACIÓN SEGURA</p>
    <label for="recoverDx">Tu DX</label>
    <input id="recoverDx" autocomplete="username" placeholder="DX-XXXXXXXX" spellcheck="false" />
    <label for="recoverVcr">Clave VCR</label>
    <input id="recoverVcr" autocomplete="off" placeholder="VCR-XXXXX-XXXXX-XXXXX" spellcheck="false" />
    <button id="recoverDxSubmit" type="button" class="primary big">RECUPERAR Y ENTRAR</button>
    <div id="recoverDxError" class="notice error hidden" role="alert"></div>`;

  $('activateButton').insertAdjacentElement('afterend', open);
  open.insertAdjacentElement('afterend', panel);
  open.addEventListener('click', () => panel.classList.toggle('hidden'));

  $('recoverDxSubmit').addEventListener('click', async () => {
    const dx = $('recoverDx').value.trim().toUpperCase();
    const vcr = $('recoverVcr').value.trim().toUpperCase();
    const error = $('recoverDxError');
    error.classList.add('hidden');
    $('recoverDxSubmit').disabled = true;
    $('recoverDxSubmit').textContent = 'RECUPERANDO…';
    try {
      const result = await recoverGlobalIdentity(dx, vcr);
      localStorage.setItem(SESSION_KEY, result.sessionToken);
      const profile = saveGlobalProfile({ dx: result.dx, displayName: result.displayName });
      $('recoverVcr').value = '';
      showActivationConfirmation(result, profile);
    } catch (err) {
      error.textContent = err?.message === 'DESAPLICAXI_TIMEOUT'
        ? 'El núcleo tardó demasiado en responder. Tu identidad no se modificó; inténtalo cuando mejore la conexión.'
        : 'No se pudo recuperar la identidad. Revisa el DX y la VCR.';
      error.classList.remove('hidden');
    } finally {
      $('recoverDxSubmit').disabled = false;
      $('recoverDxSubmit').textContent = 'RECUPERAR Y ENTRAR';
    }
  });
}

async function globalizeActivation() {
  if (activationBusy) return;
  const provisional = loadProfileRaw();
  const code = $('inviteCode')?.value.trim().toUpperCase() || provisional?.invite || '';
  const name = $('displayName')?.value.trim() || provisional?.name || '';
  if (!/^VCM-[A-HJ-NP-Z2-9]{4}(?:-[A-HJ-NP-Z2-9]{4}){3}$/i.test(code) || name.length < 2) return;

  activationBusy = true;
  const button = $('activateButton');
  if (button) { button.disabled = true; button.textContent = 'ACTIVANDO IDENTIDAD GLOBAL…'; }
  setActivationError('');
  try {
    const result = await activateGlobalInvitation(code, name);
    localStorage.setItem(SESSION_KEY, result.sessionToken);
    const profile = saveGlobalProfile({
      dx: result.dx,
      displayName: result.displayName || name,
      invite: code,
      room: provisional?.room || '',
    });
    renderGlobalHome(profile);
    showActivationConfirmation(result, profile);
  } catch (err) {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(SESSION_KEY);
    showView('activationView');
    setActivationError(err?.message === 'DESAPLICAXI_TIMEOUT'
      ? 'No se pudo contactar con DESAPLICAXI. No se creó ninguna identidad local falsa. Reintenta cuando vuelva la conexión.'
      : 'Invitación inválida, usada, vencida o no autorizada por DESAPLICAXI.');
  } finally {
    activationBusy = false;
    if (button) { button.disabled = false; button.textContent = 'ACTIVAR Y ENTRAR A VIVA CUBA'; }
  }
}

function restoreGlobalProfile() {
  const profile = loadProfileRaw();
  if (profile?.backend !== 'desaplicaxi-global' || !profile.dx) return;
  renderGlobalHome(profile);
  const token = localStorage.getItem(SESSION_KEY);
  if (!token || !navigator.onLine) return;
  whoAmI(token).then((identity) => {
    if (!identity?.dx || identity.dx !== profile.dx) {
      localStorage.removeItem(SESSION_KEY);
      setActivationError('La sesión global expiró. Recupera tu identidad con DX + VCR.');
    }
  }).catch(() => {});
}

$('activateButton')?.addEventListener('click', () => queueMicrotask(globalizeActivation));
$('copyDx')?.addEventListener('click', async (event) => {
  const profile = loadProfileRaw();
  if (profile?.backend !== 'desaplicaxi-global') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  try { await navigator.clipboard.writeText(profile.dx); } catch { window.prompt('Copia tu DX:', profile.dx); }
}, { capture: true });

ensureRecoveryUi();
restoreGlobalProfile();
