import {generateDx} from '../dx.js';
import {hashSecret, randomRecoveryCode, sha256, verifySecret} from '../crypto.js';
import {newSessionToken, sessionExpiresAt, sessionTokenHash} from '../sessions.js';
import type {CoreRepository, IdentityRecord, SessionContext} from '../repositories/core-repository.js';

export type ActivationResult = {identity:IdentityRecord;recoveryCode:string;sessionToken:string};
export type RecoveryResult = {identity:IdentityRecord;recoveryCode:string;sessionToken:string};

export class AccessService {
  constructor(private readonly repo:CoreRepository) {}

  private async uniqueDx():Promise<string> {
    for (let i=0;i<8;i++) {
      const dx=generateDx();
      if (!await this.repo.findIdentityByDx(dx)) return dx;
    }
    throw new Error('DX_ALLOCATION_FAILED');
  }

  async activate(input:{code:string;label:string;deviceId:string;deviceLabel?:string}):Promise<ActivationResult> {
    const code=input.code.trim().toUpperCase(), label=input.label.trim(), clientDeviceId=input.deviceId.trim();
    if (!/^VCM-[A-Z0-9-]{8,80}$/.test(code) || label.length<2 || label.length>80 || clientDeviceId.length<8 || clientDeviceId.length>160) throw new Error('INVALID_ACTIVATION');
    const invitation=await this.repo.findInvitationByLookupHash(sha256(code));
    if (!invitation || !await verifySecret(code, invitation)) throw new Error('INVALID_OR_EXPIRED_INVITATION');
    const dx=await this.uniqueDx(), recoveryCode=randomRecoveryCode(), recovery=await hashSecret(recoveryCode), sessionToken=newSessionToken();
    const created=await this.repo.activateInvitation({invitationId:invitation.id,dx,label,clientDeviceId,deviceLabel:(input.deviceLabel||'Dispositivo principal').slice(0,120),recoverySalt:recovery.salt,recoveryDigest:recovery.digest,sessionTokenHash:sessionTokenHash(sessionToken),sessionExpiresAt:sessionExpiresAt()});
    return {identity:created.identity,recoveryCode,sessionToken};
  }

  async recover(input:{dx:string;recoveryCode:string;deviceId:string;deviceLabel?:string}):Promise<RecoveryResult> {
    const dx=input.dx.trim().toUpperCase(), recoveryCode=input.recoveryCode.trim().toUpperCase(), clientDeviceId=input.deviceId.trim();
    if (!/^DX-[A-Z0-9]{8}$/.test(dx) || !/^VCR-[A-F0-9]{20}-[A-F0-9]{20}$/.test(recoveryCode) || clientDeviceId.length<8 || clientDeviceId.length>160) throw new Error('INVALID_RECOVERY');
    const identity=await this.repo.findIdentityByDx(dx);
    if (!identity) throw new Error('INVALID_RECOVERY');
    const active=await this.repo.findActiveRecovery(identity.id,'USER_RECOVERY');
    if (!active || !await verifySecret(recoveryCode,active)) throw new Error('INVALID_RECOVERY');
    const nextRecoveryCode=randomRecoveryCode(), nextRecovery=await hashSecret(nextRecoveryCode), sessionToken=newSessionToken();
    const recovered=await this.repo.recoverIdentity({identityId:identity.id,recoveryId:active.id,clientDeviceId,deviceLabel:(input.deviceLabel||'Dispositivo recuperado').slice(0,120),nextRecoverySalt:nextRecovery.salt,nextRecoveryDigest:nextRecovery.digest,sessionTokenHash:sessionTokenHash(sessionToken),sessionExpiresAt:sessionExpiresAt()});
    return {identity:recovered.identity,recoveryCode:nextRecoveryCode,sessionToken};
  }

  async session(token:string):Promise<SessionContext|null> {
    if (!token) return null;
    return this.repo.sessionContext(sessionTokenHash(token));
  }

  async logout(token:string):Promise<void> {
    if (token) await this.repo.revokeSessionByTokenHash(sessionTokenHash(token));
  }
}
