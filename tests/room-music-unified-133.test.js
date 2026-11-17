'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawn}=require('node:child_process');
const base=path.resolve(__dirname,'..');
const publicDir=path.join(base,'public');
const read=f=>fs.readFileSync(path.join(base,f),'utf8');
const html=read('public/index.html');
const css=read('public/sonorafan-room-personalization-133.css');
const js=read('public/sonorafan-mobile-music-76.js');
const theme=read('public/sonorafan-room-personalization-133.js');
const chrome=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium']
 .filter(Boolean).find(fs.existsSync);
const room=html.slice(html.indexOf('<!-- ROOM -->'),html.indexOf('<!-- CREATE ROOM -->'));

test('v133 keeps one visible music CTA, one real queue, no duplicate listening strip',()=>{
 for(const id of ['sf113AddMusic','sf116Favorites','sf5ListenersCount','sf5ListenersBody','queueList','sf116MoreButton']){
  assert.equal((room.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 assert.match(room,/id="sf116Favorites"[^>]*hidden/);
 assert.match(room,/class="sf5-listening-card sf128-presence"[^>]*hidden/);
 assert.match(room,/id="sf116MoreButton"[^>]*>\\s*<span[^>]*>☰/);
 assert.match(room,/id="sf113AddMusic"[^>]*aria-haspopup="dialog"/);
 assert.match(css,/#screen-room\.sf113-room #roomLayout \.sf128-add-panel \.sf128-presence/);
 assert.match(css,/#screen-room\.sf113-room #roomLayout #sf116Favorites/);
});

test('unified music sheet opens search and favorites at all viewport widths',()=>{
 assert.match(js,/window\.sf76OpenMusic=open/);
 assert.match(js,/data-sf76-tab="search"/);
 assert.match(js,/data-sf76-tab="favorites"/);
 assert.match(js,/window\.sf80QueueSong\(song\)/);
 assert.doesNotMatch(js,/if\(tab==='search' && typeof window\.sf77OpenSearch/);
 assert.match(css,/@media\(min-width:769px\)/);
 assert.match(css,/\.sf76-sheet:not\(\[hidden\]\)/);
 assert.match(html,/sonorafan-mobile-music-76\.js\?v=133/);
 assert.match(html,/sonorafan-room-personalization-133\.css\?v=133/);
});

test('room theme safely updates music, theme and settings dialogs with art and colors',()=>{
 assert.match(theme,/attributeFilter:\['data-room-theme','class','style'\]/);
 assert.match(theme,/\['--sf88-art','--sf133-art'\]/);
 assert.match(theme,/document\.getElementById\('screen-room'\)/);
 assert.match(css,/body\.sf133-themed-room #favoritesModal/);
 assert.match(css,/body\.sf133-themed-room #roomCfgModal/);
 assert.match(css,/body\.sf133-themed-room #sf88ThemeOverlay/);
 assert.match(css,/var\(--sf133-art\)/);
});

function fixture(){
 const main=room.replace(/src="\//g,'src="./');
 const links=[...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g)].map(x=>x[0].replace(/href="\//g,'href="./')).join('');
 const inline=html.match(/<style>[\s\S]*?<\/style>/)?.[0]||'';
 const script=`<script>
 const currentRoom='test-room';
 const currentRoomData={queue:[],waitingQueue:[],allowLive:true,maxDuration:600};
 const socket={connected:true};
 const myFavorites=[];
 window.sf133Added=[];
 window.toast=()=>{};
 window.sf80QueueSong=async song=>{
  window.sf133Added.push(song);
  const li=document.createElement('div');
  li.className='queue-item';li.textContent=song.title;
  document.querySelector('#queueList').append(li);
 };
 window.fetch=async(url)=>{
  const u=String(url);
  if(u.includes('/api/video-info'))return {ok:true,json:async()=>({embeddable:true,duration:150})};
  if(u.includes('/api/favorite-genres'))return {ok:true,json:async()=>({genres:[]})};
  if(u.includes('/api/favorites'))return {ok:true,json:async()=>[{id:'dQw4w9WgXcQ',title:'Faixa favorita',artist:'Artista teste'}]};
  throw new Error('Unexpected request '+u);
 };
 const screen=document.getElementById('screen-room');
 screen.classList.add('active');
 screen.dataset.roomTheme='indie';
 screen.style.setProperty('--sf88-primary','#fa3bd8');
 screen.style.setProperty('--sf88-secondary','#ff8811');
 screen.style.setProperty('--sf88-panel','#221131');
 screen.style.setProperty('--sf88-label','#ffffff');
 screen.style.setProperty('--sf88-art','url("./themes/illustrations/indie.webp")');
 </script>`;
 const checks=`<script>
 setTimeout(async()=>{
  let state={width:innerWidth};
  try{
   const button=document.getElementById('sf113AddMusic');
   button.click();
   const sheet=document.getElementById('sf76MusicSheet');
   state.sheetOpen=!!sheet&&!sheet.hidden;
   state.requestMoved=sheet.contains(document.getElementById('sf10RequestCard'));
   state.searchTab=sheet.querySelector('[data-sf76-tab="search"]').getAttribute('aria-selected')==='true';
   state.hiddenListener=getComputedStyle(document.querySelector('.sf128-presence')).display==='none';
   state.hiddenSecondCTA=getComputedStyle(document.getElementById('sf116Favorites')).display==='none';
   state.themed=document.body.classList.contains('sf133-themed-room');
   state.colored=!!getComputedStyle(sheet.querySelector('.sf76-panel')).borderTopColor;
   const favorites=sheet.querySelector('[data-sf76-tab="favorites"]');
   favorites.click();
   await new Promise(r=>setTimeout(r,120));
   const add=sheet.querySelector('[data-sf76-add]');
   state.favoritesVisible=!!add&&favorites.getAttribute('aria-selected')==='true';
   add?.click();
   await new Promise(r=>setTimeout(r,160));
   state.added=window.sf133Added.length===1&&window.sf133Added[0].title==='Faixa favorita';
   state.realQueue=document.querySelectorAll('#queueList .queue-item').length===1;
   window.sf76CloseMusic();
   state.restored=!document.getElementById('sf76MusicSheet').contains(document.getElementById('sf10RequestCard'));
   state.hiddenAgain=document.getElementById('sf76MusicSheet').hidden;
   state.pass=Object.entries(state).filter(([k])=>!['width','pass'].includes(k)).every(([_,v])=>v===true);
  }catch(e){state.error=String(e);state.pass=false;}
  const o=document.createElement('output');o.id='sf133Metrics';
  o.dataset.ok=String(state.pass);o.textContent=JSON.stringify(state);
  document.body.append(o);
 },350);
 </script>`;
 return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+inline+links+
 '</head><body>'+main+script+
 '<script src="./sonorafan-mobile-music-76.js"></script>'+
 '<script src="./sonorafan-room-redesign-113.js"></script>'+
 '<script src="./sonorafan-room-personalization-133.js"></script>'+
 checks+'</body></html>';
}
async function render(size){
 const user=fs.mkdtempSync(path.join(os.tmpdir(),'sf133-chrome-'));
 const file=path.join(publicDir,'.sf133-test-'+process.pid+'.html');
 fs.writeFileSync(file,fixture());
 try{return await new Promise((resolve,reject)=>{
  const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
   '--disable-background-networking','--disable-extensions','--allow-file-access-from-files',
   '--user-data-dir='+user,'--window-size='+size,'--virtual-time-budget=2500','--dump-dom','file://'+file];
  const child=spawn(chrome,args,{stdio:['ignore','pipe','pipe']});
  let data='',err='',done=false;
  const finish=(e,x)=>{if(done)return;done=true;clearTimeout(timer);e?reject(e):resolve(x)};
  const timer=setTimeout(()=>{child.kill('SIGKILL');finish(new Error('Chrome timeout '+err.slice(-260)))},20000);
  child.stdout.on('data',d=>data+=d.toString());
  child.stderr.on('data',d=>err+=d.toString());
  child.on('error',finish);
  child.on('close',code=>code===0?finish(null,data):finish(new Error('Chrome exited '+code+': '+err.slice(-200))));
 });}finally{fs.rmSync(file,{force:true});fs.rmSync(user,{recursive:true,force:true})}
}
test('Chromium verifies one dialog, favorite selection, queue update and theme on desktop and mobile',{skip:!chrome},async()=>{
 for(const size of ['1440,900','390,844']){
  const output=await render(size);
  const status=output.match(/id="sf133Metrics"[^>]*data-ok="([^"]+)"/)?.[1];
  const metrics=output.match(/<output[^>]*id="sf133Metrics"[^>]*>([^<]+)<\/output>/)?.[1];
  assert.equal(status,'true',size+': '+(metrics||output.slice(-650)));
 }
});
