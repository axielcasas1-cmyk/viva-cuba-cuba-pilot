import test from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import {OwnerService} from '../dist-test/server/services/owner-service.js';
import {PostgresCoreRepository} from '../dist-test/server/repositories/postgres-core-repository.js';
import {AccessService} from '../dist-test/server/services/access-service.js';
import {sha256} from '../dist-test/server/crypto.js';

const enabled=!!process.env.DATABASE_URL;
async function db(){return postgres(process.env.DATABASE_URL,{prepare:false,max:1});}
async function reset(sql){await sql.unsafe('TRUNCATE audit_events, owner_admin_devices, owner_policy, webauthn_challenges, webauthn_credentials, sessions, recovery_secrets, devices, invitations, identities RESTART IDENTITY CASCADE');}
async function seed(sql,{dx='DX-OWNER001',trusted=true,aal=2,aal2Future=true,identityId=null,deviceSuffix='a'}={}){
  let identity;
  if(identityId){identity={id:identityId};}
  else [identity]=await sql`INSERT INTO identities (dx,label) VALUES (${dx},'Owner Test') RETURNING id::text`;
  const [device]=await sql`INSERT INTO devices (identity_id,client_device_id,label,trusted) VALUES (${identity.id},${`owner-device-${deviceSuffix}-0001`},${`Owner Device ${deviceSuffix}`},${trusted}) RETURNING id::text`;
  const token=`owner-session-${deviceSuffix}-token`;
  const aal2Expires=aal===2 ? (aal2Future ? new Date(Date.now()+10*60*1000) : new Date(Date.now()-60*1000)) : null;
  const [session]=await sql`INSERT INTO sessions (identity_id,device_id,token_hash,aal,aal2_expires_at,expires_at) VALUES (${identity.id},${device.id},${sha256(token)},${aal},${aal2Expires},now()+interval '1 hour') RETURNING id::text`;
  return {identityId:identity.id,deviceId:device.id,sessionId:session.id,token};
}

test('expired AAL2 is exposed as effective AAL1', {skip:!enabled}, async()=>{
  const sql=await db();try{
    await reset(sql);const seeded=await seed(sql,{trusted:true,aal:2,aal2Future:false});
    const context=await new AccessService(new PostgresCoreRepository()).session(seeded.token);
    assert.ok(context);assert.equal(context.session.aal,1);
  }finally{await sql.end();}
});

test('OWNER bootstrap requires live AAL2, trusted device, and is one-time', {skip:!enabled}, async()=>{
  const sql=await db();try{
    await reset(sql);const repo=new PostgresCoreRepository(),service=new OwnerService(repo);
    const low=await seed(sql,{trusted:true,aal:1,deviceSuffix:'low'});
    await assert.rejects(()=>service.bootstrap({sessionToken:low.token,bootstrapSecret:process.env.OWNER_BOOTSTRAP_SECRET}),/OWNER_AAL2_REQUIRED/);
    await reset(sql);
    const untrusted=await seed(sql,{trusted:false,aal:2,deviceSuffix:'untrusted'});
    await assert.rejects(()=>service.bootstrap({sessionToken:untrusted.token,bootstrapSecret:process.env.OWNER_BOOTSTRAP_SECRET}),/OWNER_DEVICE_NOT_TRUSTED/);
    await reset(sql);
    const good=await seed(sql,{trusted:true,aal:2,deviceSuffix:'good'});
    await assert.rejects(()=>service.bootstrap({sessionToken:good.token,bootstrapSecret:'wrong-bootstrap-secret-value-0000'}),/OWNER_BOOTSTRAP_INVALID/);
    const result=await service.bootstrap({sessionToken:good.token,bootstrapSecret:process.env.OWNER_BOOTSTRAP_SECRET});
    assert.equal(result.identity.dx,'DX-OWNER001');assert.match(result.recoveryCode,/^VOR-[A-F0-9]{20}-[A-F0-9]{20}$/);
    const owner=await service.requireOwner(good.token);assert.equal(owner.identity.id,good.identityId);assert.equal(owner.device.id,good.deviceId);
    await assert.rejects(()=>service.bootstrap({sessionToken:good.token,bootstrapSecret:process.env.OWNER_BOOTSTRAP_SECRET}),/OWNER_ALREADY_CONFIGURED/);
  }finally{await sql.end();}
});

test('OWNER recovery rotates secret and new device still needs Passkey trust plus AAL2', {skip:!enabled}, async()=>{
  const sql=await db();try{
    await reset(sql);const repo=new PostgresCoreRepository(),service=new OwnerService(repo);
    const first=await seed(sql,{trusted:true,aal:2,deviceSuffix:'first'});
    const boot=await service.bootstrap({sessionToken:first.token,bootstrapSecret:process.env.OWNER_BOOTSTRAP_SECRET});
    const second=await seed(sql,{identityId:first.identityId,trusted:false,aal:1,deviceSuffix:'second'});
    const recovered=await service.recover({sessionToken:second.token,recoveryCode:boot.recoveryCode});
    assert.match(recovered.recoveryCode,/^VOR-/);assert.notEqual(recovered.recoveryCode,boot.recoveryCode);
    await assert.rejects(()=>service.recover({sessionToken:second.token,recoveryCode:boot.recoveryCode}),/OWNER_RECOVERY_INVALID/);
    await assert.rejects(()=>service.requireOwner(second.token),/OWNER_AAL2_REQUIRED/);
    await sql`UPDATE devices SET trusted=true WHERE id=${second.deviceId}`;
    await sql`UPDATE sessions SET aal=2,aal2_expires_at=now()+interval '10 minutes' WHERE id=${second.sessionId}`;
    const owner=await service.requireOwner(second.token);assert.equal(owner.device.id,second.deviceId);
  }finally{await sql.end();}
});
