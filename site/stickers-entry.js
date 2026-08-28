import { openStickerPicker, shareSticker } from './stickers.js';

const button = document.getElementById('userStickerButton');
const preview = document.getElementById('userStickerPreview');
const status = document.getElementById('userStickerStatus');

function setStatus(text, tone = 'ok') {
  if (!status) return;
  status.textContent = text;
  status.dataset.tone = tone;
  status.classList.remove('hidden');
}

button?.addEventListener('click', () => {
  openStickerPicker({
    onSelect: async (sticker) => {
      if (preview) {
        preview.innerHTML = '';
        const img = document.createElement('img');
        img.src = sticker.src;
        img.alt = sticker.name;
        img.className = 'user-sticker-preview-image';
        preview.append(img);
      }
      const result = await shareSticker(sticker, `Sticker VIVA CUBA · ${sticker.name}`);
      if (result === 'shared') setStatus('Sticker enviado al canal de compartir del dispositivo.');
      else if (result === 'copied') setStatus('Sticker copiado. Ya puedes pegarlo en una conversación.');
      else if (result === 'cancelled') setStatus('Envío cancelado.');
      else setStatus('Sticker seleccionado. Este navegador no permite compartir ese formato directamente.', 'warn');
    },
  });
});
