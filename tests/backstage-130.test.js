'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {spawn} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const dir = path.join(root,'public');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const html = read('public/index.html');
const styles = read('public/sonorafan-backstage-130.css');
const wizard = read('public/room-discovery-10.js');
const chrome = [process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium'].filter(Boolean).find(fs.existsSync);

test('Backstage is the definitive create room modal with original functional IDs',()=>{
  assert.match(html,/id="createRoomModal"[^>]*aria-labelledby="sf35CreateTitle"/);
  assert.match(html,/sf130-backstage-modal/);
  for(const id of ['createRoomModal','sf35CreateTitle','newRoomName','sf109GenrePicker',
    'sf109GenreError','sf88CreateTheme','createCfg','optAllowLong','optAllowLive']){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  }
  const a=html.indexOf('<!-- CREATE ROOM · BACKSTAGE');
  const b=html.indexOf('<!-- TEMAS MUSICAIS DAS SALAS -->',a);
  assert.ok(a>0 && b>a,'room modal region');
  const modal=html.slice(a,b);
  for(const handler of ['onclick="createRoom()"','onclick="closeCreateRoom()"','sf10WizardNext','sf10WizardBack']){
    assert.ok(modal.includes(handler),handler);
  }
  assert.match(modal,/data-sf10-step-mark="1"/);
  assert.match(modal,/data-sf10-step-mark="2"/);
  assert.match(modal,/sf130-stage-art-left/);
  assert.match(modal,/sf130-stage-art-right/);
  assert.match(modal,/sf130-stage-scroll/);
});

test('Backstage stylesheet is last and explicitly provides dedicated mobile layout',()=>{
  assert.match(html,/sonorafan-backstage-130\.css\?v=130/);
  assert.ok(html.indexOf('sonorafan-backstage-130.css')>html.indexOf('sonorafan-creation-auth-129.css'));
  for(const key of ['#createRoomModal .sf130-stage-art-left','sf130-brand-image',
    '#createRoomModal .sf130-stage-scroll','#createRoomModal .sf130-create-footer',
    '@media(max-width:620px)','env(safe-area-inset-bottom','height:100dvh!important']){
    assert.ok(styles.includes(key),key);
  }
  assert.match(styles,/#createRoomModal \.sf130-create-footer \.modal-actions button\[hidden\]/);
});

test('genre is mandatory before reaching the playlist and privacy step',()=>{
  assert.match(wizard,/input\[name="sf109RoomGenre"\]:checked/);
  assert.match(wizard,/if\(!genre\)/);
  assert.match(wizard,/sf109GenreError/);
  assert.match(wizard,/step\(2\)/);
  assert.match(wizard,/scroll\.scrollTop=0/);
  assert.match(wizard,/aria-current/);
});

test('owner playlist, live, private and theme controls remain integrated with the actual creation request',()=>{
  const main=html.slice(html.indexOf('function renderCfg('),html.indexOf('function joinRoom(slug, extra)'));
  assert.match(main,/sf129-mode-picker/);
  assert.match(main,/pick\('addMode','owner'\)/);
  assert.match(main,/addMode: s\.addMode === 'owner' \? 'owner' : 'all'/);
  assert.match(main,/renderCfg\('editCfg', 'e'/);
  assert.match(main,/JSON\.stringify\(\{ name, genre, adminName: myName, \.\.\.readCfg\('c'\), roomTheme:/);
  assert.match(read('server.js'),/room\.musicMode = cfg\.addMode === 'owner' \? 'owner' : 'fair'/);
});

function fixture(){
  const a=html.indexOf('<!-- CREATE ROOM · BACKSTAGE');
  const b=html.indexOf('<!-- TEMAS MUSICAIS DAS SALAS -->',a);
  assert.ok(a>0&&b>a);
  const modal=html.slice(a,b).replace(/src="\//g,'src="./');
  const inline=html.match(/<style>[\s\S]*?<\/style>/)?.[0]||'';
  const cssTags=[...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g)]
    .filter(m=>m[0].includes('href="/'))
    .map(m=>m[0].replace(/href="\//g,'href="./')).join('\n');
  const i=html.indexOf('const CFG_COLORS =');
  const j=html.indexOf('function openRoomCfg()',i);
  assert.ok(i>0&&j>i,'renderCfg source');
  const cfg=html.slice(i,j);
  const boot='<script>const $=id=>document.getElementById(id);const escapeHtml=v=>String(v??"");'+cfg+
    '\nwindow.toast=()=>{};renderCfg("createCfg","c");document.getElementById("createRoomModal").classList.add("active");</script>';
  const check=[
    '<script>setTimeout(()=>{',
    'const m=document.getElementById("createRoomModal");',
    'const box=m.querySelector(".sf130-backstage-modal");',
    'const scroll=m.querySelector("#sf130CreateScroll");',
    'const footer=m.querySelector(".sf130-create-footer");',
    'const left=m.querySelector(".sf130-stage-art-left");',
    'const right=m.querySelector(".sf130-stage-art-right");',
    'const rect=box.getBoundingClientRect(),foot=footer.getBoundingClientRect();',
    'window.sf10WizardReset();',
    'const start=m.dataset.sf10Step;',
    'document.getElementById("newRoomName").value="Lounge SonoraFan";',
    'window.sf10WizardNext();',
    'const denied=m.dataset.sf10Step;',
    'const radio=m.querySelector("input[name=sf109RoomGenre]");radio.checked=true;radio.dispatchEvent(new Event("change",{bubbles:true}));',
    'window.sf10WizardNext();',
    'const next=m.dataset.sf10Step;',
    'const mode=m.querySelector("#createCfg .sf129-mode-owner");mode.click();',
    'const live=[...m.querySelectorAll("#createCfg .sf17-room-format-grid .kind-tile")].find(x=>x.textContent.includes("Live"));live.click();',
    'const priv=[...m.querySelectorAll("#createCfg .kind-tile")].find(x=>x.textContent.includes("Privada"));priv.click();',
    'const cfg=readCfg("c");',
    'const hidden=sel=>getComputedStyle(m.querySelector(sel)).display==="none";',
    'const metrics={width:innerWidth,screenHeight:innerHeight,modalWidth:rect.width,modalHeight:rect.height,modalLeft:rect.left,modalRight:rect.right,',
    'footerBottom:foot.bottom,footerTop:foot.top,scrollClient:scroll.clientHeight,scrollHeight:scroll.scrollHeight,',
    'start,denied,next,genreErrorHidden:document.getElementById("sf109GenreError").hidden,',
    'owner:cfg.addMode==="owner",live:cfg.allowLive===true,private:cfg.isPrivate===true,hasPassword:!!document.getElementById("cPw"),',
    'hasTheme:!!document.getElementById("sf88CreateTheme"),backVisible:!hidden(".sf10-back"),',
    'submitVisible:!hidden(".sf10-submit"),nextHidden:hidden(".sf10-next"),',
    'leftVisible:!hidden(".sf130-stage-art-left"),rightVisible:!hidden(".sf130-stage-art-right"),',
    'scrollOverflow:getComputedStyle(scroll).overflowY,modeButtons:!!mode};',
    'const compact=innerWidth<=865, phone=innerWidth<=620;',
    'const pass=rect.width>280&&rect.height>300&&rect.left>=-2&&rect.right<=innerWidth+2&&foot.bottom<=innerHeight+3',
    '&&metrics.start==="1"&&metrics.denied==="1"&&metrics.next==="2"&&metrics.owner&&metrics.live&&metrics.private&&metrics.hasPassword',
    '&&metrics.hasTheme&&metrics.genreErrorHidden&&metrics.backVisible&&metrics.submitVisible&&metrics.nextHidden',
    '&&!metrics.leftVisible===false',
    '&&(!compact?metrics.rightVisible:!metrics.rightVisible)',
    '&&(phone?rect.width>=innerWidth-2:true)',
    '&&metrics.scrollClient>50&&metrics.scrollOverflow==="auto";',
    'const output=document.createElement("output");output.id="sf130Metrics";output.dataset.ok=pass?"yes":"no";',
    'output.textContent=JSON.stringify(metrics);document.body.append(output);',
    '},400);</script>'
  ].join('\n');
  const guard='<script>setTimeout(()=>{if(document.getElementById("sf130Metrics"))return;'+
    'const o=document.createElement("output");o.id="sf130Metrics";o.dataset.ok="no";'+
    'o.textContent="No browser metrics generated";document.body.append(o);},1200);</script>';
  return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">'+
   '<meta name="viewport" content="width=device-width,initial-scale=1">'+inline+cssTags+
   '</head><body>'+modal+boot+
   '<script src="./room-discovery-10.js"></script>'+check+guard+'</body></html>';
}

async function render(view){
 const user=fs.mkdtempSync(path.join(os.tmpdir(),'sf130-browser-'));
 const file=path.join(dir,'.sf130-browser-'+process.pid+'.html');
 fs.writeFileSync(file,fixture());
 try{
  return await new Promise((resolve,reject)=>{
   const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--disable-background-networking','--allow-file-access-from-files','--disable-extensions',
    '--user-data-dir='+user,'--window-size='+view,'--virtual-time-budget=1800','--dump-dom','file://'+file];
   const child=spawn(chrome,args,{stdio:['ignore','pipe','pipe']});
   let result='',error='',done=false;
   const finish=(err,value)=>{if(done)return;done=true;clearTimeout(timer);err?reject(err):resolve(value);};
   const timer=setTimeout(()=>{child.kill('SIGKILL');finish(new Error('Chrome timeout '+error.slice(-300)))},22000);
   child.stdout.on('data',x=>result+=x.toString());
   child.stderr.on('data',x=>error+=x.toString());
   child.on('error',err=>finish(err));
   child.on('close',code=>code===0?finish(null,result):finish(new Error('Chrome exit '+code+': '+error.slice(-300))));
  });
 }finally{
  fs.rmSync(file,{force:true});
  fs.rmSync(user,{recursive:true,force:true});
 }
}

test('Backstage desktop, tablet and dedicated mobile preserve functional layout in Chromium',{
 skip:chrome||process.env.CI==='true'?false:'Chromium unavailable'
},async()=>{
 assert.ok(chrome,'Chromium required in CI');
 for(const view of ['1440,900','1024,768','390,844']){
  const output=await render(view);
  const status=output.match(/id="sf130Metrics"[^>]*data-ok="([^"]+)"/)?.[1];
  const details=output.match(/<output[^>]*id="sf130Metrics"[^>]*>([^<]+)<\/output>/)?.[1];
  assert.equal(status,'yes',view+': '+(details||output.slice(-800)));
 }
});
