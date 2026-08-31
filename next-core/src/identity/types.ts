export type Identity = {id:string;dx:string;label:string};
export type AccessResponse = {identity:Identity;recoveryCode:string};
export type SessionResponse = {identity:Identity;device:{id:string;label:string};aal:1|2};
