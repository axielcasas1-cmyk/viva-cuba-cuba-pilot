import {OwnerService} from '../../server/services/owner-service.js';
import {PostgresCoreRepository} from '../../server/repositories/postgres-core-repository.js';
import {bodyObject,fail,readCookie,type RequestLike,type ResponseLike} from '../../server/http.js';
import {failOwner,requireMethod} from '../../server/owner-http.js';

export default async function handler(req:RequestLike,res:ResponseLike){
  if(!requireMethod(req,res,'POST'))return;
  const sessionToken=readCookie(req);
  if(!sessionToken)return fail(res,401,'UNAUTHORIZED');
  const bootstrapSecret=bodyObject(req).bootstrapSecret;
  if(typeof bootstrapSecret!=='string'||!bootstrapSecret)return fail(res,400,'OWNER_BOOTSTRAP_SECRET_REQUIRED');
  try{
    const result=await new OwnerService(new PostgresCoreRepository()).bootstrap({sessionToken,bootstrapSecret});
    res.status(200).json(result);
  }catch(error){failOwner(res,error);}
}
