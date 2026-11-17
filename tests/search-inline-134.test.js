'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const pub=path.join(root,'public');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('public/index.html');
const inlineJS=read('public/sonorafan-inline-search-78.js');
const mobileJS=read('public/sonorafan-mobile-music-76.js');
const css=read('public/sonorafan-search-inline-134.css');
const chrome=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium']
 .filter(Boolean).find(fs.existsSync);
const room=html.slice(html.indexOf('<!-- ROOM -->'),html.indexOf('<!-- CREATE ROOM -->'));

test('v134 results render below search field, never in a black floating overlay',()=>{
  assert.match(mobileJS,/id="sf76InlineResultsHost"/);
  assert.match(inlineJS,/function syncResultsHost\(\)/);
  assert.match(inlineJS,/inline\.appendChild\(popup\)/);
  assert.match(inlineJS,/popup\.classList\.add\('sf134-inline'\)/);
  assert.match(css,/#sf76InlineResultsHost > #sf78InlineSearch\.sf134-inline:not\(\[hidden\]\)/);
  assert.match(css,/position:relative!important/);
  assert.match(css,/#sf76InlineResultsHost \.sf78-row/);
});
test('v134 preserves music confirmation and the official shared queue',()=>{
  const quick=read('public/sonorafan-quick-add-81.js');
  assert.match(quick,/window\.sf81QuickSelect=choose/);
  assert.match(quick,/window\.sf80QueueSong\(chosen\)/);
  assert.match(inlineJS,/window\.sf81QuickSelect\(track\)/);
  assert.match(inlineJS,/state\.items=tracks/);
  assert.match(mobileJS,/window\.sf78CloseInline\?\.\(\)/);
});
test('v134 high-quality artwork is loaded on the homepage',()=>{
  const image=fs.readFileSync(path.join(pub,'art-134/sonorafan-kpop-home-hq.avif'));
  assert.ok(image.length>100000,'asset too small for full-resolution image');
  assert.equal(image.toString('ascii',4,8),'ftyp');
  assert.match(html,/src="\/art-134\/sonorafan-kpop-home-hq\.avif"/);
  assert.match(html,/sonorafan-search-inline-134\.css\?v=134\.1/);
  assert.match(html,/sonorafan-mobile-music-76\.js\?v=134\.1/);
  assert.match(html,/sonorafan-inline-search-78\.js\?v=134\.1/);
});
function fixture(){
 const style=html.match(/<style>[\s\S]*?<\/style>/)?.[0]||'';
 const links=[...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g)]
  .map(x=>x[0].replace(/href="\//g,'href="./')).join('\n');
 const main=room.replace(/src="\//g,'src="./');
 const boot=`<script>
 const currentRoom='test-room',currentRoomData={queue:[],waitingQueue:[],allowLive:true,maxDuration:600};
 const socket={connected:true};
 const myFavorites=[];
 window.__added=[];
 window.toast=()=>{};
 window.sf80QueueSong=async song=>{
   window.__added.push(song);
   const row=document.createElement('div');row.className='queue-item';row.textContent=song.title;
   document.getElementById('queueList').append(row);
   return {placement:'queue'};
 };
 window.fetch=async(url)=>{
   const u=String(url);
   if(u.includes('/api/search-youtube'))return {ok:true,json:async()=>({
     items:[{id:'dQw4w9WgXcQ',title:'Metallica concerto',artist:'Banda de teste'}]})};
   if(u.includes('/api/video-info'))return {ok:true,json:async()=>({
     title:'Metallica concerto',artist:'Banda de teste',duration:180,embeddable:true})};
   if(u.includes('/api/favorites'))return {ok:true,json:async()=>[]};
   if(u.includes('/api/favorite-genres'))return {ok:true,json:async()=>({genres:[]})};
   throw Error('Unexpected fetch '+u);
 };
 window.handleSearchInput=text=>window.sf78SearchFromField?.(text,true);
 window.roomLimit=()=>600;
 document.getElementById('screen-room').classList.add('active');
 </script>`;
 const checks=`<script>
 setTimeout(async()=>{
   let state={width:innerWidth};
   try{
     const layer=document.getElementById('sf76MusicSheet');
     window.sf76OpenMusic('search');
     const input=document.getElementById('songUrl');
     input.value='metallica';
     input.dispatchEvent(new Event('input',{bubbles:true}));
     await new Promise(r=>setTimeout(r,410));
     const popup=document.getElementById('sf78InlineSearch');
     const host=document.getElementById('sf76InlineResultsHost');
     const row=popup?.querySelector('.sf78-row');
     state.sheetOpen=!layer.hidden;
     state.inline=popup?.parentElement===host && popup?.classList.contains('sf134-inline');
     state.notFloating=getComputedStyle(popup).position==='relative';
     state.belowForm=popup.getBoundingClientRect().top>=input.getBoundingClientRect().bottom;
     state.resultsShown=!!row;
     state.noSecondDialog=!document.querySelector('.sf77-overlay:not([hidden])');
     row?.click();
     await new Promise(r=>setTimeout(r,140));
     const add=document.getElementById('sf81QuickSubmit');
     state.quickSelect=!!add;
     state.canSubmit=!!add&&!add.disabled;
     add?.click();
     await new Promise(r=>setTimeout(r,140));
     state.added=window.__added.length===1 && window.__added[0]?.title==='Metallica concerto';
     state.realQueue=document.querySelector('#queueList .queue-item')?.textContent==='Metallica concerto';
     state.pass=Object.entries(state).filter(([key])=>!['pass','width'].includes(key)).every(([_,v])=>v===true);
   }catch(e){state.pass=false;state.error=String(e);}
   const out=document.createElement('output');
   out.id='sf134Metrics';out.dataset.ok=String(state.pass);out.textContent=JSON.stringify(state);
   document.body.append(out);
 },280);
 </script>`;
 return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+style+links+'</head><body>'+main+boot+
  '<script src="./sonorafan-mobile-music-76.js"></script>'+ 
  '<script src="./sonorafan-inline-search-78.js"></script>'+ 
  '<script src="./sonorafan-quick-add-81.js"></script>'+checks+'</body></html>';
}
async function render(size){
 const user=fs.mkdtempSync(path.join(os.tmpdir(),'sf134-chrome-'));
 const file=path.join(pub,'.sf134-test-'+process.pid+'.html');
 fs.writeFileSync(file,fixture());
 try{return await new Promise((resolve,reject)=>{
   const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--disable-background-networking','--disable-extensions','--allow-file-access-from-files',
    '--user-data-dir='+user,'--window-size='+size,'--virtual-time-budget=3000','--dump-dom','file://'+file];
   const process=spawn(chrome,args,{stdio:['ignore','pipe','pipe']});
   let output='',errors='',done=false;
   const finish=(err,value)=>{if(done)return;done=true;clearTimeout(timer);err?reject(err):resolve(value)};
   const timer=setTimeout(()=>{process.kill('SIGKILL');finish(new Error('Chrome timeout: '+errors.slice(-200)))},23000);
   process.stdout.on('data',d=>output+=d.toString());
   process.stderr.on('data',d=>errors+=d.toString());
   process.on('error',finish);
   process.on('close',code=>code===0?finish(null,output):finish(new Error('Chrome '+code+': '+errors.slice(-200))));
 });}finally{fs.rmSync(file,{force:true});fs.rmSync(user,{recursive:true,force:true})}
}
test('Chromium displays inline results and adds the chosen track on desktop/mobile',{skip:!chrome},async()=>{
 for(const viewport of ['1440,900','390,844']){
   const output=await render(viewport);
   const passed=output.match(/id="sf134Metrics"[^>]*data-ok="([^"]+)"/)?.[1];
   const metrics=output.match(/<output[^>]*id="sf134Metrics"[^>]*>([^<]+)<\/output>/)?.[1];
   assert.equal(passed,'true',viewport+': '+(metrics||output.slice(-500)));
 }
});