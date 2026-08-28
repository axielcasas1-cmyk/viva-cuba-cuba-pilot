import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const callPath = new URL('../site/call.js', import.meta.url);
const callExists = fs.existsSync(callPath);
const call = callExists ? fs.readFileSync(callPath, 'utf8') : '';
const ownerEntry = fs.readFileSync(new URL('../site/owner-entry.js', import.meta.url), 'utf8');

test('VIVA CUBA creates its own full-screen call surface', () => {
  assert.equal(callExists, true, 'site/call.js must exist');
  assert.match(call, /callOverlay/);
  assert.match(call, /jitsiContainer/);
  assert.match(call, /closeCall/);
});

test('embedded call controller uses official Jitsi iframe API without deep-link landing', () => {
  assert.match(call, /external_api\.js/);
  assert.match(call, /JitsiMeetExternalAPI/);
  assert.match(call, /prejoinConfig:\s*\{\s*enabled:\s*false/);
  assert.match(call, /disableDeepLinking:\s*true/);
});

test('call layer intercepts all current videollamada entry points before legacy external handlers', () => {
  for (const id of ['joinCall', 'openHostRoom', 'ownerStartCall', 'ownerShareCall']) {
    assert.match(call, new RegExp(id));
  }
  assert.match(call, /stopImmediatePropagation/);
  assert.match(call, /capture:\s*true/);
});

test('OWNER persistence does not swallow an incoming VIVA CUBA call link', () => {
  assert.match(ownerEntry, /startsWith\('#call='\)/);
  assert.match(ownerEntry, /import '\.\/call\.js'/);
});
