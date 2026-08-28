import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const exists = (p) => fs.existsSync(new URL(p, import.meta.url));
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');

const stickersExists = exists('../site/stickers.js');
const stickers = stickersExists ? read('../site/stickers.js') : '';
const index = read('../site/index.html');
const owner = read('../site/owner-user.js');

test('hybrid sticker module exists and supports static plus animated stickers', () => {
  assert.equal(stickersExists, true, 'site/stickers.js must exist');
  assert.match(stickers, /type:\s*['"]static['"]/);
  assert.match(stickers, /type:\s*['"]animated['"]/);
  assert.match(stickers, /RECENTS_KEY/);
  assert.match(stickers, /FAVORITES_KEY/);
});

test('sticker picker exposes recents favorites packs and create sticker', () => {
  assert.match(stickers, /Recientes/);
  assert.match(stickers, /Favoritos/);
  assert.match(stickers, /Packs/);
  assert.match(stickers, /Crear sticker/);
});

test('USER and OWNER can launch the same sticker picker', () => {
  assert.match(index, /id="userStickerButton"/);
  assert.match(owner, /openStickerPicker/);
});

test('custom stickers accept images and animated image formats without copying third-party packs', () => {
  assert.match(stickers, /image\/png/);
  assert.match(stickers, /image\/webp/);
  assert.match(stickers, /image\/gif/);
  assert.match(stickers, /custom/);
});
