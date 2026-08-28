const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_RE = /VCM-[A-HJ-NP-Z2-9]{4}(?:-[A-HJ-NP-Z2-9]{4}){3}/i;
const ROOM_RE = /^VivaCubaPilot-[A-HJ-NP-Z2-9]{20,40}$/;
const DX_RE = /^DX-[A-HJ-NP-Z2-9]{8}$/;

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
