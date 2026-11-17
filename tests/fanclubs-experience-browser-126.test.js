'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawn}=require('node:child_process');
const chrome=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium'].filter(Boolean).find(fs.existsSync);
const root=path.join(__dirname,'../public');

function fixture(){
 const full=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const css=[...full.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g)].map(m=>m[0].replace(/href="\//g,'href="./')).join('\n');
 const markup=[
  '<div id="sf125LobbyHero"></div><main id="original-hub">',
  '<div id="sfSocialHub" class="sf-social-hub">',
  '<div class="sf71-social-head"><h3>Comunidade antiga</h3></div>',
  '<section id="sfFanClubsPanel" class="sf71-panel" hidden>',
  '<div class="sf71-club-toolbar"><strong>Encontre fãs do mesmo artista</strong>',
  '<button id="sf71CreateClub" type="button">Criar Fan Club</button></div>',
  '<div class="sf71-club-search"><input id="sf71ClubSearch" placeholder="Buscar Fan Club">',
  '<button id="sf71ClubMine" aria-pressed="false">Meus clubes</button></div>',
  '<p id="sf71ClubStatus"></p>',
  '<div id="sf71ClubList" class="sf71-club-grid">',
  '<article class="sf71-club-card"><div class="sf71-club-art"><img src="./art-44/festival-card.webp" alt=""></div>',
  '<div class="sf71-club-copy"><small>FAN CLUB</small><strong>Rock Lovers</strong><span>Rock</span></div>',
  '<button type="button" data-sf71-open="31c70666-80bf-42e0-9fee-2a9cb3c95b11">Ver Fan Club</button></article></div>',
  '<section id="sf71ClubDetail" hidden></section></section></div></main>'
 ].join('');
 const boot=[
  '<script>',
  'window.__sf126Calls=[];',
  'window.sf71OpenFanClub=id=>window.__sf126Calls.push("detail:"+id);',
  'window.sf71LoadFanClubs=()=>window.__sf126Calls.push("load-clubs");',
  'window.sf15OpenNotifications=()=>window.__sf126Calls.push("notifications");',
  'window.sf110OpenCommunity=function(tab){',
  ' window.__sf126Calls.push("open:"+tab);',
  ' const layer=document.createElement("div");layer.className="sf5-community-layer sf125-community";',
  ' layer.innerHTML="<section class=\'sf5-community-shell sf110-community-shell sf110-show-details\'>"+',
  '  "<header class=\'sf5-community-top\'><div><h2>Comunidades</h2><p>Antiga</p></div><button class=\'sf5-close\'>×</button></header>"+',
  '  "<div class=\'sf5-community-scroll\'></div></section>";',
  ' document.body.append(layer);layer.querySelector(".sf5-community-scroll").append(document.getElementById("sfSocialHub"));',
  ' layer.querySelector(".sf5-close").onclick=()=>layer.remove();',
  '};',
  '</script>'
 ].join('\n');
 const check=[
  '<script>',
  'setTimeout(()=>{window.sf126OpenClubs?.();setTimeout(()=>{',
  'const $=s=>document.querySelector(s),a=s=>[...document.querySelectorAll(s)];',
  'const layer=$(".sf126-fan-layer"),shell=$(".sf126-fan-shell"),hero=$("#sf126ClubHero");',
  'const card=$(".sf71-club-card"),right=$(".sf126-club-side"),rail=$(".sf126-recommended");',
  'const dims=e=>e?[e.getBoundingClientRect().width,e.getBoundingClientRect().height]:[0,0];',
  'rail?.click();',
  'const data={viewport:innerWidth,open:!!layer,hero:dims(hero),card:dims(card),',
  'right:dims(right),recommended:a(".sf126-recommended").length,',
  'shellFits:!!shell&&shell.getBoundingClientRect().right<=innerWidth+8,',
  'noHorizontal:document.documentElement.scrollWidth<=innerWidth+5,',
  'panelVisible:!$("#sfFanClubsPanel").hidden,',
  'tabHidden:getComputedStyle($(".sf71-social-head")).display==="none",',
  'calls:window.__sf126Calls};',
  'const pass=data.open&&data.hero[0]>270&&data.hero[1]>145&&data.card[0]>130',
  '&&data.right[0]>120&&data.recommended===1&&data.shellFits&&data.noHorizontal',
  '&&data.panelVisible&&data.tabHidden',
  '&&data.calls.includes("load-clubs")&&data.calls.includes("detail:31c70666-80bf-42e0-9fee-2a9cb3c95b11");',
  'const out=document.createElement("output");out.id="sf126ClubMetrics";',
  'out.dataset.sf126ClubResult=pass?"ok":"fail";out.textContent=JSON.stringify(data);document.body.append(out);',
  '},350);},300);',
  '</script>'
 ].join('\n');
 return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+css+
  '</head><body>'+markup+boot+'<script src="./sonorafan-experience-126.js"></script>'+check+'</body></html>';
}
async function render(view){
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'sf126-clubs-'));
 const filename=path.join(root,'.sf126-clubs-'+process.pid+'.html');
 fs.writeFileSync(filename,fixture());
 try{
  return await new Promise((resolve,reject)=>{
   const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-extensions',
    '--disable-background-networking','--allow-file-access-from-files','--user-data-dir='+profile,
    '--no-first-run','--window-size='+view,'--virtual-time-budget=2300','--dump-dom','file://'+filename];
   const child=spawn(chrome,args,{stdio:['ignore','pipe','pipe']});
   let out='',err='',settled=false;
   const done=(e,v)=>{if(settled)return;settled=true;clearTimeout(timer);e?reject(e):resolve(v)};
   const timer=setTimeout(()=>{child.kill('SIGKILL');done(new Error('Chromium timeout '+err.slice(-300)))},23000);
   child.stdout.on('data',x=>out+=x.toString());child.stderr.on('data',x=>err+=x.toString());
   child.on('error',e=>done(e));child.on('close',c=>c===0?done(null,out):done(new Error('Chromium exit '+c+' '+err.slice(-300))));
  });
 }finally{fs.rmSync(filename,{force:true});fs.rmSync(profile,{recursive:true,force:true})}
}
test('Fan Clubs uses native cards and actions in desktop/mobile, no duplicated Community dashboard',{
 skip:chrome||process.env.CI==='true'?false:'Chromium unavailable'
},async()=>{
 assert.ok(chrome,'Chromium required in CI');
 for(const view of ['1600,900','390,844']){
  const html=await render(view);
  const status=html.match(/data-sf126-club-result="([^"]+)"/)?.[1];
  const details=html.match(/<output[^>]*id="sf126ClubMetrics"[^>]*>([^<]+)<\/output>/)?.[1]||html.slice(-1200);
  assert.equal(status,'ok',view+': '+details);
 }
});
