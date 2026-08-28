const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_RE = /VCM-[A-HJ-NP-Z2-9]{4}(?:-[A-HJ-NP-Z2-9]{4}){3}/i;
const ROOM_RE = /^VivaCubaPilot-[A-HJ-NP-Z2-9]{20,40}$/;
const DX_RE = /^DX-[A-HJ-NP-Z2-9]{8}$/;
const OWNER_SECRET_RE = /^OWN-[A-F0-9]{6}(?:-[A-F0-9]{6}){3}$/i;

function secureBytes(length) {
  const out = new Uint8Array(length);
  globalThis.crypto.getRandomValues(out);
  return out;
}

function randomChars(length) {
  const bytes = secureBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export function isValidInvite(code) {
  return typeof code === 'string' && new RegExp(`^${INVITE_RE.source}$`, 'i').test(code.trim());
}

export function isValidRoom(room) {
  return typeof room === 'string' && ROOM_RE.test(room.trim());
}

export function isValidOwnerSecret(secret) {
  return typeof secret === 'string' && OWNER_SECRET_RE.test(secret.trim());
}

export function isOwnerRoute(hash) {
  return String(hash || '').trim().toLowerCase() === '#owner';
}

export function generateInviteCode() {
  return `VCM-${[0, 1, 2, 3].map(() => randomChars(4)).join('-')}`;
}

export function generateRoomId() {
  return `VivaCubaPilot-${randomChars(24)}`;
}

export function generateDx() {
  return `DX-${randomChars(8)}`;
}

export function buildInviteUrl(baseUrl, code, room) {
  if (!isValidInvite(code)) throw new Error('INVALID_INVITE');
  if (!isValidRoom(room)) throw new Error('INVALID_ROOM');
  const url = new URL(baseUrl);
  url.hash = new URLSearchParams({ invite: code.toUpperCase(), room }).toString();
  return url.toString();
}

export function buildInviteMessage(code, link) {
  if (!isValidInvite(code)) throw new Error('INVALID_INVITE');
  const url = new URL(link);
  if (!/^https?:$/.test(url.protocol)) throw new Error('INVALID_LINK');
  return `VIVA CUBA 🇨🇺\nAbre este enlace para entrar:\n${url.toString()}\n\nCódigo de invitación: ${code.toUpperCase()}\n\nCuando aparezca VIVA CUBA, escribe tu nombre y pulsa ACTIVAR Y ENTRAR.`;
}

export function parseInviteHash(hash) {
  const params = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  const invite = (params.get('invite') || '').toUpperCase();
  const room = params.get('room') || '';
  return {
    invite: isValidInvite(invite) ? invite : '',
    room: isValidRoom(room) ? room : '',
  };
}

export function extractInvitePayload(text) {
  const raw = String(text || '');
  const inviteMatch = raw.match(INVITE_RE);
  const invite = inviteMatch ? inviteMatch[0].toUpperCase() : '';

  let room = '';
  const roomParam = raw.match(/[?#&]room=([^\s&#]+)/i);
  if (roomParam) {
    try {
      const decoded = decodeURIComponent(roomParam[1]);
      if (isValidRoom(decoded)) room = decoded;
    } catch {
      room = '';
    }
  }

  if (!room) {
    const directRoom = raw.match(/VivaCubaPilot-[A-HJ-NP-Z2-9]{20,40}/);
    if (directRoom && isValidRoom(directRoom[0])) room = directRoom[0];
  }

  return {
    invite: isValidInvite(invite) ? invite : '',
    room,
  };
}

export function isValidDx(dx) {
  return typeof dx === 'string' && DX_RE.test(dx.trim());
}

export function detectInstallPlatform(userAgent = '', maxTouchPoints = 0) {
  const ua = String(userAgent || '').toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/macintosh/.test(ua) && Number(maxTouchPoints) > 1) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/cros/.test(ua)) return 'chromeos';
  if (/windows/.test(ua)) return 'windows';
  if (/macintosh|mac os x/.test(ua)) return 'mac';
  if (/linux/.test(ua)) return 'linux';
  return 'other';
}

export function installUiState({ platform = 'other', installed = false, promptAvailable = false } = {}) {
  if (installed) return { label: 'APP INSTALADA', mode: 'installed' };
  if (promptAvailable) return { label: 'DESCARGAR APP', mode: 'prompt' };
  if (platform === 'ios') return { label: 'DESCARGAR APP', mode: 'ios-guide' };
  return { label: 'DESCARGAR APP', mode: 'manual-guide' };
}
