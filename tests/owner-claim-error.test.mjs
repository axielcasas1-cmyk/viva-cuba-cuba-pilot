import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyOwnerClaimError } from '../site/lib/owner-claim-error.mjs';

test('owner claim distinguishes backend permission errors from invalid SETUP', () => {
  assert.equal(classifyOwnerClaimError(new Error('permission denied for function dx_claim_owner_setup')), 'PERMISSION');
  assert.equal(classifyOwnerClaimError(new Error('PGRST202 Could not find the function public.dx_claim_owner_setup')), 'RPC_MISSING');
  assert.equal(classifyOwnerClaimError(new Error('Failed to fetch')), 'NETWORK');
  assert.equal(classifyOwnerClaimError(new Error('DESAPLICAXI_TIMEOUT')), 'TIMEOUT');
  assert.equal(classifyOwnerClaimError(new Error('SETUP_INVALID_OR_EXPIRED')), 'SETUP_INVALID');
});
