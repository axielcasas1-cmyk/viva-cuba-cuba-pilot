import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('persistent OWNER restores directly without a reload loop', () => {
  const ownerEntry = read('site/owner-entry.js');

  assert.match(ownerEntry, /vc_owner_persistent_v1/);
  assert.match(ownerEntry, /vc_owner_session_v1/);
  assert.match(ownerEntry, /restorePersistentOwner/);
  assert.match(ownerEntry, /ownerView/);
  assert.match(ownerEntry, /ownerGate/);
  assert.doesNotMatch(ownerEntry, /location\.reload\s*\(/, 'OWNER entry must never reload the page');
});
