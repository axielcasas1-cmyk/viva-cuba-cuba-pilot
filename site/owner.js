import { buildInviteUrl, generateInviteCode, generateRoomId } from './lib/core.mjs';

const $ = (id) => document.getElementById(id);
let current = null;

function publicBaseUrl() {
  return new URL('./', location.href).toString();
}

function makeMessage() {
  if (!current) return '';
  return `VIVA CUBA 🇨🇺\nAbre este enlace para entrar:\n${current.link}\n\nCódigo de invitación: ${current.code}\n\nCuando aparezca VIVA CUBA, escribe tu nombre y pulsa ACTIVAR Y ENTRAR.`;
}

function status(message) {
  $('ownerStatus').textContent = message;
  $('ownerStatus').classList.remove('hidden');
  setTimeout(() => $('ownerStatus').classList.add('hidden'), 1800);
}

async function copyText(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    status(label);
  } catch {
    window.prompt('Copia este contenido:', text);
  }
}

function generate() {
  const code = generateInviteCode();
  const room = generateRoomId();
  const link = buildInviteUrl(publicBaseUrl(), code, room);
  current = { code, room, link };
  $('generatedCode').textContent = code;
  $('generatedRoom').textContent = room;
  $('generatedLink').textContent = link;
  status('Nueva invitación generada');
}

$('generateInvite').addEventListener('click', generate);
$('copyCode').addEventListener('click', () => current && copyText(current.code, 'Código copiado'));
$('copyLink').addEventListener('click', () => current && copyText(current.link, 'Enlace copiado'));
$('copyMessage').addEventListener('click', () => current && copyText(makeMessage(), 'Mensaje completo copiado'));

$('shareInvite').addEventListener('click', async () => {
  if (!current) return;
  const text = makeMessage();
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Invitación VIVA CUBA', text, url: current.link });
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }
  await copyText(text, 'Mensaje copiado para compartir');
});

$('openHostRoom').addEventListener('click', () => {
  if (!current) return;
  window.open(`https://meet.jit.si/${encodeURIComponent(current.room)}`, '_blank', 'noopener,noreferrer');
});

generate();
