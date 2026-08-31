import test from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import {AccessService} from '../dist-test/server/services/access-service.js';
import {PostgresCoreRepository} from '../dist-test/server/repositories/postgres-core-repository.js';
import {hashSecret,sha256} from '../dist-test/server/crypto.js';

const enabled=!!process.env.DATABASE_URL;
async function reset(){const sql=postgres(process.env.DATABASE_URL,{prepare:false,max:1});try{await sql.unsafe('TRUNCATE audit_events, owner_admin_devices, owner_policy, webauthn_challenges, webauthn_credentials, sessions, recovery_secrets, devices, invitations, identities RESTART IDENTITY CASCADE');}finally{await sql.end();}}

test('activation is one-time and recovery rotates VCR', {skip:!enabled}, async()=>{
  await reset();
  const repo=new PostgresCoreRepository(), service=new AccessService(repo), code='VCM-TEST-ACCESS-0001', secret=await hashSecret(code);
  await repo.createInvitation({lookupHash:sha256(code),salt:secret.salt,digest:secret.digest,label:'test',expiresAt:new Date(Date.now()+3600000)});
  const a=await service.activate({code,label:'Usuario Uno',deviceId:'device-alpha-0001'});
  assert.match(a.identity.dx,/^DX-[A-Z0-9]{8}$/);assert.match(a.recoveryCode,/^VCR-/);assert.ok(await service.session(a.sessionToken));
  await assert.rejects(()=>service.activate({code,label:'Usuario Dos',deviceId:'device-beta-0002'}));
  const r=await service.recover({dx:a.identity.dx,recoveryCode:a.recoveryCode,deviceId:'device-beta-0002'});
  assert.equal(r.identity.dx,a.identity.dx);assert.notEqual(r.recoveryCode,a.recoveryCode);assert.ok(await service.session(r.sessionToken));
  await assert.rejects(()=>service.recover({dx:a.identity.dx,recoveryCode:a.recoveryCode,deviceId:'device-gamma-0003'}),/INVALID_RECOVERY/);
  await service.logout(r.sessionToken);assert.equal(await service.session(r.sessionToken),null);
});
