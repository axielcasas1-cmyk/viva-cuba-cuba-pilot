# ADR — Separación USER/OWNER e instalación PWA

Fecha: 2026-08-28
Estado: ACEPTADO / CANÓNICO
Runtime: v0.7.3 recovery line

## Decisión 1 — Una app, dos puertas explícitas

VIVA CUBA sigue siendo una sola aplicación, pero las entradas no pueden confundirse:

- `/` = acceso público USER. Debe mostrar siempre la experiencia USER, incluso si ese dispositivo conserva autorización OWNER.
- `?mode=owner#owner` = acceso explícito OWNER.
- El botón visible `ACCESO OWNER` activa ese modo sin crear una segunda aplicación.
- `owner.html` existe solo por compatibilidad y redirige al modo OWNER explícito.

La persistencia `vc_owner_persistent_v1` significa **dispositivo autorizado como OWNER**, no “forzar que toda apertura pública muestre administración”. Si el dispositivo está autorizado, al entrar por la puerta OWNER no vuelve a pedir la clave mientras no se cierre explícitamente la sesión.

Invitaciones `#invite=...` y llamadas `#call=...` tienen prioridad y nunca pueden ser secuestradas por la persistencia OWNER.

## Decisión 2 — Cierre OWNER

`CERRAR SESIÓN OWNER` elimina la autorización persistente local y devuelve la URL al acceso público USER.

## Decisión 3 — Instalación

El botón principal sigue siendo `DESCARGAR APP`.

- En navegadores que exponen instalador PWA programático, un toque sobre el botón dispara directamente el instalador nativo.
- Si la app ya está instalada, el botón informa `APP INSTALADA`.
- En iPhone/iPad, una página web no puede añadir por sí sola una PWA a la pantalla de inicio. iOS exige una confirmación del usuario desde la interfaz del navegador/sistema; VIVA CUBA debe explicarlo claramente y nunca fingir una instalación automática.
- No afirmar que existe APK/IPA nativo hasta construir y firmar esos artefactos.

## Regla de regresión

CI debe proteger permanentemente:

1. `/` nunca autoabre OWNER por persistencia.
2. la puerta OWNER sigue siendo explícita y persistente.
3. invitaciones/llamadas no son interceptadas por OWNER.
4. no puede existir más de un controlador del evento de instalación.
5. cambios funcionales PWA rotan la caché del Service Worker.
