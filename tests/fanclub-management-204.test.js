'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('Fan Club room management and identity scripts remain syntactically valid',()=>{
 const api=read('fan-clubs-71.js'),client=read('public/sonorafan-community-71.js');
 new Function(api);new Function(client);
});
test('founder can edit the community identity with validated genre and theme',()=>{
 const api=read('fan-clubs-71.js');
 assert.match(api,/app\.patch\('\/api\/fan-clubs\/:id\/identity'/);
 assert.match(api,/ownerOrAdmin\(data,me\)/);
 assert.match(api,/GENRES\.has\(genre\)/);
 assert.match(api,/THEMES\.has\(theme\)/);
 assert.match(api,/profileUpdatedBy:me\.id/);
});
test('room replacement is atomic and maintains the default room',()=>{
 const api=read('fan-clubs-71.js');
 assert.match(api,/app\.patch\('\/api\/fan-clubs\/:id\/rooms\/:slug'/);
 assert.match(api,/room\.ownerEmail!==me\.email/);
 assert.match(api,/defaultRoomSlug=data\.defaultRoomSlug===oldSlug\?slug/);
 assert.match(api,/roomSlugs:slugs,defaultRoomSlug/);
 assert.match(api,/defaultRoomSlug:snap\.data\(\)\.defaultRoomSlug===req\.params\.slug\?'':/);
});
test('room manager has live replace, unlink, primary, and identity controls',()=>{
 const client=read('public/sonorafan-community-71.js');
 for(const action of ['data-sf204-replace-room','data-sf204-unlink-room','data-sf204-make-default',
   'data-sf71-addroom','data-sf204-edit-identity','sf204-room-manager'])assert.ok(client.includes(action),action);
 assert.match(client,/refreshClubRooms\(id\)/);
 assert.match(client,/data-sf160-pane="rooms"/);
});
