'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const file=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');

test('profile dashboard and Fan Club agenda are included in main platform',()=>{
 const html=file('public/index.html');
 assert.match(html,/sonorafan-community-profile-202\.css\?v=205\.1/);
 assert.match(html,/sonorafan-profile-dashboard-202\.js\?v=206\.0/);
 for(const p of ['public/sonorafan-profile-dashboard-202.js','public/sonorafan-community-71.js',
  'public/sonorafan-agenda-200.js','public/sonorafan-profile-library-112.js'])new Function(file(p));
});

test('Fan Club events validate linked public rooms and expose room name',()=>{
 const server=file('fan-clubs-71.js');
 assert.match(server,/Escolha uma sala pública vinculada a este Fan Club/);
 assert.match(server,/roomSlug,notifyMembers,sendRoomLink,remindStart,attendeeIds:/);
 assert.match(server,/roomName:clean\(rooms\.get\(d\.data\(\)\.roomSlug\)/);
 assert.match(server,/app\.post\('\/api\/fan-clubs\/:id\/default-room'/);
 assert.match(server,/roomSlug:details\.roomSlug/);
});

test('creator supports room selection from club details and defaults',()=>{
 const code=file('public/sonorafan-agenda-200.js');
 assert.match(code,/sf202-room-link/);
 assert.match(code,/roomSlug:roomSelector\.value/);
 assert.match(code,/sf200CreateEvent/);
 assert.match(code,/defaultRoomSlug/);
});

test('profile shows distinct joined and managed clubs, confirmed events and notifications',()=>{
 const code=file('public/sonorafan-profile-dashboard-202.js');
 assert.match(code,/Fan Clubs que participo/);
 assert.match(code,/Fan Clubs que administro/);
 assert.match(code,/Próximos eventos confirmados/);
 assert.match(code,/\/api\/social\/notifications/);
 assert.match(code,/\/api\/music-agenda/);
});

test('Fan Club event details contain room-link and creator controls',()=>{
 const code=file('public/sonorafan-community-71.js');
 assert.match(code,/sf202-room-pill/);
 assert.match(code,/data-sf141-club-room/);
 assert.match(code,/sf202DefaultRoom/);
 assert.match(code,/data-sf170-create-event/);
});
