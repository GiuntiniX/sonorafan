'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('calendar event uses existing scheduled event with a 30-minute reminder',async()=>{
 const source=read('public/sonorafan-studio-100.js');
 const start=source.indexOf(' const eventCalendar=(e)=>');
 const end=source.indexOf(' const prefsKey=',start);
 assert.ok(start>0&&end>start,'calendar export helper present');
 const context={Blob,Date,Number,Math,String};
 vm.runInNewContext(source.slice(start,end)+';this.exportCalendar=eventCalendar;',context);
 const blob=context.exportCalendar({
   id:'6edfee44-1192-439b-9964-4b6aaa0f4569',
   title:'Show, Indie; Amigos',roomName:'Sala Rock',
   startAt:Date.parse('2026-12-10T22:00:00Z'),durationMinutes:90
 });
 assert.equal(blob.type,'text/calendar;charset=utf-8');
 const calendar=await blob.text();
 assert.match(calendar,/BEGIN:VCALENDAR/);
 assert.match(calendar,/DTSTART:20261210T220000Z/);
 assert.match(calendar,/DTEND:20261210T233000Z/);
 assert.match(calendar,/TRIGGER:-PT30M/);
 assert.match(calendar,/Show\\, Indie\\; Amigos/);
 assert.match(calendar,/END:VCALENDAR/);
});

test('service worker intercepts only public artwork and bypasses private requests',()=>{
 const callbacks={};
 const context={
   self:{
     location:{origin:'https://app.example'},
     addEventListener:(kind,cb)=>{callbacks[kind]=cb;},
     skipWaiting(){},clients:{claim(){}}
   },
   caches:{open:async()=>({match:async()=>null,put:async()=>{},keys:async()=>[]})},URL,Response,
   fetch:async()=>({ok:false,type:'error'})
 };
 vm.runInNewContext(read('public/sf-static-142-sw.js'),context);
 assert.ok(callbacks.fetch);
 function intercepted(url,extra={}){
   let called=false;
   const req={method:'GET',mode:'cors',url,headers:{has:()=>false},...extra};
   callbacks.fetch({request:req,respondWith:promise=>{called=true;promise.catch(()=>{});}});
   return called;
 }
 assert.equal(intercepted('https://app.example/api/me'),false);
 assert.equal(intercepted('https://app.example/socket.io/socket.io.js'),false);
 assert.equal(intercepted('https://app.example/sonorafan-studio-100.js'),false);
 assert.equal(intercepted('https://app.example/'),false);
 assert.equal(intercepted('https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg'),false);
 assert.equal(intercepted('https://app.example/brand-64/sonorafan-icon-192.png'),true);
 assert.equal(intercepted('https://app.example/art-44/vinyl-room.webp'),true);
 assert.equal(intercepted('https://app.example/art-44/vinyl-room.webp',{headers:{has:()=>true}}),false);
});

test('PWA avoids duplicating the existing room connection banner',()=>{
 const pwa=read('public/sonorafan-pwa-83.js');
 assert.match(pwa,/existing=document\.getElementById\('connBanner'\)/);
 assert.match(pwa,/if\(room&&existing\)return;/);
 assert.match(pwa,/serviceWorker\.register\('\/sf-static-142-sw\.js'/);
 assert.match(pwa,/window\.addEventListener\('online'/);
});

test('player health is scoped, throttled and surfaced only in admin quality',()=>{
 const client=read('public/sonorafan-studio-100.js');
 const server=read('sonorafan-studio-100.js');
 assert.match(client,/function playerHealthTick\(/);
 assert.match(client,/if\(document\.hidden\|\|!roomActive\(\)/);
 assert.match(client,/now-bufferingStarted>=16000/);
 assert.match(client,/now-lastBufferReport>120000/);
 assert.match(client,/connection-lost/);
 assert.match(client,/connection-restored/);
 assert.match(client,/Buffer prolongado/);
 assert.match(client,/state\.qualityAllowed&&!state\.loading&&!state\.qualityDenied/);
 assert.match(server,/connection-lost/);
 assert.match(server,/player-buffering/);
 assert.match(server,/app\.get\('\/api\/admin\/studio100\/quality'/);
});

test('frontend links refreshed files without a second player or chat',()=>{
 const html=read('public/index.html');
 for(const filename of ['sonorafan-studio-100.js','sonorafan-pwa-83.js','sonorafan-community-71.js']){
   assert.match(html,new RegExp(filename.replace(/\./g,'\\.')+'\\?v=142\\.0'));
 }
 assert.equal((html.match(/id="queueList"/g)||[]).length,1);
 assert.equal((html.match(/id="chatInput"/g)||[]).length,1);
});
