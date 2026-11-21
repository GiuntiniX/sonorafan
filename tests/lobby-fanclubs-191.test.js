'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const js=read('public/sonorafan-lobby-107.js');
const css=read('public/sonorafan-fanclubs-lobby-191.css');
const index=read('public/index.html');
test('Fan Clubs lobby visual remains isolated to its own module',()=>{
 assert.match(index,/sonorafan-fanclubs-lobby-191\.css\?v=191\.0/);
 assert.match(index,/sonorafan-lobby-107\.js\?v=191\.0/);
 assert.match(js,/class="sf191-club-discovery"/);
 assert.match(css,/#screen-lobby \.sf191-club-discovery/);
 assert.match(css,/@media\(max-width:520px\)/);
 assert.doesNotMatch(css,/#screen-room|#signupModal|#loginScreen/);
});
test('Fan Club cards use real API information and preserve entry flow',()=>{
 assert.match(js,/load\('\/api\/fan-clubs'\)/);
 assert.match(js,/c\.coverVersion&&id/);
 assert.match(js,/c\.memberCount/);
 assert.match(js,/c\.description/);
 assert.match(js,/data-sf107-club=/);
 assert.match(js,/openClubs\(club\.dataset\.sf107Club\)/);
 assert.match(js,/data-sf107="club-create"/);
 assert.doesNotMatch(js,/3\.428 membros|12\.096 membros|26 comunidades de artistas/);
});
test('Search, sorting and genre discovery are wired to live state',()=>{
 for(const id of ['sf191ClubSearch','sf191ClubSort','sf191ClubFilters','sf191ClubChips'])assert.ok(js.includes(id),id);
 assert.match(js,/function clubGenre\(c\)/);
 assert.match(js,/state\.clubGenre==='todos'/);
 assert.match(js,/state\.clubSort==='new'/);
 assert.match(js,/state\.clubSort==='az'/);
 assert.match(js,/state\.clubQuery=/);
 assert.match(js,/data-sf191-genre/);
 assert.match(js,/data-sf191-reset/);
 assert.doesNotThrow(()=>new Function(js));
});
