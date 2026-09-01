import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const URL='https://axielcasas1-cmyk.github.io/viva-cuba-cuba-pilot/work-search-ownerfix-preview/';
const pageErrors=[], consoleErrors=[], failed=[];
let browser, exitCode=1;
const phase=(name,data={})=>console.log(`WSAX_PHASE ${name} ${JSON.stringify(data)}`);
const assert=(ok,msg,detail)=>{if(!ok)throw new Error(msg+(detail?` · ${JSON.stringify(detail)}`:''))};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

try {
  phase('launch');
  browser=await puppeteer.launch({args:chromium.args,defaultViewport:{width:1280,height:900},executablePath:await chromium.executablePath(),headless:'shell'});
  const page=await browser.newPage();
  page.on('pageerror',e=>pageErrors.push(String(e?.message||e)));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
  page.on('requestfailed',r=>failed.push({url:r.url(),error:r.failure()?.errorText||''}));

  phase('online-nav');
  const response=await page.goto(URL,{waitUntil:'domcontentloaded',timeout:12000});
  assert(response?.ok(),'LIVE_HTTP_NOT_OK',{status:response?.status()});
  try{await page.waitForFunction(()=>window.__WS_OWNER_RELEASE_MANAGER_V2__===true&&window.__WS_PERSISTENT_SESSION_V1__===true,{timeout:10000})}catch{}

  phase('first-state');
  const first=await page.evaluate(async()=>{
    const swActive=await Promise.race([
      navigator.serviceWorker?.ready.then(r=>!!r.active).catch(()=>false),
      new Promise(resolve=>setTimeout(()=>resolve(false),5000))
    ]);
    return {title:document.title,bodyLen:(document.body?.innerText||'').length,ownerV2:window.__WS_OWNER_RELEASE_MANAGER_V2__===true,persistent:window.__WS_PERSISTENT_SESSION_V1__===true,swActive,controller:!!navigator.serviceWorker?.controller,updateVisible:!![...document.querySelectorAll('button')].find(b=>/actualizar app/i.test(b.textContent||'')),userShell:document.body?.classList.contains('wsax-user-shell')||false,hasLoader:[...document.scripts].some(s=>String(s.src).includes('/loader.js'))};
  });
  phase('first-result',first);

  phase('controlled-reload');
  await page.reload({waitUntil:'domcontentloaded',timeout:12000}).catch(e=>phase('reload-error',{message:String(e?.message||e)}));
  await sleep(1500);
  const after=await page.evaluate(()=>({ownerV2:window.__WS_OWNER_RELEASE_MANAGER_V2__===true,persistent:window.__WS_PERSISTENT_SESSION_V1__===true,controller:!!navigator.serviceWorker?.controller,bodyLen:(document.body?.innerText||'').length,title:document.title}));
  phase('after-result',after);

  phase('offline');
  await page.setOfflineMode(true);
  let offlineNav=true;
  try{await page.reload({waitUntil:'domcontentloaded',timeout:8000})}catch{offlineNav=false}
  await sleep(1000);
  const offline=await page.evaluate(()=>({ownerV2:window.__WS_OWNER_RELEASE_MANAGER_V2__===true,persistent:window.__WS_PERSISTENT_SESSION_V1__===true,controller:!!navigator.serviceWorker?.controller,bodyLen:(document.body?.innerText||'').length,title:document.title})).catch(()=>({ownerV2:false,persistent:false,controller:false,bodyLen:0,title:''}));
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
  exitCode=0;
} catch (error) {
  console.error('WSAX OWNERFIX LIVE: FAIL',String(error?.stack||error));
} finally {
  phase('close');
  if(browser) await Promise.race([browser.close().catch(()=>{}),sleep(4000)]);
  process.exit(exitCode);
}
