'use strict';
const { test }=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const os=require('node:os');
const { spawn }=require('node:child_process');
const binaries=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
const chrome=binaries.find(bin=>fs.existsSync(bin));

async function runChrome(fixture='quick-add-81.html',viewport=null){
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'sf81-chrome-'));
 const file='file://'+path.join(__dirname,'fixtures',fixture);
 const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-extensions','--disable-sync','--no-first-run','--no-default-browser-check','--disable-background-networking','--allow-file-access-from-files','--user-data-dir='+profile,'--virtual-time-budget=4000',...(viewport?['--window-size='+viewport]:[]),'--dump-dom',file];
 try{
  return await new Promise((resolve,reject)=>{
    const child=spawn(chrome,args,{stdio:['ignore','pipe','pipe']});
    let out='',err='',settled=false;
    const finish=(failure,result)=>{
      if(settled)return;settled=true;clearTimeout(timer);
      if(failure)reject(failure);else resolve(result);
    };
    const timer=setTimeout(()=>{
      child.kill('SIGKILL');
      finish(new Error('Chrome test timeout: '+err.slice(-350)));
    },12000);
    child.stdout.on('data',data=>{out+=data.toString();});
    child.stderr.on('data',data=>{err+=data.toString();});
    child.on('error',e=>finish(e));
    child.on('close',code=>code===0?finish(null,out):finish(new Error('Chrome exit '+code+': '+err.slice(-400))));
  });
 }finally{fs.rmSync(profile,{recursive:true,force:true});}
}

test('desktop quick search confirms in place and full search stays separate (Chromium)',{
 skip:chrome||process.env.CI==='true'?false:'Chrome/Chromium not installed'
},async()=>{
 assert.ok(chrome,'Chrome/Chromium required in CI');
 let lastError=null;
 for(let attempt=0;attempt<2;attempt++){
   try{
     const output=await runChrome();
     const match=output.match(/data-sf81-test="([^"]+)"/);
     assert.equal(match?.[1],'ok',output.slice(-1500));
     return;
   }catch(error){
     lastError=error;
     if(!/Chrome test timeout|Chrome exit/.test(String(error?.message)))break;
   }
 }
 throw lastError;
});

test('mobile music search adds to queue without favoriting (Chromium)',{
 skip:chrome||process.env.CI==='true'?false:'Chrome/Chromium not installed'
},async()=>{
 assert.ok(chrome,'Chrome/Chromium required in CI');
 let lastError=null;
 for(let attempt=0;attempt<2;attempt++){
   try{
     const output=await runChrome('mobile-add-84.html');
     const match=output.match(/data-sf84-test="([^"]+)"/);
     assert.equal(match?.[1],'ok',output.slice(-1500));
     return;
   }catch(error){
     lastError=error;
     if(!/Chrome test timeout|Chrome exit/.test(String(error?.message)))break;
   }
 }
 throw lastError;
});

test('discovery panel chooses music for queue and keeps favorite separate (Chromium)',{
  skip:chrome||process.env.CI==='true'?false:'Chrome/Chromium not installed'
},async()=>{
 assert.ok(chrome,'Chrome/Chromium required in CI');
 let lastError=null;
 for(let attempt=0;attempt<2;attempt++){
   try{
     const output=await runChrome('discovery-queue-87.html');
     const match=output.match(/data-sf87-test="([^"]+)"/);
     assert.equal(match?.[1],'ok',output.slice(-2400));
     return;
   }catch(error){
     lastError=error;
     if(!/Chrome test timeout|Chrome exit/.test(String(error?.message)))break;
   }
 }
 throw lastError;
});

test('room themes work on creation, shared room updates and personal overrides (Chromium)',{
 skip:chrome||process.env.CI==='true'?false:'Chrome/Chromium not installed'
},async()=>{
 assert.ok(chrome,'Chrome/Chromium required in CI');
 let lastError=null;
 for(let attempt=0;attempt<2;attempt++){
   try{
     const output=await runChrome('theme-picker-88.html');
     const match=output.match(/data-sf88-test="([^"]+)"/);
     assert.equal(match?.[1],'ok',output.slice(-2200));
     return;
   }catch(error){
     lastError=error;
     if(!/Chrome test timeout|Chrome exit/.test(String(error?.message)))break;
   }
 }
 throw lastError;
});

test('Convidar amigos matches menu sizing, order and click action (Chromium)',{
 skip:chrome||process.env.CI==='true'?false:'Chrome/Chromium not installed'
},async()=>{
 assert.ok(chrome,'Chrome/Chromium required in CI');
 let lastError=null;
 for(let attempt=0;attempt<2;attempt++){
  try{
   const output=await runChrome('menu-align-89.html');
   const match=output.match(/data-sf89-test="([^"]+)"/);
   assert.equal(match?.[1],'ok',output.slice(-1800));
   return;
  }catch(error){
   lastError=error;
   if(!/Chrome test timeout|Chrome exit/.test(String(error?.message)))break;
  }
 }
 throw lastError;
});

test('room sidebar has no scroll and all 13 actions are visible at desktop heights (Chromium)',{
 skip:chrome||process.env.CI==='true'?false:'Chrome/Chromium not installed'
},async()=>{
 assert.ok(chrome,'Chrome/Chromium required in CI');
 for(const viewport of ['1440,860','1440,700','1440,610']){
  let lastError=null;
  for(let attempt=0;attempt<2;attempt++){
   try{
    const output=await runChrome('sidebar-no-scroll-90.html',viewport);
    const match=output.match(/data-sf90-test="([^"]+)"/);
    assert.equal(match?.[1],'ok',viewport+' '+output.slice(-2300));
    lastError=null;
    break;
   }catch(error){
    lastError=error;
    if(!/Chrome test timeout|Chrome exit/.test(String(error?.message)))break;
   }
  }
  if(lastError)throw lastError;
 }
});

test('room and player fit notebooks, widescreens and tablet widths without horizontal expansion (Chromium)',{
 skip:chrome||process.env.CI==='true'?false:'Chrome/Chromium not installed'
},async()=>{
 assert.ok(chrome,'Chrome/Chromium required in CI');
 for(const viewport of ['1920,1080','1440,900','1366,768','1280,720','1100,700','1024,768','800,900','390,844']){
  let lastError=null;
  for(let attempt=0;attempt<2;attempt++){
   try{
    const output=await runChrome('responsive-room-91.html',viewport);
    const match=output.match(/data-sf91-test="([^"]+)"/);
    assert.equal(match?.[1],'ok',viewport+' '+output.slice(-2300));
    lastError=null;break;
   }catch(error){
    lastError=error;
    if(!/Chrome test timeout|Chrome exit/.test(String(error?.message)))break;
   }
  }
  if(lastError)throw lastError;
 }
});
