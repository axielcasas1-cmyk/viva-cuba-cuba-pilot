import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../site/app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');

test('OWNER authorization persists on the device until explicit logout', () => {
  assert.match(app, /localStorage\.setItem\(OWNER_SESSION_KEY/);
  assert.match(app, /localStorage\.getItem\(OWNER_SESSION_KEY/);
  assert.match(app, /localStorage\.removeItem\(OWNER_SESSION_KEY/);
  assert.doesNotMatch(app, /sessionStorage\.(?:setItem|getItem|removeItem)\(OWNER_SESSION_KEY/);
});

test('persistent OWNER automatically reopens OWNER view on later app launches', () => {
  assert.match(app, /ownerPersisted/);
  assert.match(app, /if \(ownerRequested \|\| ownerPersisted\)/);
});

test('OWNER has an explicit logout control', () => {
  assert.match(html, /id="exitOwner"[^>]*>CERRAR SESIÓN OWNER</);
});
