import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ownerEntry = fs.readFileSync(new URL('../site/owner-entry.js', import.meta.url), 'utf8');

test('OWNER authorization persists on the device until explicit logout', () => {
  assert.match(ownerEntry, /OWNER_PERSIST_KEY/);
  assert.match(ownerEntry, /localStorage\.setItem\(OWNER_PERSIST_KEY, 'unlocked'\)/);
  assert.match(ownerEntry, /localStorage\.getItem\(OWNER_PERSIST_KEY\)/);
  assert.match(ownerEntry, /localStorage\.removeItem\(OWNER_PERSIST_KEY\)/);
});

test('persistent OWNER restores the temporary session bridge and reopens OWNER', () => {
  assert.match(ownerEntry, /sessionStorage\.setItem\(OWNER_SESSION_KEY, 'unlocked'\)/);
  assert.match(ownerEntry, /restorePersistentOwner/);
  assert.match(ownerEntry, /#owner/);
});

test('invite links are never hijacked by persistent OWNER mode', () => {
  assert.match(ownerEntry, /startsWith\('#invite='\)/);
});

test('OWNER closes only through an explicit confirmed logout action', () => {
  assert.match(ownerEntry, /CERRAR SESIÓN OWNER/);
  assert.match(ownerEntry, /window\.confirm\('¿Cerrar la sesión OWNER persistente en este dispositivo\?'\)/);
});
