import {OwnerService} from '../../server/services/owner-service.js';
import {PostgresCoreRepository} from '../../server/repositories/postgres-core-repository.js';
import {fail,readCookie,type RequestLike,type ResponseLike} from '../../server/http.js';
import {failOwner,requireMethod} from '../../server/owner-http.js';

export default async function handler(req:RequestLike,res:ResponseLike){
  if(!requireMethod(req,res,'GET'))return;
  const sessionToken=readCookie(req);
  if(!sessionToken)return fail(res,401,'UNAUTHORIZED');
  try{
    const owner=await new OwnerService(new PostgresCoreRepository()).requireOwner(sessionToken);
    res.status(200).json({identity:owner.identity,device:owner.device,aal:owner.session.aal,ownerPolicyId:owner.ownerPolicyId});
  }catch(error){failOwner(res,error);}
}
