import test from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import {SecurityControlService} from '../dist-test/server/services/security-control-service.js';
import {PostgresCoreRepository} from '../dist-test/server/repositories/postgres-core-repository.js';
import {sha256} from '../dist-test/server/crypto.js';

const enabled=!!process.env.DATABASE_URL;
test('destructive security controls require live AAL2', {skip:!enabled}, async()=>{
  const sql=postgres(process.env.DATABASE_URL,{prepare:false,max:1});try{
    await sql.unsafe('TRUNCATE audit_events, owner_admin_devices, owner_policy, webauthn_challenges, webauthn_credentials, sessions, recovery_secrets, devices, invitations, identities RESTART IDENTITY CASCADE');
    const [identity]=await sql`INSERT INTO identities (dx,label) VALUES ('DX-AAL20001','AAL2 Security') RETURNING id::text`;
    const [current]=await sql`INSERT INTO devices (identity_id,client_device_id,label,trusted) VALUES (${identity.id},'aal2-current','Current',true) RETURNING id::text`;
    const [other]=await sql`INSERT INTO devices (identity_id,client_device_id,label,trusted) VALUES (${identity.id},'aal2-other','Other',true) RETURNING id::text`;
    const token='aal2-security-token';
    const [session]=await sql`INSERT INTO sessions (identity_id,device_id,token_hash,aal,expires_at) VALUES (${identity.id},${current.id},${sha256(token)},1,now()+interval '1 hour') RETURNING id::text`;
    const [otherSession]=await sql`INSERT INTO sessions (identity_id,device_id,token_hash,aal,expires_at) VALUES (${identity.id},${other.id},${sha256('aal2-other-token')},1,now()+interval '1 hour') RETURNING id::text`;
    const service=new SecurityControlService(new PostgresCoreRepository());
    await assert.rejects(()=>service.revokeSession(token,otherSession.id),/SECURITY_AAL2_REQUIRED/);
    await assert.rejects(()=>service.revokeDevice(token,other.id),/SECURITY_AAL2_REQUIRED/);
    await sql`UPDATE sessions SET aal=2,aal2_expires_at=now()+interval '5 minutes' WHERE id=${session.id}`;
    await service.revokeSession(token,otherSession.id);
  }finally{await sql.end();}
});
