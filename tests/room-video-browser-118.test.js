'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawn}=require('node:child_process');
const chrome=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium'].filter(Boolean).find(fs.existsSync);
async function render(viewport){
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'sf118-iframe-'));
 const file='file://'+path.join(__dirname,'fixtures/room-video-118.html');
 const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--disable-extensions','--disable-background-networking','--allow-file-access-from-files',
  '--no-first-run','--user-data-dir='+profile,'--window-size='+viewport,'--virtual-time-budget=2100','--dump-dom',file];
 try{
   return await new Promise((resolve,reject)=>{
    const child=spawn(chrome,args,{stdio:['ignore','pipe','pipe']});
    let out='',err='',settled=false;
    const finish=(e,result)=>{if(settled)return;settled=true;clearTimeout(timer);e?reject(e):resolve(result)};
    const timer=setTimeout(()=>{child.kill('SIGKILL');finish(new Error('Chromium timeout: '+err.slice(-400)));},20000);
    child.stdout.on('data',data=>out+=data.toString());
    child.stderr.on('data',data=>err+=data.toString());
    child.on('error',error=>finish(error));
    child.on('close',code=>code===0?finish(null,out):finish(new Error('Chromium exit '+code+': '+err.slice(-500))));
   });
 }finally{fs.rmSync(profile,{recursive:true,force:true})}
}
test('YouTube fills video frame and volume remains visible under it on desktop and mobile',{
 skip:chrome||process.env.CI==='true'?false:'Chromium unavailable'
},async()=>{
 assert.ok(chrome,'Chromium required in CI');
 for(const viewport of ['1792,900','1440,900','390,844']){
  let error=null;
  for(let attempt=0;attempt<2;attempt++){
   try{
    const html=await render(viewport);
    const state=html.match(/data-sf118-test="([^"]+)"/)?.[1];
    const details=html.match(/<output[^>]*id="sf118Metrics"[^>]*>([^<]+)<\/output>/)?.[1]||html.slice(-1100);
    assert.equal(state,'ok',viewport+': '+details);
    error=null;break;
   }catch(e){error=e;if(!/Chromium timeout|Chromium exit/.test(String(e.message)))break}
  }
  if(error)throw error;
 }
});
