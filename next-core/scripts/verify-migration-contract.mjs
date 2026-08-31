import fs from 'node:fs';

const root = new URL('../../', import.meta.url);
const read = (path) => JSON.parse(fs.readFileSync(new URL(path, root), 'utf8'));
const contract = read('docs/migrations/next-core-contract.json');
const snapshots = read('docs/migrations/appdeploy-snapshots.json');

const failures = [];
if (snapshots.v18?.version !== '1787770673468') failures.push('v18 snapshot mismatch');
if (snapshots.v35?.version !== '1787870459426') failures.push('v35 snapshot mismatch');
if (contract.identity?.phoneIndependent !== true) failures.push('phone-independent identity invariant missing');
if (contract.calls?.oneToOne !== 'webrtc-p2p-turn') failures.push('1:1 WebRTC invariant missing');
if (contract.calls?.jitsiCanonical !== false) failures.push('Jitsi must not be canonical');
if (contract.routes?.publicDefault !== '/' || contract.routes?.owner !== '/owner') failures.push('USER/OWNER route invariant mismatch');
if (contract.crypto?.plaintextMessagesServerSide !== false) failures.push('plaintext message storage forbidden');
if (contract.optionalModulesMayBlockCore !== false) failures.push('optional-module isolation invariant missing');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('NEXT CORE migration contract: OK');
