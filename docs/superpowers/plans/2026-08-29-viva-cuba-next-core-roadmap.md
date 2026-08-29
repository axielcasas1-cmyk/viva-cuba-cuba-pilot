# VIVA CUBA NEXT CORE Implementation Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver VIVA CUBA NEXT CORE from preserved AppDeploy v18/v35 capabilities to a provider-independent, migration-safe production system with DESAPLICAXI Identity Core, native WebRTC/E2EE communications and Radar Neon.

**Architecture:** Preserve AppDeploy v18 as emergency rollback and v35 as advanced-capability reference while building a new `next-core/` runtime in GitHub. Deploy previews independently from production, use explicit provider adapters for persistence/realtime/media, and cut over `viva.desaplicaxi.com` only after every functional and physical gate is GREEN.

**Tech Stack:** Node.js 22+, TypeScript, Vite PWA frontend, Vercel Functions HTTP API, PostgreSQL via standard `DATABASE_URL`, WebCrypto, WebAuthn/passkeys, WebRTC, TURN, replaceable SFU adapter, Playwright, Node test runner, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-29-viva-cuba-next-core-radar-neon-design.md`

## Global Constraints

- AppDeploy v18 version `1787770673468` remains available as rollback reference.
- AppDeploy v35 version `1787870459426` remains available as advanced capability reference.
- `viva.desaplicaxi.com` is not moved until Gates 0–7 are GREEN.
- `/` is USER by default; OWNER is explicit and authenticated.
- WebRTC P2P/TURN is canonical for 1:1 calls; SFU extends groups and never replaces working 1:1.
- Jitsi or equivalent hosted meeting pages are not part of the canonical communication path.
- E2EE message/media payloads are never downgraded to plaintext server storage.
- Optional modules cannot block Identity Core, USER bootstrap, OWNER bootstrap, chat or 1:1 calls.
- Updates cannot reload during an active call, SFU room, sensitive recovery flow or active file transfer.
- Physical Cuba/Brazil certification is separate from CI/build success.

---

## Delivery Sequence

### Gate 0 — Preservation and source-of-truth lock

**Outcome:** Existing working states are preserved before new runtime work starts.

- [ ] Record v18/v35 version IDs, URLs, capability inventory and rollback instructions in `docs/migrations/appdeploy-snapshots.json` and `docs/migrations/ROLLBACK.md`.
- [ ] Export the NEXT CORE machine-readable migration contract to `docs/migrations/next-core-contract.json`.
- [ ] Add CI validation that the spec, rollback inventory and migration contract exist and contain required invariants.
- [ ] Verify AppDeploy v18 remains `READY` without modifying production.
- [ ] Commit and tag the preservation checkpoint `next-core-gate0-preserved`.

**Acceptance:** A reviewer can identify exactly what is preserved, where it lives, how to roll back, and which data/capabilities a future migration must retain.

### Gate 1 — NEXT CORE foundation

**Outcome:** A clean, provider-independent preview runtime builds and deploys without touching production.

- [ ] Create `next-core/` TypeScript/Vite workspace with Node 22+.
- [ ] Add `/api/health` and environment validation.
- [ ] Add PostgreSQL adapter behind a repository interface and schema migrations.
- [ ] Add GitHub Actions for unit, integration, typecheck and build.
- [ ] Add Vercel preview configuration rooted at `next-core/`.
- [ ] Add rollback-safe release metadata and `/api/version`.
- [ ] Deploy a preview and verify `/`, `/api/health`, `/api/version`, manifest and service worker.

**Acceptance:** Preview is independently reachable, CI is GREEN, database migration is reproducible, no production domain/DNS is changed.

### Gate 2 — DESAPLICAXI Identity + USER + OWNER

**Outcome:** Permanent DX identity, recoverable OWNER and safe installation/update exist on the new runtime.

- [ ] Implement DX identities independent of phone/email/SIM/device.
- [ ] Implement invitation activation and rotating recovery credential.
- [ ] Implement HttpOnly session cookies, device/session inventory and revocation.
- [ ] Implement WebAuthn/passkeys and trusted-device registration.
- [ ] Implement explicit OWNER bootstrap with passkey + recovery and no first-login-wins dead end.
- [ ] Implement USER root and explicit OWNER route with anti-leak tests.
- [ ] Implement visible `INSTALAR / DESCARGAR APP` and lilac `ACTUALIZAR APP` controls.
- [ ] Implement deferred service-worker update during critical activity.
- [ ] Add audit events for activation, recovery, device/session revocation and OWNER actions.

**Acceptance:** USER and OWNER work on fresh and returning devices; public entry never exposes OWNER; OWNER can be recovered without destroying history; PWA install/update controls are visible and safe.

### Gate 3 — 1:1 realtime parity with v18

**Outcome:** The new runtime reaches or exceeds the v18 communication baseline before advanced features are added.

- [ ] Port ECDH P-256 + AES-256-GCM envelope model with per-device key handling.
- [ ] Port DX contact authorization.
- [ ] Port sent/delivered/read receipts.
- [ ] Add provider-agnostic realtime signalling adapter plus HTTP catch-up.
- [ ] Port WebRTC 1:1 audio/video, STUN, TURN fallback, ICE restart and call recovery.
- [ ] Port screen share and camera switching.
- [ ] Port encrypted resumable media transfer.
- [ ] Add parity tests against v18 capability inventory.

**Acceptance:** Two physical devices can message, reconnect, exchange encrypted media and complete a 1:1 WebRTC call without Jitsi.

### Gate 4 — Communication enhancements

**Outcome:** Messaging reaches modern messenger expectations without weakening E2EE.

- [ ] Voice messages.
- [ ] Emoji picker and reactions.
- [ ] Static and animated hybrid stickers.
- [ ] Favorites, recents, search and user-imported sticker validation.
- [ ] Reply/quote, edit/delete policy and message actions.
- [ ] Persistent encrypted outbound queue with idempotent resend.
- [ ] Typing/presence events with privacy controls.

**Acceptance:** Messaging remains usable through brief outages and restores without duplicate visible messages; stickers animate where supported and fall back gracefully.

### Gate 5 — Radar Neon

**Outcome:** Functional black/neon radar shows live network/presence state and optional E2EE geolocation without becoming a critical dependency.

- [ ] Lazy-load Radar Neon after critical bootstrap.
- [ ] Implement `ONLINE`, `CONNECTING`, `DEGRADED`, `OFFLINE`, `CALLING`, `IN_CALL`, `SYNC_PENDING` nodes.
- [ ] Render radar sweep, rings, pulses and connection arcs with reduced-motion mode.
- [ ] Bind transport telemetry: P2P/TURN/SFU, RTT band, quality band and freshness.
- [ ] Implement Geo Radar opt-in with encrypted coordinates, TTL and immediate stop.
- [ ] Add fallback textual presence when rendering/geolocation/map provider fails.
- [ ] Add OWNER operational radar without plaintext access to private chat/location content.

**Acceptance:** Killing the radar module or denying geolocation does not break USER, OWNER, chat or calls.

### Gate 6 — Groups 3 → 4 → 6 → 10

**Outcome:** Group rooms use a replaceable SFU while preserving 1:1 capability.

- [ ] Port room lifecycle and membership.
- [ ] Implement SFU adapter interface and Cloudflare Realtime adapter.
- [ ] Port in-call messages, reactions/stickers, screen-state events and live location.
- [ ] Add adaptive media degradation and audio-first fallback.
- [ ] Add progressive physical Gate Probe for 3, 4, 6 and 10 active participants.

**Acceptance:** Each stage passes metrics before the next participant count is attempted; SFU outage does not damage identity/chat/1:1.

### Gate 7 — Physical connectivity certification

**Outcome:** Real devices and real networks verify the product claims.

- [ ] Spain↔Spain baseline.
- [ ] Spain↔Brazil regression.
- [ ] Spain↔Cuba API/realtime/message/media/call test.
- [ ] Cuba microcut/reconnect test.
- [ ] Cuba low-bandwidth degradation test: video → audio → text/store-and-forward.
- [ ] PWA install/update test on iPhone, Android and desktop.
- [ ] OWNER recovery test on a second authorized device.

**Acceptance:** Results are recorded with date, device/browser/network, transport route, RTT/loss and pass/fail. No Cuba certification claim is made without observed results.

### Gate 8 — Production cutover

**Outcome:** `viva.desaplicaxi.com` moves only after full verification and remains reversible.

- [ ] Export migration backup and checksum it.
- [ ] Import/migrate identity/session/contact/encrypted-envelope/media/audit state required by the migration contract.
- [ ] Run dry-run reconciliation and refuse cutover on count/hash mismatch.
- [ ] Switch domain only after dry run is GREEN.
- [ ] Monitor USER, OWNER, API, realtime and WebRTC health.
- [ ] Keep rollback path available until post-cutover physical verification is GREEN.

**Acceptance:** Production users reach NEXT CORE through the canonical domain, the PWA updates in place where origin/scope permits, and rollback remains documented and testable.

## Plan Decomposition

This roadmap is intentionally not executed as one giant change. Detailed plans are created and reviewed independently:

1. `2026-08-29-viva-cuba-next-core-gates-1-2.md` — foundation, identity, USER/OWNER, PWA/update.
2. `2026-08-29-viva-cuba-next-core-gate-3-realtime.md` — v18 parity: E2EE/chat/WebRTC/TURN/media.
3. `2026-08-29-viva-cuba-next-core-gate-4-messaging.md` — voice, reactions, stickers, offline queue.
4. `2026-08-29-viva-cuba-next-core-gate-5-radar-neon.md` — dynamic radar and optional Geo Radar.
5. `2026-08-29-viva-cuba-next-core-gate-6-groups.md` — SFU rooms and 3→4→6→10 gate.
6. `2026-08-29-viva-cuba-next-core-gates-7-8-certification-cutover.md` — physical certification and production migration.

Each detailed plan must use TDD, small commits, independent review gates and rollback-safe previews.