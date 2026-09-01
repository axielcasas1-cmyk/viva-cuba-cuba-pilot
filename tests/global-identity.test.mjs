import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const api = read('../site/lib/desaplicaxi-api.mjs');
const entry = read('../site/global-identity-entry.js');
const ownerEntry = read('../site/owner-entry.js');

test('browser uses only publishable backend access and RPCs', () => {
  assert.match(api, /sb_publishable_/);
  assert.doesNotMatch(api, /service_role|sb_secret_/i);
  assert.match(api, /dx_activate_invitation/);
  assert.match(api, /dx_recover_identity/);
  assert.match(api, /dx_whoami/);
});

test('global activation replaces provisional local DX and persists session token', () => {
  assert.match(entry, /vc_dx_session_v1/);
  assert.match(entry, /activateGlobalInvitation/);
  assert.match(entry, /localStorage\.removeItem\(PROFILE_KEY\)/);
  assert.match(entry, /ACCESO ACTIVADO · DESAPLICAXI/);
  assert.match(entry, /Ya estás dentro de VIVA CUBA/);
  assert.match(entry, /Entrar a VIVA CUBA/);
});

test('recovery rotates VCR through backend and uses the same direct-entry confirmation', () => {
  assert.match(entry, /recoverGlobalIdentity/);
  assert.match(entry, /RECUPERAR IDENTIDAD/);
  assert.match(entry, /recoveryKey/);
  assert.match(entry, /showActivationConfirmation/);
});

test('global identity entry is loaded in the unified USER OWNER runtime', () => {
  assert.match(ownerEntry, /global-identity-entry\.js/);
});
