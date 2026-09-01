# VIVA CUBA Madre Única v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el piloto existente en una app madre versionada con sincronización de releases, actualización segura sin bucles, trazabilidad de cliente y validación explícita España/Cuba/internacional.

**Architecture:** GitHub `main` será la fuente única de código y GitHub Pages el canal público de la app madre. Cada cliente consulta un manifiesto `release.json`, compara su versión local, registra trazabilidad de sincronización y actualiza únicamente cuando la interfaz está en estado seguro; el Service Worker usa caché versionada y estrategia network-first para código para evitar mezclar releases. El backend DESAPLICAXI/Supabase se conecta como segunda fase sin alterar la interfaz pública.

**Tech Stack:** HTML/CSS/ES modules, Service Worker/PWA, Node 22 built-in test runner, GitHub Actions, GitHub Pages.

**Spec:** `docs/VIVA_CUBA_MASTER_SPEC.md`

## Global Constraints

- Una sola VIVA CUBA; OWNER = USER + ADMINISTRACIÓN.
- Identidad objetivo independiente de teléfono/SIM/email/dispositivo.
- No presentar capacidades locales como backend real.
- No recargar durante llamada/actividad sensible.
- No repetir el patrón de auto-reload que produjo bucles en AppDeploy.
- Actualización: detectar -> diferir si no es seguro -> aplicar una sola vez -> auditar -> verificar.
- Funcionalidad y release deben poder validarse desde España, Cuba y una red internacional normal.

---

### Task 1: Release Core y pruebas TDD

**Files:**
- Create: `site/lib/release-core.mjs`
- Create: `tests/release-sync.test.mjs`
- Create: `site/release.json`

**Interfaces:**
- Produces: `parseSemver`, `compareSemver`, `shouldUpdate`, `reloadGuardKey`, `appendReleaseAudit`.

- [ ] Escribir pruebas para comparación de versión, rechazo de downgrade, guardia anti-bucle y auditoría acotada.
- [ ] Verificar que fallen antes de crear el módulo.
- [ ] Implementar funciones puras mínimas.
- [ ] Ejecutar `npm test` y exigir PASS.

### Task 2: Sync Core de cliente

**Files:**
- Create: `site/sync.js`
- Modify: `site/index.html`
- Modify: `site/version.js`

**Interfaces:**
- Consumes: `site/release.json` y `site/lib/release-core.mjs`.
- Produces: eventos `viva:release-status` y estado visible `MADRE vX · sincronizada/actualización pendiente`.

- [ ] Consultar release con `cache: no-store` al cargar, `online`, `focus`, `visibilitychange` y cada 30 s.
- [ ] Diferir actualización si existe overlay de llamada/actividad de instalación.
- [ ] Aplicar como máximo una navegación por versión mediante sessionStorage.
- [ ] Registrar resultado y error en `vc_release_audit_v1` sin ubicación precisa ni contenido privado.

### Task 3: Service Worker seguro

**Files:**
- Modify: `site/sw.js`
- Modify: `site/manifest.webmanifest`

**Interfaces:**
- Consumes: versión `0.9.0`.
- Produces: caché `viva-cuba-mother-v0.9.0`, limpieza de caches anteriores y código network-first con fallback offline.

- [ ] Versionar caché.
- [ ] Navegación network-first.
- [ ] Scripts/styles/JSON network-first; imágenes/font cache-first con actualización.
- [ ] Nunca cachear respuestas no-OK.
- [ ] Incluir `release.json`, `sync.js` y `release-core.mjs` en shell.

### Task 4: Trazabilidad y contrato canónico

**Files:**
- Modify: `docs/VIVA_CUBA_MASTER_SPEC.md`
- Modify: `docs/migration-contract.json`
- Modify: `README.md`
- Modify: `package.json`

**Interfaces:**
- Produces: contrato de release, clave `vc_release_audit_v1` y semántica de actualización multinacional.

- [ ] Documentar GitHub como source of truth.
- [ ] Documentar convergencia tras reconexión y limitación física sin Internet.
- [ ] Añadir `sync.js` y `release-core.mjs` a chequeos de sintaxis.

### Task 5: CI, merge y Pages

**Files:**
- Modify: `.github/workflows/ci.yml` only if branch CI does not run.

- [ ] Ejecutar CI en PR.
- [ ] Revisar checks y corregir fallos.
- [ ] Merge a `main` únicamente con tests verdes.
- [ ] Confirmar GitHub Pages deploy y verificar `release.json`/UI pública.

### Task 6: Backend DESAPLICAXI global

**Files:** fase posterior en este mismo programa, preservando UI.

- [ ] Conectar identidad global, VCM/VCR, dispositivos, sesiones, contactos, mensajes E2EE, receipts, presencia, ubicación y salas al Supabase ya provisionado.
- [ ] Mantener transporte/fallback local hasta completar migración.
- [ ] Validar España -> Cuba -> red internacional con reconexión y convergencia.
