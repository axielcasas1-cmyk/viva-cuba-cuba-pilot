export type IdentityRecord = {id:string;dx:string;label:string};
export type ActiveSessionRecord = {id:string;identityId:string;deviceId:string;aal:1|2;expiresAt:Date;aal2ExpiresAt:Date|null};
export type InvitationSecretRecord = {id:string;salt:string;digest:string;expiresAt:Date};
export type RecoverySecretRecord = {id:string;identityId:string;salt:string;digest:string};
export type SessionContext = {session:ActiveSessionRecord;identity:IdentityRecord;device:{id:string;label:string}};
export type OwnerAccessRecord = {policyId:string};

export interface CoreRepository {
  createIdentity(input:{dx:string;label:string}): Promise<IdentityRecord>;
  findIdentityByDx(dx:string): Promise<IdentityRecord|null>;
  createSession(input:{identityId:string;tokenHash:string;deviceId:string;aal:1|2;expiresAt:Date}): Promise<string>;
  findActiveSession(tokenHash:string): Promise<ActiveSessionRecord|null>;
  revokeSession(sessionId:string): Promise<void>;
  appendAudit(input:{actorIdentityId:string|null;kind:string;result:string;metadata:unknown}): Promise<void>;
  createInvitation(input:{lookupHash:string;salt:string;digest:string;label?:string;expiresAt:Date;createdByIdentityId?:string|null}):Promise<string>;
  findInvitationByLookupHash(lookupHash:string):Promise<InvitationSecretRecord|null>;
  activateInvitation(input:{invitationId:string;dx:string;label:string;clientDeviceId:string;deviceLabel:string;recoverySalt:string;recoveryDigest:string;sessionTokenHash:string;sessionExpiresAt:Date}):Promise<{identity:IdentityRecord;deviceId:string;sessionId:string}>;
  findActiveRecovery(identityId:string,purpose:'USER_RECOVERY'|'OWNER_RECOVERY'):Promise<RecoverySecretRecord|null>;
  recoverIdentity(input:{identityId:string;recoveryId:string;clientDeviceId:string;deviceLabel:string;nextRecoverySalt:string;nextRecoveryDigest:string;sessionTokenHash:string;sessionExpiresAt:Date}):Promise<{identity:IdentityRecord;deviceId:string;sessionId:string}>;
  sessionContext(tokenHash:string):Promise<SessionContext|null>;
  revokeSessionByTokenHash(tokenHash:string):Promise<void>;
  isTrustedDevice(identityId:string,deviceId:string):Promise<boolean>;
  bootstrapOwner(input:{identityId:string;deviceId:string;recoverySalt:string;recoveryDigest:string}):Promise<OwnerAccessRecord>;
  recoverOwner(input:{identityId:string;deviceId:string;recoveryId:string;nextRecoverySalt:string;nextRecoveryDigest:string}):Promise<OwnerAccessRecord>;
  ownerAccess(identityId:string,deviceId:string):Promise<OwnerAccessRecord|null>;
}
