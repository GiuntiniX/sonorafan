'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const catalog=JSON.parse(read('public/themes/catalog-88.json'));
const css=read('public/sonorafan-theme-atmospheres-143.css');
const themeJS=read('public/sonorafan-room-themes-88.js');
const modalJS=read('public/sonorafan-room-personalization-133.js');

test('each of the fourteen genre themes has its own new illustrated overlay and unchanged original WebP cover',()=>{
 const ids=catalog.filter(x=>x.id!=='geral').map(x=>x.id);
 assert.equal(ids.length,14);
 const bodies=new Set();
 for(const id of ids){
   const relative='public/themes/atmospheres/'+id+'.svg';
   assert.ok(fs.existsSync(path.join(root,relative)),relative);
   const art=read(relative);
   assert.match(art,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
   assert.match(art,/<\/svg>$/);
   assert.match(art,/width="1600" height="900"/);
   assert.match(art,/<(?:path|circle|rect|ellipse|g)\b/);
   assert.ok(art.length>1100,'Layer too plain: '+id);
   assert.ok(!bodies.has(art),'Duplicate artwork for '+id);
   bodies.add(art);
   assert.match(css,new RegExp('data-room-theme="'+id+'"'));
   assert.ok(css.includes('url("/themes/atmospheres/'+id+'.svg")'));
   assert.match(catalog.find(x=>x.id===id).art,/^\/themes\/[a-z0-9/_-]+\.webp$/);
 }
 assert.match(catalog.find(x=>x.id==='geral').art,/^\/themes\/[a-z0-9/_-]+\.webp$/);
 assert.doesNotMatch(css,/data-room-theme="geral"\]\s*\{/);
});

test('visual layer reuses room selector, follows personal/shared theme and leaves playback untouched',()=>{
 assert.match(themeJS,/overlay\.dataset\.sf143Preview=selected\.id/);
 assert.match(themeJS,/target\.dataset\.sf143Theme=theme\.id/);
 assert.match(themeJS,/socket\.emit\('updateRoomSettings',\{roomTheme:modalChoice\}\)/);
 assert.match(modalJS,/root\.dataset\.sf143Theme=id/);
 assert.match(modalJS,/delete root\.dataset\.sf143Theme/);
 assert.match(modalJS,/--sf143-body-scene/);
 assert.doesNotMatch(css,/pointer-events:none!important;.*player-frame/);
 assert.match(css,/chatMessagesInner/);
 assert.match(css,/background-image:none!important/);
 assert.match(css,/@media\(max-width:768px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('theme artwork stylesheet is loaded at end and does not create duplicate UI',()=>{
 const html=read('public/index.html');
 assert.match(html,/sonorafan-theme-atmospheres-143\.css\?v=143\.0/);
 assert.match(html,/sonorafan-room-themes-88\.js\?v=143\.0/);
 assert.match(html,/sonorafan-room-personalization-133\.js\?v=143\.0/);
 const old=html.indexOf('sonorafan-mobile-music-138.css');
 const newStyle=html.indexOf('sonorafan-theme-atmospheres-143.css');
 assert.ok(newStyle>old,'Last room stylesheet should own atmospheric treatment');
 for(const id of ['roomLayout','queueList','chatInput','sf88ThemeOverlay','sf88ThemeCards'])
   assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
});
