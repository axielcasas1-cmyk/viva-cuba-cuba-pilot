import {SESSION_MAX_AGE_SECONDS} from './sessions.js';
import {env} from './env.js';

export type RequestLike = {method?:string;body?:unknown;headers?:Record<string,string|string[]|undefined>};
export type ResponseLike = {status:(code:number)=>ResponseLike;json:(value:unknown)=>void;setHeader:(name:string,value:string)=>void};

export function bodyObject(req:RequestLike):Record<string,unknown> {
  return req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body as Record<string,unknown> : {};
}

export function recordValue(value:unknown):Record<string,unknown>|null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string,unknown> : null;
}

export function requirePost(req:RequestLike,res:ResponseLike):boolean {
  if (req.method !== 'POST') {
    fail(res,405,'METHOD_NOT_ALLOWED');
    return false;
  }
  return true;
}

export function readCookie(req:RequestLike,name=env.SESSION_COOKIE_NAME):string {
  const raw = String(req.headers?.cookie ?? req.headers?.Cookie ?? '');
  for (const part of raw.split(';')) {
    const [key,...rest]=part.trim().split('=');
    if (key===name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

export function setSessionCookie(res:ResponseLike,token:string):void {
  res.setHeader('Set-Cookie', `${env.SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}`);
}

export function clearSessionCookie(res:ResponseLike):void {
  res.setHeader('Set-Cookie', `${env.SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
}

export function fail(res:ResponseLike,status:number,error:string):void {
  res.status(status).json({error});
}
