const JITSI_DOMAIN = 'meet.jit.si';
const JITSI_API_URL = `https://${JITSI_DOMAIN}/external_api.js`;
const PROFILE_KEY = 'vc_cuba_pilot_profile_v1';
const OWNER_PERSONAL_KEY = 'vc_owner_personal_v1';
let apiInstance = null;
let apiLoader = null;

function safeJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

function validRoom(value) {
  return /^[A-Za-z0-9-]{12,80}$/.test(String(value || ''));
}

function ensureCallSurface() {
  let overlay = document.getElementById('callOverlay');
  if (overlay) return overlay;

  const style = document.createElement('style');
  style.textContent = `
    #callOverlay{position:fixed;inset:0;z-index:2147483600;background:#02050a;display:none;flex-direction:column;color:#fff;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    #callOverlay.vc-call-open{display:flex}
    .vc-call-topbar{min-height:62px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;background:linear-gradient(90deg,#06151f,#0b1630);border-bottom:1px solid rgba(72,182,255,.35);box-shadow:0 0 24px rgba(0,151,255,.18)}
    .vc-call-title{display:flex;flex-direction:column;min-width:0}.vc-call-title strong{font-size:16px;letter-spacing:.04em}.vc-call-title span{font-size:12px;color:#a9dfff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #closeCall{border:1px solid #68c8ff;border-radius:13px;background:#10223a;color:#fff;font-weight:800;padding:11px 15px;box-shadow:0 0 14px rgba(0,170,255,.32)}
    #jitsiContainer{flex:1;min-height:0;background:#000;position:relative}
    #jitsiContainer iframe{display:block;width:100%!important;height:100%!important;border:0!important}
    #callStatus{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2;background:rgba(4,13,24,.92);border:1px solid rgba(78,190,255,.45);border-radius:15px;padding:14px 18px;text-align:center;max-width:82%;box-shadow:0 0 25px rgba(0,145,255,.22)}
    #callStatus.hidden{display:none}
  `;
  document.head.append(style);

  overlay = document.createElement('section');
  overlay.id = 'callOverlay';
  overlay.setAttribute('aria-label', 'Videollamada VIVA CUBA');
  overlay.innerHTML = `
    <header class="vc-call-topbar">
      <div class="vc-call-title"><strong>VIVA CUBA · VIDEOLLAMADA</strong><span id="callRoomLabel">Preparando sala…</span></div>
      <button id="closeCall" type="button">CERRAR LLAMADA</button>
    </header>
    <div id="jitsiContainer"><div id="callStatus">Conectando cámara y audio…</div></div>
  `;
  document.body.append(overlay);
  document.getElementById('closeCall').addEventListener('click', closeEmbeddedCall);
  return overlay;
}

function setCallStatus(message, visible = true) {
  const box = document.getElementById('callStatus');
  if (!box) return;
  box.textContent = message;
  box.classList.toggle('hidden', !visible);
}

function loadJitsiApi() {
  if (window.JitsiMeetExternalAPI) return Promise.resolve(window.JitsiMeetExternalAPI);
  if (apiLoader) return apiLoader;
  apiLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = JITSI_API_URL;
    script.async = true;
    script.onload = () => window.JitsiMeetExternalAPI ? resolve(window.JitsiMeetExternalAPI) : reject(new Error('Jitsi API no disponible'));
    script.onerror = () => reject(new Error('No se pudo cargar el motor de videollamada'));
    document.head.append(script);
  });
  return apiLoader;
}

export function closeEmbeddedCall() {
  try { apiInstance?.dispose?.(); } catch {}
  apiInstance = null;
  const container = document.getElementById('jitsiContainer');
  if (container) container.innerHTML = '<div id="callStatus">Llamada cerrada.</div>';
  document.getElementById('callOverlay')?.classList.remove('vc-call-open');
  document.body.style.overflow = '';
}

export async function openEmbeddedCall(room, displayName = 'VIVA CUBA') {
  if (!validRoom(room)) {
    window.alert('La sala de videollamada no es válida. Genera o abre una invitación nueva.');
    return;
  }

  const overlay = ensureCallSurface();
  const container = document.getElementById('jitsiContainer');
  container.innerHTML = '<div id="callStatus">Conectando cámara y audio…</div>';
  document.getElementById('callRoomLabel').textContent = `Sala segura de piloto · ${room}`;
  overlay.classList.add('vc-call-open');
  document.body.style.overflow = 'hidden';

  try {
    const JitsiMeetExternalAPI = await loadJitsiApi();
    if (!overlay.classList.contains('vc-call-open')) return;
    container.innerHTML = '<div id="callStatus">Entrando a la videollamada…</div>';
    apiInstance?.dispose?.();
    apiInstance = new JitsiMeetExternalAPI(JITSI_DOMAIN, {
      roomName: room,
      width: '100%',
      height: '100%',
      parentNode: container,
      lang: 'es',
      userInfo: { displayName },
      configOverwrite: {
        prejoinConfig: { enabled: false },
        disableDeepLinking: true,
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        useHostPageLocalStorage: true
      }
    });
    apiInstance.addListener('videoConferenceJoined', () => setCallStatus('', false));
    apiInstance.addListener('readyToClose', closeEmbeddedCall);
    apiInstance.addListener('cameraError', () => setCallStatus('No se pudo acceder a la cámara. Revisa el permiso de cámara del navegador.'));
  } catch (error) {
    setCallStatus(`No pude cargar la videollamada dentro de VIVA CUBA. Revisa la conexión y vuelve a intentarlo. ${error?.message || ''}`);
  }
}

async function shareAppCall(room) {
  if (!validRoom(room)) return;
  const url = new URL(location.href);
  url.hash = `call=${encodeURIComponent(room)}`;
  const text = 'Únete a mi videollamada dentro de VIVA CUBA.';
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Videollamada VIVA CUBA', text, url: url.toString() });
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    window.alert('Enlace de videollamada VIVA CUBA copiado.');
  } catch {
    window.prompt('Copia este enlace de videollamada:', url.toString());
  }
}

function interceptButton(id, handler) {
  const button = document.getElementById(id);
  if (!button) return;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    handler();
  }, { capture: true });
}

function bindCallInterceptors() {
  interceptButton('joinCall', () => {
    const profile = safeJson(PROFILE_KEY);
    openEmbeddedCall(profile?.room, profile?.name || 'Usuario VIVA CUBA');
  });

  interceptButton('openHostRoom', () => {
    const room = document.getElementById('generatedRoom')?.textContent?.trim();
    openEmbeddedCall(room, 'OWNER');
  });

  interceptButton('ownerStartCall', () => {
    const profile = safeJson(OWNER_PERSONAL_KEY);
    openEmbeddedCall(profile?.room, profile?.name || 'OWNER');
  });

  interceptButton('ownerShareCall', () => {
    const profile = safeJson(OWNER_PERSONAL_KEY);
    shareAppCall(profile?.room);
  });
}

function handleIncomingCallHash() {
  if (!location.hash.toLowerCase().startsWith('#call=')) return;
  let room = '';
  try { room = decodeURIComponent(location.hash.slice(6)); } catch { room = location.hash.slice(6); }
  if (!validRoom(room)) return;
  history.replaceState(null, '', `${location.pathname}${location.search}`);
  queueMicrotask(() => openEmbeddedCall(room, 'Invitado VIVA CUBA'));
}

bindCallInterceptors();
handleIncomingCallHash();
