import {finishAuthentication} from '../../../server/services/webauthn-service.js';
import {failPasskey,requirePasskeyContext,requirePasskeyResponse} from '../../../server/passkey-http.js';
import type {RequestLike,ResponseLike} from '../../../server/http.js';

export default async function handler(req:RequestLike,res:ResponseLike){
  try{
    const context=await requirePasskeyContext(req,res);
    if(!context)return;
    const response=requirePasskeyResponse(req,res);
    if(!response)return;
    const result=await finishAuthentication({identityId:context.identity.id,sessionId:context.session.id,response:response as never});
    res.status(200).json(result);
  }catch(error){failPasskey(res,error);}
}
