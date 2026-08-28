import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../site/app.js', import.meta.url), 'utf8');
const owner = fs.readFileSync(new URL('../site/owner-user.js', import.meta.url), 'utf8');
const callPath = new URL('../site/call.js', import.meta.url);
const callExists = fs.existsSync(callPath);
const call = callExists ? fs.readFileSync(callPath, 'utf8') : '';

test('VIVA CUBA owns a full-screen embedded call surface', () => {
  assert.match(html, /id="callOverlay"/);
  assert.match(html, /id="jitsiContainer"/);
  assert.match(html, /id="closeCall"/);
});

test('embedded call controller uses the official Jitsi iframe API', () => {
  assert.equal(callExists, true, 'site/call.js must exist');
  assert.match(call, /external_api\.js/);
  assert.match(call, /JitsiMeetExternalAPI/);
  assert.match(call, /prejoinConfig:\s*\{\s*enabled:\s*false/);
  assert.match(call, /disableDeepLinking:\s*true/);
});

test('user and OWNER call actions no longer open meet.jit.si as a separate page', () => {
  assert.doesNotMatch(app, /window\.open\(`https:\/\/meet\.jit\.si/);
  assert.doesNotMatch(owner, /window\.open\(url, '_blank'/);
  assert.match(app, /openEmbeddedCall/);
  assert.match(owner, /openEmbeddedCall/);
});
