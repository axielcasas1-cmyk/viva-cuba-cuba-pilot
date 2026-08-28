import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const ownerEntry = read('../site/owner-entry.js');
const sw = read('../site/sw.js');
const version = read('../site/version.js');

test('OWNER bootstrap never hard-imports optional sticker modules', () => {
  assert.doesNotMatch(ownerEntry, /^import ['"]\.\/stickers-entry\.js['"];?$/m);
  assert.doesNotMatch(ownerEntry, /^import ['"]\.\/owner-stickers\.js['"];?$/m);
  assert.match(ownerEntry, /loadOptionalStickerModules/);
  assert.match(ownerEntry, /Promise\.allSettled/);
});

test('offline critical shell excludes optional sticker modules', () => {
  assert.match(sw, /v0\.7\.2/);
  const shellBlock = sw.match(/const SHELL = \[([\s\S]*?)\];/)?.[1] || '';
  assert.doesNotMatch(shellBlock, /stickers\.js/);
  assert.doesNotMatch(shellBlock, /stickers-entry\.js/);
  assert.doesNotMatch(shellBlock, /owner-stickers\.js/);
});

test('recovery release uses a small explicit version', () => {
  assert.match(version, /VERSION = ['"]0\.7\.2['"]/);
});
