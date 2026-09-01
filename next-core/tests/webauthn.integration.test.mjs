import test from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import { persistChallenge, consumeChallenge, beginRegistration } from '../dist-test/server/services/webauthn-service.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL required');
const db = postgres(databaseUrl, {prepare:false, max:1, idle_timeout:1});

async function createIdentity() {
  const suffix = Math.random().toString(36).slice(2,10).toUpperCase().replace(/[^A-Z0-9]/g,'X').padEnd(8,'X').slice(0,8);
  const dx = `DX-${suffix}`;
  const [row] = await db`INSERT INTO identities (dx,label) VALUES (${dx},'WebAuthn Test') RETURNING id::text,dx`;
  return row;
}

async function createDevice(identityId) {
  const [row] = await db`INSERT INTO devices (identity_id,client_device_id,label) VALUES (${identityId},${`test-${crypto.randomUUID()}`},'Passkey test device') RETURNING id::text`;
  return row.id;
}

test('WebAuthn challenge is consumed once and rejects replay', async () => {
  const identity = await createIdentity();
  const challenge = 'challenge-once-123';
  await persistChallenge({identityId:identity.id,purpose:'REGISTER',challenge,payload:{deviceId:'device-test'}});
  const first = await consumeChallenge({identityId:identity.id,purpose:'REGISTER',challenge});
  assert.equal(first.deviceId, 'device-test');
  await assert.rejects(
    () => consumeChallenge({identityId:identity.id,purpose:'REGISTER',challenge}),
    /WEBAUTHN_CHALLENGE_INVALID/
  );
});

test('registration options require user verification and are bound to the DX identity', async () => {
  const identity = await createIdentity();
  const deviceId = await createDevice(identity.id);
  const options = await beginRegistration({identityId:identity.id,deviceId,dx:identity.dx});
  assert.equal(options.rp.id, process.env.RP_ID);
  assert.equal(options.user.name, identity.dx);
  assert.equal(options.authenticatorSelection?.userVerification, 'required');
  assert.equal(options.authenticatorSelection?.residentKey, 'preferred');
  assert.equal(typeof options.challenge, 'string');
  assert.ok(options.challenge.length >= 16);
});

test.after(async () => { await db.end({timeout:1}); });
