import test from 'node:test';
import assert from 'node:assert/strict';
import {createSecurityClient} from '../dist-test/src/security/client.js';
import {deviceAction,sessionAction} from '../dist-test/src/security/ui-policy.js';

function response(body,{ok=true,status=200}={}){return{ok,status,json:async()=>body};}

const inventory={
  identity:{id:'identity-1',dx:'DX-SECUI001',label:'Security User'},
  devices:[
    {id:'device-current',label:'Current',status:'ACTIVE',trusted:true,createdAt:'2026-09-01T00:00:00Z',lastSeenAt:'2026-09-01T01:00:00Z',current:true},
    {id:'device-other',label:'Other',status:'ACTIVE',trusted:false,createdAt:'2026-09-01T00:00:00Z',lastSeenAt:null,current:false}
  ],
  sessions:[
    {id:'session-current',deviceId:'device-current',status:'ACTIVE',aal:1,createdAt:'2026-09-01T00:00:00Z',expiresAt:'2026-09-02T00:00:00Z',current:true},
    {id:'session-other',deviceId:'device-other',status:'ACTIVE',aal:1,createdAt:'2026-09-01T00:00:00Z',expiresAt:'2026-09-02T00:00:00Z',current:false}
  ]
};

test('security browser client lists inventory with GET',async()=>{
  const calls=[];
  const client=createSecurityClient({fetchFn:async(url,init)=>{calls.push([url,init?.method]);return response(inventory);},stepUpFn:async()=>{throw new Error('STEP_UP_NOT_EXPECTED');}});
  const result=await client.list();
  assert.equal(result.identity.dx,'DX-SECUI001');
  assert.deepEqual(calls,[['/api/security/list','GET']]);
});

test('AAL1 destructive session revocation performs Passkey step-up before POST',async()=>{
  const calls=[];
  const client=createSecurityClient({
    fetchFn:async(url,init)=>{calls.push(['fetch',url,init?.method,init?.body]);return response({ok:true});},
    stepUpFn:async()=>{calls.push(['stepup']);return{verified:true};}
  });
  await client.revokeSession('session-other',1);
  assert.deepEqual(calls.map(c=>c.slice(0,3)),[['stepup'],['fetch','/api/security/revoke-session','POST']]);
  assert.deepEqual(JSON.parse(calls[1][3]),{targetSessionId:'session-other'});
});

test('AAL2 device revocation posts directly without redundant step-up',async()=>{
  const calls=[];
  const client=createSecurityClient({
    fetchFn:async(url,init)=>{calls.push([url,init?.method,init?.body]);return response({ok:true});},
    stepUpFn:async()=>{throw new Error('STEP_UP_NOT_EXPECTED');}
  });
  await client.revokeDevice('device-other',2);
  assert.deepEqual(calls.map(c=>c.slice(0,2)),[['/api/security/revoke-device','POST']]);
  assert.deepEqual(JSON.parse(calls[0][2]),{targetDeviceId:'device-other'});
});

test('UI policy protects current resources and revoked resources',()=>{
  assert.equal(deviceAction({current:true,status:'ACTIVE'}),'PROTECTED');
  assert.equal(deviceAction({current:false,status:'ACTIVE'}),'REVOKE');
  assert.equal(deviceAction({current:false,status:'REVOKED'}),'NONE');
  assert.equal(sessionAction({current:true,status:'ACTIVE'}),'PROTECTED');
  assert.equal(sessionAction({current:false,status:'ACTIVE'}),'REVOKE');
  assert.equal(sessionAction({current:false,status:'EXPIRED'}),'NONE');
});

test('security browser client surfaces server error codes',async()=>{
  const client=createSecurityClient({fetchFn:async()=>response({error:'SECURITY_TARGET_NOT_FOUND'},{ok:false,status:404}),stepUpFn:async()=>({verified:true})});
  await assert.rejects(()=>client.revokeDevice('missing',2),/SECURITY_TARGET_NOT_FOUND/);
});
