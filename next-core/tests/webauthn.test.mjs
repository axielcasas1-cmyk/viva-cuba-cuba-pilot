import test from 'node:test';
import assert from 'node:assert/strict';
import { challengeDigest, challengeExpiresAt } from '../dist-test/server/services/webauthn-service.js';

test('WebAuthn challenge TTL is capped at five minutes', () => {
  const now = new Date('2026-08-31T20:30:00.000Z');
  const expires = challengeExpiresAt(now);
  assert.equal(expires.toISOString(), '2026-08-31T20:35:00.000Z');
});

test('WebAuthn challenge digest is deterministic and does not expose challenge', () => {
  const challenge = 'sensitive-challenge-value';
  const a = challengeDigest(challenge);
  const b = challengeDigest(challenge);
  assert.equal(a, b);
  assert.notEqual(a, challenge);
  assert.match(a, /^[a-f0-9]{64}$/);
});
