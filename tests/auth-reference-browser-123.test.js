'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawn}=require('node:child_process');

const chrome=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].filter(Boolean).find(fs.existsSync);
const root=path.resolve(__dirname,'../public');

function makeFixture(){
 const full=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const css=full.match(/<style>[\s\S]*?<\/style>/)?.[0];
 assert.ok(css,'original inline CSS missing');
 const links=Array.from(full.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g),m=>m[0].replace(/href="\//g,'href="./'));
 const start=full.indexOf('<!-- ===== SONORAFAN 123 • LOGIN');
 const end=full.indexOf('<!-- ===== SONORAFAN 12 ADMIN CONTROL CENTER',start);
 assert.ok(start>=0 && end>start,'auth DOM missing');
 const dom=full.slice(start,end).replace(/src="\//g,'src="./');
 const script=String.raw`
<script>
window.doLogin=()=>{};
window.submitSignup=()=>{};
window.showLogin=()=>{};
window.openSignup=()=>{};
window.openLegal=()=>{};
window.closeSignup=()=>{};
window.sf123ResetPassword=()=>{};
window.sf123GoLogin=()=>{};
window.sf123BackHome=()=>{};
window.sf123TogglePassword=(id,btn)=>{const input=document.getElementById(id);input.type=input.type==='password'?'text':'password';btn.setAttribute('aria-pressed',input.type==='text'?'true':'false');};
window.toggleChip=button=>{const v=button.classList.toggle('selected');button.setAttribute('aria-pressed',String(v));};
window.addEventListener('load',()=>{
setTimeout(()=>{
 const $=id=>document.getElementById(id);
 const box=el=>el.getBoundingClientRect();
 const login=$('loginScreen'), signup=$('signupModal');
 const form=document.querySelector('.sf123-login-form');
 const photo=document.querySelector('.sf123-login-art');
 const a=box(form),b=box(photo);
 login.classList.add('active');
 const af=box(form),bf=box(photo);
 const loginCta=box($('loginBtn'));
 const image=photo.querySelector('img');
 const lr={
  visible:getComputedStyle(login).display==='flex',
  form:[af.x,af.y,af.width,af.height],
  art:[bf.x,bf.y,bf.width,bf.height],
  photoLoaded:image.complete && image.naturalWidth>0,
  button:loginCta.width>140&&loginCta.height>45,
  left:innerWidth<=800 ? af.width>300 : af.right<=bf.x+5,
  background:getComputedStyle(login).backgroundColor,
 };
 document.querySelector('#loginScreen .sf123-eye').click();
 lr.eye=$('loginPassword').type==='text';
 login.classList.remove('active');
 signup.classList.add('active');
 const intro=box(document.querySelector('.sf123-signup-intro'));
 const right=box(document.querySelector('.sf123-signup-form'));
 const btn=box(document.querySelector('.sf123-submit-signup'));
 const shell=box(document.querySelector('.sf123-signup-layout'));
 const firstChip=$('signupStyles').querySelector('.chip');firstChip.click();
 const sd={
   visible:['flex','block'].includes(getComputedStyle(signup).display),
   intro:[intro.x,intro.width,intro.height],
   form:[right.x,right.width,right.height],
   shell:[shell.x,shell.width,shell.height],
   submit:[btn.x,btn.width,btn.height],
   fields:['signupNome','signupUsername','signupEmail','signupPassword','signupConfirm'].every(id=>$(id)!=null),
   chips:firstChip.getAttribute('aria-pressed')==='true',
   correctOrder:innerWidth<=800 ? intro.y<right.y : intro.right<=right.x+5,
   noHorizontalScroll:document.documentElement.scrollWidth<=innerWidth+5,
   background:getComputedStyle(signup).backgroundColor,
   scrollReachable:innerWidth>800 || (() => {
     const style=getComputedStyle(signup);
     if(!['auto','scroll'].includes(style.overflowY))return false;
     const previous=signup.scrollTop;
     signup.scrollTop=signup.scrollHeight;
     const reachable=signup.scrollHeight<=signup.clientHeight+2 || signup.scrollTop>0;
     signup.scrollTop=previous;
     return reachable;
   })(),
 };
 const result={viewport:innerWidth,login:lr,signup:sd};
 const good=lr.visible&&lr.photoLoaded&&lr.button&&lr.left&&lr.eye
   &&sd.visible&&sd.fields&&sd.chips&&sd.correctOrder
   &&sd.noHorizontalScroll&&sd.scrollReachable&&sd.submit[1]>180&&sd.submit[2]>40
   &&['rgb(13, 9, 18)','rgb(20, 20, 20)'].includes(lr.background)
   &&sd.background.length>0;
 const output=document.createElement('output');
 output.id='sf123AuthMetrics';
 output.dataset.sf123Auth=good?'ok':'fail';
 output.textContent=JSON.stringify(result);
 document.body.append(output);
},160);
});
</script>`;
 return '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+css+links.join('\n')+'</head><body>'+dom+script+'</body></html>';
}

async function run(size){
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'sf123-browser-'));
 const filename='.sf123-fixture-'+process.pid+'.html',fullpath=path.join(root,filename);
 fs.writeFileSync(fullpath,makeFixture());
 const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-extensions',
  '--disable-background-networking','--allow-file-access-from-files','--no-first-run',
  '--user-data-dir='+profile,'--window-size='+size,'--virtual-time-budget=1600','--dump-dom','file://'+fullpath];
 try{
  return await new Promise((resolve,reject)=>{
   const p=spawn(chrome,args,{stdio:['ignore','pipe','pipe']});
   let out='',err='',finished=false;
   const done=(e,v)=>{if(finished)return;finished=true;clearTimeout(timer);e?reject(e):resolve(v)};
   const timer=setTimeout(()=>{p.kill('SIGKILL');done(new Error('Chrome timeout: '+err.slice(-250)))},19000);
   p.stdout.on('data',x=>out+=x.toString());
   p.stderr.on('data',x=>err+=x.toString());
   p.on('error',e=>done(e));
   p.on('close',code=>code===0?done(null,out):done(new Error('Chrome '+code+' '+err.slice(-250))));
  });
 }finally{fs.rmSync(fullpath,{force:true});fs.rmSync(profile,{recursive:true,force:true})}
}

test('v131 concert login and signup remain functional without clipped controls across widths', {
 skip: chrome||process.env.CI==='true'?false:'Chromium unavailable'
}, async()=>{
 assert.ok(chrome,'Chromium is needed in CI');
 for(const size of ['1600,900','1280,900','390,844']){
  let last=null;
  for(let tries=0;tries<2;tries++){
   try{
    const dom=await run(size);
    const ok=dom.match(/data-sf123-auth="([^"]+)"/)?.[1];
    const detail=dom.match(/<output[^>]*id="sf123AuthMetrics"[^>]*>([^<]+)<\/output>/)?.[1] || dom.slice(-1000);
    assert.equal(ok,'ok',size+': '+detail);
    last=null;break;
   }catch(e){last=e;if(!/Chrome timeout|Chrome [0-9]+/.test(String(e.message)))break}
  }
  if(last) throw last;
 }
});
