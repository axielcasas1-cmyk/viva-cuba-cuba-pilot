import {createHash} from 'node:crypto';

export function challengeDigest(challenge:string):string {
  return createHash('sha256').update(challenge).digest('hex');
}

export function challengeExpiresAt(now = new Date()):Date {
  return new Date(now.getTime() + 5 * 60 * 1000);
}
