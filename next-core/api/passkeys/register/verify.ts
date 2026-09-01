import {finishRegistration} from '../../../server/services/webauthn-service.js';
import {failPasskey,requirePasskeyContext,requirePasskeyResponse} from '../../../server/passkey-http.js';
import type {RequestLike,ResponseLike} from '../../../server/http.js';

export default async function handler(req:RequestLike,res:ResponseLike){
  try{
    const context=await requirePasskeyContext(req,res);
    if(!context)return;
    const response=requirePasskeyResponse(req,res);
    if(!response)return;
    const result=await finishRegistration({identityId:context.identity.id,response:response as never});
    res.status(200).json(result);
  }catch(error){failPasskey(res,error);}
}
