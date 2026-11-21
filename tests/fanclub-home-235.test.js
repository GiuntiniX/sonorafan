'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Fanclub navigation opens real-data home dashboard and keeps details functional',()=>{
 const ui=read('public/sonorafan-fanclubs-home-235.js');
 const old=read('public/sonorafan-community-71.js');
 assert.match(ui,/function update\(clubs\)/);
 assert.match(ui,/window\.sf235UpdateFanclubs=update/);
 assert.match(ui,/window\.sf235ShowHome=show/);
 assert.match(ui,/window\.sf235HideHome=hide/);
 assert.match(old,/window\.sf235UpdateFanclubs\?\.\(state\.clubs\)/);
 assert.match(old,/window\.sf235ShowHome\?\.\(\)/);
 assert.match(old,/window\.sf235HideHome\?\.\(\)/);
 assert.match(ui,/window\.sf71OpenFanClub\?\.\(id\)/);
});

test('overview shows recommendation, my communities, events, posts and actual notifications',()=>{
 const ui=read('public/sonorafan-fanclubs-home-235.js');
 for(const title of ['Fan Clubs para conhecer','Convites e notificações','Sua comunidade musical','Publicações em destaque','Próximos eventos'])assert.ok(ui.includes(title),title);
 assert.match(ui,/fetch\('\/api\/social\/notifications'/);
 assert.match(ui,/fetch\('\/api\/fan-clubs\/'\+encodeURIComponent\(c\.id\)\+'\/posts'/);
 assert.match(ui,/fetch\('\/api\/fan-clubs\/'\+encodeURIComponent\(c\.id\)\+'\/events'/);
 assert.match(ui,/num\(featured\.memberCount\)/);
 assert.match(ui,/state\.clubs\.filter\(mine\)/);
 assert.doesNotMatch(ui,/482[.,]317|2[.,]846|42[.,]518/);
});

test('home has independent responsive CSS and versioned browser assets',()=>{
 const html=read('public/index.html'),css=read('public/sonorafan-fanclubs-home-235.css');
 assert.match(html,/sonorafan-fanclubs-home-235\.js\?v=235\.1/);
 assert.match(html,/sonorafan-fanclubs-home-235\.css\?v=235\.1/);
 assert.match(css,/#sf235Home \.sf235-layout/);
 assert.match(css,/@media\(max-width:780px\)/);
 assert.match(css,/@media\(max-width:470px\)/);
 assert.match(css,/#sfFanClubsPanel\.sf235-home-active/);
 assert.match(read('public/sonorafan-community-71.js'),/\$\('sf71ClubDetail'\)/);
});
