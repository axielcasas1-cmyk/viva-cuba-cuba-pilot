import test from 'node:test';
import assert from 'node:assert/strict';
import {generateDx} from '../dist-test/server/dx.js';

test('DX is random and follows canonical format', () => {
  const a = generateDx();
  const b = generateDx();
  assert.match(a, /^DX-[A-Z0-9]{8}$/);
  assert.match(b, /^DX-[A-Z0-9]{8}$/);
  assert.notEqual(a, b);
});
