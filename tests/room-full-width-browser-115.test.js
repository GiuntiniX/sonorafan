'use strict';
const { test }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawn}=require('node:child_process');
const chrome=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium'].filter(Boolean).find(fs.existsSync);

async function render(viewport){
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'sf115-room-'));
  const file='file://'+path.join(__dirname,'fixtures/room-full-width-115.html');
  const args=[
    '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--disable-extensions','--disable-background-networking',
    '--allow-file-access-from-files','--no-first-run','--no-default-browser-check',
    '--user-data-dir='+profile,'--window-size='+viewport,
    '--virtual-time-budget=2500','--dump-dom',file
  ];
  try{
    return await new Promise((resolve,reject)=>{
      const process=spawn(chrome,args,{stdio:['ignore','pipe','pipe']});
      let out='',err='',done=false;
      const stop=(error,value)=>{
        if(done)return;done=true;clearTimeout(timer);
        error?reject(error):resolve(value);
      };
      const timer=setTimeout(()=>{
        process.kill('SIGKILL');
        stop(new Error('Chromium timeout: '+err.slice(-400)));
      },18000);
      process.stdout.on('data',data=>{out+=data.toString()});
      process.stderr.on('data',data=>{err+=data.toString()});
      process.on('error',stop);
      process.on('close',code=>code===0?stop(null,out):stop(new Error('Chromium exit '+code+': '+err.slice(-400))));
    });
  } finally{fs.rmSync(profile,{recursive:true,force:true});}
}

test('full-width room uses entire viewport with old sidebar collapsed and footer helper loaded (Chromium)',{
 skip:chrome||process.env.CI==='true'?false:'Chromium unavailable'
},async()=>{
 assert.ok(chrome,'Chromium required in CI');
 for(const viewport of ['1792,900','1440,900']){
   let error;
   for(let attempt=0;attempt<2;attempt++){
     try {
       const html=await render(viewport);
       const result=html.match(/data-sf115-test="([^"]+)"/)?.[1];
       const metrics=html.match(/<output[^>]*id="metrics"[^>]*>([^<]+)<\/output>/)?.[1];
       assert.equal(result,'ok','viewport='+viewport+' '+(metrics||html.slice(-1800)));
       error=null;break;
     }catch(e){error=e;if(!/Chromium timeout|Chromium exit/.test(String(e?.message)))break;}
   }
   if(error)throw error;
 }
});
