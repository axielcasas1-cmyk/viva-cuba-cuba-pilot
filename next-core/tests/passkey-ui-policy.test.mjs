import test from 'node:test';
import assert from 'node:assert/strict';
import {ownerPasskeyAction,userPasskeyActions} from '../dist-test/src/passkeys/ui-policy.js';

test('USER AAL1 exposes registration and step-up while AAL2 avoids redundant step-up',()=>{
  assert.deepEqual(userPasskeyActions(1),['REGISTER','STEP_UP']);
  assert.deepEqual(userPasskeyActions(2),['REGISTER']);
});

test('OWNER only offers direct step-up for the explicit AAL2-required lock',()=>{
  assert.equal(ownerPasskeyAction('OWNER_AAL2_REQUIRED'),'STEP_UP');
  assert.equal(ownerPasskeyAction('OWNER_FORBIDDEN'),'USER_PREPARE');
  assert.equal(ownerPasskeyAction('UNAUTHORIZED'),'USER_PREPARE');
});
