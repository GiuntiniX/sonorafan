'use strict';
const { test }=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const os=require('node:os');
const { spawn }=require('node:child_process');
const binaries=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
const chrome=binaries.find(bin=>fs.existsSync(bin));

async function runChrome(){
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'sf81-chrome-'));
 const file='file://'+path.join(__dirname,'fixtures/quick-add-81.html');
 const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-extensions','--disable-sync','--no-first-run','--no-default-browser-check','--disable-background-networking','--allow-file-access-from-files','--user-data-dir='+profile,'--virtual-time-budget=4000','--dump-dom',file];
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
