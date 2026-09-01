import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migrationUrl = new URL('../db/migrations/20260901_identity_core_global_v1.sql', import.meta.url);

test('Identity Core global migration exists before client integration', () => {
  assert.equal(fs.existsSync(migrationUrl), true, 'missing Identity Core global migration');
});

test('Identity Core stores VCM VCR and session credentials as hashes only', () => {
  if (!fs.existsSync(migrationUrl)) return assert.fail('missing Identity Core global migration');
  const sql = fs.readFileSync(migrationUrl, 'utf8');
  assert.match(sql, /code_hash\s+text/i);
  assert.match(sql, /secret_hash\s+text/i);
  assert.match(sql, /token_hash\s+text/i);
  assert.match(sql, /digest\s*\(/i);
  assert.doesNotMatch(sql, /INSERT\s+INTO\s+public\.recovery_secrets[\s\S]{0,400}recovery_key/i);
});

test('Identity Core exposes atomic invite activation and rotating recovery RPCs', () => {
  if (!fs.existsSync(migrationUrl)) return assert.fail('missing Identity Core global migration');
  const sql = fs.readFileSync(migrationUrl, 'utf8');
  assert.match(sql, /FUNCTION\s+public\.vc_activate_invitation/i);
  assert.match(sql, /FUNCTION\s+public\.vc_recover_identity/i);
  assert.match(sql, /FUNCTION\s+public\.vc_issue_invitations/i);
  assert.match(sql, /state\s*=\s*'ISSUED'/i);
  assert.match(sql, /rotated_at/i);
});

test('Identity Core custom sessions are revocable and expire', () => {
  if (!fs.existsSync(migrationUrl)) return assert.fail('missing Identity Core global migration');
  const sql = fs.readFileSync(migrationUrl, 'utf8');
  assert.match(sql, /expires_at/i);
  assert.match(sql, /revoked/i);
  assert.match(sql, /FUNCTION\s+public\.vc_session_identity/i);
});
