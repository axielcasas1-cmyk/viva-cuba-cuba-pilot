import test from 'node:test';
import assert from 'node:assert/strict';

import {
  compareSemver,
  shouldUpdate,
  reloadGuardKey,
  appendReleaseAudit,
  readReleaseAudit,
  normalizeRelease,
} from '../site/lib/release-core.mjs';

test('release core compares semantic versions numerically', () => {
  assert.equal(compareSemver('0.9.0', '0.8.9'), 1);
  assert.equal(compareSemver('1.0.0', '1.0.0'), 0);
  assert.equal(compareSemver('1.2.3', '2.0.0'), -1);
  assert.equal(compareSemver('1.10.0', '1.9.9'), 1);
});

test('release core only upgrades to a newer compatible mother release', () => {
  assert.equal(shouldUpdate('0.8.0', { version: '0.9.0', minimumClientVersion: '0.7.0', channel: 'stable' }), true);
  assert.equal(shouldUpdate('0.9.0', { version: '0.9.0', minimumClientVersion: '0.7.0', channel: 'stable' }), false);
  assert.equal(shouldUpdate('1.0.0', { version: '0.9.0', minimumClientVersion: '0.7.0', channel: 'stable' }), false);
  assert.equal(shouldUpdate('0.8.0', { version: '0.9.0', minimumClientVersion: '0.7.0', channel: 'preview' }), false);
});

test('release manifest normalization rejects malformed versions and accepts stable contract', () => {
  assert.throws(() => normalizeRelease({ version: 'latest' }), /INVALID_RELEASE_VERSION/);
  const normalized = normalizeRelease({
    app: 'VIVA_CUBA',
    version: '0.9.0',
    minimumClientVersion: '0.7.0',
    channel: 'stable',
    schemaVersion: 1,
    releasedAt: '2026-09-01T19:00:00Z',
  });
  assert.equal(normalized.version, '0.9.0');
  assert.equal(normalized.channel, 'stable');
  assert.equal(normalized.schemaVersion, 1);
});

test('reload guard is deterministic per target version and cannot grow from timestamps', () => {
  assert.equal(reloadGuardKey('0.9.0'), 'vc_release_reload_once:0.9.0');
  assert.equal(reloadGuardKey('0.9.0'), reloadGuardKey('0.9.0'));
  assert.notEqual(reloadGuardKey('0.9.0'), reloadGuardKey('0.9.1'));
});

test('release audit is bounded and stores only operational metadata', () => {
  const map = new Map();
  const storage = {
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(key, value); },
  };

  for (let i = 0; i < 70; i += 1) {
    appendReleaseAudit(storage, {
      at: `2026-09-01T19:${String(i % 60).padStart(2, '0')}:00.000Z`,
      event: 'release_check',
      currentVersion: '0.8.0',
      targetVersion: '0.9.0',
      online: true,
      timezone: 'Europe/Madrid',
    });
  }

  const rows = readReleaseAudit(storage);
  assert.equal(rows.length, 50);
  assert.equal(rows.at(-1).event, 'release_check');
  assert.equal(Object.hasOwn(rows.at(-1), 'preciseLocation'), false);
  assert.equal(Object.hasOwn(rows.at(-1), 'messageContent'), false);
});
