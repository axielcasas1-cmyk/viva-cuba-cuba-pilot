import {PostgresCoreRepository} from './repositories/postgres-core-repository.js';
import {AccessService} from './services/access-service.js';
import {bodyObject,fail,readCookie,recordValue,requirePost,type RequestLike,type ResponseLike} from './http.js';
import type {SessionContext} from './repositories/core-repository.js';

export async function requirePasskeyContext(req:RequestLike,res:ResponseLike):Promise<SessionContext|null> {
  if (!requirePost(req,res)) return null;
  const context=await new AccessService(new PostgresCoreRepository()).session(readCookie(req));
  if (!context) {
    fail(res,401,'UNAUTHORIZED');
    return null;
  }
  return context;
}

export function requirePasskeyResponse(req:RequestLike,res:ResponseLike):Record<string,unknown>|null {
  const response=recordValue(bodyObject(req).response);
  const inner=response ? recordValue(response.response) : null;
  if (!response || typeof response.id !== 'string' || !response.id || !inner || typeof inner.clientDataJSON !== 'string' || !inner.clientDataJSON) {
    fail(res,400,'PASSKEY_RESPONSE_REQUIRED');
    return null;
  }
  return response;
}

export function failPasskey(res:ResponseLike,error:unknown):void {
  const raw=error instanceof Error ? error.message : 'PASSKEY_FAILED';
  const code=/^(PASSKEY_|WEBAUTHN_|SESSION_)/.test(raw) ? raw : 'PASSKEY_FAILED';
  const status=code==='PASSKEY_NOT_REGISTERED' || code==='PASSKEY_ALREADY_REGISTERED' ? 409
    : /(?:INVALID|NOT_FOUND|FAILED)$/.test(code) ? 401
    : 400;
  fail(res,status,code);
}
