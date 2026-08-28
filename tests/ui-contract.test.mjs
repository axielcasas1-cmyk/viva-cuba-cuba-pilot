import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../site/app.js', import.meta.url), 'utf8');
const install = fs.readFileSync(new URL('../site/install.js', import.meta.url), 'utf8');
const ownerEntry = fs.readFileSync(new URL('../site/owner-entry.js', import.meta.url), 'utf8');

test('public shell exposes a visible OWNER entry button', () => {
  assert.match(html, /id="openOwnerPortal"/);
  assert.match(html, /ACCESO OWNER/);
  assert.match(ownerEntry, /openOwnerPortal/);
});

test('app.js is the single beforeinstallprompt owner', () => {
  assert.match(app, /beforeinstallprompt/);
  assert.doesNotMatch(install, /beforeinstallprompt/);
});

test('visible download button delegates to the hidden install bridge', () => {
  assert.match(html, /id="downloadAppPrimary"/);
  assert.match(html, /id="installApp"[^>]*install-bridge/);
  assert.match(install, /installApp/);
});

test('download assistant has a visible guide surface', () => {
  assert.match(html, /id="downloadGuide"/);
  assert.match(html, /id="closeDownloadGuide"/);
  assert.match(install, /downloadGuide/);
  assert.match(install, /closeDownloadGuide/);
});

test('OWNER invite action buttons start disabled until an invite exists', () => {
  for (const id of ['copyCode', 'copyLink', 'shareInvite', 'copyMessage', 'openHostRoom']) {
    assert.match(html, new RegExp(`id="${id}"[^>]*disabled`));
    assert.match(ownerEntry, new RegExp(id));
  }
});
