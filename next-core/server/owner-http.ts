import {fail,type RequestLike,type ResponseLike} from './http.js';

export function requireMethod(req:RequestLike,res:ResponseLike,method:'GET'|'POST'):boolean {
  if(req.method!==method){fail(res,405,'METHOD_NOT_ALLOWED');return false;}
  return true;
}

export function failOwner(res:ResponseLike,error:unknown):void {
  const code=error instanceof Error ? error.message : 'OWNER_FAILED';
  if(code==='UNAUTHORIZED')return fail(res,401,code);
  if(code==='OWNER_AAL2_REQUIRED'||code==='OWNER_DEVICE_NOT_TRUSTED'||code==='OWNER_FORBIDDEN')return fail(res,403,code);
  if(code==='OWNER_BOOTSTRAP_INVALID'||code==='OWNER_RECOVERY_INVALID')return fail(res,401,code);
  if(code==='OWNER_ALREADY_CONFIGURED')return fail(res,409,code);
  fail(res,400,/^OWNER_/.test(code)?code:'OWNER_FAILED');
}
