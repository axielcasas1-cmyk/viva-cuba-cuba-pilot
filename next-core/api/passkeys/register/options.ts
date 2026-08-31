import {beginRegistration} from '../../../server/services/webauthn-service.js';
import {failPasskey,requirePasskeyContext} from '../../../server/passkey-http.js';
import type {RequestLike,ResponseLike} from '../../../server/http.js';

export default async function handler(req:RequestLike,res:ResponseLike){
  try{
    const context=await requirePasskeyContext(req,res);
    if(!context)return;
    const options=await beginRegistration({identityId:context.identity.id,deviceId:context.device.id,dx:context.identity.dx});
    res.status(200).json(options);
  }catch(error){failPasskey(res,error);}
}
