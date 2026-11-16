'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const content=p=>fs.readFileSync(path.join(root,p),'utf8');
const catalog=JSON.parse(content('public/themes/catalog-88.json'));
test('original Geral plus 14 illustrated room themes have safe asset paths',()=>{
 assert.equal(catalog.length,15);
 assert.equal(catalog[0].id,'geral');
 const ids=new Set();
 for(const t of catalog){
   assert.match(t.id,/^[a-z0-9_-]+$/);
   assert.ok(!ids.has(t.id),'Duplicate theme '+t.id);
   ids.add(t.id);
   for(const color of ['primary','secondary','bg','text'])assert.match(t[color],/^#[a-f0-9]{6}$/i);
   assert.equal(t.art,t.id==='geral'?'/art-44/vinyl-room.webp':'/themes/illustrations/'+t.id+'.webp');
   const file='public'+t.art;
   assert.ok(fs.existsSync(path.join(root,file)),file);
   if(t.id!=='geral'){
     const picture=fs.readFileSync(path.join(root,file));
     assert.equal(picture.subarray(0,4).toString('ascii'),'RIFF','Invalid WEBP header for '+t.id);
     assert.equal(picture.subarray(8,12).toString('ascii'),'WEBP','Invalid WEBP asset for '+t.id);
     assert.ok(picture.length>15000,'Artwork appears incomplete for '+t.id);
   }
 }
 for(const id of ['metal','emo','mpb','eletronica','indie','rock','pop','rap','funk','pagode','sertanejo','reggae','jazz','forro'])assert.ok(ids.has(id));
});
test('themes are persisted, listed and synchronized to listeners by server',()=>{
 const code=content('server.js');
 assert.match(code,/ROOM_THEME_IDS_88 = new Set/);
 assert.match(code,/normalizeRoomTheme88\(req\.body\.roomTheme\)/);
 assert.match(code,/roomTheme: normalizeRoomTheme88\(r\.roomTheme\)/);
 assert.match(code,/roomTheme: normalizeRoomTheme88\(room\.roomTheme\)/);
 assert.match(code,/if \(!ROOM_THEME_IDS_88\.has\(input\.roomTheme\)\)/);
 const start=code.indexOf("socket.on('updateRoomSettings'");
 const end=code.indexOf("socket.on('modAction'",start);
 assert.ok(start>=0&&end>start);
 const handler=code.slice(start,end);
 assert.match(handler,/!room \|\| !socket\.isAdmin/,'Only creator/admin can edit shared theme');
 assert.match(handler,/persistRoom\(room\); broadcastState\(room\.slug\)/);
});
test('room theme selector is available in creation, settings and room header',()=>{
 const html=content('public/index.html');
 for(const id of ['sf88CreateTheme','sf88EditTheme','sf88RoomThemeButton','sf88ThemeOverlay','sf88ThemePersonal','sf88ThemeShared','sf88ThemeReset'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/roomTheme: window\.sf88GetCreateTheme/);
 assert.match(html,/window\.sf88RoomState\?\.\(state\)/);
 assert.match(html,/window\.sf88Permission\?\.\(amIAdmin\)/);
 assert.match(html,/sonorafan-room-themes-88\.js/);
 assert.match(html,/sonorafan-room-themes-88\.css/);
});
test('personal visual override and room-wide choice are distinct',()=>{
 const app=content('public/sonorafan-room-themes-88.js');
 assert.match(app,/localStorage\.setItem\(storageKey\(slug\),id\)/);
 assert.match(app,/function applyPersonal/);
 assert.match(app,/function applyShared/);
 assert.match(app,/socket\.emit\('updateRoomSettings',\{roomTheme:modalChoice\}\)/);
 assert.match(app,/if\(!mayEdit\|\|!roomSlug/);
 assert.match(app,/personalOverride\|\|sharedTheme/);
});

test('Geral returns exact original styling without visual overrides',()=>{
 const js=content('public/sonorafan-room-themes-88.js');
 assert.match(js,/if\(chosen\.id==='geral'\)/);
 assert.match(js,/screen\.removeAttribute\('data-room-theme'\)/);
 assert.match(js,/screen\.style\.removeProperty\(key\)/);
 const srv=content('server.js');
 assert.match(srv,/normalizeRoomTheme88 = id => ROOM_THEME_IDS_88\.has\(id\) \? id : 'geral'/);
 assert.match(srv,/roomTheme: 'geral'/);
});

test('original genre mockups are used as illustrated WebP covers instead of simplified SVGs',()=>{
 const app=content('public/sonorafan-room-themes-88.js');
 assert.match(app,/t\.art==='\/themes\/illustrations\/'\+t\.id\+'\.webp'/);
 for(const id of ['metal','emo','mpb','eletronica']) {
   const t=catalog.find(x=>x.id===id);
   assert.ok(t.art.endsWith('.webp'),id);
   assert.ok(fs.statSync(path.join(root,'public'+t.art)).size>70000,id+' should keep high detail');
 }
});
