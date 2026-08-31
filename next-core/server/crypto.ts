import {createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';

const scrypt = promisify(scryptCallback);

export function sha256(value:string):string {
  return createHash('sha256').update(value).digest('hex');
}

export async function hashSecret(secret:string, salt = randomBytes(16).toString('base64url')):Promise<{salt:string;digest:string}> {
  const key = await scrypt(secret, salt, 32) as Buffer;
  return {salt,digest:key.toString('base64url')};
}

export async function verifySecret(secret:string, stored:{salt:string;digest:string}):Promise<boolean> {
  const key = await scrypt(secret, stored.salt, 32) as Buffer;
  const expected = Buffer.from(stored.digest, 'base64url');
  return key.length === expected.length && timingSafeEqual(key, expected);
}

export function randomCode(prefix:string, bytes=12):string {
  return `${prefix}-${randomBytes(bytes).toString('hex').toUpperCase()}`;
}

export function randomRecoveryCode():string {
  return `VCR-${randomBytes(10).toString('hex').toUpperCase()}-${randomBytes(10).toString('hex').toUpperCase()}`;
}
