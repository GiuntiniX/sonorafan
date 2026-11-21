'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('new rooms use ASCII-safe slugs for accented names and whitespace',()=>{
 const source=read('server.js');
 const match=source.match(/const baseSlug=([^;]+);\s*const slug=baseSlug\+'-'\+Date\.now\(\)\.toString\(36\);/);
 assert.ok(match,'room slug normalizer is present in creation route');
 const normalize=new Function('name','return '+match[1]);
 assert.equal(normalize('Música BTS'), 'musica-bts');
 assert.equal(normalize('São Paulo!'), 'sao-paulo');
 assert.equal(normalize('BTS 💜 Army'), 'bts-army');
 assert.equal(normalize('日本語'), 'sala');
});

test('legacy rooms with accents are not hidden by the current lobby',()=>{
 const source=read('public/sonorafan-lobby-107.js');
 const match=source.match(/const valid=x=>([^;]+);/);
 assert.ok(match,'room slug validator found');
 const valid=new Function('x','return '+match[1]);
 for(const slug of ['bts-army-mok7','música-army-abc','são-paulo-123','bts💜-xyz'])
   assert.equal(valid(slug),true,slug);
 for(const slug of ['', '/api/test','x\\test','\n','a'.repeat(141)])
   assert.equal(valid(slug),false,slug);
 assert.match(source,/if\(room\)return go\(room\.dataset\.sf107Room\)/);
 assert.match(source,/state\.rooms=list\.filter\(r=>r&&valid\(r\.slug\)\)/);
});

test('a return to a room receives server acknowledgement and clears old socket state',()=>{
 const server=read('server.js'),html=read('public/index.html');
 assert.match(server,/socket\.emit\('joinedRoom',\{slug/);
 assert.match(server,/socket\.on\('leaveRoom'/);
 assert.match(server,/clearWaitingSocket\(socket\);\s*if \(!currentRoom\)/);
 assert.match(html,/socket\.on\('joinedRoom'/);
 assert.match(html,/socket\.on\('joinError'/);
 assert.match(html,/sf233ClearJoinTimer\(\)/);
 assert.match(html,/if \(!socket\.connected\) \{ socket\.connect\(\); return; \}/);
 assert.match(html,/state\.slug!==currentRoom\|\|state\.slug!==_joinedSlug/);
});

test('server cap remains 30 rooms and 50 participants',()=>{
 const limits=require('../room-limits-230');
 assert.equal(limits.MAX_ROOMS,30);
 assert.equal(limits.MAX_PEOPLE_PER_ROOM,50);
});
