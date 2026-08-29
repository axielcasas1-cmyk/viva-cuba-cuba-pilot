# VIVA CUBA NEXT CORE + RADAR NEON

**Design Specification — 2026-08-29**

Status: **APPROVED DESIGN / PRE-IMPLEMENTATION**

## 1. Purpose

VIVA CUBA NEXT CORE is the canonical evolution of VIVA CUBA + DESAPLICAXI Identity Core. It must recover and preserve the proven realtime communication architecture, re-establish a reliable USER/OWNER operating model, add a functional dynamic Neon Radar, and create a migration-safe platform capable of growing without replacing the core whenever a provider or hosting route changes.

This design supersedes the experimental GitHub/Jitsi pilot as an architectural authority. The pilot may remain available only as historical/reference material. **Jitsi is not part of the canonical communication architecture.**

## 2. Existing States to Preserve

### 2.1 AppDeploy v18 — emergency rollback baseline

The currently recoverable v18 snapshot is the last known AppDeploy version before `ADMIN_ALREADY_CLAIMED` was introduced. It contains the verified foundations that must not be lost:

- DESAPLICAXI DX identity;
- ECDH P-256 + AES-256-GCM client-side message encryption;
- realtime WebSocket subscriptions and catch-up synchronization;
- contact authorization by DX;
- chat with sent/delivered/read state;
- WebRTC `RTCPeerConnection` 1:1 audio/video;
- STUN + Cloudflare TURN capability;
- ICE restart/reconnection;
- camera switching;
- screen sharing;
- realtime call signalling;
- encrypted, chunked, resumable media transfer up to the existing configured limit;
- update deferral while calls or transfers are active.

v18 remains a **rollback reference**, not the final NEXT CORE feature target.

### 2.2 AppDeploy v35 — advanced capability reference

v35 remains preserved as a reference snapshot for later capabilities, including:

- unified app shell;
- OWNER Command Center;
- invitation/Gate management;
- user/device/session revocation;
- group rooms up to 10 participants;
- Cloudflare Realtime SFU integration;
- room-bound realtime collaboration;
- in-call encrypted messages;
- reactions/stickers;
- screen-state collaboration;
- live location E2EE with TTL;
- physical Gate Probe 3 → 4 → 6 → 10;
- installable PWA and safe update controls.

v35 must not simply be reactivated as the final architecture because its OWNER bootstrap can dead-end with `ADMIN_ALREADY_CLAIMED` and AppDeploy has exhausted its lifetime free deployment quota. NEXT CORE migrates selected capabilities from v35 onto a controlled, testable architecture.

## 3. Source of Truth and Deployment Strategy

### 3.1 Canonical source

GitHub becomes the permanent source of truth for source code, tests, specifications, migration contracts and release history.

No future production state may exist only inside a deployment provider snapshot.

### 3.2 Runtime

NEXT CORE uses a provider-independent application architecture with:

- web/PWA frontend;
- authenticated HTTP API;
- realtime signalling channel;
- persistent relational data store;
- object/media storage;
- WebRTC/TURN/SFU media plane.

Initial preview deployment may use Vercel for frontend/API while realtime/data providers remain behind explicit interfaces. Provider-specific code must be isolated behind adapters so that hosting can move without rewriting identity, messaging or WebRTC logic.

### 3.3 Domain rule

`viva.desaplicaxi.com` is the canonical public domain.

It is **not moved to NEXT CORE until all migration gates are GREEN**. Until then, preview environments use independent URLs and cannot overwrite production.

## 4. Non-Negotiable Architecture Invariants

1. **DX identity is independent of phone number, SIM, email and physical device.**
2. USER and OWNER are roles/surfaces of one ecosystem, not unrelated applications.
3. `/` is USER by default. OWNER requires an explicit authenticated route/action.
4. OWNER authorization never causes the public USER entry to open administrative controls automatically.
5. WebRTC P2P/TURN is the canonical 1:1 call path.
6. SFU is an extension for group media, not a replacement for working 1:1 P2P/TURN.
7. Jitsi or equivalent hosted meeting pages cannot replace the native VIVA CUBA realtime call path.
8. E2EE message/media payloads are never downgraded to plaintext server storage.
9. Optional modules cannot block Identity Core, USER bootstrap, OWNER bootstrap, chat or 1:1 calls.
10. Every release has a rollback target and migration contract.
11. Build success is not physical certification. Cuba/Brazil/device gates remain distinct from CI gates.
12. An update cannot reload during an active call, active SFU room, sensitive recovery flow or active file transfer.

## 5. Identity Core

DESAPLICAXI Identity Core remains the system-of-record for identity and access.

### 5.1 Identity model

Each person receives a stable DX identity. The identity record is separate from:

- authentication credential;
- device;
- session;
- transport connection;
- contact relationship.

### 5.2 Authentication

Target authentication layers:

- passkeys/WebAuthn;
- platform biometrics via passkeys;
- TOTP as secondary factor/recovery reinforcement;
- trusted-device credentials;
- controlled recovery credential;
- short-lived access sessions with refresh/rotation;
- device and session revocation.

No single factor is sufficient for destructive OWNER actions.

### 5.3 OWNER recovery

NEXT CORE must not use first-login-wins ownership without recovery.

OWNER authorization requires an explicit owner policy and at least one recoverable mechanism. Administrative ownership state must support:

- current owner identity;
- authorized admin devices;
- recovery/re-key procedure;
- immutable audit history;
- no silent ownership takeover;
- no `ADMIN_ALREADY_CLAIMED` dead end.

## 6. Messaging and Collaboration Core

### 6.1 Baseline

The product should meet or exceed modern mainstream messaging expectations while retaining DESAPLICAXI identity and resilience advantages.

Required core capabilities:

- 1:1 and group chat;
- text;
- emoji;
- reactions;
- static stickers;
- animated stickers;
- user-created sticker imports where format/security validation permits;
- voice messages;
- photos;
- video;
- documents;
- reply/quote;
- edit/delete policy;
- local search/indexing where feasible without exposing plaintext server-side;
- sent/delivered/read states;
- typing and presence events;
- pinned/favorite/recent sticker state;
- offline queue and store-and-forward;
- duplicate/idempotency protection after reconnect.

### 6.2 Hybrid stickers

The sticker system supports:

- static WebP/PNG;
- animated WebP and/or supported animated formats;
- GIF import only as compatibility input, normalized where practical;
- favorites;
- recents;
- search;
- original VIVA CUBA packs;
- user-created/imported packs;
- content size/dimension validation;
- graceful static fallback when animation is unsupported.

Third-party copyrighted sticker packs are not copied into the product.

## 7. Realtime Media Plane

### 7.1 1:1

Primary route:

`WebRTC P2P → STUN → TURN fallback`

Requirements:

- incoming/outgoing audio and video;
- camera/microphone control;
- front/rear camera switch;
- ICE restart;
- reconnect after microcuts;
- network stats: RTT, packet loss, bitrate, negotiated route;
- adaptive media constraints;
- screen sharing where the OS/browser supports it.

### 7.2 Group calling

For more than two active participants:

`WebRTC → SFU adapter`

Target initial room size: **10 active participants**.

The SFU adapter must be provider-replaceable. Loss of the SFU must not corrupt identities, messages or existing 1:1 call capability.

### 7.3 Adaptive degradation

Media should degrade progressively under poor networks:

`high-quality video → lower video → audio-first → text/store-and-forward`

The application exposes status clearly instead of appearing frozen.

## 8. RADAR NEON — Dynamic Presence and Network Map

Radar Neon is a functional subsystem, not decorative background art.

### 8.1 Visual model

- black/dark background;
- circular radar grid and sweep;
- neon pulses;
- animated nodes;
- optional connection arcs;
- responsive mobile/desktop/tablet rendering;
- reduced-motion accessibility mode.

### 8.2 Two operating layers

#### Network Radar

Always available when presence data is available. It visualizes logical connection state without exposing precise location.

Node states:

- ONLINE;
- CONNECTING;
- DEGRADED;
- OFFLINE;
- CALLING;
- IN CALL;
- SYNC PENDING.

Optional technical metadata for authorized views:

- P2P / TURN / SFU route;
- RTT band;
- connection quality band;
- last-seen freshness.

#### Geo Radar

Precise or approximate geographic position appears only when the user explicitly shares it.

Rules:

- explicit opt-in;
- encrypted location payload;
- bounded TTL;
- immediate stop;
- no background precision escalation;
- no OWNER plaintext access to location beyond permissions granted by the sharing user;
- approximate region may be separately permissioned.

### 8.3 Failure isolation

If map tiles, geolocation, animation or radar rendering fail:

- USER continues;
- OWNER continues;
- chat continues;
- calls continue;
- presence can degrade to textual status.

Radar code is lazy-loaded after critical bootstrap.

## 9. USER Experience

The normal user application exposes a coherent communications workspace:

- identity/profile;
- chats;
- contacts;
- calls;
- rooms;
- files/media;
- Radar Neon;
- location sharing;
- security/devices;
- updates/install.

The app must not present engineering/provider jargon to normal users unless they open diagnostics.

## 10. OWNER / Identity Command Center

OWNER contains the full USER workspace plus administrative capabilities.

Administrative functions:

- identity creation/activation oversight;
- invitation/Gate issuance;
- device inventory;
- session inventory;
- revoke device/session/user access;
- recovery workflows;
- presence/network health;
- Radar Neon operational view;
- release/update status;
- audit trail;
- incident/risk state.

OWNER cannot decrypt ordinary E2EE message content merely because it is OWNER.

## 11. PWA Installation and Updates

### 11.1 Installation

A visible `INSTALAR / DESCARGAR APP` control is required.

- on supported Chromium platforms, invoke the browser install prompt when available;
- on iOS/iPadOS, provide the shortest system-compliant Add to Home Screen handoff because the OS does not permit a webpage to silently install itself;
- detect installed/standalone state;
- never claim automatic installation where the OS forbids it.

### 11.2 Updates

A visible purple/lilac `ACTUALIZAR APP` control remains a permanent requirement.

Update engine states:

- up to date;
- checking;
- update ready;
- deferred due to active critical activity;
- applying;
- failed with rollback/retry guidance.

Updates preserve identity/session state and never force a destructive local reset.

## 12. Resilience and Store-and-Forward

NEXT CORE treats unstable connectivity as a primary operating condition.

Required behavior:

- persistent outbound queue;
- idempotent resend;
- encrypted-at-rest pending payloads on device where feasible;
- exponential/backoff reconnection;
- realtime → HTTP catch-up fallback;
- call signalling recovery for short disconnects;
- resumable uploads;
- bounded pending retention;
- user-visible degraded status;
- recovery without full app reload where possible.

Future resilient-network work may add local P2P/device discovery, but it cannot be placed on the production critical path until OS/platform capabilities and security gates are validated.

## 13. Security Boundaries

### 13.1 Server sees

- identity identifiers required for routing;
- authorized contact relationships;
- encrypted envelopes;
- delivery metadata;
- device/session authorization metadata;
- operational health/telemetry within declared privacy rules.

### 13.2 Server must not see by default

- plaintext private messages;
- plaintext media content;
- plaintext live-location coordinates;
- private device encryption keys.

### 13.3 Blind spots

Every release reviews:

- compromised client device;
- stale/replayed sessions;
- provider outage;
- TURN/SFU outage;
- websocket outage;
- storage outage;
- clock drift/TTL errors;
- duplicate delivery after reconnect;
- privileged-owner recovery abuse;
- UI route leakage between USER and OWNER;
- migration/key-loss risk.

## 14. WhatsApp Benchmark Strategy

WhatsApp and other major messengers are **functional benchmarks, not source/code/UI templates**.

For every benchmark feature, NEXT CORE records:

1. baseline behavior expected by users;
2. VIVA CUBA equivalent;
3. measurable improvement target;
4. security/resilience trade-off;
5. physical validation result.

Examples of measurable superiority include:

- maintaining message send/receive through longer connectivity interruption via store-and-forward;
- exposing negotiated transport diagnostics without compromising UX;
- identity continuity without phone/SIM dependency;
- explicit device/session revocation;
- graceful media degradation rather than binary call failure;
- recoverable OWNER without provider/account lock-in;
- functional Radar Neon presence/network diagnostics;
- migration contract that prevents silent feature loss.

The phrase “100× better” is treated as an innovation ambition. Claims presented to users must be tied to measured criteria, not marketing assertions without evidence.

## 15. Migration Contract

Every provider/runtime migration must preserve or explicitly migrate:

- DX identities;
- identity↔device relationships;
- session/revocation state;
- public encryption keys;
- local private keys or secure re-key procedure;
- contacts;
- encrypted message envelopes and receipts;
- media metadata/storage references;
- room membership/state where still valid;
- invitation state;
- OWNER/admin authorization;
- audit history;
- update channel;
- PWA manifest identity and scope where possible.

A machine-readable migration contract will be maintained beside this specification and tested in CI.

## 16. Implementation Gates

### GATE 0 — Preservation

- v18 remains available as rollback;
- v35 remains available as advanced reference;
- GitHub spec/source becomes canonical;
- no production-domain switch.

### GATE 1 — NEXT CORE foundation

- clean repo/runtime baseline;
- healthcheck;
- CI;
- preview deploy;
- environment/provider adapters;
- rollback procedure.

### GATE 2 — Identity + USER + OWNER

- DX identity;
- USER default entry;
- recoverable OWNER;
- device/session model;
- install/update controls;
- no public→OWNER leakage.

### GATE 3 — 1:1 realtime parity

- E2EE chat;
- receipts;
- contacts;
- WebSocket/HTTP catch-up;
- WebRTC P2P/TURN;
- media transfer;
- screen sharing;
- v18 parity tests GREEN.

### GATE 4 — communication enhancements

- voice messages;
- emoji/reactions;
- hybrid static/animated stickers;
- richer message actions;
- offline queue hardening.

### GATE 5 — Radar Neon

- Network Radar;
- presence states;
- transport/quality diagnostics;
- Geo Radar opt-in;
- failure isolation;
- reduced-motion mode.

### GATE 6 — groups 3 → 4 → 6 → 10

- SFU adapter;
- room lifecycle;
- in-call E2EE messages;
- reactions/stickers;
- screen share;
- location;
- physical progressive Gate Probe.

### GATE 7 — physical connectivity

- Spain↔Spain baseline;
- Spain↔Brazil regression check;
- Spain↔Cuba real-device/network test;
- failure/reconnect scenarios;
- no claim of Cuba certification until physically observed.

### GATE 8 — production cutover

Only when gates 0–7 are GREEN:

- backup/export migration state;
- switch `viva.desaplicaxi.com`;
- preserve rollback;
- monitor health/realtime errors;
- confirm USER/OWNER/PWA on physical devices.

## 17. Testing Strategy

Every feature follows:

`RED → GREEN → REFACTOR → BUILD → PREVIEW → QA → PHYSICAL GATE`

Required test layers:

- unit;
- crypto envelope invariants;
- API authorization;
- integration;
- realtime reconnect/catch-up;
- WebRTC signalling;
- PWA/update safety;
- USER/OWNER route separation;
- migration contract;
- Radar failure isolation;
- E2E browser;
- physical mobile/network.

No release can be called complete based solely on compilation or synthetic browser tests.

## 18. Versioning and Anti-Regression Rule

NEXT CORE uses small, reviewable releases. A new optional feature cannot be bundled with unrelated identity or transport changes unless a documented dependency requires it.

For each release:

- previous GREEN version recorded;
- changed modules listed;
- regression tests required;
- rollback path verified;
- migration contract diff reviewed.

If a provider blocks, costs money unexpectedly or becomes technically unavailable, switch to a lawful compatible fallback without weakening security or silently dropping working features.

## 19. Definition of Done

NEXT CORE is production-ready only when:

- USER and OWNER entry are stable;
- OWNER recovery is verified;
- installation/update paths are verified on supported platforms;
- DX identity survives migration/recovery;
- E2EE chat/media paths pass tests;
- 1:1 WebRTC P2P/TURN works physically;
- group SFU works through progressive participant gates;
- Radar Neon is functional and isolated;
- Cuba physical test has a recorded outcome;
- rollback works;
- migration contract is current;
- source, docs and deployment state agree.

---

**Canonical design decision:** VIVA CUBA NEXT CORE grows by preserving DESAPLICAXI identity, native E2EE communications and WebRTC transport, while optional capabilities such as Radar Neon, stickers, SFU and future resilient-network modules remain independently replaceable and incapable of taking down the critical identity/communication path.