import test from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import {SecurityControlService} from '../dist-test/server/services/security-control-service.js';
import {PostgresCoreRepository} from '../dist-test/server/repositories/postgres-core-repository.js';
import {sha256} from '../dist-test/server/crypto.js';

const enabled=!!process.env.DATABASE_URL;
async function seed(){
  const sql=postgres(process.env.DATABASE_URL,{prepare:false,max:1});
  await sql.unsafe('TRUNCATE audit_events, owner_admin_devices, owner_policy, webauthn_challenges, webauthn_credentials, sessions, recovery_secrets, devices, invitations, identities RESTART IDENTITY CASCADE');
  const [a]=await sql`INSERT INTO identities (dx,label) VALUES ('DX-SECUR001','Security A') RETURNING id::text`;
  const [b]=await sql`INSERT INTO identities (dx,label) VALUES ('DX-SECUR002','Security B') RETURNING id::text`;
  const [a1]=await sql`INSERT INTO devices (identity_id,client_device_id,label,trusted) VALUES (${a.id},'sec-a1-device','A current',true) RETURNING id::text`;
  const [a2]=await sql`INSERT INTO devices (identity_id,client_device_id,label,trusted) VALUES (${a.id},'sec-a2-device','A other',true) RETURNING id::text`;
  const [b1]=await sql`INSERT INTO devices (identity_id,client_device_id,label,trusted) VALUES (${b.id},'sec-b1-device','B device',true) RETURNING id::text`;
  const token='security-current-session';
  const [s1]=await sql`INSERT INTO sessions (identity_id,device_id,token_hash,aal,aal2_expires_at,expires_at) VALUES (${a.id},${a1.id},${sha256(token)},2,now()+interval '5 minutes',now()+interval '1 hour') RETURNING id::text`;
  const [s2]=await sql`INSERT INTO sessions (identity_id,device_id,token_hash,aal,expires_at) VALUES (${a.id},${a2.id},${sha256('security-other-session')},1,now()+interval '1 hour') RETURNING id::text`;
  const [sb]=await sql`INSERT INTO sessions (identity_id,device_id,token_hash,aal,expires_at) VALUES (${b.id},${b1.id},${sha256('security-b-session')},1,now()+interval '1 hour') RETURNING id::text`;
  await sql`INSERT INTO webauthn_credentials (identity_id,device_id,credential_id,public_key,counter,transports) VALUES (${a.id},${a2.id},'security-credential-a2',${Buffer.from([1,2,3])},0,${['internal']})`;
  return {sql,token,a,b,a1,a2,b1,s1,s2,sb};
}

test('security control lists only devices and sessions owned by authenticated DX', {skip:!enabled}, async()=>{
  const x=await seed();try{
    const service=new SecurityControlService(new PostgresCoreRepository());
    const result=await service.list(x.token);
    assert.deepEqual(result.devices.map(d=>d.id).sort(),[x.a1.id,x.a2.id].sort());
    assert.deepEqual(result.sessions.map(s=>s.id).sort(),[x.s1.id,x.s2.id].sort());
    assert.equal(result.sessions.find(s=>s.id===x.s1.id).current,true);
    assert.equal(result.sessions.find(s=>s.id===x.s2.id).current,false);
    assert.equal(result.identity.id,x.a.id);
  }finally{await x.sql.end();}
});

test('session revocation is same-identity only and protects current session', {skip:!enabled}, async()=>{
  const x=await seed();try{
    const service=new SecurityControlService(new PostgresCoreRepository());
    await assert.rejects(()=>service.revokeSession(x.token,x.s1.id),/SECURITY_CURRENT_SESSION_PROTECTED/);
    await assert.rejects(()=>service.revokeSession(x.token,x.sb.id),/SECURITY_TARGET_NOT_FOUND/);
    await service.revokeSession(x.token,x.s2.id);
    const [row]=await x.sql`SELECT status FROM sessions WHERE id=${x.s2.id}`;assert.equal(row.status,'REVOKED');
  }finally{await x.sql.end();}
});

test('device revocation cascades to sessions, passkeys and OWNER-device grants but protects current device', {skip:!enabled}, async()=>{
  const x=await seed();try{
    const service=new SecurityControlService(new PostgresCoreRepository());
    await assert.rejects(()=>service.revokeDevice(x.token,x.a1.id),/SECURITY_CURRENT_DEVICE_PROTECTED/);
    await assert.rejects(()=>service.revokeDevice(x.token,x.b1.id),/SECURITY_TARGET_NOT_FOUND/);
    await service.revokeDevice(x.token,x.a2.id);
    const [device]=await x.sql`SELECT status,trusted FROM devices WHERE id=${x.a2.id}`;assert.equal(device.status,'REVOKED');assert.equal(device.trusted,false);
    const [session]=await x.sql`SELECT status FROM sessions WHERE id=${x.s2.id}`;assert.equal(session.status,'REVOKED');
    const [credential]=await x.sql`SELECT status FROM webauthn_credentials WHERE credential_id='security-credential-a2'`;assert.equal(credential.status,'REVOKED');
  }finally{await x.sql.end();}
});
