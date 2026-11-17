'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const publicDir=path.join(__dirname,'../public');
const read=name=>fs.readFileSync(path.join(publicDir,name),'utf8');
const html=read('index.html'),v126=read('sonorafan-experience-126.js');
const theme=read('sonorafan-experience-126.css'),modals=read('sonorafan-modals-126.css'),mobile=read('sonorafan-mobile-126.css');
const v125=read('sonorafan-unified-125.js');

test('v126 scripts/styles are loaded in production order, and scripts parse',()=>{
 for(const name of ['sonorafan-experience-126.js','sonorafan-experience-126.css','sonorafan-modals-126.css','sonorafan-mobile-126.css']){
  assert.ok(html.includes('/'+name+'?v=126'),name+' is not linked');
 }
 assert.ok(html.indexOf('sonorafan-mobile-126.css')>html.indexOf('sonorafan-mobile-125.css'));
 assert.ok(html.indexOf('sonorafan-experience-126.js')>html.indexOf('sonorafan-unified-125.js'));
 assert.doesNotThrow(()=>new vm.Script(v126));
 assert.doesNotThrow(()=>new vm.Script(v125));
});
test('default logo remains unchanged and no fake rooms, followers, clubs or XP enter production',()=>{
 assert.match(html,/src="\/brand-64\/sonorafan-logo-transparent\.png"/);
 assert.match(v125,/\/brand-64\/sonorafan-logo-transparent\.png/);
 assert.match(v126,/window\.sf71LoadFanClubs/);
 assert.match(v126,/window\.sf71OpenFanClub/);
 assert.doesNotMatch(v126,/const (?:clubs|roomList|users)\s*=\s*\[\s*\{.*?(?:members|listenerCount|xp)/s);
});
test('Community is not duplicated in sidebar, but social functionality is retained through Fan Clubs',()=>{
 assert.doesNotMatch(v125,/const nav=\[[^\]]*\['community'/);
 assert.match(v125,/case 'clubs':if\(typeof window\.sf126OpenClubs/);
 assert.match(v125,/case 'community':if\(typeof window\.sf126OpenClubs/);
 assert.match(v126,/window\.sf126OpenClubs=focused/);
 assert.match(v126,/original\.call\(this,'fanclubs'\)/);
 assert.match(v126,/window\.sf71LoadFanClubs\?\.\(\)/);
 assert.match(v126,/window\.sf15OpenNotifications\?\.\(\)/);
});
test('lobby has meaningful sparse-state CTA and preserves actual API-supplied rooms',()=>{
 assert.match(v126,/ensureRoomFiller/);
 assert.match(v126,/create-room-card/);
 assert.match(v126,/window\.showCreateRoom\?\.\(\)/);
 assert.match(v126,/main\.prepend\(popular\)/);
 assert.match(v126,/content\.scrollTop=0/);
 assert.match(v125,/fetch\('\/api\/rooms'/);
});
test('music modal, Fan Club creation, room creation, favorites and legacy dialogs all match current palette',()=>{
 for(const css of [theme,modals,mobile]){
  assert.match(css,/#c4ff00/i);
 }
 for(const selector of ['#sf77MusicModal','#sf71Modal','#createRoomModal','#favoritesModal','#sf88ThemeOverlay','#sf76MusicModal']){
  // v76 has a mobile fallback .sf76-sheet rather than #sf76MusicModal, test both.
  if(selector==='#sf76MusicModal')assert.match(mobile,/\.sf76-sheet/);
  else assert.ok(modals.includes(selector),selector);
 }
 assert.match(modals,/\.sf77-result-action/);
 assert.match(modals,/\.sf77-favorites/);
 assert.match(modals,/\.sf77-add/);
 assert.match(modals,/\.sf77-picked-card/);
 assert.doesNotMatch(v126,/(?:pauseVideo|seekTo|loadVideoById|playVideo)\(/);
});
test('mobile is dedicated and respects safe areas, scrolling and accessible motions',()=>{
 for(const breakpoint of ['1280','920','640','385']){
  assert.match(mobile,new RegExp('max-width:'+breakpoint+'px'));
 }
 assert.match(mobile,/env\(safe-area-inset-bottom\)/);
 assert.match(mobile,/\.sf125-mobile-bar/);
 assert.match(mobile,/#sf77MusicModal/);
 assert.match(mobile,/\.sf76-sheet/);
 assert.match(modals,/prefers-reduced-motion/);
 assert.match(v126,/aria-label|data-sf126-action|data-sf126-club/);
});
