'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const folder=path.join(__dirname,'../public');
const html=fs.readFileSync(path.join(folder,'index.html'),'utf8');
const css=fs.readFileSync(path.join(folder,'sonorafan-room-redesign-113.css'),'utf8');
const js=fs.readFileSync(path.join(folder,'sonorafan-room-redesign-113.js'),'utf8');
const room=html.slice(html.indexOf('id="screen-room"'),html.indexOf('id="premiumMiniPlayer"'));

test('v133 room keeps the functional menu and moves favorites into the unified music dialog',()=>{
  assert.doesNotMatch(room,/<nav class="sf113-nav"/);
  for(const id of ['sf116MoreButton','sf116MorePanel','sf113AddMusic','sf116Favorites','queueCount']) {
    assert.equal(room.split('id="'+id+'"').length,2,'missing or duplicate '+id);
  }
  assert.match(room,/id="sf116Favorites"[^>]*hidden/);
  assert.match(room,/id="sf113AddMusic"[^>]*aria-haspopup="dialog"/);
  assert.match(room,/id="sf116MoreButton"[^>]*☰/);
  assert.match(room,/id="sf116MoreButton"[^>]*aria-expanded="false"/);
  assert.match(room,/id="sf116MorePanel"[^>]*role="menu"[^>]*hidden/);
  assert.doesNotMatch(room,/<details class="sf113-menu"/);
});

test('current and upcoming metadata preserve existing real queue and player ids',()=>{
  for(const id of ['sf113NowTitle','sf113NowArtist','sf116NextTitle','sf116NextArtist',
      'sf116NextDj','sf116NextCover','nextTrack','nextTitle','nextArtist',
      'trackTitle','trackArtist','trackCover','sf113VisualStage','sf116BandWordmark']) {
    assert.ok(html.includes('id="'+id+'"'),id);
  }
  assert.match(js,/window\.sf100PlayerSnapshot/);
  assert.match(js,/queue\[index \+ 1\]/);
  assert.match(js,/MutationObserver\(syncStageAndUpcoming\)/);
});

test('music stage uses shared theme art and current music thumbnail with no fake band photo',()=>{
  assert.match(css,/var\(--sf88-art/);
  assert.match(css,/\.sf116-record-shell/);
  assert.match(css,/\.sf116-artist-mark/);
  assert.match(css,/\.sf116-artist-stage/);
  assert.match(html,/id="sf113VisualBackdrop"/);
  assert.match(html,/id="sf113VisualCover"/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('desktop player is fixed and list/chat are the scroll areas',()=>{
  assert.match(css,/player-column\.sf34-player-column \.player-section\s*\{[^}]*grid-template-rows:minmax\(0,1fr\) auto!important/s);
  assert.match(css,/player-column\.sf34-player-column \.player-frame\s*\{[^}]*overflow:hidden!important/s);
  assert.match(css, /\.chat-messages-inner\s*\{[^}]*overflow-y:auto!important/s);
  assert.match(css,/#queueList\s*\{[^}]*overflow-y:auto!important/s);
});

test('menu actions close on outside pointer or Escape and JS parses cleanly',()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.match(js,/trigger\.addEventListener\('click'/);
  assert.match(js,/document\.addEventListener\('pointerdown'/);
  assert.match(js,/event\.key === 'Escape'/);
  assert.match(js,/menuOpen\(false, true\)/);
  assert.doesNotMatch(js,/\b(?:pauseVideo|playVideo|loadVideoById|socket\.emit)\s*\(/);
});
