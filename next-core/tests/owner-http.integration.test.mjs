import test from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import bootstrapHandler from '../dist-test/api/owner/bootstrap.js';
import recoverHandler from '../dist-test/api/owner/recover.js';
import meHandler from '../dist-test/api/owner/me.js';
import {OwnerService} from '../dist-test/server/services/owner-service.js';
import {PostgresCoreRepository} from '../dist-test/server/repositories/postgres-core-repository.js';
import {sha256} from '../dist-test/server/crypto.js';

const enabled=!!process.env.DATABASE_URL;
function response(){let statusCode=200,body,headers={};return{status(c){statusCode=c;return this;},json(v){body=v;},setHeader(k,v){headers[k]=v;},snapshot(){return{statusCode,body,headers};}};}
async function seed(){
  const sql=postgres(process.env.DATABASE_URL,{prepare:false,max:1});
  await sql.unsafe('TRUNCATE audit_events, owner_admin_devices, owner_policy, webauthn_challenges, webauthn_credentials, sessions, recovery_secrets, devices, invitations, identities RESTART IDENTITY CASCADE');
  const [identity]=await sql`INSERT INTO identities (dx,label) VALUES ('DX-OWNERAPI','Owner API') RETURNING id::text,dx,label`;
  const [device]=await sql`INSERT INTO devices (identity_id,client_device_id,label,trusted) VALUES (${identity.id},'owner-api-device-0001','Owner API Device',true) RETURNING id::text`;
  const token='owner-api-session-token';
  const [session]=await sql`INSERT INTO sessions (identity_id,device_id,token_hash,aal,aal2_expires_at,expires_at) VALUES (${identity.id},${device.id},${sha256(token)},2,now()+interval '10 minutes',now()+interval '1 hour') RETURNING id::text`;
  return {sql,identity,device,session,token};
}

test('OWNER mutation endpoints are POST-only and me is GET-only', {skip:!enabled}, async()=>{
  for(const handler of [bootstrapHandler,recoverHandler]){const res=response();await handler({method:'GET',headers:{}},res);assert.equal(res.snapshot().statusCode,405);}
  const res=response();await meHandler({method:'POST',headers:{}},res);assert.equal(res.snapshot().statusCode,405);
});

test('OWNER endpoints require authenticated server session', {skip:!enabled}, async()=>{
  for(const [method,handler] of [['POST',bootstrapHandler],['POST',recoverHandler],['GET',meHandler]]){const res=response();await handler({method,headers:{}},res);assert.equal(res.snapshot().statusCode,401);assert.deepEqual(res.snapshot().body,{error:'UNAUTHORIZED'});}
});

test('OWNER bootstrap ignores client identity ids and returns VOR only after successful setup', {skip:!enabled}, async()=>{
  const seeded=await seed();try{
    const res=response();await bootstrapHandler({method:'POST',headers:{cookie:`vc_session=${seeded.token}`},body:{bootstrapSecret:process.env.OWNER_BOOTSTRAP_SECRET,identityId:'attacker',deviceId:'attacker',sessionId:'attacker'}},res);
    const snap=res.snapshot();assert.equal(snap.statusCode,200);assert.equal(snap.body.identity.dx,'DX-OWNERAPI');assert.equal(snap.body.device.id,seeded.device.id);assert.match(snap.body.recoveryCode,/^VOR-/);
    const [policy]=await seeded.sql`SELECT owner_identity_id::text FROM owner_policy WHERE status='ACTIVE'`;assert.equal(policy.owner_identity_id,seeded.identity.id);
  }finally{await seeded.sql.end();}
});

test('OWNER bootstrap and recovery require their secret fields', {skip:!enabled}, async()=>{
  const seeded=await seed();try{
    let res=response();await bootstrapHandler({method:'POST',headers:{cookie:`vc_session=${seeded.token}`},body:{}},res);assert.equal(res.snapshot().statusCode,400);assert.deepEqual(res.snapshot().body,{error:'OWNER_BOOTSTRAP_SECRET_REQUIRED'});
    res=response();await recoverHandler({method:'POST',headers:{cookie:`vc_session=${seeded.token}`},body:{}},res);assert.equal(res.snapshot().statusCode,400);assert.deepEqual(res.snapshot().body,{error:'OWNER_RECOVERY_CODE_REQUIRED'});
  }finally{await seeded.sql.end();}
});

test('OWNER me returns only current authorized identity/device and requires live AAL2', {skip:!enabled}, async()=>{
  const seeded=await seed();try{
    const service=new OwnerService(new PostgresCoreRepository());await service.bootstrap({sessionToken:seeded.token,bootstrapSecret:process.env.OWNER_BOOTSTRAP_SECRET});
    let res=response();await meHandler({method:'GET',headers:{cookie:`vc_session=${seeded.token}`}},res);let snap=res.snapshot();assert.equal(snap.statusCode,200);assert.equal(snap.body.identity.id,seeded.identity.id);assert.equal(snap.body.device.id,seeded.device.id);assert.equal(snap.body.aal,2);assert.equal(typeof snap.body.ownerPolicyId,'string');
    await seeded.sql`UPDATE sessions SET aal2_expires_at=now()-interval '1 minute' WHERE id=${seeded.session.id}`;
    res=response();await meHandler({method:'GET',headers:{cookie:`vc_session=${seeded.token}`}},res);snap=res.snapshot();assert.equal(snap.statusCode,403);assert.deepEqual(snap.body,{error:'OWNER_AAL2_REQUIRED'});
  }finally{await seeded.sql.end();}
});
