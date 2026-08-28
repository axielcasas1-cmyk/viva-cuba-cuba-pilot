# VIVA CUBA Cuba Pilot v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar una PWA piloto accesible mediante GitHub Pages, con invitación VCM precargada, registro local DX, panel OWNER generador de enlaces y acceso a una videollamada real compartida.

**Architecture:** GitHub Pages sirve únicamente archivos estáticos y datos locales no sensibles. El OWNER genera en el navegador un VCM y un identificador aleatorio de sala, y los codifica en el fragmento del enlace; la app captura y limpia el fragmento, crea un perfil DX local y abre la misma sala Jitsi. La seguridad de producción, códigos de un solo uso y revocación quedan fuera de este piloto y se incorporarán en DESAPLICAXI Identity Core.

**Tech Stack:** HTML5, CSS, JavaScript ES modules, Web Crypto, Service Worker, PWA manifest, Node.js 22 `node:test`, GitHub Actions, GitHub Pages, Jitsi Meet.

**Spec:** `docs/superpowers/specs/2026-08-28-viva-cuba-cuba-pilot-design.md`

## Global Constraints

- El piloto debe identificarse claramente como `CUBA PILOT v0.1`, no producción.
- No almacenar contraseñas, claves privadas, tokens de backend ni secretos en GitHub Pages.
- El código VCM del piloto no se presentará como credencial de producción ni como código realmente revocable/un solo uso.
- El usuario en Cuba no debe necesitar cuenta GitHub, Base44, Replit o AppDeploy.
- El anfitrión abre primero la sala de videollamada; el invitado entra después mediante el mismo identificador.
- La PWA debe seguir mostrando el shell cuando la conectividad sea intermitente, pero nunca prometer videollamada offline.

---

### Task 1: Núcleo de invitación y tests

**Files:**
- Create: `site/lib/core.mjs`
- Create: `tests/core.test.mjs`
- Create: `package.json`

**Interfaces:**
- Produces: `isValidInvite(code)`, `extractInvitePayload(text)`, `parseInviteHash(hash)`, `generateInviteCode()`, `generateRoomId()`, `generateDx()`, `buildInviteUrl(baseUrl, code, room)`.

- [ ] Crear tests para validación/extracción VCM, fragmento `invite+room`, generación DX y URL compartible.
- [ ] Ejecutar `npm test` y comprobar RED antes del módulo.
- [ ] Implementar las funciones puras usando Web Crypto.
- [ ] Ejecutar `npm test` y exigir PASS.
- [ ] Commit del núcleo.

### Task 2: Activación y App Shell

**Files:**
- Create: `site/index.html`
- Create: `site/app.js`
- Create: `site/styles.css`

**Interfaces:**
- Consumes: funciones de `site/lib/core.mjs`.
- Produces: flujo `enlace -> código precargado -> nombre -> DX local -> shell -> videollamada`.

- [ ] Crear formulario de activación y botón `PEGAR CÓDIGO`.
- [ ] Capturar `#invite=...&room=...`, precargar y limpiar la URL con `history.replaceState`.
- [ ] Persistir perfil piloto local y restaurarlo tras recarga.
- [ ] Implementar shell mobile-first, estado de red, copiar DX, borrar perfil piloto y botón `VIDEOLLAMADA`.
- [ ] Abrir `https://meet.jit.si/<room>` solamente con sala válida y conectividad disponible.

### Task 3: OWNER generador de invitaciones

**Files:**
- Create: `site/owner.html`
- Create: `site/owner.js`

**Interfaces:**
- Consumes: `generateInviteCode`, `generateRoomId`, `buildInviteUrl`.
- Produces: código VCM, enlace público, mensaje compartible y apertura de sala como anfitrión.

- [ ] Generar un VCM y sala distintos en cada ejecución mediante Web Crypto.
- [ ] Implementar `Copiar código`, `Copiar enlace`, `Compartir invitación` y fallback de portapapeles.
- [ ] Implementar `ABRIR SALA COMO ANFITRIÓN` y aviso de que meet.jit.si puede exigir login al creador de la sala.
- [ ] Mostrar advertencia visible de que OWNER estático es una herramienta de piloto, no una frontera administrativa de seguridad.

### Task 4: PWA y fallo elegante

**Files:**
- Create: `site/manifest.webmanifest`
- Create: `site/sw.js`
- Create: `site/icon.svg`

- [ ] Configurar PWA standalone y alcance relativo a GitHub Pages.
- [ ] Cachear shell estático y usar network-first para navegación.
- [ ] Mostrar fallback de pegado manual, error de invitación y reintento de llamada sin destruir el perfil.

### Task 5: CI y despliegue GitHub Pages

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/pages.yml`

- [ ] CI con Node 22 ejecuta `npm test` en push/PR.
- [ ] Workflow Pages prueba primero y despliega solamente `site/` desde `main`.
- [ ] Abrir PR `build/cuba-pilot-v0.1 -> main`.
- [ ] Verificar CI GREEN antes de merge.
- [ ] Merge a `main`.
- [ ] Si GitHub Pages no está habilitado, realizar una única acción manual: Settings -> Pages -> Source: GitHub Actions.
- [ ] Verificar URL pública y ejecutar gate físico España/Cuba.
