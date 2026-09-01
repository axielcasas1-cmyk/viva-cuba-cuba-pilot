const CACHE='wsax-pages-ownerfix-shell-v1';
const RUNTIME='wsax-pages-ownerfix-v1';
const SHELL=['./','./index.html','./loader.js','./owner-v2.js','./session-persistence.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(SHELL);await self.skipWaiting()})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{const ks=await caches.keys();await Promise.all(ks.filter(k=>k.startsWith('wsax-pages-ownerfix-shell-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim()})()));
self.addEventListener('message',e=>{if(e.data?.type==='WSAX_CHECK_UPDATE')e.waitUntil((async()=>{const c=await caches.open(CACHE);for(const u of SHELL){try{const r=await fetch(u,{cache:'no-store'});if(r.ok)await c.put(u,r.clone())}catch{}}})())});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==self.location.origin)return;if(r.mode==='navigate'){e.respondWith(fetch(r).then(async x=>{if(x.ok){const c=await caches.open(CACHE);await c.put('./index.html',x.clone())}return x}).catch(async()=>await caches.match('./index.html')||await caches.match('./')));return}e.respondWith(caches.match(r).then(x=>x||fetch(r)))});
