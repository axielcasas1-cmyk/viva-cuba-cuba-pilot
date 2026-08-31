import {createHash} from 'node:crypto';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import {decodeClientDataJSON,isoUint8Array} from '@simplewebauthn/server/helpers';
import {sql} from '../db.js';
import {env} from '../env.js';

export type WebAuthnPurpose = 'REGISTER'|'AUTHENTICATE'|'OWNER_SETUP'|'OWNER_RECOVERY';
export type StoredCredentialInput = {
  id:string;
  publicKey:Uint8Array;
  counter:number;
  transports:string[];
};
type RegistrationResponse = Parameters<typeof verifyRegistrationResponse>[0]['response'];
type AuthenticationResponse = Parameters<typeof verifyAuthenticationResponse>[0]['response'];

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
  const payload = JSON.parse(JSON.stringify(input.payload ?? {}));
  await sql`
    INSERT INTO webauthn_challenges (identity_id,purpose,challenge_hash,payload,expires_at)
    VALUES (${input.identityId},${input.purpose},${challengeDigest(input.challenge)},${sql.json(payload)},${challengeExpiresAt()})
  `;
}

export async function consumeChallenge(input:{
  identityId:string|null;
  purpose:WebAuthnPurpose;
  challenge:string;
}):Promise<Record<string,unknown>> {
  const [row] = await sql<{payloadJson:string}[]>`
    UPDATE webauthn_challenges
    SET consumed_at=now()
    WHERE challenge_hash=${challengeDigest(input.challenge)}
      AND purpose=${input.purpose}
      AND consumed_at IS NULL
      AND expires_at>now()
      AND (identity_id IS NOT DISTINCT FROM ${input.identityId})
    RETURNING payload::text AS "payloadJson"
  `;
  if (!row) throw new Error('WEBAUTHN_CHALLENGE_INVALID');
  const parsed = JSON.parse(row.payloadJson) as unknown;
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed as Record<string,unknown>
    : {};
}

export async function beginRegistration(input:{identityId:string;deviceId:string;dx:string;purpose?:WebAuthnPurpose}) {
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
    authenticatorSelection:{residentKey:'preferred',userVerification:'required'}
  });
  await persistChallenge({
    identityId:input.identityId,
    purpose:input.purpose ?? 'REGISTER',
    challenge:options.challenge,
    payload:{deviceId:input.deviceId}
  });
  return options;
}

export async function finishRegistration(input:{
  identityId:string;
  response:RegistrationResponse;
  purpose?:WebAuthnPurpose;
}):Promise<{verified:true;credentialId:string;deviceId:string}> {
  const {challenge} = decodeClientDataJSON(input.response.response.clientDataJSON);
  const payload = await consumeChallenge({
    identityId:input.identityId,
    purpose:input.purpose ?? 'REGISTER',
    challenge
  });
  const deviceId = typeof payload.deviceId === 'string' ? payload.deviceId : '';
  if (!deviceId) throw new Error('PASSKEY_DEVICE_INVALID');
  const verification = await verifyRegistrationResponse({
    response:input.response,
    expectedChallenge:challenge,
    expectedOrigin:env.RP_ORIGIN,
    expectedRPID:env.RP_ID,
    requireUserVerification:true
  });
  if (!verification.verified || !verification.registrationInfo) throw new Error('PASSKEY_REGISTRATION_INVALID');
  const credential = verification.registrationInfo.credential;
  await persistCredential({
    identityId:input.identityId,
    deviceId,
    credential:{
      id:credential.id,
      publicKey:credential.publicKey,
      counter:credential.counter,
      transports:credential.transports ?? []
    }
  });
  return {verified:true,credentialId:credential.id,deviceId};
}

export async function beginAuthentication(input:{identityId:string}) {
  const credentials = await sql<{credential_id:string;transports:string[]}[]>`
    SELECT credential_id,transports
    FROM webauthn_credentials
    WHERE identity_id=${input.identityId} AND status='ACTIVE'
    ORDER BY created_at ASC
  `;
  if (!credentials.length) throw new Error('PASSKEY_NOT_REGISTERED');
  const options = await generateAuthenticationOptions({
    rpID:env.RP_ID,
    userVerification:'required',
    allowCredentials:credentials.map(row=>({id:row.credential_id,transports:row.transports as never[]}))
  });
  await persistChallenge({identityId:input.identityId,purpose:'AUTHENTICATE',challenge:options.challenge});
  return options;
}

export async function finishAuthentication(input:{
  identityId:string;
  sessionId:string;
  response:AuthenticationResponse;
}):Promise<{verified:true;credentialId:string}> {
  const {challenge} = decodeClientDataJSON(input.response.response.clientDataJSON);
  await consumeChallenge({identityId:input.identityId,purpose:'AUTHENTICATE',challenge});
  const [row] = await sql<{credential_id:string;public_key:Uint8Array;counter:number;transports:string[]}[]>`
    SELECT credential_id,public_key,counter,transports
    FROM webauthn_credentials
    WHERE identity_id=${input.identityId} AND credential_id=${input.response.id} AND status='ACTIVE'
    LIMIT 1
  `;
  if (!row) throw new Error('PASSKEY_NOT_FOUND');
  const verification = await verifyAuthenticationResponse({
    response:input.response,
    expectedChallenge:challenge,
    expectedOrigin:env.RP_ORIGIN,
    expectedRPID:env.RP_ID,
    credential:{
      id:row.credential_id,
      publicKey:new Uint8Array(row.public_key),
      counter:Number(row.counter),
      transports:row.transports as never[]
    },
    requireUserVerification:true
  });
  if (!verification.verified) throw new Error('PASSKEY_AUTHENTICATION_INVALID');
  await sql`
    UPDATE webauthn_credentials
    SET counter=${verification.authenticationInfo.newCounter},last_used_at=now()
    WHERE identity_id=${input.identityId} AND credential_id=${row.credential_id} AND status='ACTIVE'
  `;
  await upgradeSessionAal2({sessionId:input.sessionId,identityId:input.identityId});
  return {verified:true,credentialId:row.credential_id};
}

export async function persistCredential(input:{identityId:string;deviceId:string;credential:StoredCredentialInput}):Promise<void> {
  await sql.begin(async tx => {
    const [device] = await tx<{id:string}[]>`
      SELECT id::text FROM devices
      WHERE id=${input.deviceId} AND identity_id=${input.identityId} AND status='ACTIVE'
      FOR UPDATE
    `;
    if (!device) throw new Error('PASSKEY_DEVICE_INVALID');
    const [created] = await tx<{id:string}[]>`
      INSERT INTO webauthn_credentials (identity_id,device_id,credential_id,public_key,counter,transports)
      VALUES (${input.identityId},${input.deviceId},${input.credential.id},${Buffer.from(input.credential.publicKey)},${input.credential.counter},${input.credential.transports})
      ON CONFLICT (credential_id) DO NOTHING
      RETURNING id::text
    `;
    if (!created) throw new Error('PASSKEY_ALREADY_REGISTERED');
    await tx`UPDATE devices SET trusted=true,last_seen_at=now() WHERE id=${input.deviceId}`;
    await tx`
      INSERT INTO audit_events (actor_identity_id,kind,result,metadata)
      VALUES (${input.identityId},'PASSKEY_REGISTERED','ALLOW',jsonb_build_object('deviceId',${input.deviceId}::text,'credentialId',${input.credential.id}::text))
    `;
  });
}

export async function upgradeSessionAal2(input:{sessionId:string;identityId:string}):Promise<void> {
  await sql.begin(async tx => {
    const [updated] = await tx<{id:string}[]>`
      UPDATE sessions
      SET aal=2,aal2_expires_at=now()+interval '10 minutes'
      WHERE id=${input.sessionId}
        AND identity_id=${input.identityId}
        AND status='ACTIVE'
        AND expires_at>now()
      RETURNING id::text
    `;
    if (!updated) throw new Error('SESSION_INVALID');
    await tx`
      INSERT INTO audit_events (actor_identity_id,kind,result,metadata)
      VALUES (${input.identityId},'PASSKEY_STEP_UP','ALLOW',jsonb_build_object('sessionId',${input.sessionId}::text))
    `;
  });
}
