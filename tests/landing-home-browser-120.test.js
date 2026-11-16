'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');
const chrome=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].filter(Boolean).find(fs.existsSync);
const dir=path.resolve(__dirname,'../public');

function fixture() {
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const style=html.match(/<style>[\s\S]*?<\/style>/)?.[0];
 assert.ok(style,'Original inline CSS is missing');
 const linked=Array.from(html.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g),m=>m[0].replace(/href="\//g,'href="./'));
 const a=html.indexOf('<!-- ===== SONORAFAN 121');
 const b=html.indexOf('<!-- ===== SONORAFAN 123',a);
 assert.ok(a>0&&b>a,'Landing region missing');
 const body=html.slice(a,b).replace(/src="\//g,'src="./');
 const verify=String.raw`
<script>
let signups=0,logins=0;
window.openSignup=()=>{signups++;};
window.showLogin=()=>{logins++;};
window.setLanguage=()=>{};
window.addEventListener('load',()=>{
 setTimeout(()=>{
  const $=s=>document.querySelector(s),all=s=>Array.from(document.querySelectorAll(s));
  const root=$('#landingScreen'),top=$('.sf120-topbar'),hero=$('.sf120-hero'),
    preview=$('.sf121-room-preview'),card=$('.sf120-feature'),signup=$('.sf120-hero-ctas .sf120-signup');
  const r=e=>e.getBoundingClientRect();
  const prevr=r(preview),hr=r(hero),rr=r(root),tr=r(top),cr=r(card);
  const registrationButtons=all('#landingScreen button[onclick="openSignup()"]');
  registrationButtons.forEach(button=>button.click());
  $('.sf122-login-button')?.click();
  const bg=getComputedStyle(root).backgroundColor;
  const feature=all('.sf120-feature');
  const whiteText=getComputedStyle($('#sf120HeroTitle')).color;
  const cols=getComputedStyle($('.sf120-feature-grid')).gridTemplateColumns;
  const data={
   viewport:innerWidth,
   background:bg,
   cards:feature.length,
   navRemoved:!all('.sf121-nav-links,.sf121-search-button').length,
   howRemoved: !all('.sf120-how-link').length,
   clickSignup:registrationButtons.length===8 && signups===registrationButtons.length,
   clickLogin:logins===1,
   loginVisible: (()=>{const b=$('.sf122-login-button');const x=r(b);return x.width>30&&x.height>30&&x.right<=innerWidth+3;})(),
   signupVisible:(()=>{const x=r($('.sf122-auth-actions .sf122-signup-pulse'));return x.width>90&&x.height>30&&x.right<=innerWidth+3;})(),
   animationsEnabled:getComputedStyle($('.sf121-hero-signup')).animationName!=='none',
   heroWidth:hr.width,
   preview:[prevr.x,prevr.width,prevr.height],
   topWidth:tr.width,
   cardWidth:cr.width,
   scheme:whiteText,
   columns:cols,
   fits:prevr.width>225 && prevr.left>=-2 && prevr.right<=innerWidth+2
     && rr.width>=innerWidth-5 && !/rgb\(5, 4, 10\)/.test(bg),
   black: bg==='rgb(20, 20, 20)'
  };
  const out=document.createElement('output');out.id='sf120HomeMetrics';
  out.dataset.sf120HomeTest=data.cards===4 && data.navRemoved && data.howRemoved && data.clickSignup && data.clickLogin
    && data.loginVisible && data.signupVisible && data.fits && data.black ? 'ok':'fail';
  out.textContent=JSON.stringify(data);document.body.append(out);
 },250);
});
</script>`;
 return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+style+
 linked.join('\n')+'</head><body>'+body+verify+'</body></html>';
}

async function launch(viewport){
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'sf120-'));
 const name='.sf120-home-check-'+process.pid+'.html';
 const target=path.join(dir,name);
 fs.writeFileSync(target,fixture());
 const args=['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
 '--disable-extensions','--disable-background-networking','--allow-file-access-from-files',
 '--no-first-run','--user-data-dir='+profile,'--window-size='+viewport,
 '--virtual-time-budget=2600','--dump-dom','file://'+target];
 try{
  return await new Promise((resolve,reject)=>{
   const proc=spawn(chrome,args,{stdio:['ignore','pipe','pipe']});
   let out='',err='',finished=false;
   const done=(error,value)=>{if(finished)return;finished=true;clearTimeout(timer);error?reject(error):resolve(value)};
   const timer=setTimeout(()=>{proc.kill('SIGKILL');done(new Error('Chromium timeout '+err.slice(-250)))},22000);
   proc.stdout.on('data',v=>out+=v.toString());
   proc.stderr.on('data',v=>err+=v.toString());
   proc.on('error',e=>done(e));
   proc.on('close',c=>c===0?done(null,out):done(new Error('Chromium exit '+c+' '+err.slice(-300))));
  });
 }finally{fs.rmSync(target,{force:true});fs.rmSync(profile,{recursive:true,force:true})}
}

test('real home v122: no menu, Login beside signup and every marketing action registers at 4 screen widths', {
 skip:chrome||process.env.CI==='true'?false:'Chromium unavailable'
},async()=>{
 assert.ok(chrome,'Chromium required in CI');
 for(const vp of ['1600,960','1280,900','768,1024','390,844']){
  let error=null;
  for(let attempt=0;attempt<2;attempt++){
   try{
    const output=await launch(vp);
    const result=output.match(/data-sf120-home-test="([^"]+)"/)?.[1];
    const detail=output.match(/<output[^>]*id="sf120HomeMetrics"[^>]*>([^<]+)<\/output>/)?.[1];
    assert.equal(result,'ok','Viewport '+vp+': '+(detail||output.slice(-1300)));
    error=null;break;
   }catch(e){error=e;if(!/Chromium timeout|Chromium exit/.test(String(e.message)))break}
  }
  if(error)throw error;
 }
});
