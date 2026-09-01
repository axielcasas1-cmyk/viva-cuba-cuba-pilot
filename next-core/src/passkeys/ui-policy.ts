export type UserPasskeyAction='REGISTER'|'STEP_UP';
export type OwnerPasskeyAction='STEP_UP'|'USER_PREPARE';

export function userPasskeyActions(aal:1|2):UserPasskeyAction[]{
  return aal===2 ? ['REGISTER'] : ['REGISTER','STEP_UP'];
}

export function ownerPasskeyAction(errorCode:string):OwnerPasskeyAction{
  return errorCode==='OWNER_AAL2_REQUIRED' ? 'STEP_UP' : 'USER_PREPARE';
}
