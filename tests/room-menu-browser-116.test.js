'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const chrome=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium'].filter(Boolean).find(fs.existsSync);

test('three-dot menu opens, closes and displays upcoming music and artist in Chromium',{
 skip:chrome||process.env.CI==='true'?false:'Chromium not installed'
},async()=>{
 assert.ok(chrome,'Chromium required in CI');
 let error;
 for(let attempt=0;attempt<2;attempt++){
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'sf116-browser-'));
  const file='file://'+path.join(__dirname,'fixtures/room-menu-116.html');
  const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--disable-extensions','--disable-background-networking','--allow-file-access-from-files',
    '--no-first-run','--user-data-dir='+profile,'--virtual-time-budget=1000','--dump-dom',file];
  try{
   const result=await new Promise((resolve,reject)=>{
    const child=spawn(chrome,args,{stdio:['ignore','pipe','pipe']});
    let out='',err='',settled=false;
    const finish=(e,r)=>{
     if(settled)return;settled=true;clearTimeout(timer);
     e?reject(e):resolve(r);
    };
    const timer=setTimeout(()=>{
     child.kill('SIGKILL');finish(new Error('Chromium timeout: '+err.slice(-300)));
    },14000);
    child.stdout.on('data',chunk=>out+=chunk.toString());
    child.stderr.on('data',chunk=>err+=chunk.toString());
    child.on('error',e=>finish(e));
    child.on('close',code=>code===0?finish(null,out):finish(new Error('Chromium exited '+code+': '+err.slice(-300))));
   });
   const state=result.match(/data-sf116-test="([^"]+)"/)?.[1];
   assert.equal(state,'ok',result.slice(-1300));
   error=null;break;
  }catch(e){error=e;if(!/Chromium timeout|Chromium exited/.test(String(e?.message)))break;}
  finally{fs.rmSync(profile,{recursive:true,force:true});}
 }
 if(error)throw error;
});
