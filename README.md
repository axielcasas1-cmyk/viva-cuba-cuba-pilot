# VIVA CUBA + DESAPLICAXI IDENTITY CORE — MADRE ÚNICA

Versión runtime madre: **v0.9.0**

Aplicación pública USER: https://axielcasas1-cmyk.github.io/viva-cuba-cuba-pilot/

Acceso OWNER explícito: https://axielcasas1-cmyk.github.io/viva-cuba-cuba-pilot/?mode=owner#owner

## Fuente única de verdad

- Desarrollo canónico desde 2026-09-23: rama `viva-cuba-modo-mami-canonical-20260923`.
- Producción pública actual: `main` hasta superar los gates de verificación y promoción.
- Release estable del carril: [`site/release.json`](site/release.json).
- [MASTER SPEC canónico](docs/VIVA_CUBA_MASTER_SPEC.md)
- [Contrato de migración legible por máquinas](docs/migration-contract.json)
- [ADR separación USER/OWNER e instalación](docs/decisions/2026-08-28-entry-separation-installation.md)
- [ADR carril canónico Modo Mami](docs/decisions/2026-09-23-canonical-modo-mami.md)

Toda evolución que cambie funciones, roles, rutas, persistencia, seguridad, proveedores, versión o semántica de migración debe actualizar los contratos canónicos en el mismo cambio.

## Regla de arquitectura

**Una sola VIVA CUBA. OWNER = USER completo + ADMINISTRACIÓN.**

La raíz `/` es siempre USER aunque el dispositivo tenga autorización OWNER persistente. OWNER solo se abre por la puerta explícita `?mode=owner#owner` o mediante el botón ACCESO OWNER. La autorización persistente evita pedir de nuevo la clave en ese dispositivo, pero no invade la experiencia pública.

## Release / Sync Core v0.9

Cada cliente consulta la app madre al iniciar, recuperar Internet, volver al primer plano, recibir foco y periódicamente. Si existe una versión estable más nueva, la actualización se aplica únicamente en estado seguro; una llamada activa la difiere. Una guardia por versión impide bucles de recarga y la caché PWA usa código network-first con fallback offline.

La trazabilidad de release se conserva localmente en `vc_release_audit_v1` de forma acotada y no incluye IP, ubicación precisa ni contenido de mensajes/archivos.

Un dispositivo totalmente sin Internet no puede recibir cambios en ese instante. Al recuperar conectividad debe volver a consultar la madre y converger sin reinstalación manual.

## Estado funcional preservado

El runtime web valida PWA pública, activación por invitación, DX local, OWNER persistente, videollamada embebida, contactos/compartir, ubicación bajo permiso, stickers híbridos estáticos + animados y sincronización de releases.

El carril preserva además la entrada de identidad global DESAPLICAXI, OWNER global, invitaciones autoritativas y diagnóstico de fallos OWNER que existían antes de que el repositorio principal recibiera commits de otros proyectos.

## Regla Modo Mami

La experiencia final para la madre debe reducirse a: **recibir enlace → abrir/instalar → autoenrolar dispositivo → ver a Axiel → llamar**. No se promoverá a producción una versión que reintroduzca registro técnico, credenciales de administrador o pasos innecesarios para ella.
