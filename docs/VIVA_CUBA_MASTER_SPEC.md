# VIVA CUBA + DESAPLICAXI IDENTITY CORE

## MASTER SPEC CANÓNICO — FUENTE ÚNICA DE VERDAD

**Estado del documento:** CANÓNICO / VERSIONADO  
**Versión base:** MADRE ÚNICA v0.9  
**Objetivo:** preservar arquitectura, funciones, decisiones, límites, contratos de datos y requisitos de migración para que ninguna reconstrucción, cambio de proveedor o nuevo chat obligue a redefinir VIVA CUBA desde cero.

> Regla: toda evolución futura debe actualizar este documento y `docs/migration-contract.json` en el mismo cambio de código. Si existe contradicción entre una conversación y este archivo, se revisa el historial Git y se actualiza explícitamente este MASTER SPEC; nunca se sobrescriben requisitos silenciosamente.

---

## 1. VISIÓN DEL SISTEMA

VIVA CUBA es la interfaz de usuario de un ecosistema de identidad digital y comunicación segura. DESAPLICAXI Identity Core es el núcleo interno previsto para identidad, autenticación, cifrado, autorización, auditoría, dispositivos, sesiones, recuperación y control administrativo.

Principios obligatorios:

1. La identidad no depende del número telefónico, SIM, correo, dispositivo ni sesión temporal.
2. El identificador lógico del usuario es un **DX ID** permanente.
3. OWNER es también un usuario completo: **OWNER = USER + ADMINISTRACIÓN**.
4. Una sola app, una sola experiencia y una sola URL pública; el rol determina las capacidades visibles.
5. No crear botones decorativos que aparenten funciones inexistentes.
6. Toda función sensible debe diferenciar claramente entre capacidad local de piloto y capacidad real respaldada por servidor.
7. Seguridad por capas: passkeys/WebAuthn, biometría del sistema, TOTP, dispositivos de confianza, sesiones controladas, cifrado E2EE y gestión segura de claves cuando DESAPLICAXI backend esté conectado.
8. Fail-safe y graceful degradation: una dependencia caída no debe borrar identidad, perfil o datos locales necesarios para recuperación.
9. No depender de un único proveedor. La arquitectura debe permitir migración sin reescribir la experiencia principal.
10. Git `main` + `site/release.json` constituyen la fuente única de release; los clientes convergen automáticamente a la versión estable cuando recuperan conectividad.

---

## 2. RUNTIME PÚBLICO ACTUAL

Repositorio: `axielcasas1-cmyk/viva-cuba-cuba-pilot`  
Hosting piloto/madre web: GitHub Pages  
URL pública: `https://axielcasas1-cmyk.github.io/viva-cuba-cuba-pilot/`

Rutas lógicas:

- `/` — aplicación única VIVA CUBA.
- `#owner` — acceso/área OWNER dentro de la misma aplicación.
- `#invite=<VCM>&room=<ROOM>` — invitación; el código se precarga y el fragmento debe limpiarse después de capturarlo.
- `#call=<ROOM>` — videollamada VIVA CUBA embebida.
- `owner.html` — compatibilidad histórica; redirige a la aplicación única y no constituye una segunda app.

El runtime web valida acceso internacional, instalación PWA, onboarding por invitación, UX USER/OWNER, videollamada y módulos locales. GitHub Pages **no es** el backend final de identidad ni de mensajería; DESAPLICAXI backend es la autoridad objetivo.

---

## 3. MODELO DE IDENTIDAD

### 3.1 Identidad objetivo de producción

- DX ID único y permanente.
- Cuenta independiente de teléfono/SIM/email.
- Múltiples dispositivos autorizados.
- Múltiples sesiones controladas.
- Recuperación segura mediante VCR/recovery flow.
- Revocación de dispositivos y sesiones.
- Auditoría de eventos relevantes.

Formato representativo: `DX-XXXXXXXX` o futuras variantes DESAPLICAXI compatibles.

### 3.2 Estado del piloto

El piloto genera un DX local mediante criptografía del navegador. Este DX sirve para validar UX/persistencia y **no debe interpretarse como identidad global autoritativa** hasta conectar DESAPLICAXI backend.

---

## 4. ACTIVACIÓN E INVITACIONES

Flujo objetivo:

`OWNER autoriza → genera VCM + enlace → usuario recibe → abre enlace → VCM precargado → escribe nombre → activa → obtiene DX → entra en VIVA CUBA`.

Requisitos permanentes:

- Botón explícito PEGAR CÓDIGO.
- Lectura del portapapeles solo tras acción del usuario.
- El enlace puede incluir `#invite=...` para evitar que el token forme parte de la petición HTTP inicial.
- El fragmento debe eliminarse de la URL después de capturarlo.
- No registrar códigos crudos en logs innecesarios.
- Producción: VCM de un solo uso, almacenado como hash, expiración/revocación y autoridad del servidor.
- Piloto estático: el VCM valida flujo y UX, pero no puede garantizar revocación global ni unicidad autoritativa.

---

## 5. APP ÚNICA Y MODELO DE ROLES

### USER

Debe disponer de:

- identidad DX;
- copiar/compartir DX;
- contactos;
- mensajes;
- emojis;
- stickers;
- fotografías y archivos;
- videollamadas;
- llamadas cuando se implemente transporte de audio dedicado;
- ubicación bajo consentimiento;
- presencia/actividad según permisos;
- instalación/actualización de la app;
- estado de conexión.

### OWNER

OWNER debe incluir **todo lo anterior** en la parte superior de su área y, debajo, funciones administrativas.

Orden visual obligatorio:

1. **MI ÁREA · OWNER COMO USUARIO**
2. **ADMINISTRACIÓN / OWNER · COMMAND CENTER**

Funciones personales OWNER actuales del piloto:

- DX local propio;
- copiar DX;
- contactos DX locales;
- selección de contacto;
- mensajes mediante canal de compartir disponible;
- emoji;
- stickers híbridos;
- videollamada embebida;
- compartir sala;
- fotos/archivos mediante Web Share cuando el navegador lo permite;
- ubicación bajo gesto explícito;
- actividad local.

Funciones administrativas actuales del piloto:

- generar código VCM;
- generar sala;
- generar enlace de invitación;
- copiar código;
- copiar enlace;
- compartir invitación;
- copiar mensaje completo;
- abrir sala como anfitrión;
- historial local de invitaciones;
- marca local de revocación;
- auditoría OWNER local;
- estado de red/PWA/dispositivo;
- indicadores de módulos de identidad/presencia.

Funciones administrativas que **requieren DESAPLICAXI backend**:

- identidad global autoritativa;
- revocación remota real;
- sesiones globales;
- dispositivos autorizados globales;
- auditoría central e inmutable;
- políticas de riesgo;
- recuperación controlada multi-dispositivo;
- gestión real de roles y permisos.

---

## 6. SESIÓN OWNER

Requisito permanente:

- Tras autenticación OWNER correcta, el dispositivo autorizado puede recordar el acceso.
- La sesión OWNER persiste entre cierres de pestaña/PWA y reinicios del navegador mientras se conserven los datos locales.
- Solo una acción explícita **CERRAR SESIÓN OWNER** debe retirar esta persistencia local.
- Navegación privada, borrado de datos o reinstalación del navegador pueden eliminarla.
- En producción, esta persistencia local debe sustituirse/complementarse con una credencial de dispositivo, passkey y sesión revocable desde DESAPLICAXI.
- Nunca almacenar la clave OWNER en claro. El repositorio puede contener solo verificadores/hash adecuados al piloto; secretos reales deben residir en un gestor de secretos/backend.

---

## 7. MENSAJERÍA Y COMUNICACIÓN

Objetivo final:

- mensajería instantánea interna DX↔DX;
- E2EE;
- confirmación de envío/entrega/lectura;
- texto, emojis, stickers, fotos, vídeos, documentos y ubicación;
- almacenamiento y reintento cuando la conectividad reaparece;
- multi-dispositivo con sobres de claves por dispositivo;
- grupos y salas.

Estado del piloto GitHub Pages:

- mensajes/archivos utilizan el sistema de compartir del dispositivo cuando corresponde;
- no existe todavía transporte interno persistente DX↔DX respaldado por servidor;
- no debe presentarse compartir del sistema como si fuera mensajería E2EE interna.

La futura migración al backend debe conservar la UX y sustituir únicamente la capa de transporte/persistencia.

---

## 8. STICKERS HÍBRIDOS

Requisito permanente incorporado en v0.8:

- stickers **estáticos y animados/móviles** en el mismo selector;
- comportamiento visual inspirado en el patrón general de mensajería moderna, sin copiar packs, recursos ni propiedad intelectual de WhatsApp u otros terceros;
- selector con:
  - Recientes;
  - Favoritos;
  - Packs;
  - Crear sticker;
  - búsqueda;
  - cuadrícula visual;
- packs integrados deben ser originales de VIVA CUBA;
- USER y OWNER usan el mismo motor de stickers;
- formatos personalizados de piloto: PNG, WebP y GIF;
- PNG se trata como estático; GIF/WebP personalizados pueden tratarse como animados;
- los stickers animados integrados pueden usar SVG animado u otro formato compatible;
- el sticker seleccionado debe poder previsualizarse;
- en piloto, se intenta compartir mediante Web Share/Clipboard cuando el navegador lo permite;
- en producción, el mismo objeto sticker se enviará por el transporte interno E2EE.

Persistencia local de stickers:

- recientes;
- favoritos;
- personalizados pequeños;
- límite de tamaño/cantidad para no agotar almacenamiento local.

Migración futura: mover blobs personalizados a almacenamiento cifrado/objeto y mantener identificadores lógicos para recientes/favoritos.

---

## 9. VIDEOLLAMADA

Requisito UX: la videollamada debe abrir **dentro de VIVA CUBA**, no expulsar al usuario a una página de proveedor.

Estado piloto:

- motor de transporte: Jitsi Meet;
- integración: Jitsi IFrame API;
- superficie: overlay VIVA CUBA a pantalla completa;
- prejoin externo desactivado cuando lo permite la configuración;
- deep-linking hacia la app Jitsi desactivado;
- botón propio CERRAR LLAMADA;
- USER, OWNER personal y OWNER anfitrión deben converger en la misma experiencia embebida;
- enlaces de llamada VIVA CUBA pueden usar `#call=<ROOM>`.

Jitsi es una dependencia sustituible, no parte de la identidad del producto. Una futura SFU/WebRTC propia debe conservar la misma interfaz de llamada.

---

## 10. PWA, DESCARGA E INSTALACIÓN

VIVA CUBA se distribuye actualmente como PWA.

Botón principal: **DESCARGAR APP** con diseño azul eléctrico/fosforescente.

Comportamiento:

- Android/Windows/Mac/Chromebook: dispara `beforeinstallprompt` cuando existe;
- iPhone/iPad: guía para Safari → Compartir → Añadir a pantalla de inicio;
- si ya está instalada: mostrar APP INSTALADA;
- fallback visible si el navegador no permite instalación programática.

No afirmar que existe APK/IPA nativo hasta que dichos artefactos se construyan y firmen realmente.

Service Worker desde MADRE v0.9:

- caché versionada por release;
- navegación y código ejecutable con estrategia **network-first** y fallback offline;
- `release.json` nunca debe servirse desde la caché runtime;
- al activar un nuevo worker se eliminan caches anteriores de VIVA CUBA;
- una actualización automática puede intentar como máximo una recarga por versión objetivo en la misma sesión;
- una llamada activa bloquea/difiere el cambio de versión hasta un estado seguro;
- la existencia de shell offline no implica videollamada/mensajería offline completa.

---

## 11. PRESENCIA Y UBICACIÓN

Objetivo:

- online/offline;
- estado de conexión;
- región/país solo cuando exista base legal/permiso;
- historial de actividad sujeto a política;
- mapa oscuro/futurista para visualización de red cuando el backend exista.

Ubicación:

- jamás solicitar automáticamente sin necesidad;
- requerir acción explícita del usuario;
- compartir solo los datos necesarios;
- producción: controles de expiración/alcance para ubicación en vivo.

---

## 12. SEGURIDAD Y AUTENTICACIÓN OBJETIVO

Capas previstas:

- Passkeys / WebAuthn;
- biometría del sistema;
- TOTP;
- dispositivos de confianza;
- sesiones revocables;
- E2EE;
- gestión segura de claves;
- mínimo privilegio;
- rate limiting;
- auditoría;
- detección de anomalías;
- clasificación de riesgo;
- recuperación segura.

Principio: nunca depender de una única barrera.

Piloto estático: no presentar la clave local OWNER ni localStorage como frontera de seguridad equivalente a un backend autenticado.

---

## 13. THREAT & RESILIENCE COMMAND

Toda función futura debe analizar:

- qué ve el sistema;
- qué no ve;
- qué asume confiable;
- qué puede fallar;
- dependencias externas;
- comportamiento si una capa desaparece.

Todo riesgo importante debe tener:

1. mitigación principal;
2. mitigaciones secundarias;
3. mitigación madre/última barrera.

Rollback-UX:

`detectar → aislar → proteger datos → recuperar estado seguro → registrar → aprender`.

Fallo elegante:

`aislar → contener → continuar cuando sea seguro → activar mitigación → recuperar → informar`.

---

## 14. CONTRATO DE DATOS LOCAL DEL PILOTO

Las claves se formalizan también en `docs/migration-contract.json`.

Principales claves actuales:

- `vc_cuba_pilot_profile_v1` — perfil USER local.
- `vc_owner_session_v1` — desbloqueo OWNER de sesión.
- `vc_owner_persistent_v1` — autorización OWNER persistente en navegador/dispositivo.
- `vc_owner_personal_v1` — perfil personal OWNER local.
- `vc_owner_contacts_v1` — contactos locales OWNER.
- `vc_owner_invites_v1` — historial local de invitaciones.
- `vc_owner_audit_v1` — auditoría OWNER local.
- `vc_stickers_recents_v1` — IDs recientes.
- `vc_stickers_favorites_v1` — IDs favoritos.
- `vc_stickers_custom_v1` — stickers personalizados pequeños del piloto.
- `vc_release_audit_v1` — trazabilidad local acotada de comprobación/aplicación de releases, sin IP, ubicación precisa ni contenido privado.
- `vc_release_reload_once:<version>` — guardia de sesión contra bucles de actualización.

Regla de migración: **no renombrar ni eliminar claves sin migrador explícito**. Si cambia el schema, incrementar versión y crear función de migración idempotente.

---

## 15. CONTRATO DE MIGRACIÓN

Una migración de proveedor/hosting/backend se considera correcta solo si conserva:

- DX y asociaciones de identidad;
- roles USER/OWNER;
- sesiones/dispositivos según política;
- contactos;
- conversaciones y adjuntos cuando exista backend;
- stickers recientes/favoritos/personalizados;
- invitaciones pendientes válidas o estrategia explícita de invalidación;
- auditoría requerida;
- manifiesto de release y semántica de convergencia;
- configuración de PWA;
- rutas públicas o redirecciones compatibles;
- experiencia OWNER = USER + ADMIN;
- videollamada embebida;
- permisos y consentimiento de ubicación;
- capacidad de rollback.

Antes de cortar proveedor:

1. congelar schema;
2. exportar datos y checksum;
3. transformar mediante migrador versionado;
4. importar en sandbox;
5. ejecutar pruebas de identidad, mensajes, archivos, llamada y OWNER;
6. probar Android/iPhone/PC;
7. validar acceso desde España, Cuba y una red internacional normal;
8. mantener proveedor anterior como rollback temporal cuando sea posible;
9. cortar tráfico solo tras gates GREEN;
10. documentar commit/tag de la migración.

---

## 16. ARCHIVOS FUNCIONALES CLAVE DEL PILOTO

- `site/index.html` — shell única.
- `site/app.js` — activación, perfil, OWNER base e invitaciones.
- `site/owner-entry.js` — acceso OWNER, persistencia y bootstrap de extensiones/Sync Core.
- `site/owner-user.js` — zona USER dentro de OWNER.
- `site/call.js` — videollamada embebida.
- `site/stickers.js` — motor híbrido de stickers.
- `site/stickers-entry.js` — integración USER.
- `site/owner-stickers.js` — integración OWNER.
- `site/install.js` — instalación PWA.
- `site/version.js` — versión local del runtime.
- `site/release.json` — manifiesto estable de la app madre.
- `site/sync.js` — detección/convergencia segura de releases.
- `site/sw.js` — Service Worker/cache versionada.
- `site/manifest.webmanifest` — manifiesto PWA.
- `site/styles.css`, `install.css`, `owner-entry.css` — estilos.
- `site/lib/core.mjs` — helpers puros de invitación/DX/room/rol.
- `site/lib/release-core.mjs` — comparación de releases, guardias y auditoría privada.
- `tests/*.test.mjs` — contrato automatizado.
- `.github/workflows/ci.yml` — CI.
- `.github/workflows/pages.yml` — deploy Pages.

---

## 17. TESTING Y DEFINITION OF DONE

Ciclo obligatorio:

`RED → GREEN → REFACTOR → BUILD → DEPLOY → QA → GATE`.

Una función no está terminada porque compile. Debe incluir, cuando aplique:

- tests unitarios;
- sintaxis/build;
- integración;
- UX móvil;
- permisos;
- degradación/fallback;
- deployment verificado;
- actualización de documentación;
- migración/schema cuando cambien datos.

Gates de red permanentes:

1. **España:** aplicación, backend y sincronización deben responder desde una red española real.
2. **Cuba:** cualquier capacidad de red crítica debe probarse desde al menos un dispositivo en Cuba antes de declararse certificada para ese entorno.
3. **Internacional normal:** verificar que la misma app madre y la misma versión funcionen sin bifurcaciones por país.
4. **Reconexión:** un dispositivo offline no puede recibir cambios mientras carece totalmente de Internet; al recuperar conectividad debe detectar la madre y converger sin reinstalación manual.

---

## 18. ESCALABILIDAD Y FUTURO

La arquitectura debe poder evolucionar a:

- millones de identidades;
- familias;
- planes gratis/premium;
- suscripciones;
- remesas/recargas únicamente bajo marco legal y proveedores autorizados;
- salas grupales;
- llamadas y videollamadas multiusuario;
- presencia distribuida;
- red resiliente/store-and-forward;
- integraciones futuras.

No introducir funciones financieras o sensibles en GitHub Pages estático.

---

## 19. REGLA DE CAMBIO PERMANENTE

Desde v0.8, cualquier PR/cambio que altere:

- una función visible;
- un flujo de usuario;
- un rol;
- un dato persistente;
- una dependencia;
- un requisito de seguridad;
- una ruta pública;
- un proveedor;
- una versión o política de sincronización;

debe actualizar este MASTER SPEC y/o `migration-contract.json`.

**Objetivo final:** que VIVA CUBA pueda ser reconstruida o migrada desde el repositorio y sus contratos sin depender de recordar conversaciones anteriores.

---

## 20. MADRE ÚNICA · RELEASE & SYNC CORE

Desde v0.9 se establece como ley de arquitectura:

1. **Una sola app madre:** `main` del repositorio canónico contiene el código aprobado. No mantener copias funcionalmente divergentes por país.
2. **Un solo manifiesto estable:** `site/release.json` declara versión, canal, versión mínima y política de actualización.
3. **Convergencia expedita:** cada cliente comprueba la madre al iniciar, recuperar conexión, volver al primer plano, recibir foco y periódicamente.
4. **Sin bucles:** una versión objetivo puede provocar como máximo una recarga automática por sesión hasta que `APP_VERSION` converja; si no converge se mantiene operativa la versión actual y se registra la guardia.
5. **No interrumpir llamadas:** una llamada activa difiere la aplicación de release y el cliente reintenta al finalizar.
6. **Cuba/offline:** mientras no exista conectividad IP se conserva el shell disponible; al regresar la conexión se consulta inmediatamente la madre y se converge.
7. **Trazabilidad:** registrar versión local, versión objetivo, momento, resultado, online/offline, idioma y zona horaria; nunca registrar IP, coordenadas precisas ni contenido E2EE por este mecanismo.
8. **PWA segura:** scripts, estilos, navegación y manifiesto de release priorizan red cuando existe; caché es fallback de resiliencia, no fuente autoritativa de versión.
9. **Rollback:** un release defectuoso se revierte mediante Git + nueva versión estable; no se fuerza downgrade silencioso del cliente.
10. **Futuro backend:** DESAPLICAXI/Supabase será la autoridad de identidad, sesiones, dispositivos, auditoría y mensajería, pero la interfaz pública continúa gobernada por la misma app madre.
