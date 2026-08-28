import { openStickerPicker, shareSticker } from './stickers.js';

function setOwnerStickerPreview(sticker) {
  const button = document.getElementById('ownerSticker');
  const card = button?.closest('.owner-user-card');
  if (!card) return;
  let preview = document.getElementById('ownerStickerPreview');
  if (!preview) {
    preview = document.createElement('div');
    preview.id = 'ownerStickerPreview';
    preview.style.cssText = 'margin-top:10px;min-height:70px;display:flex;align-items:center;gap:10px;flex-wrap:wrap';
    card.append(preview);
  }
  preview.innerHTML = '';
  const img = document.createElement('img');
  img.src = sticker.src;
  img.alt = sticker.name;
  img.style.cssText = 'width:92px;height:92px;object-fit:contain';
  const label = document.createElement('span');
  label.textContent = `${sticker.name}${sticker.type === 'animated' ? ' · móvil' : ''}`;
  preview.append(img, label);
}

function ownerStatus(text, tone = 'ok') {
  const box = document.getElementById('ownerUserStatus');
  if (!box) return;
  box.textContent = text;
  box.dataset.tone = tone;
  box.classList.remove('hidden');
}

export function openOwnerStickerPicker() {
  openStickerPicker({
    onSelect: async (sticker) => {
      setOwnerStickerPreview(sticker);
      const result = await shareSticker(sticker, `Sticker VIVA CUBA · ${sticker.name}`);
      if (result === 'shared') ownerStatus('Sticker compartido desde tu área OWNER.');
      else if (result === 'copied') ownerStatus('Sticker copiado. Ya puedes pegarlo en la conversación.');
      else if (result === 'cancelled') ownerStatus('Envío de sticker cancelado.');
      else ownerStatus('Sticker seleccionado. Este navegador no permite compartir ese formato directamente.', 'error');
    },
  });
}

// Capture phase prevents the old placeholder ✨ handler from firing.
document.addEventListener('click', (event) => {
  const button = event.target.closest?.('#ownerSticker');
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  openOwnerStickerPicker();
}, true);
