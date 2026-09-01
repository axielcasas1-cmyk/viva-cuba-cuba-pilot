import {beginAuthentication} from '../../../server/services/webauthn-service.js';
import {failPasskey,requirePasskeyContext} from '../../../server/passkey-http.js';
import type {RequestLike,ResponseLike} from '../../../server/http.js';

export default async function handler(req:RequestLike,res:ResponseLike){
  try{
    const context=await requirePasskeyContext(req,res);
    if(!context)return;
    const options=await beginAuthentication({identityId:context.identity.id});
    res.status(200).json(options);
  }catch(error){failPasskey(res,error);}
}
