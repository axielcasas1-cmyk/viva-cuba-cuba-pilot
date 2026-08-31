import {sql} from '../db.js';
import type {ActiveSessionRecord, CoreRepository, IdentityRecord} from './core-repository.js';

export class PostgresCoreRepository implements CoreRepository {
  async createIdentity(input:{dx:string;label:string}):Promise<IdentityRecord> {
    const [row] = await sql<{id:string;dx:string;label:string}[]>`
      INSERT INTO identities (dx,label) VALUES (${input.dx},${input.label})
      RETURNING id::text,dx,label
    `;
    return row;
  }

  async findIdentityByDx(dx:string):Promise<IdentityRecord|null> {
    const [row] = await sql<{id:string;dx:string;label:string}[]>`
      SELECT id::text,dx,label FROM identities WHERE dx=${dx} AND status='ACTIVE' LIMIT 1
    `;
    return row ?? null;
  }

  async createSession(input:{identityId:string;tokenHash:string;deviceId:string;aal:1|2;expiresAt:Date}):Promise<string> {
    const [row] = await sql<{id:string}[]>`
      INSERT INTO sessions (identity_id,device_id,token_hash,aal,expires_at)
      VALUES (${input.identityId},${input.deviceId},${input.tokenHash},${input.aal},${input.expiresAt})
      RETURNING id::text
    `;
    return row.id;
  }

  async findActiveSession(tokenHash:string):Promise<ActiveSessionRecord|null> {
    const [row] = await sql<{id:string;identity_id:string;device_id:string;aal:number;expires_at:Date;aal2_expires_at:Date|null}[]>`
      SELECT id::text,identity_id::text,device_id::text,aal,expires_at,aal2_expires_at
      FROM sessions
      WHERE token_hash=${tokenHash} AND status='ACTIVE' AND expires_at>now()
      LIMIT 1
    `;
    return row ? {id:row.id,identityId:row.identity_id,deviceId:row.device_id,aal:row.aal===2?2:1,expiresAt:row.expires_at,aal2ExpiresAt:row.aal2_expires_at} : null;
  }

  async revokeSession(sessionId:string):Promise<void> {
    await sql`UPDATE sessions SET status='REVOKED',revoked_at=now() WHERE id=${sessionId}`;
  }

  async appendAudit(input:{actorIdentityId:string|null;kind:string;result:string;metadata:unknown}):Promise<void> {
    await sql`
      INSERT INTO audit_events (actor_identity_id,kind,result,metadata)
      VALUES (${input.actorIdentityId},${input.kind},${input.result},${sql.json(input.metadata as Record<string,unknown>)})
    `;
  }
}
