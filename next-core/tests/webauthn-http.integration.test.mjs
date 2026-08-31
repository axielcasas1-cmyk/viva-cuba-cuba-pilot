import test from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import registerOptions from '../dist-test/api/passkeys/register/options.js';
import registerVerify from '../dist-test/api/passkeys/register/verify.js';
import authOptions from '../dist-test/api/passkeys/authenticate/options.js';
import authVerify from '../dist-test/api/passkeys/authenticate/verify.js';
import {sha256} from '../dist-test/server/crypto.js';

const enabled=!!process.env.DATABASE_URL;

function mockResponse(){
  let statusCode=200,body,headers={};
  return {
    status(code){statusCode=code;return this;},
    json(value){body=value;},
    setHeader(name,value){headers[name]=value;},
    snapshot(){return {statusCode,body,headers};}
  };
}

async function seedSession(){
  const sql=postgres(process.env.DATABASE_URL,{prepare:false,max:1});
  try{
    await sql.unsafe('TRUNCATE audit_events, owner_admin_devices, owner_policy, webauthn_challenges, webauthn_credentials, sessions, recovery_secrets, devices, invitations, identities RESTART IDENTITY CASCADE');
    const [identity]=await sql`INSERT INTO identities (dx,label) VALUES ('DX-HTTP0001','HTTP Test') RETURNING id::text`;
    const [device]=await sql`INSERT INTO devices (identity_id,client_device_id,label) VALUES (${identity.id},'http-device-0001','HTTP Device') RETURNING id::text`;
    const token='passkey-http-session-token';
    const [session]=await sql`INSERT INTO sessions (identity_id,device_id,token_hash,aal,expires_at) VALUES (${identity.id},${device.id},${sha256(token)},1,now()+interval '1 hour') RETURNING id::text`;
    return {sql,identityId:identity.id,deviceId:device.id,sessionId:session.id,token};
  }catch(e){await sql.end();throw e;}
}

for (const [name,handler] of [['register/options',registerOptions],['register/verify',registerVerify],['authenticate/options',authOptions],['authenticate/verify',authVerify]]) {
  test(`${name} rejects non-POST requests`, {skip:!enabled}, async()=>{
    const res=mockResponse();
    await handler({method:'GET',headers:{}},res);
    assert.equal(res.snapshot().statusCode,405);
    assert.deepEqual(res.snapshot().body,{error:'METHOD_NOT_ALLOWED'});
  });
}

test('passkey endpoints require a server-side authenticated session', {skip:!enabled}, async()=>{
  const res=mockResponse();
  await registerOptions({method:'POST',headers:{}},res);
  assert.equal(res.snapshot().statusCode,401);
  assert.deepEqual(res.snapshot().body,{error:'UNAUTHORIZED'});
});

test('register options are derived from session identity and device, never client supplied ids', {skip:!enabled}, async()=>{
  const seeded=await seedSession();
  try{
    const res=mockResponse();
    await registerOptions({method:'POST',body:{identityId:'attacker',deviceId:'attacker'},headers:{cookie:`vc_session=${seeded.token}`}},res);
    const snap=res.snapshot();
    assert.equal(snap.statusCode,200);
    assert.equal(typeof snap.body.challenge,'string');
    assert.equal(snap.body.user.name,'DX-HTTP0001');
    const [challenge]=await seeded.sql`SELECT identity_id::text,purpose,payload FROM webauthn_challenges ORDER BY created_at DESC LIMIT 1`;
    assert.equal(challenge.identity_id,seeded.identityId);
    assert.equal(challenge.purpose,'REGISTER');
    assert.equal(challenge.payload.deviceId,seeded.deviceId);
  }finally{await seeded.sql.end();}
});

test('authentication options expose only active credentials for the authenticated DX identity', {skip:!enabled}, async()=>{
  const seeded=await seedSession();
  try{
    await seeded.sql`INSERT INTO webauthn_credentials (identity_id,device_id,credential_id,public_key,counter,transports) VALUES (${seeded.identityId},${seeded.deviceId},'cred-http-0001',${Buffer.from([1,2,3])},0,${['internal']})`;
    const res=mockResponse();
    await authOptions({method:'POST',headers:{cookie:`vc_session=${seeded.token}`}},res);
    const snap=res.snapshot();
    assert.equal(snap.statusCode,200);
    assert.equal(snap.body.userVerification,'required');
    assert.deepEqual(snap.body.allowCredentials.map(x=>x.id),['cred-http-0001']);
  }finally{await seeded.sql.end();}
});

test('verify routes validate response shape before invoking cryptographic verification', {skip:!enabled}, async()=>{
  const seeded=await seedSession();
  try{
    for (const handler of [registerVerify,authVerify]) {
      const res=mockResponse();
      await handler({method:'POST',body:{identityId:'attacker',sessionId:'attacker'},headers:{cookie:`vc_session=${seeded.token}`}},res);
      assert.equal(res.snapshot().statusCode,400);
      assert.deepEqual(res.snapshot().body,{error:'PASSKEY_RESPONSE_REQUIRED'});
    }
  }finally{await seeded.sql.end();}
});
