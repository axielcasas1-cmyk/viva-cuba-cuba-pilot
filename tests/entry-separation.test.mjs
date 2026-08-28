import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('public root never auto-restores OWNER even when device authorization persists', () => {
  const ownerEntry = read('site/owner-entry.js');
  assert.match(ownerEntry, /if \(hash !== '#owner'\) return;/);
});

test('explicit OWNER route remains available and app does not erase it before OWNER restore', () => {
  const app = read('site/app.js');
  assert.match(app, /const ownerRequested = isOwnerRoute\(location\.hash\)/);
  assert.doesNotMatch(app, /if \(ownerRequested\) \{\s*history\.replaceState/);
});

test('install button uses browser install prompt directly when available', () => {
  const install = read('site/install.js');
  assert.match(install, /if \(bridgeReady\(\)\)/);
  assert.match(install, /installBridge\.click\(\)/);
});
