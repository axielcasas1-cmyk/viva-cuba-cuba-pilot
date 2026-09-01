import {AccessService} from './access-service.js';
import {constantTimeSecretEqual,hashSecret,randomOwnerRecoveryCode,verifySecret} from '../crypto.js';
import {env} from '../env.js';
import type {CoreRepository,SessionContext} from '../repositories/core-repository.js';

export type OwnerContext = SessionContext & {ownerPolicyId:string};
export type OwnerBootstrapResult = {identity:SessionContext['identity'];device:SessionContext['device'];ownerPolicyId:string;recoveryCode:string};
export type OwnerRecoveryResult = OwnerBootstrapResult;

export class OwnerService {
  constructor(private readonly repo:CoreRepository) {}

  private async context(sessionToken:string):Promise<SessionContext> {
    const context=await new AccessService(this.repo).session(sessionToken);
    if(!context)throw new Error('UNAUTHORIZED');
    return context;
  }

  private requireAal2(context:SessionContext):void {
    if(context.session.aal!==2)throw new Error('OWNER_AAL2_REQUIRED');
  }

  async bootstrap(input:{sessionToken:string;bootstrapSecret:string}):Promise<OwnerBootstrapResult> {
    const context=await this.context(input.sessionToken);
    this.requireAal2(context);
    if(!constantTimeSecretEqual(input.bootstrapSecret,env.OWNER_BOOTSTRAP_SECRET))throw new Error('OWNER_BOOTSTRAP_INVALID');
    if(!await this.repo.isTrustedDevice(context.identity.id,context.device.id))throw new Error('OWNER_DEVICE_NOT_TRUSTED');

    const recoveryCode=randomOwnerRecoveryCode();
    const recovery=await hashSecret(recoveryCode);
    const owner=await this.repo.bootstrapOwner({
      identityId:context.identity.id,
      deviceId:context.device.id,
      recoverySalt:recovery.salt,
      recoveryDigest:recovery.digest
    });
    return {identity:context.identity,device:context.device,ownerPolicyId:owner.policyId,recoveryCode};
  }

  async recover(input:{sessionToken:string;recoveryCode:string}):Promise<OwnerRecoveryResult> {
    const context=await this.context(input.sessionToken);
    const code=input.recoveryCode.trim().toUpperCase();
    if(!/^VOR-[A-F0-9]{20}-[A-F0-9]{20}$/.test(code))throw new Error('OWNER_RECOVERY_INVALID');
    const active=await this.repo.findActiveRecovery(context.identity.id,'OWNER_RECOVERY');
    if(!active || !await verifySecret(code,active))throw new Error('OWNER_RECOVERY_INVALID');

    const nextRecoveryCode=randomOwnerRecoveryCode();
    const nextRecovery=await hashSecret(nextRecoveryCode);
    const owner=await this.repo.recoverOwner({
      identityId:context.identity.id,
      deviceId:context.device.id,
      recoveryId:active.id,
      nextRecoverySalt:nextRecovery.salt,
      nextRecoveryDigest:nextRecovery.digest
    });
    return {identity:context.identity,device:context.device,ownerPolicyId:owner.policyId,recoveryCode:nextRecoveryCode};
  }

  async requireOwner(sessionToken:string):Promise<OwnerContext> {
    const context=await this.context(sessionToken);
    this.requireAal2(context);
    const access=await this.repo.ownerAccess(context.identity.id,context.device.id);
    if(!access)throw new Error('OWNER_FORBIDDEN');
    return {...context,ownerPolicyId:access.policyId};
  }
}
