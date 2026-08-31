export type IdentityRecord = {id:string;dx:string;label:string};
export type ActiveSessionRecord = {id:string;identityId:string;deviceId:string;aal:1|2;expiresAt:Date;aal2ExpiresAt:Date|null};

export interface CoreRepository {
  createIdentity(input:{dx:string;label:string}): Promise<IdentityRecord>;
  findIdentityByDx(dx:string): Promise<IdentityRecord|null>;
  createSession(input:{identityId:string;tokenHash:string;deviceId:string;aal:1|2;expiresAt:Date}): Promise<string>;
  findActiveSession(tokenHash:string): Promise<ActiveSessionRecord|null>;
  revokeSession(sessionId:string): Promise<void>;
  appendAudit(input:{actorIdentityId:string|null;kind:string;result:string;metadata:unknown}): Promise<void>;
}
