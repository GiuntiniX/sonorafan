'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const base = path.resolve(__dirname, '..');
const pub = path.join(base, 'public');
const read = name => fs.readFileSync(path.join(base,name), 'utf8');
const html = read('public/index.html');
const css = read('public/sonorafan-mobile-room-135.css');
const musicJS = read('public/sonorafan-mobile-music-76.js');
const chrome = [process.env.CHROME_BIN,'/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable','/usr/bin/chromium'].filter(Boolean).find(fs.existsSync);

test('v135 mobile tabs contain queue, player, chat and unified music/favorites', () => {
  const a=html.indexOf('<!-- ROOM -->');
  const b=html.indexOf('<!-- CREATE ROOM -->',a);
  assert.ok(a>=0&&b>a,'room HTML');
  const room=html.slice(a,b);
  for(const tab of ['queue','player','chat']) {
    assert.match(room,new RegExp('data-t="'+tab+'"'));
  }
  assert.match(room,/class="sf34-add-mobile sf135-add-music"/);
  assert.match(room,/aria-label="Adicionar música: buscar ou escolher das favoritas"/);
  assert.match(room,/aria-controls="sf76MusicSheet"/);
  assert.match(html,/sonorafan-mobile-room-135\.css\?v=137/);
  assert.match(css,/#screen-room\.sf113-room #mTabs\.mtabs/);
  assert.match(html,/sonorafan-mobile-room-136\.css\?v=140\.0/);
  assert.match(html,/sonorafan-mobile-room-136\.js\?v=140\.0/);
  assert.match(css,/body\[data-tab="chat"\]/);
  assert.match(css,/#chatMessagesInner/);
  assert.match(css,/#sf113AddMusic/);
  assert.match(musicJS,/data-sf76-tab="favorites"/);
  assert.match(musicJS,/window\.sf76OpenMusic=open/);
});

test('v135 room chat and queue remain real, single functional components',()=>{
 const room=html.slice(html.indexOf('<!-- ROOM -->'),html.indexOf('<!-- CREATE ROOM -->'));
 for(const id of ['mTabs','sf113AddMusic','queueList','chatMessagesInner','chatInput','sf76ViewQueue']){
  const expected=id==='sf76ViewQueue'?0:1;
  assert.equal((room.match(new RegExp('id="'+id+'"','g'))||[]).length,expected,id);
 }
 assert.match(room,/class="sf5-bottom-row"/);
 assert.match(css,/#roomLayout > \.sf5-bottom-row/);
 assert.match(css,/#mTabs > \.sf34-add-mobile/);
});

function fixture() {
 const a=html.indexOf('<!-- ROOM -->');
 const b=html.indexOf('<!-- CREATE ROOM -->',a);
 const room=html.slice(a,b).replace(/src="\//g,'src="./');
 const inline=html.match(/<style>[\s\S]*?<\/style>/)?.[0]||'';
 const links=[...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g)]
   .map(x=>x[0].replace(/href="\//g,'href="./')).join('\n');
 const start=html.indexOf('    function setTab(tab) {');
 const end=html.indexOf("    setTab('player');",start);
 assert.ok(start>=0&&end>start,'live setTab implementation');
 const originalTab=html.slice(start,end);
 const pre=`<script>
  const currentRoom='mobile-test';
  const currentRoomData={queue:[],waitingQueue:[],maxDuration:600};
  const socket={connected:true};
  const myFavorites=[];
  let userScrolledUp=false,unreadMessages=0;
  const $=id=>document.getElementById(id);
  function scrollChatToBottom(){}
  ${originalTab}
  document.body.classList.add('sf64-room-sidebar-collapsed');
  document.getElementById('screen-room').classList.add('active');
  setTab('player');
  window.fetch=async(url)=>{
    if(String(url).includes('/api/favorites')) return {ok:true,json:async()=>[{id:'dQw4w9WgXcQ',title:'Favorita teste',artist:'Artista'}]};
    if(String(url).includes('/api/search-youtube'))return {ok:true,json:async()=>({items:[{id:'dQw4w9WgXcQ',title:'Metallica teste',artist:'Metallica'}]})};
    if(String(url).includes('/api/favorite-genres'))return {ok:true,json:async()=>({genres:[]})};
    if(String(url).includes('/api/video-info'))return {ok:true,json:async()=>({embeddable:true,duration:180})};
    throw Error('Unexpected API '+url);
  };
  </script>`;
 const post=`<script>
  setTimeout(async()=>{
    const metric={width:innerWidth,height:innerHeight};
    try {
      const rect=e=>e.getBoundingClientRect();
      const visible=e=>!!e&&getComputedStyle(e).display!=='none'&&rect(e).width>30&&rect(e).height>20&&rect(e).top<innerHeight&&rect(e).bottom>0;
      const nav=document.getElementById('mTabs');
      const music=nav.querySelector('.sf34-add-mobile');
      metric.nav=visible(nav);
      metric.navBottom=rect(nav).bottom<=innerHeight+2;
      const app=document.querySelector('#screen-room > .app');
      const layout=document.getElementById('roomLayout');
      metric.docked=Math.abs(rect(nav).top-rect(layout).bottom)<6;
      metric.headerCompact=rect(document.querySelector('#screen-room .header')).height<=60;
      metric.appFits=rect(app).bottom<=innerHeight+2;
      metric.welcome=!document.getElementById('sf136MobileWelcome');
      metric.music=visible(music);
      metric.musicLabel=music.getAttribute('aria-label').includes('favoritas');
      metric.tabCount=nav.querySelectorAll('button[data-t]').length===3;
      music.click();
      await new Promise(r=>setTimeout(r,80));
      const sheet=document.getElementById('sf76MusicSheet');
      metric.sheetOpen=!!sheet&&!sheet.hidden&&visible(sheet.querySelector('.sf76-panel'));
      metric.searchVisible=visible(document.getElementById('sf138SearchQuery'));
      metric.mobileFormIndependent=!sheet.contains(document.getElementById('sf10RequestCard'));
      metric.singleModal=document.getElementById('sf77MusicModal')?.hidden===true;
      window.sf77OpenSearch('Metallica');
      metric.redirected=sheet.hidden===false && document.getElementById('sf77MusicModal').hidden &&
        document.getElementById('sf138SearchQuery')?.value==='Metallica';
      const field=document.getElementById('sf138SearchQuery');
      field.dispatchEvent(new Event('input',{bubbles:true}));
      await new Promise(r=>setTimeout(r,450));
      metric.inlineResults=!!sheet.querySelector('#sf76InlineResultsHost .sf78-row');
      metric.inlineInSameModal=!!sheet.querySelector('#sf78InlineSearch.sf134-inline') &&
        document.getElementById('sf77MusicModal').hidden;
      const favorites=sheet.querySelector('[data-sf76-tab="favorites"]');
      favorites.click();
      await new Promise(r=>setTimeout(r,100));
      metric.favoriteTab=!document.getElementById('sf76FavoritesPane').hidden;
      metric.favoriteResults=!!document.querySelector('#sf76FavoritesList [data-sf76-add]');
      window.sf76CloseMusic();
      metric.sheetClosed=sheet.hidden;
      setTab('chat');
      const chat=document.querySelector('#roomLayout .chat-column');
      const input=document.getElementById('chatInput');
      const history=document.getElementById('chatMessagesInner');
      metric.chat=visible(chat);
      metric.chatInput=visible(input);
      metric.chatLog=getComputedStyle(history).overflowY==='auto' && rect(history).height>30;
      metric.chatAboveTabs=rect(input).bottom<=rect(nav).top+8;
      metric.chatSelected=nav.querySelector('[data-t="chat"]').getAttribute('aria-pressed')==='true';
      setTab('queue');
      const add=document.getElementById('sf113AddMusic');
      metric.queue=visible(document.querySelector('#roomLayout .queue-column'));
      metric.queueAdd=visible(add);
      metric.queueSelected=nav.querySelector('[data-t="queue"]').getAttribute('aria-pressed')==='true';
      add.click();
      await new Promise(r=>setTimeout(r,70));
      metric.addOpensSheet=!document.getElementById('sf76MusicSheet').hidden;
      metric.pass=Object.entries(metric).filter(([k])=>!['width','height','pass'].includes(k)).every(([_,v])=>v===true);
    }catch(e){metric.error=String(e);metric.pass=false;}
    const result=document.createElement('output');result.id='sf135Metrics';
    result.dataset.ok=String(metric.pass);result.textContent=JSON.stringify(metric);
    document.body.append(result);
  },380);
  </script>`;
 return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
  inline+links+'</head><body>'+room+pre+
  '<script src="./sonorafan-mobile-music-76.js"></script>'+
  '<script src="./sonorafan-search-77.js"></script>'+
  '<script src="./sonorafan-inline-search-78.js"></script>'+
  '<script src="./sonorafan-room-redesign-113.js"></script>'+
  '<script src="./sonorafan-mobile-room-136.js"></script>'+
  post+'</body></html>';
}
async function render(size){
 const user=fs.mkdtempSync(path.join(os.tmpdir(),'sf135-chrome-'));
 const file=path.join(pub,'.sf135-test-'+process.pid+'.html');
 fs.writeFileSync(file,fixture());
 try{return await new Promise((resolve,reject)=>{
  const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--disable-background-networking','--disable-extensions','--allow-file-access-from-files',
    '--user-data-dir='+user,'--window-size='+size,'--virtual-time-budget=2000','--dump-dom','file://'+file];
  const child=spawn(chrome,args,{stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='',finished=false;
  const done=(err,value)=>{if(finished)return;finished=true;clearTimeout(timer);err?reject(err):resolve(value);};
  const timer=setTimeout(()=>{child.kill('SIGKILL');done(Error('Chrome timeout: '+stderr.slice(-220)))},20000);
  child.stdout.on('data',d=>stdout+=d);
  child.stderr.on('data',d=>stderr+=d);
  child.on('error',done);
  child.on('close',code=>code===0?done(null,stdout):done(Error('Chrome exit '+code+' '+stderr.slice(-220))));
 });}finally{fs.rmSync(file,{force:true});fs.rmSync(user,{recursive:true,force:true});}
}

test('Chromium: mobile Player → Music/Favorites → Chat → Queue/Add, with visible controls',{
 skip:!chrome
},async()=>{
 for(const size of ['390,844','360,740','430,932']){
  const html=await render(size);
  const match=html.match(/<output[^>]*id="sf135Metrics"[^>]*>([^<]+)<\/output>/)?.[1];
  const ok=html.match(/id="sf135Metrics"[^>]*data-ok="([^"]+)"/)?.[1];
  assert.equal(ok,'true',size+': '+(match||html.slice(-550)));
 }
});
