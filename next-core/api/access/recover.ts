import {PostgresCoreRepository} from '../../server/repositories/postgres-core-repository.js';
import {AccessService} from '../../server/services/access-service.js';
import {bodyObject,fail,setSessionCookie,type RequestLike,type ResponseLike} from '../../server/http.js';
export default async function handler(req:RequestLike,res:ResponseLike){try{const b=bodyObject(req),r=await new AccessService(new PostgresCoreRepository()).recover({dx:String(b.dx||''),recoveryCode:String(b.recoveryCode||''),deviceId:String(b.deviceId||''),deviceLabel:String(b.deviceLabel||'Dispositivo recuperado')});setSessionCookie(res,r.sessionToken);res.status(200).json({identity:r.identity,recoveryCode:r.recoveryCode});}catch{fail(res,401,'INVALID_RECOVERY');}}
