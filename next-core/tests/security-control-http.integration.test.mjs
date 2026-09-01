import test from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import listHandler from '../dist-test/api/security/list.js';
import revokeSessionHandler from '../dist-test/api/security/revoke-session.js';
import revokeDeviceHandler from '../dist-test/api/security/revoke-device.js';
import {sha256} from '../dist-test/server/crypto.js';

const enabled=!!process.env.DATABASE_URL;
function response(){let statusCode=200,body,headers={};return{status(c){statusCode=c;return this;},json(v){body=v;},setHeader(k,v){headers[k]=v;},snapshot(){return{statusCode,body,headers};}};}
async function seed(){
  const sql=postgres(process.env.DATABASE_URL,{prepare:false,max:1});
  await sql.unsafe('TRUNCATE audit_events, owner_admin_devices, owner_policy, webauthn_challenges, webauthn_credentials, sessions, recovery_secrets, devices, invitations, identities RESTART IDENTITY CASCADE');
  const [a]=await sql`INSERT INTO identities (dx,label) VALUES ('DX-HTTPSEC1','HTTP Security A') RETURNING id::text`;
  const [b]=await sql`INSERT INTO identities (dx,label) VALUES ('DX-HTTPSEC2','HTTP Security B') RETURNING id::text`;
  const [a1]=await sql`INSERT INTO devices (identity_id,client_device_id,label,trusted) VALUES (${a.id},'http-sec-a1','A current',true) RETURNING id::text`;
  const [a2]=await sql`INSERT INTO devices (identity_id,client_device_id,label,trusted) VALUES (${a.id},'http-sec-a2','A other',true) RETURNING id::text`;
  const [b1]=await sql`INSERT INTO devices (identity_id,client_device_id,label,trusted) VALUES (${b.id},'http-sec-b1','B device',true) RETURNING id::text`;
  const token='http-security-current-token';
  const [s1]=await sql`INSERT INTO sessions (identity_id,device_id,token_hash,aal,aal2_expires_at,expires_at) VALUES (${a.id},${a1.id},${sha256(token)},2,now()+interval '5 minutes',now()+interval '1 hour') RETURNING id::text`;
  const [s2]=await sql`INSERT INTO sessions (identity_id,device_id,token_hash,aal,expires_at) VALUES (${a.id},${a2.id},${sha256('http-security-other-token')},1,now()+interval '1 hour') RETURNING id::text`;
  const [sb]=await sql`INSERT INTO sessions (identity_id,device_id,token_hash,aal,expires_at) VALUES (${b.id},${b1.id},${sha256('http-security-b-token')},1,now()+interval '1 hour') RETURNING id::text`;
  await sql`INSERT INTO webauthn_credentials (identity_id,device_id,credential_id,public_key,counter,transports) VALUES (${a.id},${a2.id},'http-security-cred-a2',${Buffer.from([1,2,3])},0,${['internal']})`;
  return {sql,a,b,a1,a2,b1,s1,s2,sb,token};
}

test('security list is GET-only and revocations are POST-only', {skip:!enabled}, async()=>{
  let res=response();await listHandler({method:'POST',headers:{}},res);assert.equal(res.snapshot().statusCode,405);
  for(const handler of [revokeSessionHandler,revokeDeviceHandler]){res=response();await handler({method:'GET',headers:{}},res);assert.equal(res.snapshot().statusCode,405);}
});

test('security endpoints require authenticated server session', {skip:!enabled}, async()=>{
  for(const [method,handler] of [['GET',listHandler],['POST',revokeSessionHandler],['POST',revokeDeviceHandler]]){const res=response();await handler({method,headers:{},body:{}},res);assert.equal(res.snapshot().statusCode,401);assert.deepEqual(res.snapshot().body,{error:'UNAUTHORIZED'});}
});

test('security list exposes only authenticated DX resources and marks current records', {skip:!enabled}, async()=>{
  const x=await seed();try{
    const res=response();await listHandler({method:'GET',headers:{cookie:`vc_session=${x.token}`},body:{identityId:x.b.id}},res);
    const snap=res.snapshot();assert.equal(snap.statusCode,200);assert.equal(snap.body.identity.id,x.a.id);
    assert.deepEqual(snap.body.devices.map(d=>d.id).sort(),[x.a1.id,x.a2.id].sort());
    assert.deepEqual(snap.body.sessions.map(s=>s.id).sort(),[x.s1.id,x.s2.id].sort());
    assert.equal(snap.body.devices.find(d=>d.id===x.a1.id).current,true);
    assert.equal(snap.body.sessions.find(s=>s.id===x.s1.id).current,true);
  }finally{await x.sql.end();}
});

test('revocation routes require target ids and ignore attacker identity/session context', {skip:!enabled}, async()=>{
  const x=await seed();try{
    let res=response();await revokeSessionHandler({method:'POST',headers:{cookie:`vc_session=${x.token}`},body:{}},res);assert.equal(res.snapshot().statusCode,400);assert.deepEqual(res.snapshot().body,{error:'SECURITY_TARGET_SESSION_REQUIRED'});
    res=response();await revokeDeviceHandler({method:'POST',headers:{cookie:`vc_session=${x.token}`},body:{}},res);assert.equal(res.snapshot().statusCode,400);assert.deepEqual(res.snapshot().body,{error:'SECURITY_TARGET_DEVICE_REQUIRED'});
    res=response();await revokeSessionHandler({method:'POST',headers:{cookie:`vc_session=${x.token}`},body:{targetSessionId:x.sb.id,identityId:x.b.id,sessionId:x.sb.id}},res);assert.equal(res.snapshot().statusCode,404);assert.deepEqual(res.snapshot().body,{error:'SECURITY_TARGET_NOT_FOUND'});
  }finally{await x.sql.end();}
});

test('revocation requires live AAL2 and protects current session/device', {skip:!enabled}, async()=>{
  const x=await seed();try{
    let res=response();await revokeSessionHandler({method:'POST',headers:{cookie:`vc_session=${x.token}`},body:{targetSessionId:x.s1.id}},res);assert.equal(res.snapshot().statusCode,409);assert.deepEqual(res.snapshot().body,{error:'SECURITY_CURRENT_SESSION_PROTECTED'});
    res=response();await revokeDeviceHandler({method:'POST',headers:{cookie:`vc_session=${x.token}`},body:{targetDeviceId:x.a1.id}},res);assert.equal(res.snapshot().statusCode,409);assert.deepEqual(res.snapshot().body,{error:'SECURITY_CURRENT_DEVICE_PROTECTED'});
    await x.sql`UPDATE sessions SET aal2_expires_at=now()-interval '1 minute' WHERE id=${x.s1.id}`;
    res=response();await revokeSessionHandler({method:'POST',headers:{cookie:`vc_session=${x.token}`},body:{targetSessionId:x.s2.id}},res);assert.equal(res.snapshot().statusCode,403);assert.deepEqual(res.snapshot().body,{error:'SECURITY_AAL2_REQUIRED'});
  }finally{await x.sql.end();}
});

test('successful device revocation cascades sessions and passkeys through HTTP boundary', {skip:!enabled}, async()=>{
  const x=await seed();try{
    const res=response();await revokeDeviceHandler({method:'POST',headers:{cookie:`vc_session=${x.token}`},body:{targetDeviceId:x.a2.id}},res);assert.equal(res.snapshot().statusCode,200);assert.deepEqual(res.snapshot().body,{ok:true});
    const [device]=await x.sql`SELECT status,trusted FROM devices WHERE id=${x.a2.id}`;assert.equal(device.status,'REVOKED');assert.equal(device.trusted,false);
    const [session]=await x.sql`SELECT status FROM sessions WHERE id=${x.s2.id}`;assert.equal(session.status,'REVOKED');
    const [cred]=await x.sql`SELECT status FROM webauthn_credentials WHERE credential_id='http-security-cred-a2'`;assert.equal(cred.status,'REVOKED');
  }finally{await x.sql.end();}
});
