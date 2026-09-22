import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const html = read('../site/index.html');
const app = read('../site/app.js');
const identity = read('../site/global-identity-entry.js');
const owner = read('../site/global-owner-entry.js');
const styles = read('../site/styles.css');

test('OWNER exposes a dedicated authoritative Mami invite action', () => {
  assert.match(html, /id="generateMamiInvite"/);
  assert.match(owner, /issueGlobalInvitation/);
  assert.match(owner, /MODO MAMI · CUBA/);
  assert.match(owner, /&mode=mami/);
});

test('Mami invite intent survives fragment cleanup and carries the call room', () => {
  assert.match(app, /hashParams\.get\('mode'\)/);
  assert.match(app, /vc_mami_pending_v1/);
  assert.match(app, /vc_mami_room_v1/);
  assert.match(app, /sessionStorage\.setItem\(MAMI_ROOM_KEY/);
});

test('Mami activation is automatic and remains DESAPLICAXI-authoritative', () => {
  assert.match(identity, /activateGlobalInvitation\(code, name\)/);
  assert.match(identity, /globalizeActivation\(\{ mami: true \}\)/);
  assert.match(identity, /const name = mami \? 'Mami'/);
  assert.match(identity, /mode: mami \? 'mami'/);
});

test('Mami home removes technical surfaces and leaves the Axiel call CTA', () => {
  assert.match(identity, /LLAMAR A AXIEL/);
  assert.match(identity, /document\.body\.classList\.toggle\('mami-mode'/);
  assert.match(styles, /body\.mami-mode \.hero-panel/);
  assert.match(styles, /body\.mami-mode \.info-grid/);
  assert.match(styles, /body\.mami-mode \.actions-panel/);
  assert.match(styles, /body\.mami-mode #joinCall/);
});

test('Mami activation does not expose the VCR confirmation sheet', () => {
  assert.match(identity, /if \(mami\) \{[\s\S]*renderGlobalHome\(profile\);[\s\S]*\} else \{[\s\S]*showActivationConfirmation\(result, profile\);/);
});
