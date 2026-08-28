import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInviteMessage,
  buildInviteUrl,
  detectInstallPlatform,
  extractInvitePayload,
  generateDx,
  generateInviteCode,
  generateRoomId,
  installUiState,
  isOwnerRoute,
  isValidDx,
  isValidInvite,
  isValidOwnerSecret,
  isValidRoom,
  parseInviteHash,
} from '../site/lib/core.mjs';

test('VCM generator creates a valid code and varies', () => {
  const a = generateInviteCode();
  const b = generateInviteCode();
  assert.equal(isValidInvite(a), true);
  assert.equal(isValidInvite(b), true);
  assert.notEqual(a, b);
});

test('room generator creates a valid room', () => {
  assert.equal(isValidRoom(generateRoomId()), true);
});

test('DX generator creates a valid local DX', () => {
  assert.equal(isValidDx(generateDx()), true);
});

test('buildInviteUrl and parseInviteHash round-trip invite and room', () => {
  const code = 'VCM-ABCD-EFGH-JKLM-NPQR';
  const room = 'VivaCubaPilot-ABCDEFGHJKLMNPQRSTUV2345';
  const url = buildInviteUrl('https://example.com/viva/', code, room);
  const parsedUrl = new URL(url);
  const payload = parseInviteHash(parsedUrl.hash);
  assert.equal(payload.invite, code);
  assert.equal(payload.room, room);
});

test('extractInvitePayload reads code and room from a shared message', () => {
  const text = 'Abre VIVA CUBA: https://example.com/#invite=VCM-ABCD-EFGH-JKLM-NPQR&room=VivaCubaPilot-ABCDEFGHJKLMNPQRSTUV2345 Código: VCM-ABCD-EFGH-JKLM-NPQR';
  const payload = extractInvitePayload(text);
  assert.equal(payload.invite, 'VCM-ABCD-EFGH-JKLM-NPQR');
  assert.equal(payload.room, 'VivaCubaPilot-ABCDEFGHJKLMNPQRSTUV2345');
});

test('owner route is recognized without matching invite hashes', () => {
  assert.equal(isOwnerRoute('#owner'), true);
  assert.equal(isOwnerRoute('#OWNER'), true);
  assert.equal(isOwnerRoute('#invite=VCM-ABCD-EFGH-JKLM-NPQR'), false);
});

test('owner secret validation rejects weak or malformed values', () => {
  assert.equal(isValidOwnerSecret('OWN-1702BD-04B269-9E5D52-3A9590'), true);
  assert.equal(isValidOwnerSecret('1234'), false);
  assert.equal(isValidOwnerSecret(''), false);
});

test('invite message contains code, link and activation instruction', () => {
  const code = 'VCM-ABCD-EFGH-JKLM-NPQR';
  const link = 'https://example.com/viva/#invite=VCM-ABCD-EFGH-JKLM-NPQR&room=VivaCubaPilot-ABCDEFGHJKLMNPQRSTUV2345';
  const message = buildInviteMessage(code, link);
  assert.match(message, /VIVA CUBA/);
  assert.match(message, new RegExp(code));
  assert.match(message, /https:\/\/example\.com\/viva\//);
  assert.match(message, /ACTIVAR Y ENTRAR/);
});

test('install platform detection covers mobile and desktop targets', () => {
  assert.equal(detectInstallPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8)'), 'android');
  assert.equal(detectInstallPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'), 'ios');
  assert.equal(detectInstallPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), 'windows');
  assert.equal(detectInstallPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)'), 'mac');
  assert.equal(detectInstallPlatform('Mozilla/5.0 (X11; CrOS x86_64 15917.65.0)'), 'chromeos');
});

test('install UI state distinguishes installed, iOS guide and install prompt', () => {
  assert.deepEqual(installUiState({ platform: 'android', installed: true, promptAvailable: false }), {
    label: 'APP INSTALADA',
    mode: 'installed',
  });
  assert.deepEqual(installUiState({ platform: 'ios', installed: false, promptAvailable: false }), {
    label: 'DESCARGAR APP',
    mode: 'ios-guide',
  });
  assert.deepEqual(installUiState({ platform: 'windows', installed: false, promptAvailable: true }), {
    label: 'DESCARGAR APP',
    mode: 'prompt',
  });
});

test('invalid values are rejected', () => {
  assert.equal(isValidInvite('VIVACUBA'), false);
  assert.equal(isValidRoom('room'), false);
  assert.deepEqual(parseInviteHash('#invite=bad&room=bad'), { invite: '', room: '' });
});
