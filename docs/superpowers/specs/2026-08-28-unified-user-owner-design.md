# VIVA CUBA Unified USER + OWNER — Design

## Objetivo
Mantener una sola URL y una sola PWA VIVA CUBA. Todo usuario entra por `index.html`. El flujo normal es USER; el OWNER se abre dentro de la misma shell mediante una ruta no visible `#owner` y una clave OWNER de piloto validada localmente contra un hash SHA-256 embebido.

## USER
Conserva activación por VCM, nombre, DX local, persistencia en dispositivo, estado de red, instalación PWA y videollamada asociada a la invitación.

## OWNER
Incluye todas las funciones USER y, tras validar la clave OWNER, muestra COMMAND CENTER con: generador automático VCM + sala + link; copiar/compartir invitación; abrir sala como anfitrión; historial local de invitaciones; revocación local de invitaciones del piloto; auditoría local de acciones OWNER; estado de la PWA/red/dispositivo; y accesos visuales a Identidades, Sesiones, Dispositivos y Presencia marcados como `BACKEND DESAPLICAXI REQUERIDO` cuando la operación no puede aplicarse globalmente desde GitHub Pages.

## Seguridad piloto
GitHub Pages sigue siendo estático. La clave OWNER real no se publica; solo su SHA-256. La validación sirve como barrera local/casual, no como autorización de servidor. Ninguna acción se presentará como revocación o gestión remota real sin backend. No se guardan contraseñas, tokens de producción ni claves privadas.

## Compatibilidad
`owner.html` deja de ser una segunda app y redirige a `./#owner`. Los enlaces públicos existentes siguen funcionando. El enlace principal de VIVA CUBA no cambia.

## Gates
1. Un único `index.html` contiene USER y OWNER.
2. El usuario normal no ve controles OWNER.
3. `#owner` abre gate OWNER y limpia el hash visible.
4. Clave incorrecta no abre COMMAND CENTER.
5. Clave correcta habilita OWNER en ese dispositivo.
6. OWNER puede volver a vista USER sin perder perfil.
7. Generador VCM/link/sala sigue funcionando.
8. Historial y auditoría local persisten tras recargar.
9. `owner.html` redirige a la app única.
10. CI y GitHub Pages quedan GREEN.
