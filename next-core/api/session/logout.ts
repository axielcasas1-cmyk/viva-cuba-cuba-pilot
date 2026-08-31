import {PostgresCoreRepository} from '../../server/repositories/postgres-core-repository.js';
import {AccessService} from '../../server/services/access-service.js';
import {clearSessionCookie,readCookie,type RequestLike,type ResponseLike} from '../../server/http.js';
export default async function handler(req:RequestLike,res:ResponseLike){await new AccessService(new PostgresCoreRepository()).logout(readCookie(req));clearSessionCookie(res);res.status(200).json({signedOut:true});}
