import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const master = fs.readFileSync(new URL('../docs/VIVA_CUBA_MASTER_SPEC.md', import.meta.url), 'utf8');
const migration = JSON.parse(fs.readFileSync(new URL('../docs/migration-contract.json', import.meta.url), 'utf8'));
const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');

test('canonical documentation is linked and protects core architecture', () => {
  assert.match(readme, /VIVA_CUBA_MASTER_SPEC\.md/);
  assert.match(readme, /migration-contract\.json/);
  assert.match(master, /OWNER = USER \+ ADMINISTRACIÓN/);
  assert.match(master, /STICKERS HÍBRIDOS/);
  assert.match(master, /VIDEOLLAMADA/);
  assert.match(master, /CONTRATO DE MIGRACIÓN/);
  assert.match(master, /REGLA DE CAMBIO PERMANENTE/);
});

test('machine-readable migration contract preserves critical state and capabilities', () => {
  assert.equal(migration.product, 'VIVA CUBA + DESAPLICAXI Identity Core');
  assert.equal(migration.roles.OWNER, 'USER capabilities plus administrative Command Center');
  assert.ok(migration.persistence.localStorage.vc_cuba_pilot_profile_v1);
  assert.ok(migration.persistence.localStorage.vc_owner_persistent_v1);
  assert.ok(migration.persistence.localStorage.vc_stickers_recents_v1);
  assert.ok(migration.persistence.localStorage.vc_stickers_favorites_v1);
  assert.equal(migration.stickers.mode, 'hybrid');
  assert.equal(migration.video.ux, 'embedded inside VIVA CUBA');
  assert.ok(migration.migration_invariants.length >= 8);
});
