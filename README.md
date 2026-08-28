# VIVA CUBA + DESAPLICAXI IDENTITY CORE — CUBA PILOT

Versión runtime actual: **v0.7.3**

Aplicación pública USER: https://axielcasas1-cmyk.github.io/viva-cuba-cuba-pilot/

Acceso OWNER explícito: https://axielcasas1-cmyk.github.io/viva-cuba-cuba-pilot/?mode=owner#owner

## Fuente única de verdad

- [MASTER SPEC canónico](docs/VIVA_CUBA_MASTER_SPEC.md)
- [Contrato de migración legible por máquinas](docs/migration-contract.json)
- [ADR separación USER/OWNER e instalación](docs/decisions/2026-08-28-entry-separation-installation.md)

Toda evolución que cambie funciones, roles, rutas, persistencia, seguridad, proveedores o semántica de migración debe actualizar esos contratos/decisiones en el mismo cambio.

## Regla de arquitectura

**Una sola VIVA CUBA. OWNER = USER completo + ADMINISTRACIÓN.**

La raíz `/` es siempre USER aunque el dispositivo tenga autorización OWNER persistente. OWNER solo se abre por la puerta explícita `?mode=owner#owner` o mediante el botón ACCESO OWNER. La autorización persistente evita pedir de nuevo la clave en ese dispositivo, pero no invade la experiencia pública.

El piloto actual valida PWA pública, activación por invitación, DX local, OWNER persistente, videollamada embebida, contactos/compartir, ubicación bajo permiso y stickers híbridos estáticos + animados. Identidad global, mensajería E2EE interna, revocación remota, multi-dispositivo y auditoría central requieren DESAPLICAXI backend.
