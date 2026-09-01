/* WORK-SEARCH OWNER RELEASE MANAGER v2 SELF-CONTAINED */
(()=>{'use strict';
if(window.__WS_OWNER_RELEASE_MANAGER_V2__)return;
window.__WS_OWNER_RELEASE_MANAGER_V2__=true;
const PROJECT='https://btdekoigcfpsqteqhcnp.supabase.co';
const KEY='sb_publishable_PSSBCNRVxvSEYDFsD7gvYQ_HckmemB8';
const $=id=>document.getElementById(id);
function session(){try{return JSON.parse(localStorage.getItem('ws_session')||'null')}catch{return null}}
function toast(message){const el=$('toast');if(!el)return;el.textContent=String(message||'');el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3200)}
async function authedFetch(path,opt={}){
  let current=session();
  if(!current?.access_token)throw new Error('OWNER_SESSION_REQUIRED');
  const run=token=>fetch(PROJECT+path,{...opt,headers:{apikey:KEY,Authorization:'Bearer '+token,...(opt.headers||{}),...(opt.body?{'Content-Type':'application/json'}:{})},cache:'no-store'});
  let response=await run(current.access_token);
  if(response.status===401&&typeof window.__WS_RENEW_SESSION__==='function'){
    try{const fresh=await window.__WS_RENEW_SESSION__();if(fresh?.access_token)response=await run(fresh.access_token)}catch{}
  }
  return response;
}
async function json(path,opt={}){
  const response=await authedFetch(path,opt),text=await response.text();
  let data={};try{data=text?JSON.parse(text):{}}catch{data={error:text}}
  if(!response.ok)throw new Error(data?.error||data?.message||('HTTP_'+response.status));
  return data;
}
async function isOwner(){try{return String(await json('/rest/v1/rpc/ws_current_role',{method:'POST',body:'{}'})||'').toLowerCase()==='owner'}catch{return false}}
function releaseLabel(data){const release=data?.release||{};return[release.version||release.key||'sin versión',data?.updateToken?('· '+data.updateToken):''].filter(Boolean).join(' ')}
function ensureUi(){
  const host=$('v-owner');if(!host||$('ownerReleaseManagerPanel'))return;
  const anchor=host.querySelector('.ownerShell')||host.firstElementChild;
  anchor?.insertAdjacentHTML('afterend','<div id="ownerReleaseManagerPanel" class="card" style="margin-top:13px;border-color:#7c5ce0"><div class="section" style="margin:0 0 10px"><div><div class="ey">RELEASE MANAGER · OWNER ONLY</div><h3 style="margin:4px 0">APP MADRE → USER APP</h3></div><span id="ownerReleaseManagerBadge" class="badge gold">COMPROBANDO</span></div><div class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:9px"><div class="card" style="padding:10px"><div class="mut">BETA preparada</div><b id="ownerBetaRelease">—</b></div><div class="card" style="padding:10px"><div class="mut">STABLE en usuarios</div><b id="ownerStableRelease">—</b></div></div><p id="ownerReleaseManagerState" class="mut" style="margin:10px 0">Solo OWNER puede promover BETA a STABLE.</p><div class="actions"><button class="btn gold" id="ownerPublishStable" type="button">Publicar a usuarios</button></div></div>');
}
async function load(){
  if(!(await isOwner()))return;
  ensureUi();
  const badge=$('ownerReleaseManagerBadge'),state=$('ownerReleaseManagerState');
  try{
    const [beta,stable]=await Promise.all([json('/functions/v1/ws-release-manifest?channel=beta'),json('/functions/v1/ws-release-manifest?channel=stable')]);
    if($('ownerBetaRelease'))$('ownerBetaRelease').textContent=releaseLabel(beta);
    if($('ownerStableRelease'))$('ownerStableRelease').textContent=releaseLabel(stable);
    const same=!!beta?.updateToken&&beta.updateToken===stable?.updateToken;
    if(badge){badge.textContent=same?'USUARIOS AL DÍA':'ACTUALIZACIÓN LISTA';badge.classList.toggle('green',same);badge.classList.toggle('gold',!same)}
    if(state)state.textContent=same?'La USER APP ya está en la misma release estable.':'Hay una BETA distinta de STABLE. Puedes publicarla cuando esté validada.';
  }catch(error){if(badge)badge.textContent='NO DISPONIBLE';if(state)state.textContent='Release Manager: '+String(error?.message||error)}
}
async function publish(){
  if(!(await isOwner())){toast('Publicación bloqueada: se requiere OWNER.');return}
  const button=$('ownerPublishStable'),state=$('ownerReleaseManagerState');
  if(!confirm('¿Publicar la release BETA actual a todos los usuarios del canal STABLE?'))return;
  if(button)button.disabled=true;if(state)state.textContent='Publicando release estable…';
  try{
    const result=await json('/functions/v1/ws-admin-action',{method:'POST',body:JSON.stringify({action:'promote_beta_to_stable'})});
    toast('Actualización publicada a usuarios · '+String(result?.release?.version||result?.updateToken||'STABLE'));
    await load();
    if('serviceWorker' in navigator)navigator.serviceWorker.ready.then(reg=>reg.active?.postMessage({type:'WSAX_CHECK_UPDATE'})).catch(()=>{});
  }catch(error){toast('Publicación bloqueada: '+String(error?.message||error));if(state)state.textContent='No se publicó: '+String(error?.message||error)}
  finally{if(button)button.disabled=false}
}
document.addEventListener('click',event=>{
  if(event.target?.closest?.('#ownerPublishStable')){publish();return}
  if(event.target?.closest?.('#ownerNav,[data-v="owner"],#adminMobile,[data-admin-entry]'))setTimeout(load,550);
},true);
function boot(){if(session()?.access_token)setTimeout(load,900)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
