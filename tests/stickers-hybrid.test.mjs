import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const exists = (p) => fs.existsSync(new URL(p, import.meta.url));
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');

const stickersExists = exists('../site/stickers.js');
const stickers = stickersExists ? read('../site/stickers.js') : '';
const userEntry = read('../site/stickers-entry.js');
const ownerEntry = read('../site/owner-stickers.js');

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

test('USER and OWNER launch the same sticker picker engine', () => {
  assert.match(userEntry, /id = 'userStickerPanel'|id = "userStickerPanel"|id='userStickerPanel'/);
  assert.match(userEntry, /userStickerButton/);
  assert.match(userEntry, /openStickerPicker/);
  assert.match(ownerEntry, /openStickerPicker/);
  assert.match(ownerEntry, /#ownerSticker/);
});

test('custom stickers accept images and animated image formats without copying third-party packs', () => {
  assert.match(stickers, /image\/png/);
  assert.match(stickers, /image\/webp/);
  assert.match(stickers, /image\/gif/);
  assert.match(stickers, /custom/);
});
