import {SecurityControlService} from '../../server/services/security-control-service.js';
import {PostgresCoreRepository} from '../../server/repositories/postgres-core-repository.js';
import {bodyObject,fail,readCookie,type RequestLike,type ResponseLike} from '../../server/http.js';
import {failSecurity,requireSecurityMethod} from '../../server/security-http.js';

export default async function handler(req:RequestLike,res:ResponseLike){
  if(!requireSecurityMethod(req,res,'POST'))return;
  const sessionToken=readCookie(req);
  if(!sessionToken)return fail(res,401,'UNAUTHORIZED');
  const body=bodyObject(req);
  const targetSessionId=typeof body.targetSessionId==='string'?body.targetSessionId.trim():'';
  if(!targetSessionId)return fail(res,400,'SECURITY_TARGET_SESSION_REQUIRED');
  try{
    await new SecurityControlService(new PostgresCoreRepository()).revokeSession(sessionToken,targetSessionId);
    res.status(200).json({ok:true});
  }catch(error){failSecurity(res,error);}
}
