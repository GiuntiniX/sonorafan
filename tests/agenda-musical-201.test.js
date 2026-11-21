'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('Agenda Musical scripts remain valid and are mounted from the main page',()=>{
 const html=read('public/index.html');
 const ui=read('public/sonorafan-agenda-200.js');
 const backend=read('fan-clubs-71.js');
 new Function(ui);
 new Function(backend);
 assert.match(html,/sonorafan-agenda-200\.css/);
 assert.match(html,/sonorafan-agenda-200\.js/);
 assert.match(ui,/sf200OpenAgenda/);
 assert.match(ui,/sf200CloseAgenda/);
});

test('Agenda aggregates Fan Club and public-room events without returning attendee identities',()=>{
 const api=read('fan-clubs-71.js');
 assert.match(api,/app\.get\('\/api\/music-agenda'/);
 assert.match(api,/collection\('events'\)/);
 assert.match(api,/socialEvents\?\.values/);
 assert.match(api,/rooms\.get\(e\.roomSlug\)\.isPrivate/);
 assert.match(api,/const \{attendeeIds,memberIds,blockedIds,moderatorIds,ownerId,hostId,\.\.\.publicData\}/);
 assert.match(api,/req\.query\.refresh==='1'/);
});

test('Event creation respects both existing permission-gated APIs and exposes proper user controls',()=>{
 const ui=read('public/sonorafan-agenda-200.js');
 assert.match(ui,/data-sf201-create/);
 assert.match(ui,/sf201CreateForm/);
 assert.match(ui,/\/api\/social\/my-rooms/);
 assert.match(ui,/\/api\/fan-clubs\?mine=true/);
 assert.match(ui,/c=>c\.canModerate/);
 assert.match(ui,/\/api\/social\/events/);
 assert.match(ui,/\/events'/);
 assert.match(ui,/data-sf200-month/);
 assert.match(ui,/data-sf200-date/);
 assert.match(ui,/data-sf201-mine/);
 assert.match(ui,/data-sf201-today/);
});

test('Agenda has a distinctive empty hero, responsive styles and dedicated navigation',()=>{
 const ui=read('public/sonorafan-agenda-200.js');
 const css=read('public/sonorafan-agenda-200.css');
 const nav=read('public/sonorafan-unified-125.js');
 assert.match(ui,/Crie o próximo encontro musical/);
 assert.match(ui,/sonorafan-todos-os-generos-home\.avif/);
 assert.match(css,/\.sf201-create-dialog/);
 assert.match(css,/@media\(max-width:580px\)/);
 assert.match(nav,/\['agenda','▦','Agenda Musical'\]/);
 assert.match(nav,/case 'agenda':window\.sf200OpenAgenda/);
});
