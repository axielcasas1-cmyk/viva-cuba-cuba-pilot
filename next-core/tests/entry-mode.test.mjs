import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveEntryMode} from '../dist-test/src/entry-mode.js';

test('public root is always USER regardless of query or hash',()=>{
  assert.equal(resolveEntryMode('/'),'USER');
  assert.equal(resolveEntryMode('/?mode=owner'),'USER');
  assert.equal(resolveEntryMode('/#owner'),'USER');
  assert.equal(resolveEntryMode('/?mode=owner#owner'),'USER');
});

test('OWNER exists only on the dedicated /owner route',()=>{
  assert.equal(resolveEntryMode('/owner'),'OWNER');
  assert.equal(resolveEntryMode('/owner/'),'OWNER');
  assert.equal(resolveEntryMode('/owner/security'),'OWNER');
  assert.equal(resolveEntryMode('/owner?from=public'),'OWNER');
});

test('lookalike paths never become OWNER',()=>{
  assert.equal(resolveEntryMode('/ownerish'),'USER');
  assert.equal(resolveEntryMode('/users/owner'),'USER');
  assert.equal(resolveEntryMode('/OWNER'),'USER');
});
