import test from 'node:test';
import assert from 'node:assert/strict';
import {healthPayload} from '../dist-test/server/health.js';

test('health payload identifies NEXT CORE', () => {
  assert.deepEqual(healthPayload(), {ok: true, service: 'viva-cuba-next-core'});
});
