# VIVA CUBA — Cuba Pilot Design

## Objetivo
Validar desde un teléfono real en Cuba que una persona puede abrir VIVA CUBA desde un enlace público normal, recibir una invitación con el código precargado, completar un registro local sencillo y entrar a una videollamada real sin cuentas de Base44, Replit, AppDeploy ni herramientas de desarrollador.

## Alcance del piloto v0.1
Este piloto valida conectividad, experiencia de invitación y videollamada. No reemplaza todavía DESAPLICAXI Identity Core ni pretende ofrecer seguridad de producción.

### Flujo usuario
1. El administrador genera una invitación desde `owner.html`.
2. El navegador genera un código `VCM-...` aleatorio y un enlace con fragmento `#invite=VCM-...`.
3. El administrador comparte ese enlace por WhatsApp, SMS, correo u otro canal disponible.
4. El usuario toca el enlace y abre GitHub Pages sin iniciar sesión en GitHub.
5. La PWA detecta `#invite=...`, valida el formato, precarga la casilla y limpia el fragmento visible con `history.replaceState`.
6. El usuario escribe su nombre y pulsa `ACTIVAR Y ENTRAR`.
7. El piloto crea un perfil DX local para ese dispositivo y guarda solo datos no sensibles en almacenamiento local.
8. El usuario entra a la shell VIVA CUBA.
9. El administrador/anfitrión abre primero la sala de videollamada. Después el usuario en Cuba pulsa `VIDEOLLAMADA` y entra como invitado a la misma sala.

## Arquitectura
- **Frontend público:** GitHub Pages, HTML/CSS/JavaScript estático y PWA instalable.
- **Invitación:** fragmento URL `#invite=...`; el fragmento no se envía al servidor HTTP.
- **Perfil piloto:** local al dispositivo. No contiene contraseña, correo, teléfono ni secretos de producción.
- **Videollamada piloto:** Jitsi Meet mediante sala aleatoria asociada localmente a la invitación. El anfitrión abre primero la sala para evitar que el usuario en Cuba tenga que crearla o autenticarse como moderador. No se implementa servidor WebRTC propio en v0.1.
- **OWNER piloto:** `owner.html` genera código, enlace y sala; es una herramienta de conveniencia del piloto y NO una frontera de seguridad. No incluir credenciales ni secretos en su JavaScript.

## Seguridad y límites explícitos
- GitHub Pages es hosting estático: no se almacenan claves privadas, contraseñas, tokens de backend ni secretos.
- El código VCM del piloto NO es todavía una credencial de producción y no puede garantizar consumo único o revocación remota sin backend.
- El OWNER estático no se considera autenticación administrativa.
- La identidad DX local sirve para validar el flujo UX y persistencia en el mismo dispositivo; la identidad permanente multi-dispositivo llegará con DESAPLICAXI Identity Core.
- Los enlaces de videollamada se generan con suficiente aleatoriedad y no se publican en el repositorio.

## Componentes
- `index.html`: activación y shell del usuario.
- `owner.html`: generador de invitación y enlace compartible.
- `app.js`: captura de invitación, activación, DX local, navegación y apertura de videollamada.
- `owner.js`: generación de VCM, identificador de sala y enlace compartible mediante Web Share/clipboard.
- `styles.css`: interfaz oscura/verde, mobile-first y accesible.
- `manifest.webmanifest`: instalación PWA.
- `sw.js`: caché del shell estático para arranque tolerante a conectividad intermitente.

## Fallo elegante
- Si el portapapeles falla, mostrar instrucción de pegado manual.
- Si Web Share no existe, copiar enlace al portapapeles.
- Si no hay invitación válida, mantener la pantalla de activación.
- Si la red no está disponible al iniciar llamada, mostrar mensaje y permitir reintentar sin borrar el perfil local.
- El Service Worker no debe prometer videollamada offline; solo mantiene el shell disponible.

## Gates del piloto
1. La URL de GitHub Pages responde públicamente sin autenticación de GitHub.
2. `#invite=VCM-...` precarga el código y desaparece de la barra tras capturarse.
3. `PEGAR CÓDIGO` funciona tras gesto explícito o muestra fallback manual.
4. Activación crea DX local y entra a Inicio.
5. Recargar conserva el perfil local del dispositivo.
6. OWNER genera un VCM diferente en cada ejecución y produce enlace compartible.
7. El usuario que abre el enlace llega directamente al flujo de activación.
8. El anfitrión puede abrir primero la sala y `VIDEOLLAMADA` lleva al usuario en Cuba a esa misma sala.
9. La shell muestra claramente que es `CUBA PILOT v0.1`, no producción.
10. Prueba física final: un dispositivo fuera de Cuba y un dispositivo en Cuba abren el mismo enlace/sala y establecen audio y vídeo.

## Siguiente fase tras gate físico GREEN
Introducir backend DESAPLICAXI para códigos realmente de un solo uso, hashes, sesiones, recuperación VCR, revocación, auditoría, identidad multi-dispositivo y señalización/infraestructura WebRTC controlada. El dominio definitivo se mueve solo después de esos gates.
