'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'../public');
const load=file=>fs.readFileSync(path.join(base,file),'utf8');
const html=load('index.html');
const js=load('sonorafan-unified-125.js');
const css=load('sonorafan-unified-125.css');
const mobile=load('sonorafan-mobile-125.css');

test('all three v125 assets are linked last in document, and compile',()=>{
 for(const filename of ['sonorafan-unified-125.css','sonorafan-mobile-125.css','sonorafan-unified-125.js']){
  assert.match(html,new RegExp(filename.replace(/\./g,'\\.')+'\\?v=125'));
 }
 assert.ok(html.indexOf('sonorafan-unified-125.css')>html.indexOf('sonorafan-chat-neon-124.css'));
 assert.ok(html.indexOf('sonorafan-mobile-125.css')>html.indexOf('sonorafan-unified-125.css'));
 assert.ok(html.indexOf('sonorafan-unified-125.js')>html.indexOf('sonorafan-room-redesign-113.js'));
 assert.doesNotThrow(()=>new vm.Script(js));
});
test('brand original remains used, theme never replaces the standard logo',()=>{
 assert.match(js,/\/brand-64\/sonorafan-logo-transparent\.png/);
 assert.match(html,/sf113-brand" aria-label="SonoraFan"/);
 assert.match(html,/sf54-brand-image/);
 assert.doesNotMatch(js,/svg[^>]*SonoraFan|data:image|createObjectURL/);
});
test('six functional navigation choices and mobile fallback',()=>{
 for(const key of ['lobby','rooms','profile','community','clubs','ranking']){
  assert.match(js,new RegExp("case '"+key+"'"));
 }
 for(const feature of ['sf125Sidebar','sf125LobbyHero','sf125MobileBar','sf125LiveRooms','sf125Leaders']){
  assert.ok(js.includes(feature),feature+' must be rendered');
 }
 for(const size of ['1180','860','600','380']){
  assert.ok(mobile.includes('max-width:'+size+'px'),size+' media query');
 }
 assert.match(mobile,/env\(safe-area-inset-bottom\)/);
 assert.match(mobile,/sf107-mobile-nav/);
});
test('real rooms, real XP, real ranking and no fake numbers/participants',()=>{
 assert.match(js,/fetch\('\/api\/rooms'/);
 assert.match(js,/fetch\('\/api\/gamification\/leaderboard'/);
 assert.match(js,/data-sf125-slug/);
 assert.match(js,/esc\(room.name/);
 assert.match(js,/esc\(x.nome/);
});
test('respect background colors, contrast, existing YouTube player',()=>{
 for(const token of ['#0d0d0f','#c4ff00','#ff8200','#ef3cdb','#ffe000']){
  assert.ok(css.includes(token),'palette '+token);
 }
 assert.match(css,/#screen-lobby\.sf125-platform/);
 assert.match(css,/#sf43ProfileModal\.sf125-profile/);
 assert.match(css,/\.sf5-community-layer\.sf125-community/);
 assert.match(css,/#lbModal\.sf125-ranking/);
 assert.match(css,/#screen-room\.sf113-room/);
 assert.doesNotMatch(css,/#youtube-player[^,\n]*\{/);
 assert.doesNotMatch(js,/\b(?:setSize|seekTo|pauseVideo|playVideo|loadVideoById)\s*\(/);
});
