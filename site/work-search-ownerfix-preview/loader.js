(()=>{'use strict';
const SOURCE='https://btdekoigcfpsqteqhcnp.supabase.co/functions/v1/work-search-app/app.js?releaseId=638e72fd-f116-449f-88e4-a647379bceb4';
const CACHE='wsax-pages-ownerfix-v1';
const APP_KEY='./__wsax_patched_app__';
const V1='/* WORK-SEARCH OWNER RELEASE MANAGER v1 */';
const USER='/* WORK-SEARCH USER APP FIREWALL v1 */';
async function textLocal(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(url+':'+r.status);return r.text()}
function patchPaths(code){
 const root='/viva-cuba-cuba-pilot/work-search-ownerfix-preview/';
 return String(code)
  .replaceAll("const swUrl='/sw.js'",`const swUrl='${root}sw.js'`)
  .replaceAll("navigator.serviceWorker.register('/sw.js',{scope:'/'})",`navigator.serviceWorker.register('${root}sw.js',{scope:'${root}'})`)
  .replaceAll("const MAN='/manifest.webmanifest'",`const MAN='${root}manifest.webmanifest'`)
  .replaceAll("fetch('/sw.js',{method:'HEAD',cache:'no-store'})",`fetch('${root}sw.js',{method:'HEAD',cache:'no-store'})`);
}
async function build(){
 const [app,owner]=await Promise.all([fetch(SOURCE,{cache:'no-store'}).then(async r=>{if(!r.ok)throw new Error('APP_'+r.status);return r.text()}),textLocal('./owner-v2.js')]);
 let out=String(app),a=out.indexOf(V1),b=out.indexOf(USER,a);
 if(a>=0&&b>a)out=out.slice(0,a)+owner+'\n'+out.slice(b);
 else if(!out.includes('__WS_OWNER_RELEASE_MANAGER_V2__'))out+='\n'+owner+'\n';
 out=patchPaths(out);
 if(out.includes('wsLoadOwnerReleaseBase=loadOwner'))throw new Error('OWNER_V1_SCOPE_REMAINS');
 if(!out.includes('__WS_OWNER_RELEASE_MANAGER_V2__'))throw new Error('OWNER_V2_MISSING');
 new Function(out);
 const c=await caches.open(CACHE);
 await c.put(APP_KEY,new Response(out,{headers:{'Content-Type':'application/javascript'}}));
 return out;
}
async function cached(){const c=await caches.open(CACHE),r=await c.match(APP_KEY);return r?await r.text():''}
async function run(){
 let code='';try{code=await build()}catch(e){code=await cached();if(!code)throw e}
 const s=document.createElement('script');s.textContent=code;document.head.appendChild(s);s.remove();
 if(!window.__WS_PERSISTENT_SESSION_V1__){const p=document.createElement('script');p.src='./session-persistence.js';p.defer=true;document.head.appendChild(p)}
 if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});
}
run().catch(e=>{console.error('WSAX_PAGES_BOOT',e);const x=document.getElementById('bootState');if(x)x.textContent='Error de arranque: '+String(e?.message||e)});
})();
