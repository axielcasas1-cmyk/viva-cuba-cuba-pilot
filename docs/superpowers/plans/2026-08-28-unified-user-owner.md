# Unified USER + OWNER Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el piloto público en una sola PWA con área USER y OWNER/COMMAND CENTER dentro de la misma shell.

**Architecture:** `index.html` será la única entrada. `app.js` gestionará activación USER, gate OWNER, Command Center y navegación. `owner.html` será solo redirect. Las funciones administrativas sin backend se etiquetan explícitamente como locales/piloto.

**Tech Stack:** HTML, CSS, JavaScript ES modules, Web Crypto SHA-256, localStorage, Node test runner, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-08-28-unified-user-owner-design.md`

## Global Constraints
- Mantener la URL pública actual.
- No publicar la clave OWNER real; solo su hash SHA-256.
- No simular revocación/identidad remota real sin backend.
- Conservar activación VCM, DX, PWA y videollamada actuales.

---

### Task 1: Core role helpers
**Files:** Modify `site/lib/core.mjs`; Modify `tests/core.test.mjs`.
- [ ] Añadir validación de PIN/clave OWNER, detección de ruta `#owner` y helper de mensaje de invitación.
- [ ] Añadir tests para ruta OWNER, PIN mínimo y mensaje VCM.
- [ ] Ejecutar `npm test`; esperado PASS.

### Task 2: Unified shell
**Files:** Modify `site/index.html`; Modify `site/app.js`; Modify `site/styles.css`.
- [ ] Integrar gate OWNER y COMMAND CENTER dentro de `index.html`.
- [ ] Validar clave OWNER con Web Crypto SHA-256 y hash embebido.
- [ ] Ocultar OWNER al usuario normal y permitir volver a USER.
- [ ] Integrar generador VCM/link/sala, compartir, abrir host, historial/auditoría local y estado operativo.

### Task 3: Compatibility redirect
**Files:** Modify `site/owner.html`.
- [ ] Convertirlo en redirect inmediato a `./#owner` con enlace fallback.

### Task 4: Verification and deploy
**Files:** No functional files unless fixes are required.
- [ ] Abrir PR contra `main`.
- [ ] Verificar CI GREEN.
- [ ] Merge.
- [ ] Verificar GitHub Pages deploy GREEN y que la URL principal no cambió.
