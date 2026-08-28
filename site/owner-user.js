import { generateDx, generateRoomId } from './lib/core.mjs';

const PERSONAL_KEY = 'vc_owner_personal_v1';
const CONTACTS_KEY = 'vc_owner_contacts_v1';
let activeContactDx = '';

const $ = (id) => document.getElementById(id);

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

function ensureOwnerPersonal() {
  const current = loadJson(PERSONAL_KEY, null);
  if (current?.dx && current?.room) return current;
  const created = {
    name: 'OWNER',
    dx: generateDx(),
    room: generateRoomId(),
    createdAt: new Date().toISOString(),
  };
  saveJson(PERSONAL_KEY, created);
  return created;
}

function setActivity(text) {
  const root = $('ownerActivity');
  if (!root) return;
  root.textContent = `${new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })} · ${text}`;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    window.prompt('Copia este contenido:', text);
    return false;
  }
}

async function shareText({ title, text, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, ...(url ? { url } : {}) });
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
    }
  }
  await copyText(url ? `${text}\n${url}` : text);
  return 'copied';
}

function ownerStatus(text, tone = 'ok') {
  const box = $('ownerUserStatus');
  if (!box) return;
  box.textContent = text;
  box.dataset.tone = tone;
  box.classList.remove('hidden');
}

function loadContacts() {
  const value = loadJson(CONTACTS_KEY, []);
  return Array.isArray(value) ? value : [];
}

function saveContacts(items) {
  saveJson(CONTACTS_KEY, items.slice(0, 100));
}

function renderContacts() {
  const root = $('ownerContacts');
  if (!root) return;
  root.textContent = '';
  const contacts = loadContacts();
  if (!contacts.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Sin contactos guardados todavía.';
    root.append(empty);
    return;
  }

  contacts.forEach((contact) => {
    const row = document.createElement('article');
    row.className = `owner-contact${activeContactDx === contact.dx ? ' active' : ''}`;
    const data = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = contact.name;
    const dx = document.createElement('span');
    dx.textContent = contact.dx;
    data.append(name, dx);

    const actions = document.createElement('div');
    actions.className = 'owner-contact-actions';
    const use = document.createElement('button');
    use.type = 'button';
    use.className = 'secondary compact';
    use.textContent = activeContactDx === contact.dx ? 'SELECCIONADO' : 'USAR';
    use.addEventListener('click', () => {
      activeContactDx = contact.dx;
      $('ownerMessageTarget').textContent = `${contact.name} · ${contact.dx}`;
      renderContacts();
      setActivity(`Contacto seleccionado: ${contact.name}`);
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'danger-ghost compact';
    remove.textContent = 'QUITAR';
    remove.addEventListener('click', () => {
      saveContacts(loadContacts().filter((item) => item.dx !== contact.dx));
      if (activeContactDx === contact.dx) {
        activeContactDx = '';
        $('ownerMessageTarget').textContent = 'Sin contacto seleccionado';
      }
      renderContacts();
      setActivity(`Contacto eliminado: ${contact.name}`);
    });
    actions.append(use, remove);
    row.append(data, actions);
    root.append(row);
  });
}

function addContact() {
  const name = $('ownerContactName').value.trim();
  const dx = $('ownerContactDx').value.trim().toUpperCase();
  if (name.length < 2 || !/^DX-[A-Z0-9]{6,16}$/.test(dx)) {
    ownerStatus('Escribe nombre y un DX válido, por ejemplo DX-ABC23456.', 'error');
    return;
  }
  const items = loadContacts().filter((item) => item.dx !== dx);
  items.unshift({ name, dx, savedAt: new Date().toISOString() });
  saveContacts(items);
  $('ownerContactName').value = '';
  $('ownerContactDx').value = '';
  activeContactDx = dx;
  $('ownerMessageTarget').textContent = `${name} · ${dx}`;
  renderContacts();
  ownerStatus('Contacto guardado.');
  setActivity(`Contacto agregado: ${name}`);
}

function appendMessageToken(token) {
  const field = $('ownerMessageText');
  field.value = `${field.value}${field.value ? ' ' : ''}${token}`;
  field.focus();
}

async function sendMessage() {
  const text = $('ownerMessageText').value.trim();
  if (!text) {
    ownerStatus('Escribe un mensaje primero.', 'error');
    return;
  }
  const contact = loadContacts().find((item) => item.dx === activeContactDx);
  const prefix = contact ? `Para ${contact.name} (${contact.dx})\n` : '';
  const result = await shareText({ title: 'Mensaje VIVA CUBA', text: `${prefix}${text}` });
  if (result === 'cancelled') return;
  ownerStatus(result === 'shared' ? 'Mensaje enviado al canal de compartir del dispositivo.' : 'Mensaje copiado para enviarlo por el canal disponible.');
  setActivity('Mensaje preparado/enviado');
}

function startCall() {
  const profile = ensureOwnerPersonal();
  if (!navigator.onLine) {
    ownerStatus('Sin conexión: la videollamada necesita internet.', 'error');
    return;
  }
  const url = `https://meet.jit.si/${encodeURIComponent(profile.room)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  ownerStatus('Sala OWNER abierta. Usa COMPARTIR SALA para invitar a otra persona.');
  setActivity('Videollamada OWNER abierta');
}

async function shareCall() {
  const profile = ensureOwnerPersonal();
  const url = `https://meet.jit.si/${encodeURIComponent(profile.room)}`;
  const result = await shareText({ title: 'Videollamada VIVA CUBA', text: `Únete a mi videollamada VIVA CUBA. Mi DX es ${profile.dx}.`, url });
  if (result !== 'cancelled') setActivity('Sala de videollamada compartida');
}

async function shareSelectedFiles(files) {
  if (!files?.length) return;
  const payload = { files: [...files], title: 'VIVA CUBA', text: 'Archivo compartido desde VIVA CUBA.' };
  if (navigator.share && navigator.canShare?.({ files: payload.files })) {
    try {
      await navigator.share(payload);
      ownerStatus(`${payload.files.length} archivo(s) compartido(s).`);
      setActivity('Foto/archivo compartido');
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }
  ownerStatus('Este navegador no permite compartir archivos directamente. Usa el menú Compartir del dispositivo.', 'error');
}

function shareLocation() {
  if (!navigator.geolocation) {
    ownerStatus('Este dispositivo no ofrece ubicación.', 'error');
    return;
  }
  ownerStatus('Solicitando ubicación…');
  navigator.geolocation.getCurrentPosition(async ({ coords }) => {
    const lat = Number(coords.latitude).toFixed(6);
    const lon = Number(coords.longitude).toFixed(6);
    const url = `https://www.google.com/maps?q=${lat},${lon}`;
    const result = await shareText({ title: 'Ubicación VIVA CUBA', text: `Mi ubicación actual: ${lat}, ${lon}`, url });
    if (result !== 'cancelled') {
      ownerStatus(result === 'shared' ? 'Ubicación compartida.' : 'Ubicación copiada para compartir.');
      setActivity('Ubicación actual compartida');
    }
  }, () => ownerStatus('No se pudo obtener la ubicación. Revisa el permiso del navegador.', 'error'), {
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 30000,
  });
}

function injectStyles() {
  if (document.getElementById('ownerUserStyles')) return;
  const style = document.createElement('style');
  style.id = 'ownerUserStyles';
  style.textContent = `
    .owner-user-workspace{border:1px solid rgba(192,120,255,.55);background:radial-gradient(circle at 12% 0%,rgba(161,66,255,.18),transparent 36%),rgba(13,8,24,.96);box-shadow:0 0 22px rgba(142,54,255,.16)}
    .owner-user-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}.owner-user-head h2{margin-bottom:4px}.owner-dx-card{padding:14px;border:1px solid rgba(194,142,255,.42);border-radius:16px;background:rgba(67,23,111,.26);display:grid;gap:8px}.owner-dx-card strong{font-size:1.2rem;color:#f0dcff;text-shadow:0 0 12px rgba(192,116,255,.7)}
    .owner-user-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin-top:14px}.owner-user-card{padding:14px;border:1px solid rgba(139,101,185,.28);border-radius:16px;background:rgba(10,14,22,.78)}.owner-user-card h3{margin:0 0 10px}.owner-user-card input,.owner-user-card textarea{width:100%;margin-bottom:8px}.owner-user-card textarea{min-height:96px;resize:vertical}.owner-inline-actions{display:flex;gap:8px;flex-wrap:wrap}.owner-inline-actions button{flex:1 1 120px}
    .owner-contact{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.08)}.owner-contact:last-child{border-bottom:0}.owner-contact>div:first-child{display:grid;gap:3px}.owner-contact span{font-size:.78rem;color:#bfc4cf}.owner-contact.active{background:rgba(139,77,207,.11)}.owner-contact-actions{display:flex;gap:6px;flex-wrap:wrap}.owner-target{font-size:.78rem;color:#d7b8ff;margin-bottom:8px}.owner-user-status{margin-top:12px;padding:11px 12px;border-radius:12px;background:rgba(47,140,94,.15);border:1px solid rgba(74,205,132,.35)}.owner-user-status[data-tone="error"]{background:rgba(150,45,55,.15);border-color:rgba(255,99,112,.35)}.owner-admin-marker{margin:20px 0 10px;padding:14px 16px;border-left:4px solid #a949ff;background:linear-gradient(90deg,rgba(123,37,200,.2),transparent);border-radius:0 14px 14px 0}.owner-admin-marker h2{margin:0 0 4px;color:#ead4ff}.owner-admin-marker p{margin:0;color:#b8adca}.owner-purple-action{background:linear-gradient(135deg,#6822a8,#a13cff)!important;box-shadow:0 0 16px rgba(168,69,255,.38)!important}
  `;
  document.head.append(style);
}

function injectOwnerUserWorkspace() {
  const ownerView = $('ownerView');
  const adminAnchor = ownerView?.querySelector('.owner-status-grid');
  if (!ownerView || !adminAnchor || $('ownerUserWorkspace')) return;

  injectStyles();
  const profile = ensureOwnerPersonal();
  const workspace = document.createElement('section');
  workspace.id = 'ownerUserWorkspace';
  workspace.className = 'panel owner-user-workspace';
  workspace.innerHTML = `
    <div class="owner-user-head">
      <div><p class="eyebrow">MI ÁREA · OWNER COMO USUARIO</p><h2>Comunicación personal</h2><p class="muted">Primero tus funciones de usuario; debajo continúa la administración.</p></div>
      <div class="owner-dx-card"><span>MI CÓDIGO DX</span><strong id="ownerPersonalDx"></strong><button id="copyOwnerDx" type="button" class="secondary compact">COPIAR DX</button></div>
    </div>
    <div class="owner-user-grid">
      <section class="owner-user-card"><h3>CONTACTOS</h3><input id="ownerContactName" placeholder="Nombre" maxlength="50"><input id="ownerContactDx" placeholder="DX-ABC23456" spellcheck="false"><button id="addOwnerContact" class="owner-purple-action" type="button">AGREGAR / GUARDAR</button><div id="ownerContacts"></div></section>
      <section class="owner-user-card"><h3>MENSAJES</h3><div id="ownerMessageTarget" class="owner-target">Sin contacto seleccionado</div><textarea id="ownerMessageText" placeholder="Escribe un mensaje…"></textarea><div class="owner-inline-actions"><button id="ownerEmoji" type="button" class="secondary">😊 EMOJI</button><button id="ownerSticker" type="button" class="secondary">✨ STICKER</button><button id="ownerSendMessage" type="button" class="owner-purple-action">ENVIAR MENSAJE</button></div></section>
      <section class="owner-user-card"><h3>VIDEOLLAMADA</h3><p class="muted">Sala personal OWNER reutilizable durante este piloto.</p><div class="owner-inline-actions"><button id="ownerStartCall" class="owner-purple-action" type="button">VIDEOLLAMADA</button><button id="ownerShareCall" class="secondary" type="button">COMPARTIR SALA</button></div></section>
      <section class="owner-user-card"><h3>FOTOS Y ARCHIVOS</h3><input id="ownerFileInput" type="file" multiple hidden><button id="ownerShareFile" class="owner-purple-action" type="button">COMPARTIR FOTO / ARCHIVO</button></section>
      <section class="owner-user-card"><h3>UBICACIÓN</h3><p class="muted">Solo se solicita cuando tú pulsas el botón.</p><button id="ownerShareLocation" class="owner-purple-action" type="button">COMPARTIR UBICACIÓN ACTUAL</button></section>
      <section class="owner-user-card"><h3>ACTIVIDAD</h3><strong id="ownerActivity">LISTO · ${navigator.onLine ? 'ONLINE' : 'OFFLINE'}</strong></section>
    </div>
    <div id="ownerUserStatus" class="owner-user-status hidden" role="status" aria-live="polite"></div>
  `;
  adminAnchor.before(workspace);

  const marker = document.createElement('section');
  marker.id = 'ownerAdminWorkspace';
  marker.className = 'owner-admin-marker';
  marker.innerHTML = '<p class="eyebrow">ADMINISTRACIÓN / OWNER</p><h2>Command Center</h2><p>Desde aquí comienzan las funciones administrativas del piloto.</p>';
  adminAnchor.before(marker);

  $('ownerPersonalDx').textContent = profile.dx;
  renderContacts();

  $('copyOwnerDx').addEventListener('click', async () => {
    await copyText(profile.dx);
    ownerStatus('DX OWNER copiado.');
    setActivity('DX copiado');
  });
  $('addOwnerContact').addEventListener('click', addContact);
  $('ownerEmoji').addEventListener('click', () => appendMessageToken('😊'));
  $('ownerSticker').addEventListener('click', () => appendMessageToken('✨'));
  $('ownerSendMessage').addEventListener('click', sendMessage);
  $('ownerStartCall').addEventListener('click', startCall);
  $('ownerShareCall').addEventListener('click', shareCall);
  $('ownerShareFile').addEventListener('click', () => $('ownerFileInput').click());
  $('ownerFileInput').addEventListener('change', (event) => shareSelectedFiles(event.target.files));
  $('ownerShareLocation').addEventListener('click', shareLocation);

  const badge = document.querySelector('.pilot-badge');
  if (badge) badge.textContent = 'CUBA PILOT v0.5';
}

injectOwnerUserWorkspace();
