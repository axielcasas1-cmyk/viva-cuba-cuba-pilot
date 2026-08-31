import type {AccessResponse,SessionResponse} from './types.js';
const DEVICE_KEY='vc_next_device_id_v1';
export function deviceId():string {
  let id=localStorage.getItem(DEVICE_KEY);
  if (!id) { id=crypto.randomUUID(); localStorage.setItem(DEVICE_KEY,id); }
  return id;
}
async function json<T>(url:string,init?:RequestInit):Promise<T>{const r=await fetch(url,init);const data=await r.json();if(!r.ok)throw new Error(String(data?.error||'REQUEST_FAILED'));return data as T;}
export const activateUser=(code:string,label:string)=>json<AccessResponse>('/api/access/activate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,label,deviceId:deviceId()})});
export const recoverUser=(dx:string,recoveryCode:string)=>json<AccessResponse>('/api/access/recover',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dx,recoveryCode,deviceId:deviceId()})});
export const currentSession=()=>json<SessionResponse>('/api/session/me');
export const logoutUser=()=>json<{signedOut:true}>('/api/session/logout',{method:'POST'});
