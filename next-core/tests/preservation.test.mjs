import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const contractPath = new URL('../../docs/migrations/next-core-contract.json', import.meta.url);
const snapshotsPath = new URL('../../docs/migrations/appdeploy-snapshots.json', import.meta.url);

test('NEXT CORE preservation metadata locks v18, v35 and transport invariants', () => {
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  const snapshots = JSON.parse(fs.readFileSync(snapshotsPath, 'utf8'));
  assert.equal(snapshots.v18.version, '1787770673468');
  assert.equal(snapshots.v35.version, '1787870459426');
  assert.equal(contract.identity.phoneIndependent, true);
  assert.equal(contract.calls.oneToOne, 'webrtc-p2p-turn');
  assert.equal(contract.calls.jitsiCanonical, false);
  assert.equal(contract.routes.publicDefault, '/');
  assert.equal(contract.routes.owner, '/owner');
});
