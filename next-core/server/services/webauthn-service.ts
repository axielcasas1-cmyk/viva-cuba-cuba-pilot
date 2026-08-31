import {createHash} from 'node:crypto';
import {generateRegistrationOptions} from '@simplewebauthn/server';
import {isoUint8Array} from '@simplewebauthn/server/helpers';
import {sql} from '../db.js';
import {env} from '../env.js';

export type WebAuthnPurpose = 'REGISTER'|'AUTHENTICATE'|'OWNER_SETUP'|'OWNER_RECOVERY';

export function challengeDigest(challenge:string):string {
  return createHash('sha256').update(challenge).digest('hex');
}

export function challengeExpiresAt(now = new Date()):Date {
  return new Date(now.getTime() + 5 * 60 * 1000);
}

export async function persistChallenge(input:{
  identityId:string|null;
  purpose:WebAuthnPurpose;
  challenge:string;
  payload?:Record<string,unknown>;
}):Promise<void> {
  const payloadJson = JSON.stringify(input.payload ?? {});
  await sql`
    INSERT INTO webauthn_challenges (identity_id,purpose,challenge_hash,payload,expires_at)
    VALUES (${input.identityId},${input.purpose},${challengeDigest(input.challenge)},${payloadJson}::jsonb,${challengeExpiresAt()})
  `;
}

export async function consumeChallenge(input:{
  identityId:string|null;
  purpose:WebAuthnPurpose;
  challenge:string;
}):Promise<Record<string,unknown>> {
  const [row] = await sql<{payload:Record<string,unknown>}[]>`
    UPDATE webauthn_challenges
    SET consumed_at=now()
    WHERE challenge_hash=${challengeDigest(input.challenge)}
      AND purpose=${input.purpose}
      AND consumed_at IS NULL
      AND expires_at>now()
      AND (identity_id IS NOT DISTINCT FROM ${input.identityId})
    RETURNING payload
  `;
  if (!row) throw new Error('WEBAUTHN_CHALLENGE_INVALID');
  return row.payload ?? {};
}

export async function beginRegistration(input:{identityId:string;deviceId:string;dx:string}) {
  const existing = await sql<{credential_id:string;transports:string[]}[]>`
    SELECT credential_id,transports
    FROM webauthn_credentials
    WHERE identity_id=${input.identityId} AND status='ACTIVE'
  `;
  const options = await generateRegistrationOptions({
    rpName:'VIVA CUBA · DESAPLICAXI',
    rpID:env.RP_ID,
    userID:isoUint8Array.fromUTF8String(input.identityId),
    userName:input.dx,
    userDisplayName:input.dx,
    attestationType:'none',
    supportedAlgorithmIDs:[-7,-257],
    excludeCredentials:existing.map(row=>({id:row.credential_id,transports:row.transports as never[]})),
    authenticatorSelection:{
      residentKey:'preferred',
      userVerification:'required'
    }
  });
  await persistChallenge({
    identityId:input.identityId,
    purpose:'REGISTER',
    challenge:options.challenge,
    payload:{deviceId:input.deviceId}
  });
  return options;
}
