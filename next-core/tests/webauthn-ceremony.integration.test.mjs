import test from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import {beginRegistration, finishRegistration, beginAuthentication} from '../dist-test/server/services/webauthn-service.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL required');
const db = postgres(databaseUrl, {prepare:false, max:1, idle_timeout:1});

const b64url = value => Buffer.from(value).toString('base64url');

async function identityFixture(label='Ceremony Test') {
  const suffix = crypto.randomUUID().replaceAll('-','').slice(0,8).toUpperCase();
  const dx = `DX-${suffix}`;
  const [identity] = await db`INSERT INTO identities (dx,label) VALUES (${dx},${label}) RETURNING id::text,dx`;
  const [device] = await db`INSERT INTO devices (identity_id,client_device_id,label) VALUES (${identity.id},${`dev-${crypto.randomUUID()}`},'Ceremony device') RETURNING id::text`;
  return {identity,device};
}

test('invalid registration consumes its challenge and cannot be replayed', async () => {
  const {identity,device} = await identityFixture();
  const options = await beginRegistration({identityId:identity.id,deviceId:device.id,dx:identity.dx});
  const clientDataJSON = b64url(JSON.stringify({
    type:'webauthn.create',
    challenge:options.challenge,
    origin:process.env.RP_ORIGIN,
    crossOrigin:false
  }));
  const invalidResponse = {
    id:`invalid-${crypto.randomUUID()}`,
    rawId:`invalid-${crypto.randomUUID()}`,
    type:'public-key',
    response:{clientDataJSON,attestationObject:'AA'},
    clientExtensionResults:{},
    authenticatorAttachment:'platform'
  };
  await assert.rejects(() => finishRegistration({identityId:identity.id,response:invalidResponse}));
  await assert.rejects(
    () => finishRegistration({identityId:identity.id,response:invalidResponse}),
    /WEBAUTHN_CHALLENGE_INVALID/
  );
});

test('authentication options expose only active credentials belonging to the DX identity', async () => {
  const first = await identityFixture('First identity');
  const second = await identityFixture('Second identity');
  const firstCred = `cred-${crypto.randomUUID()}`;
  const revokedCred = `revoked-${crypto.randomUUID()}`;
  const secondCred = `foreign-${crypto.randomUUID()}`;
  await db`INSERT INTO webauthn_credentials (identity_id,device_id,credential_id,public_key,counter,transports) VALUES (${first.identity.id},${first.device.id},${firstCred},${Buffer.from([1,2,3])},0,${['internal']})`;
  await db`INSERT INTO webauthn_credentials (identity_id,device_id,credential_id,public_key,counter,transports,status) VALUES (${first.identity.id},${first.device.id},${revokedCred},${Buffer.from([1,2,3])},0,${['internal']},'REVOKED')`;
  await db`INSERT INTO webauthn_credentials (identity_id,device_id,credential_id,public_key,counter,transports) VALUES (${second.identity.id},${second.device.id},${secondCred},${Buffer.from([1,2,3])},0,${['internal']})`;
  const options = await beginAuthentication({identityId:first.identity.id});
  assert.equal(options.userVerification, 'required');
  assert.deepEqual(options.allowCredentials?.map(item=>item.id), [firstCred]);
  assert.equal(typeof options.challenge, 'string');
  assert.ok(options.challenge.length >= 16);
});

test.after(async () => { await db.end({timeout:1}); });
