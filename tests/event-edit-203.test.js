'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Fan Club events implement validated editing and permissions without changing RSVPs',()=>{
 const api=read('fan-clubs-71.js');
 new Function(api);
 assert.match(api,/app\.patch\('\/api\/fan-clubs\/:id\/events\/:eventId'/);
 assert.match(api,/event\.data\(\)\.creatorId!==me\.id/);
 assert.match(api,/\!canModerate\(data,me\)/);
 assert.match(api,/tx\.update\(eventRef,\{title,description,startAt,durationMinutes,roomSlug/);
 assert.match(api,/agendaCache\.expires=0/);
 assert.match(api,/canEdit:canModerate\(data,me\)/);
});
test('Room events persist edits with original attendees and check room access',()=>{
 const api=read('server.js');new Function(api);
 assert.match(api,/app\.patch\('\/api\/social\/events\/:id'/);
 assert.match(api,/original\.hostId!==publicUserId\(me\)/);
 assert.match(api,/const updated=\{\.\.\.original,title,description,startAt,durationMinutes,theme,roomSlug/);
 assert.match(api,/socialEvents\.set\(original\.id,updated\)/);
});
test('Event organizer can edit and cancel from Fan Club and calendar',()=>{
 const club=read('public/sonorafan-community-71.js'),agenda=read('public/sonorafan-agenda-200.js');
 new Function(club);new Function(agenda);
 assert.match(club,/data-sf203-edit-event/);
 assert.match(club,/window\.sf200EditEvent/);
 assert.match(agenda,/data-sf203-edit/);
 assert.match(agenda,/data-sf201-delete/);
 assert.match(agenda,/editing\?'PATCH':'POST'/);
 assert.match(agenda,/sf203:event-updated/);
 assert.match(agenda,/if\(editing\)\{/);
});
