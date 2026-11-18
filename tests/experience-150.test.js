'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('performance: results cache is bounded, expires and never persists private information',()=>{
 const source=read('public/sonorafan-search-77.js');
 const start=source.indexOf('  const sf150SearchCache=new Map()');
 const end=source.indexOf('\n  function build()',start);
 assert.ok(start>0&&end>start);
 const ctx={Map,Date,String};
 vm.runInNewContext(source.slice(start,end)+'\nthis.cache=sf150Cached;this.remember=sf150Remember;this.entries=sf150SearchCache;',ctx);
 const value=[{id:'aaaaaaaaaaa',title:'Música',artist:'Artista'}];
 ctx.remember('  ARTISTA  ',value);
 assert.equal(ctx.cache('artista').length,1);
 for(let i=0;i<22;i++)ctx.remember('q'+i,value);
 assert.ok(ctx.entries.size<=16);
 assert.equal(ctx.cache('artista'),null);
 assert.doesNotMatch(source.slice(start,end),/localStorage|sessionStorage|document\.cookie|idToken/);
 assert.match(source,/uniqueIds\.has\(item\.id\)/);
});

test('inline search for mobile reuses bounded results, without changing queue permissions',()=>{
 const source=read('public/sonorafan-inline-search-78.js');
 assert.match(source,/const sf150InlineCache=new Map\(\)/);
 assert.match(source,/if\(sf150InlineCache\.size>12\)/);
 assert.match(source,/Date\.now\(\)-item\.at>90000/);
 assert.match(source,/!seen\.has\(item\.id\)/);
 assert.match(source,/window\.sf78SearchFromField/);
 assert.match(read('public/index.html'),/sonorafan-inline-search-78\.js\?v=150\.0/);
});

test('lobby: only real public rooms, now-playing labels and bounded live refresh',()=>{
 const source=read('public/sonorafan-lobby-107.js');
 assert.match(source,/!r\.isPrivate&&valid\(r\.slug\)/);
 assert.match(source,/sf150-room-nowplaying/);
 assert.match(source,/r\.currentTrack\?\.title/);
 assert.match(source,/let sf150RoomFetch=null/);
 assert.match(source,/if\(!active\(\)\|\|document\.hidden\|\|sf150RoomFetch/);
 assert.match(source,/new AbortController\(\)/);
 assert.match(source,/sf150RoomFetch=null;\}/);
 assert.match(source,/data-sf107-room=/);
});

test('social identity respects existing permissions and keeps earned badges',()=>{
 const social=read('public/sonorafan-community-110.js');
 const profile=read('public/sonorafan-profile-108.js');
 assert.match(social,/state\.friends\.filter\(f=>f\.online\)/);
 assert.match(social,/sf150-presence-count/);
 assert.match(social,/data-sf110-friend=/);
 assert.match(profile,/id="sf150MusicIdentity"/);
 assert.match(profile,/genres\.slice\(0,3\)/);
 assert.match(profile,/badges\.slice\(0,6\)/);
 assert.match(profile,/medalhas oficiais/);
 assert.match(profile,/showListeningActivity:before\.showListeningActivity!==false/);
});

test('history uses real authenticated setlist and local search, no duplicate playlist',()=>{
 const js=read('public/sonorafan-evolution-63.js');
 assert.match(js,/\/api\/platform63\/history\//);
 assert.match(js,/sf150HistorySearch/);
 assert.match(js,/sf150-history-item/);
 assert.match(js,/item\.hidden=!!q&&!hay\.includes\(q\)/);
 assert.match(js,/\/api\/platform63\/setlist\//);
 assert.match(js,/trackCard\(t,'song:'\+t\.id\)/);
});

test('Fan Club mantém foco na comunidade, sem compartilhamento musical no mural',()=>{
 const js=read('public/sonorafan-community-71.js');
 const server=read('fan-clubs-71.js');
 const studio=read('public/sonorafan-studio-100.js');
 assert(js.includes('/api/fan-clubs/'));
 assert.match(js,/data-sf160-comments/);
 assert.match(js,/data-sf160-create-poll/);
 assert.match(js,/data-sf160-pane/);
 assert.doesNotMatch(js,/data-sf140-share-song|data-sf150-music-filter|state\.onlyMusic|musicCard\(/);
 assert.doesNotMatch(js,/\['music','Músicas'\]|\/api\/fan-clubs\/.*\/music/);
 assert.doesNotMatch(server,/app\.get\('\/api\/fan-clubs\/:id\/music'/);
 assert.doesNotMatch(studio,/mix-club|club-post|Enviar ao Fan Club/);
 assert.match(studio,/mix-copy/);
});

test('admin metrics are aggregated, access restriction preserved and no personal logs added',()=>{
 const source=read('public/sonorafan-studio-100.js');
 const server=read('sonorafan-studio-100.js');
 assert.match(source,/sf150-quality-overview/);
 assert.match(source,/sf150-device-breakdown/);
 assert.match(source,/state\.qualityAllowed&&!state\.loading&&!state\.qualityDenied/);
 assert.match(source,/d\?\.byDevice\|\|\{\}/);
 assert.match(source,/sf150Recent\.filter\(e=>Number\(e\.at\)>Date\.now\(\)-3600000\)/);
 assert.match(server,/if\(!adminEmails\.has\(email\)\)return res\.status\(403\)/);
 assert.match(server,/quality\.recent\.slice\(0,40\)/);
});

test('responsive design keeps the single queue, chat, player and original theme picker',()=>{
 const css=read('public/sonorafan-experience-150.css');
 const html=read('public/index.html');
 assert.match(css,/@media\(max-width:768px\)/);
 assert.match(css,/@media\(min-width:769px\) and \(max-width:1100px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/#screen-room\.sf113-room > \.app > #mTabs\.mtabs/);
 assert.match(css,/#sf88ThemeOverlay \.sf88-theme-card/);
 assert.match(css,/#sf95Overlay \.sf150-quality-overview/);
 for(const id of ['queueList','chatInput','roomLayout','sf88ThemeOverlay'])
   assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.match(html,/sonorafan-experience-150\.css\?v=150\.1/);
 assert.match(html,/sonorafan-studio-100\.js\?v=161\.0/);
});
