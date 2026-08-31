import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import postgres from 'postgres';

const required = ['identities','devices','sessions','recovery_secrets','owner_policy','owner_admin_devices','webauthn_credentials','invitations','audit_events'];

test('identity core migration creates required tables', {skip: !process.env.DATABASE_URL}, async () => {
  const sql = postgres(process.env.DATABASE_URL, {prepare:false,max:1});
  try {
    const migration = fs.readFileSync(new URL('../db/migrations/0001_identity_core.sql', import.meta.url), 'utf8');
    await sql.unsafe(migration);
    const rows = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`;
    const names = new Set(rows.map((r) => r.table_name));
    for (const table of required) assert.equal(names.has(table), true, `missing ${table}`);
  } finally {
    await sql.end();
  }
});
