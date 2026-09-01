import test from 'node:test';
import assert from 'node:assert/strict';
import {createPasskeyClient} from '../dist-test/src/passkeys/client.js';

function response(body,{ok=true,status=200}={}){return{ok,status,json:async()=>body};}

test('browser Passkey registration performs options -> authenticator -> verify in order',async()=>{
  const calls=[];
  const registrationResponse={id:'cred-reg',rawId:'cred-reg',type:'public-key',response:{clientDataJSON:'x',attestationObject:'y'}};
  const client=createPasskeyClient({
    supports:()=>true,
    fetchFn:async(url,init)=>{
      calls.push(['fetch',url,init?.method,init?.body]);
      if(url==='/api/passkeys/register/options')return response({challenge:'register-challenge',rp:{name:'VIVA CUBA',id:'example.test'},user:{id:'aWQ',name:'DX-TEST0001',displayName:'DX-TEST0001'},pubKeyCredParams:[],timeout:300000,excludeCredentials:[],authenticatorSelection:{userVerification:'required'},attestation:'none'});
      if(url==='/api/passkeys/register/verify')return response({verified:true,credentialId:'cred-reg',deviceId:'device-1'});
      throw new Error(`UNEXPECTED_URL:${url}`);
    },
    startRegistrationFn:async({optionsJSON})=>{calls.push(['registration',optionsJSON.challenge]);return registrationResponse;},
    startAuthenticationFn:async()=>{throw new Error('AUTH_NOT_EXPECTED');}
  });
  const result=await client.register();
  assert.equal(result.verified,true);
  assert.deepEqual(calls.map(x=>x.slice(0,3)),[
    ['fetch','/api/passkeys/register/options','POST'],
    ['registration','register-challenge'],
    ['fetch','/api/passkeys/register/verify','POST']
  ]);
  assert.equal(JSON.parse(calls[2][3]).id,'cred-reg');
});

test('browser Passkey step-up performs options -> authenticator -> verify and returns verified',async()=>{
  const calls=[];
  const authResponse={id:'cred-auth',rawId:'cred-auth',type:'public-key',response:{clientDataJSON:'x',authenticatorData:'y',signature:'z',userHandle:null}};
  const client=createPasskeyClient({
    supports:()=>true,
    fetchFn:async(url,init)=>{
      calls.push(['fetch',url,init?.method,init?.body]);
      if(url==='/api/passkeys/authenticate/options')return response({challenge:'auth-challenge',rpId:'example.test',allowCredentials:[{id:'cred-auth',type:'public-key'}],userVerification:'required'});
      if(url==='/api/passkeys/authenticate/verify')return response({verified:true,credentialId:'cred-auth'});
      throw new Error(`UNEXPECTED_URL:${url}`);
    },
    startRegistrationFn:async()=>{throw new Error('REGISTER_NOT_EXPECTED');},
    startAuthenticationFn:async({optionsJSON})=>{calls.push(['authentication',optionsJSON.challenge]);return authResponse;}
  });
  const result=await client.stepUp();
  assert.equal(result.verified,true);
  assert.deepEqual(calls.map(x=>x.slice(0,3)),[
    ['fetch','/api/passkeys/authenticate/options','POST'],
    ['authentication','auth-challenge'],
    ['fetch','/api/passkeys/authenticate/verify','POST']
  ]);
  assert.equal(JSON.parse(calls[2][3]).id,'cred-auth');
});

test('unsupported browsers fail closed before contacting the server',async()=>{
  let contacted=false;
  const client=createPasskeyClient({
    supports:()=>false,
    fetchFn:async()=>{contacted=true;return response({});},
    startRegistrationFn:async()=>({}),
    startAuthenticationFn:async()=>({})
  });
  await assert.rejects(()=>client.register(),/PASSKEY_UNSUPPORTED/);
  await assert.rejects(()=>client.stepUp(),/PASSKEY_UNSUPPORTED/);
  assert.equal(contacted,false);
});

test('HTTP errors surface sanitized server error codes',async()=>{
  const client=createPasskeyClient({
    supports:()=>true,
    fetchFn:async()=>response({error:'PASSKEY_NOT_REGISTERED'},{ok:false,status:400}),
    startRegistrationFn:async()=>({}),
    startAuthenticationFn:async()=>({})
  });
  await assert.rejects(()=>client.stepUp(),/PASSKEY_NOT_REGISTERED/);
});
