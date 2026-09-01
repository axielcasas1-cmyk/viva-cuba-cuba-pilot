import {browserSupportsWebAuthn,startAuthentication,startRegistration} from '@simplewebauthn/browser';

type JsonObject=Record<string,unknown>;
type FetchResponse={ok:boolean;status:number;json():Promise<unknown>};
type FetchLike=(url:string,init?:RequestInit)=>Promise<FetchResponse>;
type CeremonyLike=(input:{optionsJSON:unknown})=>Promise<unknown>;

export type PasskeyClientDependencies={
  supports:()=>boolean;
  fetchFn:FetchLike;
  startRegistrationFn:CeremonyLike;
  startAuthenticationFn:CeremonyLike;
};

const defaults:PasskeyClientDependencies={
  supports:browserSupportsWebAuthn,
  fetchFn:(url,init)=>fetch(url,init),
  startRegistrationFn:({optionsJSON})=>startRegistration({optionsJSON:optionsJSON as never}),
  startAuthenticationFn:({optionsJSON})=>startAuthentication({optionsJSON:optionsJSON as never})
};

function asObject(value:unknown):JsonObject {
  return value && typeof value==='object' && !Array.isArray(value) ? value as JsonObject : {};
}

export function createPasskeyClient(overrides:Partial<PasskeyClientDependencies>={}){
  const deps={...defaults,...overrides};

  async function postJson(url:string,body?:unknown):Promise<JsonObject>{
    const response=await deps.fetchFn(url,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:body===undefined?'{}':JSON.stringify(body)
    });
    const payload=asObject(await response.json());
    if(!response.ok){
      const code=typeof payload.error==='string'&&payload.error?payload.error:`HTTP_${response.status}`;
      throw new Error(code);
    }
    return payload;
  }

  function requireSupport(){
    if(!deps.supports())throw new Error('PASSKEY_UNSUPPORTED');
  }

  return {
    async register(){
      requireSupport();
      const optionsJSON=await postJson('/api/passkeys/register/options');
      const response=await deps.startRegistrationFn({optionsJSON});
      return postJson('/api/passkeys/register/verify',response);
    },
    async stepUp(){
      requireSupport();
      const optionsJSON=await postJson('/api/passkeys/authenticate/options');
      const response=await deps.startAuthenticationFn({optionsJSON});
      return postJson('/api/passkeys/authenticate/verify',response);
    }
  };
}

const browserClient=createPasskeyClient();
export const registerPasskey=()=>browserClient.register();
export const stepUpPasskey=()=>browserClient.stepUp();
