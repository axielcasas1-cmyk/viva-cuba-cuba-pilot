export const RECENTS_KEY = 'vc_stickers_recents_v1';
export const FAVORITES_KEY = 'vc_stickers_favorites_v1';
const CUSTOM_KEY = 'vc_stickers_custom_v1';
const MAX_RECENTS = 24;
const MAX_CUSTOM = 16;
const MAX_CUSTOM_BYTES = 700 * 1024;
let activeSelect = null;
let activeTab = 'packs';
let searchTerm = '';

const svgData = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const staticSvg = (emoji, bg1, bg2) => svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs><rect width="256" height="256" rx="58" fill="url(#g)"/><circle cx="128" cy="128" r="92" fill="rgba(255,255,255,.13)"/><text x="128" y="153" text-anchor="middle" font-size="104">${emoji}</text></svg>`);
const animatedSvg = (emoji, bg1, bg2, motion='pulse') => {
  const anim = motion === 'spin'
    ? '<animateTransform attributeName="transform" type="rotate" values="-8 128 128;8 128 128;-8 128 128" dur="1.1s" repeatCount="indefinite"/>'
    : '<animateTransform attributeName="transform" type="scale" values="1;1.13;1" additive="sum" dur=".85s" repeatCount="indefinite"/>';
  return svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs><rect width="256" height="256" rx="58" fill="url(#g)"/><g transform-origin="128px 128px">${anim}<circle cx="128" cy="128" r="94" fill="rgba(255,255,255,.12)"/><text x="128" y="153" text-anchor="middle" font-size="104">${emoji}</text></g></svg>`);
};

const BUILTIN = [
  { id:'vc-love', name:'Corazón VIVA', pack:'VIVA', type:'static', mime:'image/svg+xml', src:staticSvg('💙','#045fda','#07d7ff') },
  { id:'vc-cuba', name:'Cuba', pack:'VIVA', type:'static', mime:'image/svg+xml', src:staticSvg('🇨🇺','#004dcc','#e61e3a') },
  { id:'vc-laugh', name:'Jajaja', pack:'VIVA', type:'animated', mime:'image/svg+xml', src:animatedSvg('😂','#6b28c9','#ff48d7','spin') },
  { id:'vc-fire', name:'Candela', pack:'VIVA', type:'animated', mime:'image/svg+xml', src:animatedSvg('🔥','#ff6600','#ffcc00') },
  { id:'vc-hug', name:'Abrazo', pack:'VIVA', type:'animated', mime:'image/svg+xml', src:animatedSvg('🤗','#673ab7','#00c7ff') },
  { id:'vc-wow', name:'Wow', pack:'VIVA', type:'static', mime:'image/svg+xml', src:staticSvg('😮','#4224aa','#00c2ff') },
  { id:'vc-ok', name:'Perfecto', pack:'VIVA', type:'animated', mime:'image/svg+xml', src:animatedSvg('👌','#005f73','#0a9396') },
  { id:'vc-party', name:'Fiesta', pack:'VIVA', type:'animated', mime:'image/svg+xml', src:animatedSvg('🎉','#7209b7','#4cc9f0','spin') },
  { id:'vc-coffee', name:'Cafecito', pack:'VIVA', type:'static', mime:'image/svg+xml', src:staticSvg('☕','#5b3716','#c58c52') },
  { id:'vc-star', name:'Estrella', pack:'VIVA', type:'animated', mime:'image/svg+xml', src:animatedSvg('⭐','#003566','#ffc300') },
  { id:'vc-sad', name:'Triste', pack:'VIVA', type:'static', mime:'image/svg+xml', src:staticSvg('😢','#12345b','#5bc0eb') },
  { id:'vc-kiss', name:'Besito', pack:'VIVA', type:'animated', mime:'image/svg+xml', src:animatedSvg('😘','#8a1c7c','#ff77aa') },
];

function loadJson(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function customStickers() { const items = loadJson(CUSTOM_KEY, []); return Array.isArray(items) ? items : []; }
function allStickers() { return [...customStickers(), ...BUILTIN]; }
function idsFor(key) { const value = loadJson(key, []); return Array.isArray(value) ? value : []; }
function rememberRecent(id) { saveJson(RECENTS_KEY, [id, ...idsFor(RECENTS_KEY).filter((x) => x !== id)].slice(0, MAX_RECENTS)); }
function toggleFavorite(id) {
  const ids = idsFor(FAVORITES_KEY);
  saveJson(FAVORITES_KEY, ids.includes(id) ? ids.filter((x) => x !== id) : [id, ...ids]);
  renderGrid();
}
function stickerById(id) { return allStickers().find((item) => item.id === id) || null; }

function injectStickerUi() {
  if (document.getElementById('stickerPicker')) return;
  const style = document.createElement('style');
  style.id = 'stickerHybridStyles';
  style.textContent = `
    #stickerPicker{position:fixed;inset:0;z-index:2147483550;background:rgba(3,5,9,.76);display:none;align-items:flex-end;justify-content:center;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    #stickerPicker.open{display:flex}.vc-sticker-sheet{width:min(760px,100%);height:min(76vh,720px);background:#121416;border:1px solid #343a40;border-radius:24px 24px 0 0;box-shadow:0 -18px 60px rgba(0,0,0,.5);display:flex;flex-direction:column;color:#fff;overflow:hidden}
    .vc-sticker-grab{width:58px;height:5px;border-radius:99px;background:#6e7277;margin:8px auto}.vc-sticker-head{display:flex;gap:9px;padding:8px 14px;align-items:center}.vc-sticker-search{flex:1;border:1px solid #34383d!important;background:#23272b!important;color:#fff!important;border-radius:16px!important;padding:12px 14px!important}.vc-sticker-close{border:0;background:#2b3035;color:#fff;border-radius:12px;padding:10px 13px;font-weight:800}
    .vc-sticker-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:0 12px 10px}.vc-sticker-tab{border:0;border-radius:12px;background:#24282c;color:#d6d9dd;padding:10px 6px;font-weight:700;font-size:.78rem}.vc-sticker-tab.active{background:#3a3f45;color:#fff;box-shadow:inset 0 -2px #56b8ff}
    .vc-sticker-grid{flex:1;overflow:auto;padding:10px 12px 22px;display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:10px;align-content:start}.vc-sticker-tile{position:relative;min-height:105px;border:0;border-radius:15px;background:#181b1e;padding:7px;display:grid;place-items:center;cursor:pointer}.vc-sticker-tile img{width:84px;height:84px;object-fit:contain;filter:drop-shadow(0 5px 10px rgba(0,0,0,.35))}.vc-sticker-fav{position:absolute;right:5px;top:5px;border:0;border-radius:50%;width:29px;height:29px;background:rgba(0,0,0,.58);color:#fff;font-size:17px;z-index:2}.vc-sticker-name{font-size:.68rem;color:#bfc5cc;text-align:center;line-height:1.1}.vc-sticker-empty{grid-column:1/-1;color:#adb5bd;padding:30px;text-align:center}
    .vc-sticker-create{padding:14px 16px 24px;display:grid;gap:12px}.vc-sticker-create button{border:1px solid #57bfff;background:linear-gradient(135deg,#045ee0,#00b7ff);color:#fff;border-radius:16px;padding:14px;font-weight:900;box-shadow:0 0 22px rgba(0,153,255,.28)}.vc-sticker-note{font-size:.78rem;color:#aab2bb;margin:0}.vc-sticker-preview{max-width:160px;max-height:160px;object-fit:contain}
  `;
  document.head.append(style);

  const root = document.createElement('section');
  root.id = 'stickerPicker';
  root.setAttribute('aria-label', 'Stickers VIVA CUBA');
  root.innerHTML = `
    <div class="vc-sticker-sheet">
      <div class="vc-sticker-grab"></div>
      <div class="vc-sticker-head"><input id="stickerSearch" class="vc-sticker-search" placeholder="Buscar stickers"><button id="closeStickers" class="vc-sticker-close" type="button">✕</button></div>
      <nav class="vc-sticker-tabs" aria-label="Categorías"><button class="vc-sticker-tab" data-tab="recents">Recientes</button><button class="vc-sticker-tab" data-tab="favorites">Favoritos</button><button class="vc-sticker-tab active" data-tab="packs">Packs</button><button class="vc-sticker-tab" data-tab="create">Crear sticker</button></nav>
      <div id="stickerGrid" class="vc-sticker-grid"></div>
      <div id="stickerCreate" class="vc-sticker-create" hidden><button id="chooseStickerFile" type="button">CREAR STICKER DESDE IMAGEN / ANIMACIÓN</button><input id="stickerFile" type="file" accept="image/png,image/webp,image/gif" hidden><p class="vc-sticker-note">Admite PNG estático y WebP/GIF animados. Para el piloto, cada archivo personalizado debe pesar menos de 700 KB.</p></div>
    </div>`;
  document.body.append(root);
  root.addEventListener('click', (event) => { if (event.target === root) closeStickerPicker(); });
  document.getElementById('closeStickers').addEventListener('click', closeStickerPicker);
  document.getElementById('stickerSearch').addEventListener('input', (event) => { searchTerm = event.target.value.trim().toLowerCase(); renderGrid(); });
  root.querySelectorAll('.vc-sticker-tab').forEach((button) => button.addEventListener('click', () => {
    activeTab = button.dataset.tab;
    root.querySelectorAll('.vc-sticker-tab').forEach((b) => b.classList.toggle('active', b === button));
    document.getElementById('stickerGrid').hidden = activeTab === 'create';
    document.getElementById('stickerCreate').hidden = activeTab !== 'create';
    renderGrid();
  }));
  document.getElementById('chooseStickerFile').addEventListener('click', () => document.getElementById('stickerFile').click());
  document.getElementById('stickerFile').addEventListener('change', importCustomSticker);
}

function selectedItems() {
  const all = allStickers();
  let items = all;
  if (activeTab === 'recents') items = idsFor(RECENTS_KEY).map(stickerById).filter(Boolean);
  if (activeTab === 'favorites') items = idsFor(FAVORITES_KEY).map(stickerById).filter(Boolean);
  if (searchTerm) items = items.filter((item) => `${item.name} ${item.pack}`.toLowerCase().includes(searchTerm));
  return items;
}

function renderGrid() {
  const grid = document.getElementById('stickerGrid');
  if (!grid || activeTab === 'create') return;
  grid.textContent = '';
  const favorites = new Set(idsFor(FAVORITES_KEY));
  const items = selectedItems();
  if (!items.length) {
    const empty = document.createElement('p'); empty.className = 'vc-sticker-empty'; empty.textContent = activeTab === 'recents' ? 'Todavía no has usado stickers.' : activeTab === 'favorites' ? 'Todavía no tienes favoritos.' : 'No encontré stickers.'; grid.append(empty); return;
  }
  items.forEach((sticker) => {
    const tile = document.createElement('button'); tile.type = 'button'; tile.className = 'vc-sticker-tile'; tile.title = sticker.name;
    const img = document.createElement('img'); img.src = sticker.src; img.alt = sticker.name;
    const name = document.createElement('span'); name.className = 'vc-sticker-name'; name.textContent = sticker.type === 'animated' ? `${sticker.name} · móvil` : sticker.name;
    const fav = document.createElement('button'); fav.type = 'button'; fav.className = 'vc-sticker-fav'; fav.textContent = favorites.has(sticker.id) ? '★' : '☆'; fav.title = favorites.has(sticker.id) ? 'Quitar de favoritos' : 'Añadir a favoritos';
    fav.addEventListener('click', (event) => { event.stopPropagation(); toggleFavorite(sticker.id); });
    tile.addEventListener('click', () => selectSticker(sticker));
    tile.append(img, name, fav); grid.append(tile);
  });
}

function selectSticker(sticker) {
  rememberRecent(sticker.id);
  const callback = activeSelect;
  closeStickerPicker();
  window.dispatchEvent(new CustomEvent('viva-sticker-selected', { detail: sticker }));
  callback?.(sticker);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
}

async function importCustomSticker(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  const allowed = ['image/png','image/webp','image/gif'];
  if (!allowed.includes(file.type)) return alert('Formato no compatible. Usa PNG, WebP o GIF.');
  if (file.size > MAX_CUSTOM_BYTES) return alert('Para este piloto el sticker personalizado debe pesar menos de 700 KB.');
  const src = await fileToDataUrl(file);
  const item = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    name: file.name.replace(/\.[^.]+$/, '').slice(0,40) || 'Sticker personal',
    pack: 'Mis stickers',
    type: file.type === 'image/png' ? 'static' : 'animated',
    mime: file.type,
    src,
    custom: true,
  };
  const items = [item, ...customStickers()].slice(0, MAX_CUSTOM);
  try { saveJson(CUSTOM_KEY, items); }
  catch { return alert('No queda espacio local suficiente para guardar este sticker. Prueba con un archivo más pequeño.'); }
  activeTab = 'packs';
  const picker = document.getElementById('stickerPicker');
  picker?.querySelectorAll('.vc-sticker-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === 'packs'));
  document.getElementById('stickerGrid').hidden = false;
  document.getElementById('stickerCreate').hidden = true;
  renderGrid();
}

export function openStickerPicker({ onSelect } = {}) {
  injectStickerUi();
  activeSelect = typeof onSelect === 'function' ? onSelect : null;
  searchTerm = '';
  const search = document.getElementById('stickerSearch'); if (search) search.value = '';
  document.getElementById('stickerPicker').classList.add('open');
  renderGrid();
}

export function closeStickerPicker() {
  document.getElementById('stickerPicker')?.classList.remove('open');
  activeSelect = null;
}

export async function shareSticker(sticker, title = 'Sticker VIVA CUBA') {
  if (!sticker?.src) return 'invalid';
  try {
    const blob = await fetch(sticker.src).then((response) => response.blob());
    const ext = sticker.mime === 'image/gif' ? 'gif' : sticker.mime === 'image/webp' ? 'webp' : sticker.mime === 'image/png' ? 'png' : 'svg';
    const file = new File([blob], `viva-cuba-sticker.${ext}`, { type: sticker.mime || blob.type || 'image/svg+xml' });
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files:[file] }))) {
      await navigator.share({ title, files:[file] });
      return 'shared';
    }
    if (navigator.clipboard && window.ClipboardItem && blob.type === 'image/png') {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return 'copied';
    }
  } catch (error) {
    if (error?.name === 'AbortError') return 'cancelled';
  }
  return 'unsupported';
}

window.VivaCubaStickers = { openStickerPicker, closeStickerPicker, shareSticker };
