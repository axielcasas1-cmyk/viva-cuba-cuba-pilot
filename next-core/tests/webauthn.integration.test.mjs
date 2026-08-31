import test from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import { persistChallenge, consumeChallenge } from '../dist-test/server/services/webauthn-service.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL required');
const db = postgres(databaseUrl, {prepare:false, max:1, idle_timeout:1});

async function createIdentity() {
  const suffix = Math.random().toString(36).slice(2,10).toUpperCase().replace(/[^A-Z0-9]/g,'X').padEnd(8,'X').slice(0,8);
  const [row] = await db`INSERT INTO identities (dx,label) VALUES (${`DX-${suffix}`},'WebAuthn Test') RETURNING id::text`;
  return row.id;
}

test('WebAuthn challenge is consumed once and rejects replay', async () => {
  const identityId = await createIdentity();
  const challenge = 'challenge-once-123';
  await persistChallenge({identityId,purpose:'REGISTER',challenge,payload:{deviceId:'device-test'}});
  const first = await consumeChallenge({identityId,purpose:'REGISTER',challenge});
  assert.equal(first.deviceId, 'device-test');
  await assert.rejects(
    () => consumeChallenge({identityId,purpose:'REGISTER',challenge}),
    /WEBAUTHN_CHALLENGE_INVALID/
  );
});

test.after(async () => { await db.end({timeout:1}); });
