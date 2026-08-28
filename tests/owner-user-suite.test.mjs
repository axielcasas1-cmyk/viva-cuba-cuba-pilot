import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../site/owner-user.js', import.meta.url), 'utf8');

test('OWNER view contains a complete personal user workspace before administration', () => {
  const personal = html.indexOf('id="ownerUserWorkspace"');
  const admin = html.indexOf('id="ownerAdminWorkspace"');
  assert.ok(personal >= 0, 'owner personal workspace missing');
  assert.ok(admin > personal, 'admin workspace must appear below personal workspace');
});

test('OWNER personal workspace exposes operational user controls', () => {
  for (const id of [
    'ownerPersonalDx','copyOwnerDx','ownerContactName','ownerContactDx','addOwnerContact',
    'ownerContacts','ownerMessageText','ownerEmoji','ownerSticker','ownerSendMessage',
    'ownerStartCall','ownerShareFile','ownerFileInput','ownerShareLocation','ownerActivity'
  ]) assert.match(html, new RegExp(`id="${id}"`), `missing ${id}`);
});

test('OWNER user controller wires all communication functions', () => {
  for (const token of [
    'copyOwnerDx','addOwnerContact','ownerSendMessage','ownerStartCall',
    'ownerShareFile','ownerShareLocation','navigator.geolocation','navigator.share'
  ]) assert.match(js, new RegExp(token));
});

test('OWNER personal identity and contacts persist locally for pilot continuity', () => {
  assert.match(js, /vc_owner_personal_v1/);
  assert.match(js, /vc_owner_contacts_v1/);
  assert.match(js, /localStorage/);
});
