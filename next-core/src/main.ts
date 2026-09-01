import './styles/base.css';
import {resolveEntryMode} from './entry-mode.js';
import {activateUser,currentSession,logoutUser,recoverUser} from './identity/client.js';
import type {SessionResponse} from './identity/types.js';

const root=document.querySelector<HTMLDivElement>('#app');
if(!root)throw new Error('APP_ROOT_MISSING');

const esc=(value:unknown)=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]||char));
const errorCode=(error:unknown)=>error instanceof Error?error.message:'REQUEST_FAILED';

function userSignedOut(message='Activa tu identidad DX o recupera una existente.'){
  root!.innerHTML=`<main class="vc-shell" data-entry-mode="USER"><section class="vc-card vc-stack">
    <div class="vc-tag">VIVA CUBA · USER</div><h1>VIVA CUBA</h1><p>${esc(message)}</p>
    <form id="activate" class="vc-form"><h2>Activar identidad</h2><label>Código de activación<input name="code" autocomplete="one-time-code" required></label><label>Nombre de este dispositivo<input name="label" maxlength="120" required></label><button>ACTIVAR</button></form>
    <form id="recover" class="vc-form"><h2>Recuperar identidad</h2><label>ID DESAPLICAXI<input name="dx" placeholder="DX-XXXXXXXX" required></label><label>Código VCR<input name="recovery" required></label><button>RECUPERAR</button></form>
    <output id="notice" class="vc-notice" aria-live="polite"></output>
  </section></main>`;
  const notice=root!.querySelector<HTMLOutputElement>('#notice')!;
  root!.querySelector<HTMLFormElement>('#activate')!.addEventListener('submit',async event=>{
    event.preventDefault();notice.textContent='Activando…';
    const form=event.currentTarget as HTMLFormElement;
    const data=new FormData(form);
    try{const result=await activateUser(String(data.get('code')||''),String(data.get('label')||''));notice.textContent=`Identidad ${result.identity.dx} activada. Guarda ahora tu VCR: ${result.recoveryCode}`;setTimeout(()=>void renderUser(),0);}
    catch(error){notice.textContent=`No se pudo activar: ${errorCode(error)}`;}
  });
  root!.querySelector<HTMLFormElement>('#recover')!.addEventListener('submit',async event=>{
    event.preventDefault();notice.textContent='Recuperando…';
    const form=event.currentTarget as HTMLFormElement;
    const data=new FormData(form);
    try{const result=await recoverUser(String(data.get('dx')||''),String(data.get('recovery')||''));notice.textContent=`Identidad ${result.identity.dx} recuperada. Nuevo VCR: ${result.recoveryCode}`;setTimeout(()=>void renderUser(),0);}
    catch(error){notice.textContent=`No se pudo recuperar: ${errorCode(error)}`;}
  });
}

function userSignedIn(session:SessionResponse){
  root!.innerHTML=`<main class="vc-shell" data-entry-mode="USER"><section class="vc-card vc-stack">
    <div class="vc-tag">VIVA CUBA · USER</div><h1>${esc(session.identity.dx)}</h1><p>${esc(session.identity.label)}</p>
    <div class="vc-grid"><div><span>Dispositivo</span><strong>${esc(session.device.label)}</strong></div><div><span>Seguridad</span><strong>AAL${session.aal}</strong></div></div>
    <div class="vc-actions"><button id="security">DISPOSITIVOS Y SESIONES</button><button id="logout" class="vc-secondary">CERRAR SESIÓN</button></div>
    <output id="notice" class="vc-notice" aria-live="polite"></output>
  </section></main>`;
  const notice=root!.querySelector<HTMLOutputElement>('#notice')!;
  root!.querySelector<HTMLButtonElement>('#security')!.addEventListener('click',async()=>{
    notice.textContent='Consultando seguridad…';
    try{const response=await fetch('/api/security/list');const data=await response.json();if(!response.ok)throw new Error(String(data?.error||'REQUEST_FAILED'));notice.textContent=`${data.devices.length} dispositivo(s) · ${data.sessions.length} sesión(es) activas.`;}
    catch(error){notice.textContent=`Seguridad: ${errorCode(error)}`;}
  });
  root!.querySelector<HTMLButtonElement>('#logout')!.addEventListener('click',async()=>{try{await logoutUser();userSignedOut('Sesión cerrada de forma segura.');}catch(error){notice.textContent=`No se pudo cerrar: ${errorCode(error)}`;}});
}

async function renderUser(){
  try{userSignedIn(await currentSession());}
  catch{userSignedOut();}
}

async function renderOwner(){
  root!.innerHTML=`<main class="vc-shell vc-owner" data-entry-mode="OWNER"><section class="vc-card vc-stack"><div class="vc-tag">DESAPLICAXI · OWNER COMMAND CENTER</div><h1>OWNER</h1><p id="owner-status">Verificando sesión, dispositivo, Passkey y AAL2…</p><div id="owner-body"></div><a class="vc-link" href="/">Volver a VIVA CUBA USER</a></section></main>`;
  const status=root!.querySelector<HTMLParagraphElement>('#owner-status')!;
  const body=root!.querySelector<HTMLDivElement>('#owner-body')!;
  try{
    const response=await fetch('/api/owner/me');const data=await response.json();if(!response.ok)throw new Error(String(data?.error||'OWNER_FORBIDDEN'));
    status.textContent='OWNER verificado por servidor.';
    body.innerHTML=`<div class="vc-grid"><div><span>Identidad</span><strong>${esc(data.identity.dx)}</strong></div><div><span>Dispositivo</span><strong>${esc(data.device.label)}</strong></div><div><span>Nivel</span><strong>AAL${esc(data.aal)}</strong></div><div><span>Policy</span><strong>${esc(data.ownerPolicyId)}</strong></div></div><div class="vc-actions"><button id="owner-security">CONTROL DE DISPOSITIVOS</button></div><output id="owner-notice" class="vc-notice" aria-live="polite"></output>`;
    body.querySelector<HTMLButtonElement>('#owner-security')!.addEventListener('click',async()=>{
      const out=body.querySelector<HTMLOutputElement>('#owner-notice')!;out.textContent='Consultando…';
      try{const r=await fetch('/api/security/list');const payload=await r.json();if(!r.ok)throw new Error(String(payload?.error||'REQUEST_FAILED'));out.textContent=`${payload.devices.length} dispositivo(s) · ${payload.sessions.length} sesión(es).`;}
      catch(error){out.textContent=`Control: ${errorCode(error)}`;}
    });
  }catch(error){
    const code=errorCode(error);status.textContent=code==='OWNER_AAL2_REQUIRED'?'OWNER bloqueado: se requiere verificación Passkey/AAL2.':'OWNER bloqueado: sesión administrativa no autorizada.';
    body.innerHTML=`<div class="vc-lock">${esc(code)}</div>`;
  }
}

const mode=resolveEntryMode(location.href);
if(mode==='OWNER')void renderOwner();else void renderUser();
