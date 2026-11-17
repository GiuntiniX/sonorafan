'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');
const chrome=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium'].filter(Boolean).find(fs.existsSync);
const dir=path.resolve(__dirname,'../public');
function fixture(){
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const inline=html.match(/<style>[\s\S]*?<\/style>/)?.[0];assert.ok(inline);
 const styles=[...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g)].map(x=>x[0].replace(/href="\//g,'href="./')).join('\n');
 const a=html.indexOf('<div class="modal-overlay" id="sf43ProfileModal"'),b=html.indexOf('<div class="sf50-status"',a);
 assert.ok(a>0&&b>a);
 const profile=html.slice(a,b).replace(/src="\//g,'src="./');
 const ranking=html.split('\n').find(line=>line.includes('id="lbModal"'));assert.ok(ranking);
 const community='<div class="sf5-community-layer sf125-community" style="display:none"><div class="sf5-community-shell sf110-community-shell"><div class="sf5-community-top"><h2>Comunidades</h2></div><div class="sf5-community-scroll"><div class="sf110-dashboard">Comunidade</div></div></div></div>';
 const boot=['<script>',
  'window.__sf125Errors=[];',
  'window.addEventListener("error",e=>window.__sf125Errors.push(String(e.message)+" @"+e.lineno));',
  'document.body.classList.add("sf125-global");',
  'document.getElementById("sf43ProfileModal").classList.add("sf108-profile");',
  'document.getElementById("sf43ProfileModal").querySelector(".sf43-profile-body").classList.add("sf108-ready");',
  'window.sf43CloseProfile=()=>document.getElementById("sf43ProfileModal").classList.remove("active");',
  'window.openLeaderboard=()=>document.getElementById("lbModal").classList.add("active");',
  'window.sf112OpenProfile=()=>document.getElementById("sf43ProfileModal").classList.add("active");',
  'window.sf5OpenCommunity=()=>{};',
  'window.sf110OpenCommunity=()=>{};',
  '</script>'].join('\n');
 const check=['<script>',
  'setTimeout(()=>{',
  'const $=s=>document.querySelector(s);',
  'const profile=$("#sf43ProfileModal");profile.classList.add("active");',
  'const rank=$("#lbModal"),prail=$("#sf43ProfileModal .sf125-modal-rail"),',
  'rrail=$("#lbModal .sf125-modal-rail"),crail=$(".sf5-community-layer .sf125-modal-rail");',
  'const visible=x=>getComputedStyle(x).display!=="none"&&x.getBoundingClientRect().width>0;',
  'const metrics={width:innerWidth,profile:!!prail,ranking:!!rrail,community:!!crail,',
  'modalRailVisible:!!prail&&visible(prail),',
  'logo:!!prail&&[...prail.querySelectorAll("img")].some(img=>img.getAttribute("src")?.endsWith("sonorafan-logo-transparent.png")),',
  'profileContent:$("#sf43ProfileModal .sf43-profile-shell").getBoundingClientRect().width,',
  'profileOverflow:$("#sf43ProfileModal .sf43-profile-modal").getBoundingClientRect().right<=innerWidth+5,',
  'profilePadding:parseFloat(getComputedStyle($("#sf43ProfileModal .sf43-profile-modal")).paddingLeft),',
  'rankPadding:parseFloat(getComputedStyle($("#lbModal .sf35-ranking-modal")).paddingLeft),',
  'communityPadding:parseFloat(getComputedStyle($(".sf5-community-shell")).paddingLeft)};',
  'const mobile=innerWidth<=860;',
  'const pass=!metrics.profile&&!metrics.ranking&&!metrics.community&&metrics.profileOverflow',
  '&&metrics.profileContent>200&&metrics.profilePadding<100',
  '&&metrics.rankPadding<100&&metrics.communityPadding<100;',
  'const out=document.createElement("output");out.id="sf125Overlays";out.dataset.sf125Status=pass?"ok":"fail";',
  'out.textContent=JSON.stringify(metrics);document.body.append(out);',
  '},650);',
  '</script>'].join('\n');
 const guard=['<script>',
  'setTimeout(()=>{if(document.getElementById("sf125Overlays"))return;',
  'const node=document.createElement("output");node.id="sf125Overlays";node.dataset.sf125Status="fail";',
  'node.textContent=JSON.stringify({diagnostic:"no metrics",errors:window.__sf125Errors||[],profile:!!document.getElementById("sf43ProfileModal"),rank:!!document.getElementById("lbModal"),community:!!document.querySelector(".sf5-community-layer")});',
  'document.body.append(node);},1300);',
  '</script>'].join('\n');
 return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+inline+styles+
   '</head><body>'+profile+ranking+community+boot+
   '<script src="./sonorafan-unified-125.js"></script>'+check+guard+'</body></html>';
}
async function render(res){
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'sf125-overlay-'));
 const filename=path.join(dir,'.sf125-overlay-'+process.pid+'.html');
 fs.writeFileSync(filename,fixture());
 try{
  return await new Promise((resolve,reject)=>{
   const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-extensions',
    '--disable-background-networking','--allow-file-access-from-files','--user-data-dir='+profile,
    '--window-size='+res,'--virtual-time-budget=2100','--dump-dom','file://'+filename];
   const child=spawn(chrome,args,{stdio:['ignore','pipe','pipe']});
   let output='',err='',done=false;
   const finish=(e,v)=>{if(done)return;done=true;clearTimeout(timer);e?reject(e):resolve(v)};
   const timer=setTimeout(()=>{child.kill('SIGKILL');finish(new Error('Chromium timeout '+err.slice(-300)))},22000);
   child.stdout.on('data',v=>output+=v.toString());child.stderr.on('data',v=>err+=v.toString());
   child.on('error',e=>finish(e));child.on('close',code=>code===0?finish(null,output):finish(new Error('Chromium '+code+': '+err.slice(-400))));
  });
 }finally{fs.rmSync(filename,{force:true});fs.rmSync(profile,{recursive:true,force:true})}
}
test('v128 profile, ranking and Fan Clubs open without side navigation on desktop and mobile',{
 skip:chrome||process.env.CI==='true'?false:'Chromium unavailable'
},async()=>{
 assert.ok(chrome,'Chromium required in CI');
 for(const res of ['1600,900','390,844']){
  const html=await render(res);
  const status=html.match(/data-sf125-status="([^"]+)"/)?.[1];
  const details=html.match(/<output[^>]*id="sf125Overlays"[^>]*>([^<]+)<\/output>/)?.[1];
  assert.equal(status,'ok',res+': '+(details||html.slice(-1300)));
 }
});
