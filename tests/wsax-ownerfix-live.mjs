import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const URL='https://axielcasas1-cmyk.github.io/viva-cuba-cuba-pilot/work-search-ownerfix-preview/';
const pageErrors=[];
const consoleErrors=[];
const failed=[];
let browser;

function assert(ok,msg,detail){
  if(!ok) throw new Error(msg+(detail?` · ${JSON.stringify(detail)}`:''));
}

try{
  browser=await puppeteer.launch({
    args:chromium.args,
    defaultViewport:{width:1280,height:900},
    executablePath:await chromium.executablePath(),
    headless:'shell'
  });
  const page=await browser.newPage();
  page.on('pageerror',e=>pageErrors.push(String(e?.message||e)));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
  page.on('requestfailed',r=>failed.push({url:r.url(),error:r.failure()?.errorText||''}));

  const response=await page.goto(URL,{waitUntil:'domcontentloaded',timeout:20000});
  assert(response?.ok(),'LIVE_HTTP_NOT_OK',{status:response?.status()});

  try{
    await page.waitForFunction(
      ()=>window.__WS_OWNER_RELEASE_MANAGER_V2__===true&&window.__WS_PERSISTENT_SESSION_V1__===true,
      {timeout:15000}
    );
  }catch{}

  const first=await page.evaluate(async()=>{
    const swActive=await Promise.race([
      navigator.serviceWorker?.ready.then(r=>!!r.active).catch(()=>false),
      new Promise(resolve=>setTimeout(()=>resolve(false),7000))
    ]);
    return {
      title:document.title,
      bodyLen:(document.body?.innerText||'').length,
      ownerV2:window.__WS_OWNER_RELEASE_MANAGER_V2__===true,
      persistent:window.__WS_PERSISTENT_SESSION_V1__===true,
      swActive,
      controller:!!navigator.serviceWorker?.controller,
      updateVisible:!![...document.querySelectorAll('button')].find(b=>/actualizar app/i.test(b.textContent||'')),
      userShell:document.body?.classList.contains('wsax-user-shell')||false,
      hasLoader:[...document.scripts].some(s=>String(s.src).includes('/loader.js'))
    };
  });

  await page.reload({waitUntil:'domcontentloaded',timeout:20000});
  await new Promise(r=>setTimeout(r,2500));
  const after=await page.evaluate(()=>({
    ownerV2:window.__WS_OWNER_RELEASE_MANAGER_V2__===true,
    persistent:window.__WS_PERSISTENT_SESSION_V1__===true,
    controller:!!navigator.serviceWorker?.controller,
    bodyLen:(document.body?.innerText||'').length,
    title:document.title
  }));

  await page.setOfflineMode(true);
  let offlineNav=true;
  try{await page.reload({waitUntil:'domcontentloaded',timeout:12000})}catch{offlineNav=false}
  await new Promise(r=>setTimeout(r,1500));
  const offline=await page.evaluate(()=>({
    ownerV2:window.__WS_OWNER_RELEASE_MANAGER_V2__===true,
    persistent:window.__WS_PERSISTENT_SESSION_V1__===true,
    controller:!!navigator.serviceWorker?.controller,
    bodyLen:(document.body?.innerText||'').length,
    title:document.title
  })).catch(()=>({ownerV2:false,persistent:false,controller:false,bodyLen:0,title:''}));

  const badScope=pageErrors.filter(e=>/loadOwner is not defined|wsLoadOwnerReleaseBase/i.test(e));
  const result={first,after,offlineNav,offline,pageErrors,consoleErrors,failed,badScope};
  console.log('WSAX_OWNERFIX_LIVE_GATE '+JSON.stringify(result));

  assert(first.ownerV2,'OWNER_V2_NOT_ACTIVE',result);
  assert(first.persistent,'PERSISTENT_SESSION_NOT_ACTIVE',result);
  assert(first.swActive,'SERVICE_WORKER_NOT_ACTIVE',result);
  assert(after.controller,'SERVICE_WORKER_NOT_CONTROLLING_AFTER_RELOAD',result);
  assert(first.updateVisible,'UPDATE_BUTTON_NOT_VISIBLE',result);
  assert(badScope.length===0,'OWNER_PRIVATE_SCOPE_REGRESSION',result);
  assert(offline.controller,'OFFLINE_SERVICE_WORKER_NOT_CONTROLLING',result);
  assert(offline.bodyLen>500,'OFFLINE_SHELL_EMPTY',result);
  assert(offline.ownerV2,'OWNER_V2_MISSING_OFFLINE',result);
  assert(offline.persistent,'PERSISTENT_SESSION_MISSING_OFFLINE',result);
  console.log('WSAX OWNERFIX LIVE: PASS');
} finally {
  if(browser) await browser.close();
}
