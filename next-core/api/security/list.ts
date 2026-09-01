import {SecurityControlService} from '../../server/services/security-control-service.js';
import {PostgresCoreRepository} from '../../server/repositories/postgres-core-repository.js';
import {fail,readCookie,type RequestLike,type ResponseLike} from '../../server/http.js';
import {failSecurity,requireSecurityMethod} from '../../server/security-http.js';

export default async function handler(req:RequestLike,res:ResponseLike){
  if(!requireSecurityMethod(req,res,'GET'))return;
  const sessionToken=readCookie(req);
  if(!sessionToken)return fail(res,401,'UNAUTHORIZED');
  try{
    const result=await new SecurityControlService(new PostgresCoreRepository()).list(sessionToken);
    res.status(200).json(result);
  }catch(error){failSecurity(res,error);}
}
