'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('festival profile scripts are included and syntactically valid',()=>{
 const html=read('public/index.html'),ui=read('public/sonorafan-profile-dashboard-202.js');
 new Function(ui);
 assert.match(html,/sonorafan-profile-festival-206\.css\?v=206\.0/);
 assert.match(html,/sonorafan-profile-dashboard-202\.js\?v=206\.0/);
});
test('saved portrait is displayed independently with bounded image styles',()=>{
 const ui=read('public/sonorafan-profile-dashboard-202.js'),css=read('public/sonorafan-profile-festival-206.css');
 assert.match(ui,/sf43ProfileAvatar/);
 assert.match(ui,/sf206Portrait/);
 assert.match(ui,/new MutationObserver/);
 assert.doesNotMatch(ui,/cloneNode\(true\)/);
 assert.match(css,/\.sf206-portrait img#sf206Portrait/);
 assert.match(css,/object-fit:cover!important/);
 assert.match(css,/@media\(max-width:600px\)/);
});
test('all numbers are based on existing APIs and never invented',()=>{
 const ui=read('public/sonorafan-profile-dashboard-202.js');
 for(const api of ['/api/music-agenda','/api/fan-clubs?mine=true','/api/social/notifications','/api/community/profile','/api/ranking60/me'])
  assert.ok(ui.includes(api),'missing '+api);
 assert.match(ui,/num\(accepted\(\)\.length\)/);
 assert.match(ui,/num\(joined\(\)\.length\)/);
 assert.match(ui,/num\(managed\(\)\.length\)/);
 assert.match(ui,/data-sf206-journey/);
});
test('profile cards connect to native platform features',()=>{
 const ui=read('public/sonorafan-profile-dashboard-202.js');
 for(const key of ['sf206-edit','sf206-club','sf206-event','sf206-room','sf206-action','sf206-suggest'])
  assert.ok(ui.includes('data-'+key),key);
 for(const target of ['create-event','create-club','create-room','profile','library','achievements','dna'])
  assert.ok(ui.includes(target),target);
});
