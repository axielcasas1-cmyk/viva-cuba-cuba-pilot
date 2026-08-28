import { openStickerPicker, shareSticker } from './stickers.js';

function injectUserStickerPanel() {
  const appView = document.getElementById('appView');
  const anchor = appView?.querySelector('.info-grid');
  if (!appView || !anchor || document.getElementById('userStickerPanel')) return;

  const style = document.createElement('style');
  style.textContent = `
    .user-sticker-panel{border:1px solid rgba(41,166,255,.35);background:linear-gradient(145deg,rgba(3,31,52,.9),rgba(7,15,27,.94))}.user-sticker-actions{display:flex;gap:8px;flex-wrap:wrap}.user-sticker-actions button{flex:1 1 150px}.user-sticker-preview{min-height:82px;margin-top:10px;display:flex;align-items:center;gap:10px}.user-sticker-preview-image{width:98px;height:98px;object-fit:contain}.user-sticker-status{margin-top:10px;padding:10px 12px;border-radius:12px;background:rgba(35,143,88,.15);border:1px solid rgba(70,220,135,.3)}.user-sticker-status[data-tone="warn"]{background:rgba(164,117,25,.16);border-color:rgba(255,192,67,.35)}
  `;
  document.head.append(style);

  const panel = document.createElement('section');
  panel.id = 'userStickerPanel';
  panel.className = 'panel user-sticker-panel';
  panel.innerHTML = `
    <div class="panel-heading"><p class="eyebrow">MENSAJES / STICKERS</p><h2>Stickers híbridos</h2><p class="muted">Estáticos y móviles, recientes, favoritos, packs y stickers creados por ti.</p></div>
    <div class="user-sticker-actions"><button id="userStickerButton" type="button" class="primary">✨ ABRIR STICKERS</button></div>
    <div id="userStickerPreview" class="user-sticker-preview"><span class="muted">Selecciona un sticker para previsualizarlo y compartirlo.</span></div>
    <div id="userStickerStatus" class="user-sticker-status hidden" role="status" aria-live="polite"></div>`;
  anchor.before(panel);
}

function setStatus(text, tone = 'ok') {
  const status = document.getElementById('userStickerStatus');
  if (!status) return;
  status.textContent = text;
  status.dataset.tone = tone;
  status.classList.remove('hidden');
}

function wireUserStickerButton() {
  const button = document.getElementById('userStickerButton');
  if (!button || button.dataset.wired === '1') return;
  button.dataset.wired = '1';
  button.addEventListener('click', () => {
    openStickerPicker({
      onSelect: async (sticker) => {
        const preview = document.getElementById('userStickerPreview');
        if (preview) {
          preview.innerHTML = '';
          const img = document.createElement('img');
          img.src = sticker.src;
          img.alt = sticker.name;
          img.className = 'user-sticker-preview-image';
          const label = document.createElement('span');
          label.textContent = `${sticker.name}${sticker.type === 'animated' ? ' · móvil' : ''}`;
          preview.append(img, label);
        }
        const result = await shareSticker(sticker, `Sticker VIVA CUBA · ${sticker.name}`);
        if (result === 'shared') setStatus('Sticker enviado al canal de compartir del dispositivo.');
        else if (result === 'copied') setStatus('Sticker copiado. Ya puedes pegarlo en una conversación.');
        else if (result === 'cancelled') setStatus('Envío cancelado.');
        else setStatus('Sticker seleccionado. Este navegador no permite compartir ese formato directamente.', 'warn');
      },
    });
  });
}

injectUserStickerPanel();
wireUserStickerButton();

const appView = document.getElementById('appView');
if (appView) {
  new MutationObserver(() => { injectUserStickerPanel(); wireUserStickerButton(); }).observe(appView, { attributes:true, attributeFilter:['class'] });
}
