# VIVA CUBA + DESAPLICAXI IDENTITY CORE — CUBA PILOT

Versión actual: **v0.8**

Aplicación pública: https://axielcasas1-cmyk.github.io/viva-cuba-cuba-pilot/

## Fuente única de verdad

- [MASTER SPEC canónico](docs/VIVA_CUBA_MASTER_SPEC.md)
- [Contrato de migración legible por máquinas](docs/migration-contract.json)

Toda evolución que cambie funciones, roles, rutas, persistencia, seguridad, proveedores o semántica de migración debe actualizar esos contratos en el mismo cambio.

## Regla de arquitectura

**Una sola VIVA CUBA. OWNER = USER completo + ADMINISTRACIÓN.**

El piloto actual valida PWA pública, activación por invitación, DX local, OWNER persistente, videollamada embebida, contactos/compartir, ubicación bajo permiso y stickers híbridos estáticos + animados. Identidad global, mensajería E2EE interna, revocación remota, multi-dispositivo y auditoría central requieren DESAPLICAXI backend.
