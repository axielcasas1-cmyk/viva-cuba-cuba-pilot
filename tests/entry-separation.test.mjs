import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('public root never auto-restores OWNER even when device authorization persists', () => {
  const ownerEntry = read('site/owner-entry.js');
  assert.match(ownerEntry, /if \(!isExplicitOwnerRoute\(\)\) return;/);
  assert.match(ownerEntry, /URLSearchParams\(location\.search\)/);
  assert.match(ownerEntry, /params\.get\(OWNER_MODE_PARAM\) === 'owner'/);
});

test('OWNER mode is explicit and public logout removes it from the URL', () => {
  const ownerEntry = read('site/owner-entry.js');
  assert.match(ownerEntry, /url\.searchParams\.set\(OWNER_MODE_PARAM, 'owner'\)/);
  assert.match(ownerEntry, /url\.searchParams\.delete\(OWNER_MODE_PARAM\)/);
  assert.match(ownerEntry, /setPublicUrl\(\)/);
});

test('install button uses browser install prompt directly when available', () => {
  const install = read('site/install.js');
  assert.match(install, /if \(bridgeReady\(\)\)/);
  assert.match(install, /installBridge\.click\(\)/);
});
