import {AccessService} from './access-service.js';
import type {CoreRepository,SecurityDeviceRecord,SecuritySessionRecord,SessionContext} from '../repositories/core-repository.js';

export type SecurityControlList = {
  identity:SessionContext['identity'];
  devices:Array<SecurityDeviceRecord & {current:boolean}>;
  sessions:Array<SecuritySessionRecord & {current:boolean}>;
};

export class SecurityControlService {
  constructor(private readonly repo:CoreRepository) {}

  private async context(sessionToken:string):Promise<SessionContext> {
    const context=await new AccessService(this.repo).session(sessionToken);
    if(!context)throw new Error('UNAUTHORIZED');
    return context;
  }

  private requireAal2(context:SessionContext):void {
    if(context.session.aal!==2)throw new Error('SECURITY_AAL2_REQUIRED');
  }

  async list(sessionToken:string):Promise<SecurityControlList> {
    const context=await this.context(sessionToken);
    const [devices,sessions]=await Promise.all([
      this.repo.listSecurityDevices(context.identity.id),
      this.repo.listSecuritySessions(context.identity.id)
    ]);
    return {
      identity:context.identity,
      devices:devices.map(device=>({...device,current:device.id===context.device.id})),
      sessions:sessions.map(session=>({...session,current:session.id===context.session.id}))
    };
  }

  async revokeSession(sessionToken:string,targetSessionId:string):Promise<void> {
    const context=await this.context(sessionToken);
    this.requireAal2(context);
    if(targetSessionId===context.session.id)throw new Error('SECURITY_CURRENT_SESSION_PROTECTED');
    if(!await this.repo.revokeOwnedSession(context.identity.id,targetSessionId))throw new Error('SECURITY_TARGET_NOT_FOUND');
  }

  async revokeDevice(sessionToken:string,targetDeviceId:string):Promise<void> {
    const context=await this.context(sessionToken);
    this.requireAal2(context);
    if(targetDeviceId===context.device.id)throw new Error('SECURITY_CURRENT_DEVICE_PROTECTED');
    if(!await this.repo.revokeOwnedDevice(context.identity.id,targetDeviceId))throw new Error('SECURITY_TARGET_NOT_FOUND');
  }
}
