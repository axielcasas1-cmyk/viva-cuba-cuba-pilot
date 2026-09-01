import fs from 'node:fs';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL_REQUIRED');
const migration = fs.readFileSync(new URL('../db/migrations/0001_identity_core.sql', import.meta.url), 'utf8');
const sql = postgres(url, {prepare:false,max:1});
try {
  await sql.unsafe(migration);
  console.log('0001_identity_core: applied');
} finally {
  await sql.end();
}
