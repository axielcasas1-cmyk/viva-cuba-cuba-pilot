import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('OWNER persistence bootstrap runs before app without reload loops', () => {
  const html = read('site/index.html');
  const ownerEntry = read('site/owner-entry.js');
  const bootstrap = read('site/owner-bootstrap.js');

  const bootstrapPos = html.indexOf('src="./owner-bootstrap.js"');
  const appPos = html.indexOf('src="./app.js"');
  assert.ok(bootstrapPos >= 0, 'owner-bootstrap.js must be loaded');
  assert.ok(appPos >= 0, 'app.js must be loaded');
  assert.ok(bootstrapPos < appPos, 'OWNER bootstrap must execute before app.js');

  assert.match(bootstrap, /vc_owner_persistent_v1/);
  assert.match(bootstrap, /vc_owner_session_v1/);
  assert.doesNotMatch(bootstrap, /location\.reload\s*\(/);
  assert.doesNotMatch(ownerEntry, /location\.reload\s*\(/, 'OWNER entry must never auto-reload');
});
