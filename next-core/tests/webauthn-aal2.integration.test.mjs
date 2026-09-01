import test from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import {persistCredential, upgradeSessionAal2} from '../dist-test/server/services/webauthn-service.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL required');
const db = postgres(databaseUrl, {prepare:false, max:1, idle_timeout:1});

async function fixture() {
  const suffix = crypto.randomUUID().replaceAll('-','').slice(0,8).toUpperCase();
  const [identity] = await db`INSERT INTO identities (dx,label) VALUES (${`DX-${suffix}`},'AAL2 Test') RETURNING id::text`;
  const [device] = await db`INSERT INTO devices (identity_id,client_device_id,label) VALUES (${identity.id},${`dev-${crypto.randomUUID()}`},'AAL2 device') RETURNING id::text`;
  const [first] = await db`INSERT INTO sessions (identity_id,device_id,token_hash,aal,expires_at) VALUES (${identity.id},${device.id},${`tok-${crypto.randomUUID()}`},1,now()+interval '1 day') RETURNING id::text`;
  const [second] = await db`INSERT INTO sessions (identity_id,device_id,token_hash,aal,expires_at) VALUES (${identity.id},${device.id},${`tok-${crypto.randomUUID()}`},1,now()+interval '1 day') RETURNING id::text`;
  return {identityId:identity.id,deviceId:device.id,firstSessionId:first.id,secondSessionId:second.id};
}

test('verified passkey persistence stores public credential and trusts only its device', async () => {
  const f = await fixture();
  await persistCredential({
    identityId:f.identityId,
    deviceId:f.deviceId,
    credential:{id:`cred-${crypto.randomUUID()}`,publicKey:new Uint8Array([1,2,3,4]),counter:0,transports:['internal']}
  });
  const [credential] = await db`SELECT identity_id::text,device_id::text,counter,transports FROM webauthn_credentials WHERE identity_id=${f.identityId}`;
  const [device] = await db`SELECT trusted FROM devices WHERE id=${f.deviceId}`;
  assert.equal(credential.identity_id, f.identityId);
  assert.equal(credential.device_id, f.deviceId);
  assert.equal(Number(credential.counter), 0);
  assert.deepEqual(credential.transports, ['internal']);
  assert.equal(device.trusted, true);
});

test('passkey step-up elevates only the current session to AAL2 for about ten minutes', async () => {
  const f = await fixture();
  const before = Date.now();
  await upgradeSessionAal2({sessionId:f.firstSessionId,identityId:f.identityId});
  const rows = await db`SELECT id::text,aal,aal2_expires_at FROM sessions WHERE id IN (${f.firstSessionId},${f.secondSessionId}) ORDER BY id`;
  const first = rows.find(row=>row.id===f.firstSessionId);
  const second = rows.find(row=>row.id===f.secondSessionId);
  assert.equal(Number(first.aal), 2);
  assert.ok(first.aal2_expires_at instanceof Date);
  assert.ok(first.aal2_expires_at.getTime() >= before + 9 * 60 * 1000);
  assert.ok(first.aal2_expires_at.getTime() <= before + 11 * 60 * 1000);
  assert.equal(Number(second.aal), 1);
  assert.equal(second.aal2_expires_at, null);
});

test.after(async () => { await db.end({timeout:1}); });
