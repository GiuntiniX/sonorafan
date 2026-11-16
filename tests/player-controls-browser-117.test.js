'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const os=require('node:os');
const {spawn}=require('node:child_process');
const chrome=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].filter(Boolean).find(fs.existsSync);

async function run(){
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'sf117-chrome-'));
 const file='file://'+path.join(__dirname,'fixtures/player-controls-117.html');
 const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
   '--disable-extensions','--disable-background-networking','--allow-file-access-from-files',
   '--no-first-run','--user-data-dir='+profile,'--virtual-time-budget=1200',
   '--window-size=1150,800','--dump-dom',file];
 try {
  return await new Promise((resolve,reject)=>{
   const child=spawn(chrome,args,{stdio:['ignore','pipe','pipe']});
   let out='',err='',done=false;
   const finish=(error,result)=>{if(done)return;done=true;clearTimeout(timer);error?reject(error):resolve(result)};
   const timer=setTimeout(()=>{child.kill('SIGKILL');finish(new Error('Chromium timeout: '+err.slice(-300)));},18000);
   child.stdout.on('data',x=>{out+=x.toString()});
   child.stderr.on('data',x=>{err+=x.toString()});
   child.on('error',e=>finish(e));
   child.on('close',code=>code===0?finish(null,out):finish(new Error('Chromium exit '+code+': '+err.slice(-400))));
  });
 }finally{fs.rmSync(profile,{recursive:true,force:true});}
}

test('mute/restore, slider, theme progress, remaining time and expanded video work in Chromium',{
 skip:chrome||process.env.CI==='true'?false:'Chromium unavailable'
},async()=>{
 assert.ok(chrome,'Chromium required in CI');
 let failure=null;
 for(let attempt=0;attempt<2;attempt++){
  try{
   const output=await run();
   const result=output.match(/data-sf117-test="([^"]+)"/)?.[1];
   const detail=output.match(/<output[^>]*data-sf117-test[^>]*>([^<]+)<\/output>/)?.[1];
   assert.equal(result,'ok', detail||output.slice(-1200));
   failure=null;break;
  }catch(error){failure=error;if(!/Chromium timeout|Chromium exit/.test(String(error?.message)))break;}
 }
 if(failure)throw failure;
});
