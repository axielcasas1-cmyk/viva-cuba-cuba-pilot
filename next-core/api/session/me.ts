import {PostgresCoreRepository} from '../../server/repositories/postgres-core-repository.js';
import {AccessService} from '../../server/services/access-service.js';
import {fail,readCookie,type RequestLike,type ResponseLike} from '../../server/http.js';
export default async function handler(req:RequestLike,res:ResponseLike){const c=await new AccessService(new PostgresCoreRepository()).session(readCookie(req));if(!c)return fail(res,401,'UNAUTHORIZED');res.status(200).json({identity:c.identity,device:c.device,aal:c.session.aal});}
