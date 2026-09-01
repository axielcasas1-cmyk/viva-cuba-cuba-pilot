# VIVA CUBA NEXT CORE — Rollback and Preservation Rules

## Purpose

This document protects the working historical states while NEXT CORE is built. Gates 1–2 are preview-only and must not change DNS, custom-domain routing, or the production origin `viva.desaplicaxi.com`.

## Preserved snapshots

- **AppDeploy v18 — `1787770673468`**: emergency rollback baseline for DX, E2EE chat, receipts, WebRTC P2P/TURN, screen share, encrypted media and safe update behavior.
- **AppDeploy v35 — `1787870459426`**: advanced capability reference for OWNER, Gate, rooms up to 10, SFU, in-call events, E2EE live location and PWA controls. It is not the default rollback target because its OWNER bootstrap can dead-end at `ADMIN_ALREADY_CLAIMED`.

## Operator rules

1. Do not point `viva.desaplicaxi.com` at NEXT CORE during Gates 1–2.
2. Do not delete either AppDeploy snapshot or its capability inventory.
3. Do not replace native WebRTC with Jitsi or another hosted meeting page.
4. If a NEXT CORE preview fails, abandon or roll back the preview. Do not repair it by redirecting production traffic.
5. Before any future production cutover, export and reconcile: identities, devices, sessions, public keys, contacts, encrypted envelopes, receipts, media references, OWNER policy and audit.
6. A build/CI success is not physical Cuba certification.
7. Optional modules such as Radar Neon, stickers, maps or SFU must never become bootstrap dependencies for Identity Core, USER, OWNER, chat or 1:1 calls.

## Emergency runtime

Current AppDeploy runtime URL: `https://viva-cuba-desaplicaxi-pilot-4get18.v2.appdeploy.ai/`

Canonical production domain: `https://viva.desaplicaxi.com/`

The snapshot version ID, not the display URL, determines the preserved rollback state.
