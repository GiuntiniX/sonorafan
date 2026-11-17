'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawn}=require('node:child_process');
const chrome=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium'].filter(Boolean).find(fs.existsSync);
const dir=path.join(__dirname,'../public');
function build(){
 const full=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const inline=full.match(/<style>[\s\S]*?<\/style>/)?.[0];
 assert.ok(inline);
 const styles=[...full.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g)]
   .map(x=>x[0].replace(/href="\//g,'href="./')).join('\n');
 const a=full.indexOf('<!-- LOBBY -->'),b=full.indexOf('<!-- ROOM -->',a);
 assert.ok(a>0&&b>a,'Lobby section missing');
 const lobby=full.slice(a,b).replace(/src="\//g,'src="./');
 const boot=[
  '<script>',
  'window.__sf125Calls=[];',
  'window.showCreateRoom=()=>window.__sf125Calls.push("create");',
  'window.sf110OpenCommunity=x=>window.__sf125Calls.push("community:"+x);',
  'window.sf5OpenCommunity=()=>window.__sf125Calls.push("legacy-community");',
  'window.sf112OpenProfile=x=>window.__sf125Calls.push("profile:"+x);',
  'window.openLeaderboard=()=>window.__sf125Calls.push("ranking");',
  'window.joinRoom=x=>window.__sf125Calls.push("room:"+x);',
  'window.sf41UpdateRooms=()=>{};',
  'window.fetch=async path=>({ok:true,json:async()=>{',
  'if(String(path).startsWith("/api/gamification/leaderboard"))return {items:[{nome:"Ana",points:900},{nome:"Rafa",points:720}]};',
  'if(String(path).startsWith("/api/rooms"))return [{slug:"sala-teste",name:"Sala Real",genre:"rock",listenerCount:3,isPlaying:true,isPrivate:false}];',
  'return {clubs:[],items:[]};}});',
  'document.getElementById("screen-lobby").classList.add("active");',
  '</script>'
 ].join('\n');
 const verify=[
  '<script>',
  'window.addEventListener("load",()=>setTimeout(()=>{',
  'const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];',
  'const visible=s=>!!$(s)&&getComputedStyle($(s)).display!=="none"&&$(s).getBoundingClientRect().width>0;',
  'const screen=$("#screen-lobby"),hero=$("#sf125LobbyHero"),nav=$("#sf125MobileBar"),side=$("#sf125Sidebar"),head=$(".sf125-toolbar");',
  'const ok=!!hero&&!!nav&&!!side&&!!head;',
  'const data={width:innerWidth,ready:screen.classList.contains("sf107-ready"),created:ok,',
  'sidebarVisible:visible("#sf125Sidebar"),mobileVisible:visible("#sf125MobileBar"),',
  'horizontal:document.documentElement.scrollWidth<=innerWidth+5,',
  'headFits:head&&head.getBoundingClientRect().right<=innerWidth+5,',
  'live:all("#sf125LiveRooms .sf125-rail-room").length,ranking:all("#sf125Leaders .sf125-rail-leader").length};',
  'all("[data-sf125-go=clubs]")[0]?.click();all("[data-sf125-go=create]")[0]?.click();',
  'data.calls=window.__sf125Calls;',
  'const pass=data.ready&&data.created&&data.horizontal&&data.headFits&&data.live===1&&data.ranking===2',
  '&&data.calls.includes("community:fanclubs")&&data.calls.includes("create")&&!data.calls.includes("legacy-community")',
  '&&(innerWidth<=860?data.mobileVisible&&!data.sidebarVisible:data.sidebarVisible&&!data.mobileVisible);',
  'const out=document.createElement("output");out.id="sf125Metrics";out.dataset.sf125Result=pass?"ok":"fail";',
  'out.textContent=JSON.stringify(data);document.body.append(out);',
  '},800));',
  '</script>'
 ].join('\n');
 return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
  inline+styles+'</head><body>'+lobby+boot+
  '<script src="./sonorafan-lobby-107.js"></script><script src="./sonorafan-unified-125.js"></script>'+verify+'</body></html>';
}
async function render(view){
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'sf125-'));
 const fixture=path.join(dir,'.sf125-'+process.pid+'.html');
 fs.writeFileSync(fixture,build());
 const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-extensions',
  '--disable-background-networking','--allow-file-access-from-files','--user-data-dir='+profile,
  '--no-first-run','--window-size='+view,'--virtual-time-budget=3600','--dump-dom','file://'+fixture];
 try{
  return await new Promise((resolve,reject)=>{
   const proc=spawn(chrome,args,{stdio:['ignore','pipe','pipe']});
   let out='',err='',settled=false;
   const done=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(result)};
   const timer=setTimeout(()=>{proc.kill('SIGKILL');done(new Error('Chromium timeout '+err.slice(-300)))},24000);
   proc.stdout.on('data',x=>out+=x.toString());proc.stderr.on('data',x=>err+=x.toString());
   proc.on('error',e=>done(e));
   proc.on('close',code=>code===0?done(null,out):done(new Error('Chromium exit '+code+' '+err.slice(-300))));
  });
 }finally{fs.rmSync(fixture,{force:true});fs.rmSync(profile,{force:true,recursive:true})}
}
test('v125 actual Lobby DOM and styles: visual shell, working CTAs and mobile bottom navigation',{
 skip:chrome||process.env.CI==='true'?false:'Chromium unavailable'
},async()=>{
 assert.ok(chrome,'Chromium required in CI');
 for(const view of ['1600,900','1024,768','390,844']){
  let error=null;
  for(let retry=0;retry<2;retry++){
   try{
    const result=await render(view);
    const status=result.match(/data-sf125-result="([^"]+)"/)?.[1];
    const details=result.match(/<output[^>]*id="sf125Metrics"[^>]*>([^<]+)<\/output>/)?.[1];
    assert.equal(status,'ok','Viewport '+view+': '+(details||result.slice(-1300)));
    error=null;break;
   }catch(e){error=e;if(!/Chromium timeout|Chromium exit/.test(String(e.message)))break}
  }
  if(error)throw error;
 }
});
