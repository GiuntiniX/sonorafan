'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const content=p=>fs.readFileSync(path.join(root,p),'utf8');
const catalog=JSON.parse(content('public/themes/catalog-88.json'));
test('14 illustrated room themes have unique IDs and safe visual asset paths',()=>{
 assert.equal(catalog.length,14);
 const ids=new Set();
 for(const t of catalog){
   assert.match(t.id,/^[a-z0-9_-]+$/);
   assert.ok(!ids.has(t.id),'Duplicate theme '+t.id);
   ids.add(t.id);
   for(const color of ['primary','secondary','bg','text'])assert.match(t[color],/^#[a-f0-9]{6}$/i);
   assert.equal(t.art,'/themes/'+t.id+'.svg');
   const file='public'+t.art;
   assert.ok(fs.existsSync(path.join(root,file)),file);
   const art=content(file);
   assert.match(art,/<svg /);
   assert.match(art,/viewBox="0 0 1200 600"/);
   assert.ok(art.length>1100, 'SVG missing artwork '+t.id);
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
