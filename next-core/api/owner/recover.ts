import {OwnerService} from '../../server/services/owner-service.js';
import {PostgresCoreRepository} from '../../server/repositories/postgres-core-repository.js';
import {bodyObject,fail,readCookie,type RequestLike,type ResponseLike} from '../../server/http.js';
import {failOwner,requireMethod} from '../../server/owner-http.js';

export default async function handler(req:RequestLike,res:ResponseLike){
  if(!requireMethod(req,res,'POST'))return;
  const sessionToken=readCookie(req);
  if(!sessionToken)return fail(res,401,'UNAUTHORIZED');
  const recoveryCode=bodyObject(req).recoveryCode;
  if(typeof recoveryCode!=='string'||!recoveryCode)return fail(res,400,'OWNER_RECOVERY_CODE_REQUIRED');
  try{
    const result=await new OwnerService(new PostgresCoreRepository()).recover({sessionToken,recoveryCode});
    res.status(200).json(result);
  }catch(error){failOwner(res,error);}
}
