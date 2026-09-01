import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const owner = read('../site/global-owner-entry.js');
const api = read('../site/lib/desaplicaxi-api.mjs');
const entry = read('../site/owner-entry.js');

test('OWNER first claim uses one-time setup RPC and global session', () => {
  assert.match(api, /dx_claim_owner_setup/);
  assert.match(owner, /vc_dx_owner_session_v1/);
  assert.match(owner, /claimGlobalOwner/);
  assert.match(owner, /SETUP-/);
  assert.match(owner, /stopImmediatePropagation/);
});

test('OWNER invite generator is authoritative backend, not local VCM generation', () => {
  assert.match(api, /dx_issue_invitation/);
  assert.match(owner, /issueGlobalInvitation/);
  assert.match(owner, /currentGlobalInvite/);
  assert.match(owner, /GENERANDO INVITACIÓN GLOBAL/);
});

test('unified runtime loads global OWNER bridge', () => {
  assert.match(entry, /global-owner-entry\.js/);
});

test('explicit OWNER logout revokes global session token', () => {
  assert.match(owner, /logoutGlobal/);
  assert.match(owner, /OWNER_TOKEN_KEY/);
});
