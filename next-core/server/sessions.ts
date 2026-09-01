import {randomBytes} from 'node:crypto';
import {sha256} from './crypto.js';

export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
export const newSessionToken = () => randomBytes(32).toString('base64url');
export const sessionTokenHash = (token:string) => sha256(token);
export const sessionExpiresAt = (now = Date.now()) => new Date(now + SESSION_MAX_AGE_SECONDS * 1000);
