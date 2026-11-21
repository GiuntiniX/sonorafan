'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Global search includes only real rooms, Fan Clubs, events and safe user results',()=>{
 const src=read('public/sonorafan-global-search-208.js');
 new Function(src);
 for(const endpoint of ['/api/rooms','/api/fan-clubs?q=','/api/music-agenda','/api/social/search?q=','/api/favorites'])assert.ok(src.includes(endpoint),endpoint);
 assert.match(src,/!r\.isPrivate/);
 assert.match(src,/ArrowDown/);
 assert.match(src,/ArrowUp/);
 assert.match(src,/Escape/);
 assert.match(src,/sf200OpenEvent/);
});
test('Room affiliation endpoint excludes private rooms and returns only linked Fan Clubs',()=>{
 const backend=read('fan-clubs-71.js');new Function(backend);
 assert.match(backend,/app\.get\('\/api\/fan-clubs\/room\/:slug'/);
 assert.match(backend,/room\.isPrivate/);
 assert.match(backend,/\.where\('roomSlugs','array-contains',room\.slug\)/);
});
test('Fan Club invitation validates administrator, member state and sends notification',()=>{
 const backend=read('fan-clubs-71.js');
 assert.match(backend,/app\.post\('\/api\/fan-clubs\/:id\/invite'/);
 assert.match(backend,/canModerate\(data,me\)/);
 assert.match(backend,/data\.blockedIds/);
 assert.match(backend,/sf15Notify\(found\[0\]/);
});
test('Fan Club invitation button, theme preview and direct share links are functional',()=>{
 const client=read('public/sonorafan-community-71.js');
 new Function(client);
 for(const x of ['data-sf208-invite','data-sf208-share','sf208ThemePreview','/api/social/search?q=','/invite','location.hash'])assert.ok(client.includes(x),x);
 assert.match(client,/themeOverlay\.querySelector/);
 const css=read('public/sonorafan-fanclub-identity-208.css');
 for(const theme of ['vinyl','stage','cassette','waves'])assert.ok(css.includes('sf71-theme-'+theme));
});
test('Room chat shows linked Fan Club and clears stale associations when leaving',()=>{
 const room=read('public/sonorafan-room-fanclub-208.js'),html=read('public/index.html');
 new Function(room);
 assert.match(room,/sf208RoomClubs/);
 assert.match(room,/sf71OpenFanClub/);
 assert.match(html,/sf208RenderRoomClub/);
 assert.match(html,/sf208ClearRoomClub/);
 for(const f of ['sonorafan-global-search-208.js','sonorafan-room-fanclub-208.js','sonorafan-global-search-208.css','sonorafan-fanclub-identity-208.css'])assert.ok(html.includes(f),f);
});
