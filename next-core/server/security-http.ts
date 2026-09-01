import {fail,type RequestLike,type ResponseLike} from './http.js';

export function requireSecurityMethod(req:RequestLike,res:ResponseLike,method:'GET'|'POST'):boolean {
  if(req.method!==method){fail(res,405,'METHOD_NOT_ALLOWED');return false;}
  return true;
}

export function failSecurity(res:ResponseLike,error:unknown):void {
  const code=error instanceof Error ? error.message : 'SECURITY_FAILED';
  if(code==='UNAUTHORIZED')return fail(res,401,code);
  if(code==='SECURITY_AAL2_REQUIRED')return fail(res,403,code);
  if(code==='SECURITY_TARGET_NOT_FOUND')return fail(res,404,code);
  if(code==='SECURITY_CURRENT_SESSION_PROTECTED'||code==='SECURITY_CURRENT_DEVICE_PROTECTED')return fail(res,409,code);
  fail(res,400,/^SECURITY_/.test(code)?code:'SECURITY_FAILED');
}
