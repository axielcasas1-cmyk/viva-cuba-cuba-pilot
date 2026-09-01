import {SecurityControlService} from '../../server/services/security-control-service.js';
import {PostgresCoreRepository} from '../../server/repositories/postgres-core-repository.js';
import {bodyObject,fail,readCookie,type RequestLike,type ResponseLike} from '../../server/http.js';
import {failSecurity,requireSecurityMethod} from '../../server/security-http.js';

export default async function handler(req:RequestLike,res:ResponseLike){
  if(!requireSecurityMethod(req,res,'POST'))return;
  const sessionToken=readCookie(req);
  if(!sessionToken)return fail(res,401,'UNAUTHORIZED');
  const body=bodyObject(req);
  const targetDeviceId=typeof body.targetDeviceId==='string'?body.targetDeviceId.trim():'';
  if(!targetDeviceId)return fail(res,400,'SECURITY_TARGET_DEVICE_REQUIRED');
  try{
    await new SecurityControlService(new PostgresCoreRepository()).revokeDevice(sessionToken,targetDeviceId);
    res.status(200).json({ok:true});
  }catch(error){failSecurity(res,error);}
}
