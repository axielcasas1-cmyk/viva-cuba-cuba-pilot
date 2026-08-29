# VIVA CUBA NEXT CORE Gates 1–2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an independently deployable NEXT CORE preview with provider-independent persistence, permanent DX identity, recoverable USER/OWNER authentication, device/session control, and safe PWA install/update without touching `viva.desaplicaxi.com`.

**Architecture:** Create a new `next-core/` TypeScript/Vite workspace beside the historical GitHub pilot. Vercel serves the frontend and HTTP functions; PostgreSQL is accessed only through a small repository adapter using standard `DATABASE_URL`. Authentication is DESAPLICAXI-native: invitation + recovery for users, WebAuthn/passkey + controlled recovery for OWNER, HttpOnly sessions, explicit `/owner` routing, and no first-login-wins ownership.

**Tech Stack:** Node.js 22+, TypeScript 5+, Vite 6+, PostgreSQL, `postgres`, `zod`, `@simplewebauthn/server`, `@simplewebauthn/browser`, WebCrypto/Node crypto, Playwright, Node test runner, GitHub Actions, Vercel.

**Spec:** `docs/superpowers/specs/2026-08-29-viva-cuba-next-core-radar-neon-design.md`

## Global Constraints

- AppDeploy v18 `1787770673468` remains the emergency rollback reference.
- AppDeploy v35 `1787870459426` remains the advanced-capability reference.
- Production `viva.desaplicaxi.com` is not changed in this plan.
- `/` is USER; `/owner` is explicit OWNER.
- No Jitsi dependency or hosted-meeting redirect is introduced.
- No plaintext private message/media/location storage is introduced.
- Optional PWA/UI modules cannot prevent USER or OWNER bootstrap.
- OWNER destructive actions require AAL2/passkey-authenticated session.
- Session/recovery secrets are never stored in plaintext server-side.
- Node runtime floor is `>=22`.
- Every task follows RED → GREEN → REFACTOR → BUILD/VERIFY → COMMIT.

---

## File Structure Locked by This Plan

```text
next-core/
  package.json
  tsconfig.json
  vite.config.ts
  vercel.json
  .env.example
  public/
    manifest.webmanifest
    sw.js
    icons/README.md
  src/
    main.ts
    styles/base.css
    app/bootstrap.ts
    app/router.ts
    app/critical-activity.ts
    identity/client.ts
    identity/types.ts
    owner/client.ts
    pwa/install.ts
    pwa/update.ts
  api/
    health.ts
    version.ts
    access/activate.ts
    access/recover.ts
    session/me.ts
    session/logout.ts
    webauthn/register-options.ts
    webauthn/register-verify.ts
    webauthn/auth-options.ts
    webauthn/auth-verify.ts
    owner/setup-start.ts
    owner/setup-complete.ts
    owner/recover.ts
    owner/dashboard.ts
    owner/devices.ts
    owner/sessions.ts
    owner/revoke-device.ts
    owner/revoke-session.ts
  server/
    env.ts
    db.ts
    http.ts
    crypto.ts
    dx.ts
    sessions.ts
    audit.ts
    repositories/core-repository.ts
    repositories/postgres-core-repository.ts
    services/access-service.ts
    services/webauthn-service.ts
    services/owner-service.ts
  db/migrations/
    0001_identity_core.sql
  tests/
    preservation.test.mjs
    dx.test.mjs
    schema.integration.test.mjs
    access.integration.test.mjs
    owner.integration.test.mjs
    route-separation.test.mjs
    pwa-update.test.mjs
    e2e/user-owner.spec.ts
  scripts/
    migrate.mjs
    verify-migration-contract.mjs
.github/workflows/
  next-core-ci.yml
```

The existing `site/` GitHub Pilot remains untouched by Gates 1–2 except documentation clearly marking it historical.

---

### Task 1: Preserve v18/v35 and Enforce the Migration Contract

**Files:**
- Create: `docs/migrations/appdeploy-snapshots.json`
- Create: `docs/migrations/ROLLBACK.md`
- Create: `docs/migrations/next-core-contract.json`
- Create: `next-core/tests/preservation.test.mjs`
- Create: `next-core/scripts/verify-migration-contract.mjs`

**Interfaces:**
- Consumes: approved NEXT CORE spec.
- Produces: machine-readable invariant set used by all later CI jobs.

- [ ] **Step 1: Write the failing preservation test**

```js
// next-core/tests/preservation.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const contractPath = new URL('../../docs/migrations/next-core-contract.json', import.meta.url);
const snapshotsPath = new URL('../../docs/migrations/appdeploy-snapshots.json', import.meta.url);

test('NEXT CORE preservation metadata locks v18, v35 and transport invariants', () => {
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  const snapshots = JSON.parse(fs.readFileSync(snapshotsPath, 'utf8'));
  assert.equal(snapshots.v18.version, '1787770673468');
  assert.equal(snapshots.v35.version, '1787870459426');
  assert.equal(contract.identity.phoneIndependent, true);
  assert.equal(contract.calls.oneToOne, 'webrtc-p2p-turn');
  assert.equal(contract.calls.jitsiCanonical, false);
  assert.equal(contract.routes.publicDefault, '/');
  assert.equal(contract.routes.owner, '/owner');
});
```

- [ ] **Step 2: Run it and verify RED**

Run: `node --test next-core/tests/preservation.test.mjs`

Expected: FAIL with `ENOENT` for `docs/migrations/next-core-contract.json`.

- [ ] **Step 3: Create the snapshot inventory**

```json
{
  "v18": {
    "provider": "AppDeploy",
    "version": "1787770673468",
    "role": "emergency-rollback",
    "mustPreserve": ["dx", "e2ee-chat", "receipts", "webrtc-p2p-turn", "screen-share", "encrypted-media", "safe-update"]
  },
  "v35": {
    "provider": "AppDeploy",
    "version": "1787870459426",
    "role": "advanced-reference",
    "mustReference": ["owner", "gate", "groups-10", "sfu", "in-call-events", "live-location-e2ee", "pwa-controls"]
  }
}
```

- [ ] **Step 4: Create the migration contract**

```json
{
  "identity": {"phoneIndependent": true, "stableDx": true, "multiDevice": true},
  "routes": {"publicDefault": "/", "owner": "/owner", "publicMayAutoOpenOwner": false},
  "calls": {"oneToOne": "webrtc-p2p-turn", "groups": "replaceable-sfu", "jitsiCanonical": false},
  "crypto": {"plaintextMessagesServerSide": false, "plaintextMediaServerSide": false, "privateKeysServerSide": false},
  "updates": {"blockDuringCriticalActivity": true},
  "migrationRequired": ["identities", "devices", "sessions", "publicKeys", "contacts", "encryptedEnvelopes", "receipts", "mediaRefs", "ownerPolicy", "audit"]
}
```

- [ ] **Step 5: Create `ROLLBACK.md` with exact operator rules**

Document that production is not switched during Gates 1–2; AppDeploy v18 is the emergency runtime; v35 is reference-only; a failed preview is abandoned rather than pointed at `viva.desaplicaxi.com`.

- [ ] **Step 6: Run preservation test GREEN**

Run: `node --test next-core/tests/preservation.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add docs/migrations next-core/tests/preservation.test.mjs next-core/scripts/verify-migration-contract.mjs
git commit -m "chore: lock NEXT CORE preservation contract"
```

---

### Task 2: Scaffold the Independent NEXT CORE Runtime

**Files:**
- Create: `next-core/package.json`
- Create: `next-core/tsconfig.json`
- Create: `next-core/vite.config.ts`
- Create: `next-core/vercel.json`
- Create: `next-core/.env.example`
- Create: `next-core/index.html`
- Create: `next-core/src/main.ts`
- Create: `next-core/src/styles/base.css`
- Create: `next-core/api/health.ts`
- Create: `next-core/api/version.ts`
- Test: `next-core/tests/health.test.mjs`

**Interfaces:**
- Produces: `GET /api/health -> {ok:true,service:'viva-cuba-next-core'}` and `GET /api/version -> release metadata`.

- [ ] **Step 1: Write RED health test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { healthPayload } from '../dist-test/server/health.js';

test('health payload identifies NEXT CORE', () => {
  assert.deepEqual(healthPayload(), {ok: true, service: 'viva-cuba-next-core'});
});
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "viva-cuba-next-core",
  "private": true,
  "type": "module",
  "engines": {"node": ">=22"},
  "scripts": {
    "build": "vite build",
    "typecheck": "tsc --noEmit",
    "test": "npm run typecheck && node --test tests/*.test.mjs",
    "migrate": "node scripts/migrate.mjs",
    "e2e": "playwright test"
  },
  "dependencies": {
    "@simplewebauthn/browser": "^13.1.0",
    "@simplewebauthn/server": "^13.1.0",
    "postgres": "^3.4.7",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.55.0",
    "typescript": "^5.9.0",
    "vite": "^6.1.0"
  }
}
```

- [ ] **Step 3: Create Vite/TypeScript config and minimal HTML**

`vite.config.ts` must set `base: '/'` and build to `dist`. `index.html` contains only `<div id="app"></div>` and `/src/main.ts`.

- [ ] **Step 4: Create minimal USER bootstrap UI**

```ts
// next-core/src/main.ts
import './styles/base.css';
const root = document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML = '<main class="vc-shell"><h1>VIVA CUBA</h1><p>NEXT CORE preview</p></main>';
```

- [ ] **Step 5: Add health/version shared implementation and Vercel handlers**

```ts
// next-core/server/health.ts
export const healthPayload = () => ({ok: true, service: 'viva-cuba-next-core'} as const);
```

```ts
// next-core/api/health.ts
import {healthPayload} from '../server/health.js';
export default function handler(_req: unknown, res: {status:(n:number)=>any;json:(v:unknown)=>void}) {
  res.status(200).json(healthPayload());
}
```

- [ ] **Step 6: Configure Vercel rewrites**

`vercel.json` must route `/owner` to `/index.html` while leaving `/api/*` functions untouched.

- [ ] **Step 7: Run typecheck/build**

Run: `cd next-core && npm install && npm run typecheck && npm run build`

Expected: both commands succeed.

- [ ] **Step 8: Commit**

```bash
git add next-core
git commit -m "feat: scaffold NEXT CORE preview runtime"
```

---

### Task 3: Add Environment Validation, PostgreSQL Adapter and Schema

**Files:**
- Create: `next-core/server/env.ts`
- Create: `next-core/server/db.ts`
- Create: `next-core/server/repositories/core-repository.ts`
- Create: `next-core/server/repositories/postgres-core-repository.ts`
- Create: `next-core/db/migrations/0001_identity_core.sql`
- Create: `next-core/scripts/migrate.mjs`
- Test: `next-core/tests/schema.integration.test.mjs`

**Interfaces:**
- Produces: `CoreRepository` methods for identity/session/device/owner/audit used by Tasks 4–6.

- [ ] **Step 1: Write RED schema integration test**

Test connects to `process.env.DATABASE_URL`, runs migration, and asserts tables `identities`, `devices`, `sessions`, `recovery_secrets`, `owner_policy`, `owner_admin_devices`, `webauthn_credentials`, `invitations`, `audit_events` exist.

- [ ] **Step 2: Define environment schema**

```ts
import {z} from 'zod';
export const env = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_COOKIE_NAME: z.string().default('vc_session'),
  RP_ID: z.string().min(1),
  RP_ORIGIN: z.string().url(),
  OWNER_BOOTSTRAP_SECRET: z.string().min(24)
}).parse(process.env);
```

- [ ] **Step 3: Create SQL schema**

Use UUID primary keys, unique `dx`, hashed session/recovery columns, timestamps, explicit status checks, foreign keys and indexes. `owner_policy` must allow exactly one active policy row but multiple historical/admin-device records.

- [ ] **Step 4: Define repository interface**

```ts
export interface CoreRepository {
  createIdentity(input:{dx:string;label:string}): Promise<{id:string;dx:string;label:string}>;
  findIdentityByDx(dx:string): Promise<{id:string;dx:string;label:string}|null>;
  createSession(input:{identityId:string;tokenHash:string;deviceId:string;aal:1|2;expiresAt:Date}): Promise<string>;
  findActiveSession(tokenHash:string): Promise<{id:string;identityId:string;deviceId:string;aal:1|2}|null>;
  revokeSession(sessionId:string): Promise<void>;
  appendAudit(input:{actorIdentityId:string|null;kind:string;result:string;metadata:unknown}): Promise<void>;
}
```

- [ ] **Step 5: Implement PostgreSQL adapter with parameterized queries only**

Use `postgres(env.DATABASE_URL, {prepare:false, max:5})`. No string interpolation for user-controlled SQL values.

- [ ] **Step 6: Run migration test GREEN**

Run against local/test Postgres:

```bash
cd next-core
DATABASE_URL=postgres://postgres:postgres@localhost:5432/viva_test npm test
```

Expected: schema test PASS.

- [ ] **Step 7: Commit**

```bash
git add next-core/server next-core/db next-core/scripts next-core/tests/schema.integration.test.mjs
git commit -m "feat: add provider-independent identity database"
```

---

### Task 4: Implement DX, Invitation Activation, Recovery and Sessions

**Files:**
- Create: `next-core/server/dx.ts`
- Create: `next-core/server/crypto.ts`
- Create: `next-core/server/sessions.ts`
- Create: `next-core/server/services/access-service.ts`
- Create: `next-core/api/access/activate.ts`
- Create: `next-core/api/access/recover.ts`
- Create: `next-core/api/session/me.ts`
- Create: `next-core/api/session/logout.ts`
- Create: `next-core/src/identity/types.ts`
- Create: `next-core/src/identity/client.ts`
- Test: `next-core/tests/dx.test.mjs`
- Test: `next-core/tests/access.integration.test.mjs`

**Interfaces:**
- `generateDx(): string`
- `activate({code,label,deviceId}) -> {identity,recoveryCode}` plus HttpOnly session cookie.
- `recover({dx,recoveryCode,deviceId}) -> {identity,nextRecoveryCode}` and rotates old recovery secret.

- [ ] **Step 1: RED-test DX format**

```js
assert.match(generateDx(), /^DX-[A-Z0-9]{8}$/);
assert.notEqual(generateDx(), generateDx());
```

- [ ] **Step 2: Implement DX generation using cryptographic randomness**

```ts
import {randomBytes} from 'node:crypto';
export function generateDx() {
  return `DX-${randomBytes(5).toString('base64url').replace(/[-_]/g,'').slice(0,8).toUpperCase()}`;
}
```

- [ ] **Step 3: Implement secret hashing**

Use `scrypt` with a random 16-byte salt for invitation/recovery secrets and constant-time comparison. Session tokens use 32 random bytes and SHA-256 hash because the token already has high entropy.

- [ ] **Step 4: Implement activation transaction**

Activation must: validate `VCM-` code → consume exactly once → create identity → create device → create 30-day session → create `VCR-` recovery secret hash → audit `USER_ACTIVATED` → return plaintext VCR only once.

- [ ] **Step 5: Implement recovery transaction**

Recovery must validate DX + active VCR, mark old recovery `ROTATED`, create a new device/session and new VCR, then audit `USER_RECOVERED`. Invalid recovery never reveals whether DX exists.

- [ ] **Step 6: Set cookie exactly**

Cookie attributes: `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`.

- [ ] **Step 7: Add access integration tests**

Cover one-time invitation, duplicate activation rejection, valid recovery, old recovery rejection after rotation, logout revocation and `/api/session/me`.

- [ ] **Step 8: Run GREEN**

Run: `cd next-core && npm test`

Expected: all access tests PASS.

- [ ] **Step 9: Commit**

```bash
git add next-core/server next-core/api/access next-core/api/session next-core/src/identity next-core/tests
git commit -m "feat: add DX activation recovery and sessions"
```

---

### Task 5: Implement WebAuthn/Passkeys and Trusted Devices

**Files:**
- Create: `next-core/server/services/webauthn-service.ts`
- Create: `next-core/api/webauthn/register-options.ts`
- Create: `next-core/api/webauthn/register-verify.ts`
- Create: `next-core/api/webauthn/auth-options.ts`
- Create: `next-core/api/webauthn/auth-verify.ts`
- Modify: `next-core/db/migrations/0001_identity_core.sql`
- Test: `next-core/tests/webauthn.test.mjs`

**Interfaces:**
- `beginRegistration(identityId, deviceId)`
- `finishRegistration(identityId, response)`
- `beginAuthentication(identityId)`
- `finishAuthentication(identityId, response) -> aal2 session upgrade`

- [ ] **Step 1: RED-test challenge persistence and one-time use**

The test asserts a challenge expires in 5 minutes and cannot be verified twice.

- [ ] **Step 2: Implement registration options**

Use `generateRegistrationOptions` with `rpID=env.RP_ID`, `userVerification:'required'`, `residentKey:'preferred'`, and store only the challenge server-side with TTL.

- [ ] **Step 3: Verify registration response**

Use `verifyRegistrationResponse`; persist `credentialID`, public key, counter, transports and device association. Never persist biometric data.

- [ ] **Step 4: Implement authentication and AAL2 upgrade**

After `verifyAuthenticationResponse`, update credential counter and set the current server session `aal=2` with `aal2_expires_at=now()+10 minutes`.

- [ ] **Step 5: Test replay/counter protection**

Reject reused challenges and authentication with a lower counter when the authenticator is counter-capable.

- [ ] **Step 6: Run GREEN and commit**

```bash
cd next-core && npm test
git add next-core
git commit -m "feat: add DESAPLICAXI passkey authentication"
```

---

### Task 6: Implement Recoverable OWNER Without `ADMIN_ALREADY_CLAIMED`

**Files:**
- Create: `next-core/server/services/owner-service.ts`
- Create: `next-core/api/owner/setup-start.ts`
- Create: `next-core/api/owner/setup-complete.ts`
- Create: `next-core/api/owner/recover.ts`
- Create: `next-core/api/owner/dashboard.ts`
- Test: `next-core/tests/owner.integration.test.mjs`

**Interfaces:**
- `setup-start` accepts server-side bootstrap secret and creates a 5-minute setup nonce; it does not create the owner yet.
- `setup-complete` requires verified passkey registration, creates OWNER policy and one `VOR-` recovery credential shown once.
- `owner/recover` requires valid VOR and fresh passkey registration before authorizing a replacement admin device.

- [ ] **Step 1: RED-test no first-login-wins behavior**

Test: calling owner endpoints from an ordinary authenticated user before setup returns `OWNER_SETUP_REQUIRED`, not silent ownership assignment.

- [ ] **Step 2: Implement bootstrap-secret verification**

Compare `OWNER_BOOTSTRAP_SECRET` using constant-time comparison. Never return it and never write it to DB/logs.

- [ ] **Step 3: Implement OWNER setup transaction**

Create or identify the owner DX identity, register passkey, persist `owner_policy`, persist `owner_admin_devices`, hash/store `VOR-<random>` recovery secret, and audit `OWNER_SETUP_COMPLETED`.

- [ ] **Step 4: Implement OWNER recovery**

A valid VOR is consumed/rotated. Recovery does not delete the previous owner or audit history; it adds a newly authorized admin device after passkey registration and emits `OWNER_DEVICE_RECOVERED`.

- [ ] **Step 5: Require AAL2 for dashboard**

`GET /api/owner/dashboard` requires owner role and current session `aal=2`; stale AAL2 returns `STEP_UP_REQUIRED`.

- [ ] **Step 6: Test wrong-owner and recovery cases**

Cover: ordinary user denied, invalid bootstrap denied, setup succeeds once, second setup denied without changing owner, recovery adds device, old VOR rejected after rotation.

- [ ] **Step 7: Run GREEN and commit**

```bash
cd next-core && npm test
git add next-core
git commit -m "feat: add recoverable OWNER policy"
```

---

### Task 7: Build USER and OWNER Shells With Hard Route Separation

**Files:**
- Create: `next-core/src/app/bootstrap.ts`
- Create: `next-core/src/app/router.ts`
- Create: `next-core/src/owner/client.ts`
- Modify: `next-core/src/main.ts`
- Modify: `next-core/src/styles/base.css`
- Test: `next-core/tests/route-separation.test.mjs`
- Test: `next-core/tests/e2e/user-owner.spec.ts`

**Interfaces:**
- `routeFor(pathname): 'user'|'owner'`
- USER root never reads OWNER state to change its route.
- OWNER route may reuse full USER workspace later but administrative controls load only after authenticated owner API succeeds.

- [ ] **Step 1: RED route test**

```js
assert.equal(routeFor('/'), 'user');
assert.equal(routeFor('/owner'), 'owner');
assert.equal(routeFor('/anything-else'), 'user');
```

- [ ] **Step 2: Implement pure route resolver**

```ts
export function routeFor(pathname:string):'user'|'owner' {
  return pathname === '/owner' || pathname.startsWith('/owner/') ? 'owner' : 'user';
}
```

- [ ] **Step 3: Build USER shell**

Render VIVA CUBA identity activation/recovery entry. Add visible navigation placeholders only for future functional modules; do not display fake chat/call buttons as active until Gate 3.

- [ ] **Step 4: Build OWNER shell**

OWNER shell initially displays authentication/setup/recovery, then authenticated dashboard. It must include a clear `Volver a VIVA CUBA` action to `/`.

- [ ] **Step 5: Add E2E separation test**

Playwright opens `/` and asserts no `Identity Command Center` or destructive OWNER controls. Then opens `/owner` and asserts OWNER authentication surface exists.

- [ ] **Step 6: Run GREEN and commit**

```bash
cd next-core && npm test && npm run e2e
git add next-core
git commit -m "feat: separate USER and OWNER routes"
```

---

### Task 8: Add Device/Session Inventory, Revocation and Audit

**Files:**
- Create: `next-core/server/audit.ts`
- Create: `next-core/api/owner/devices.ts`
- Create: `next-core/api/owner/sessions.ts`
- Create: `next-core/api/owner/revoke-device.ts`
- Create: `next-core/api/owner/revoke-session.ts`
- Modify: `next-core/server/repositories/core-repository.ts`
- Modify: `next-core/server/repositories/postgres-core-repository.ts`
- Test: `next-core/tests/device-session-admin.test.mjs`

**Interfaces:**
- All destructive endpoints require OWNER + fresh AAL2.
- Revoking a device revokes every active session for that device.
- Audit is append-only from application code.

- [ ] **Step 1: RED-test session revocation cascade**

Create two sessions on one device and one session on another. Revoke first device. Assert first two are inactive and third remains active.

- [ ] **Step 2: Implement repository transaction**

`revokeDevice(deviceId, actorOwnerId)` updates device status and all sessions sharing `device_id`, then appends one `DEVICE_REVOKED` audit event containing IDs only, not secrets.

- [ ] **Step 3: Implement list endpoints**

Return device label, created/last-seen timestamps, status and session count. Never return token hashes, recovery hashes or WebAuthn public-key internals to the UI.

- [ ] **Step 4: Implement revoke endpoints with AAL2 guard**

If AAL2 expired, return HTTP 403 `{error:'STEP_UP_REQUIRED'}`.

- [ ] **Step 5: Run tests and commit**

```bash
cd next-core && npm test
git add next-core
git commit -m "feat: add OWNER device and session control"
```

---

### Task 9: Implement PWA Install and Safe Update Controls

**Files:**
- Create: `next-core/public/manifest.webmanifest`
- Create: `next-core/public/sw.js`
- Create: `next-core/public/icons/README.md`
- Create: `next-core/src/app/critical-activity.ts`
- Create: `next-core/src/pwa/install.ts`
- Create: `next-core/src/pwa/update.ts`
- Modify: `next-core/src/app/bootstrap.ts`
- Test: `next-core/tests/pwa-update.test.mjs`

**Interfaces:**
- `criticalActivity.begin(kind)` / `.end(kind)` / `.isActive()`.
- `requestInstall()` invokes captured install prompt where supported.
- `checkForUpdate()` never reloads while critical activity is active.

- [ ] **Step 1: RED-test critical activity registry**

```js
criticalActivity.begin('recovery');
assert.equal(criticalActivity.isActive(), true);
criticalActivity.end('recovery');
assert.equal(criticalActivity.isActive(), false);
```

- [ ] **Step 2: Implement registry with counted activity names**

Use a `Map<string,number>` so nested calls cannot accidentally clear another active operation.

- [ ] **Step 3: Implement installation manager**

Capture one `beforeinstallprompt` listener. Chromium: invoke prompt on button click. iOS/iPadOS: display one concise system-compliant `Compartir → Añadir a pantalla de inicio` instruction. Standalone mode displays `APP INSTALADA`.

- [ ] **Step 4: Implement service worker update protocol**

Service worker receives `SKIP_WAITING`. UI calls `registration.update()`. If `registration.waiting` and no critical activity, post `SKIP_WAITING`; otherwise show `Actualización lista · se aplicará al terminar`.

- [ ] **Step 5: Add permanent controls**

USER settings and OWNER header both include:

- `INSTALAR / DESCARGAR APP`
- lilac `ACTUALIZAR APP`

The controls call the same shared managers; no duplicate listeners.

- [ ] **Step 6: Test no reload during recovery**

Mock waiting service worker, start `criticalActivity.begin('recovery')`, assert no reload/activation; end activity and assert update applies once.

- [ ] **Step 7: Run GREEN and commit**

```bash
cd next-core && npm test && npm run build
git add next-core
git commit -m "feat: add safe PWA install and update engine"
```

---

### Task 10: Add CI With Real PostgreSQL and Preview Gate

**Files:**
- Create: `.github/workflows/next-core-ci.yml`
- Modify: `next-core/package.json`
- Create: `next-core/playwright.config.ts`
- Test: all tests from previous tasks.

**Interfaces:**
- PR checks: typecheck, migration, tests, build.
- Production GitHub Pages workflow remains unchanged.

- [ ] **Step 1: Add PostgreSQL service to GitHub Actions**

```yaml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: viva_test
    ports:
      - 5432:5432
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

- [ ] **Step 2: Add CI environment**

Set only test values in workflow:

```yaml
env:
  DATABASE_URL: postgres://postgres:postgres@localhost:5432/viva_test
  SESSION_COOKIE_NAME: vc_session
  RP_ID: localhost
  RP_ORIGIN: http://127.0.0.1:4173
  OWNER_BOOTSTRAP_SECRET: ci-only-owner-bootstrap-secret-0001
```

- [ ] **Step 3: Add CI steps**

Run `npm ci`, migration, `npm test`, `npm run build`. Run Playwright route-separation tests against `vite preview`; WebAuthn physical authenticator certification remains a later device gate, not falsely marked by synthetic CI.

- [ ] **Step 4: Verify existing pilot workflow is untouched**

Run `git diff main -- .github/workflows/pages.yml`.

Expected: no diff.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/next-core-ci.yml next-core
git commit -m "ci: gate NEXT CORE foundation and identity"
```

---

### Task 11: Deploy an Independent Vercel Preview

**Files:**
- No production-domain file changes.
- Verify: `next-core/vercel.json`, `.env.example`.

**Interfaces:**
- Preview must expose `/`, `/owner`, `/api/health`, `/api/version`, manifest and service worker.

- [ ] **Step 1: Create a new Vercel project for NEXT CORE**

Use repository `axielcasas1-cmyk/viva-cuba-cuba-pilot` with Root Directory `next-core`. Do not attach `viva.desaplicaxi.com`.

- [ ] **Step 2: Configure preview environment variables**

Provide `DATABASE_URL`, `SESSION_COOKIE_NAME=vc_session`, preview `RP_ID`, preview HTTPS `RP_ORIGIN`, and a high-entropy `OWNER_BOOTSTRAP_SECRET`. Do not commit secret values.

- [ ] **Step 3: Deploy preview**

Expected: build succeeds with Node 22+ and Vite output.

- [ ] **Step 4: Verify endpoints**

Expected:

- `/` → 200 USER shell
- `/owner` → 200 OWNER authentication/setup shell
- `/api/health` → 200 `{ok:true,service:'viva-cuba-next-core'}`
- `/api/version` → 200 release metadata
- `/manifest.webmanifest` → 200
- `/sw.js` → 200 JavaScript

- [ ] **Step 5: Verify no production impact**

Confirm `viva.desaplicaxi.com` still resolves to the preserved AppDeploy runtime and the preview has its own Vercel URL.

- [ ] **Step 6: Record preview URL and deployment ID**

Write only non-secret deployment metadata to `docs/migrations/next-core-preview.md` and commit:

```bash
git add docs/migrations/next-core-preview.md
git commit -m "docs: record NEXT CORE preview gate"
```

---

### Task 12: Gate 2 Functional Verification and Handoff to Realtime Parity

**Files:**
- Modify: `docs/migrations/next-core-preview.md`
- Create: `docs/gates/gate-2-identity-owner-results.md`

**Interfaces:**
- Produces: formal GO/NO-GO for Gate 3.

- [ ] **Step 1: Test USER activation on a fresh browser profile**

Issue one VCM invitation through OWNER, activate USER, record DX, save VCR, close/reopen browser, verify session persists.

- [ ] **Step 2: Test USER recovery on a second browser/device profile**

Use DX+VCR, verify a new VCR is generated and the old one no longer works.

- [ ] **Step 3: Test OWNER setup/recovery**

Complete passkey setup, enter dashboard, authorize a second admin device through recovery, verify audit retains first device/history.

- [ ] **Step 4: Test route isolation**

Open `/` on an OWNER-authorized device. Expected: USER shell only. Open `/owner`. Expected: OWNER surface without reassigning ownership.

- [ ] **Step 5: Test device/session revocation**

Revoke one session and then one device. Expected: only targeted authorization is lost; unaffected USER/OWNER sessions remain valid.

- [ ] **Step 6: Test PWA/update behavior**

Verify install control; simulate waiting update during recovery and confirm update defers; end recovery and confirm update applies.

- [ ] **Step 7: Write gate result**

Use exact status matrix:

```markdown
| Check | Result |
|---|---|
| USER default route | GREEN/RED |
| OWNER explicit route | GREEN/RED |
| DX activation | GREEN/RED |
| Recovery rotation | GREEN/RED |
| Passkey OWNER | GREEN/RED |
| OWNER recovery | GREEN/RED |
| Device revocation | GREEN/RED |
| Session revocation | GREEN/RED |
| Install control | GREEN/RED |
| Safe update deferral | GREEN/RED |
| Production untouched | GREEN/RED |
```

Do not mark Gate 2 GREEN unless every row is GREEN.

- [ ] **Step 8: Commit gate evidence**

```bash
git add docs/gates/gate-2-identity-owner-results.md
git commit -m "test: certify NEXT CORE identity and OWNER gate"
```

## Completion Criteria

Gates 1–2 are complete only when:

1. CI is GREEN on Node 22+ with real PostgreSQL migration tests.
2. Independent Vercel preview is reachable and production domain is untouched.
3. USER activation/recovery and explicit OWNER setup/recovery are functional.
4. `ADMIN_ALREADY_CLAIMED` cannot occur as an unrecoverable product state.
5. Public `/` never auto-opens OWNER.
6. Passkey-backed AAL2 protects destructive OWNER actions.
7. Device/session revocation works and is audited.
8. PWA install and lilac update controls are visible and updates defer during critical activity.
9. Preservation/migration contract tests remain GREEN.
10. A formal Gate 2 result authorizes creation/execution of the separate Gate 3 realtime parity plan.

## Self-Review Result

- Spec coverage for Gates 0–2: complete.
- Placeholder scan: no TBD/TODO/"implement later" instructions.
- Type/interface consistency: `CoreRepository`, session AAL, DX/VCR/VOR naming and USER/OWNER routes are consistent across tasks.
- Scope boundary: WebRTC/chat/media implementation is deliberately excluded from this plan and begins only in the Gate 3 realtime parity plan; no Jitsi migration is permitted.