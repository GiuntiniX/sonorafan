'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('dedicated rooms page accepts exactly the same legacy identifiers as lobby',()=>{
 const lobby=read('public/sonorafan-lobby-107.js');
 const rooms=read('public/sonorafan-rooms-discovery-216.js');
 const extract=s=>s.match(/const valid=\w+=>([^;]+);/)?.[1];
 const a=extract(lobby),b=extract(rooms);
 assert.ok(a&&b);
 const checkA=new Function('x','return '+a);
 const checkB=new Function('v','return '+b);
 for(const slug of ['bts-army-123','música-bts-nov','são-paulo-abc','bts💜-amigos']){
   assert.equal(checkA(slug),true);
   assert.equal(checkB(slug),true,slug);
 }
 for(const slug of ['/rooms/test','a\\b','\n','', 'x'.repeat(141)]){
   assert.equal(checkB(slug),false,JSON.stringify(slug));
 }
});

test('all room entry buttons route through one reliable handler',()=>{
 const js=read('public/sonorafan-rooms-discovery-216.js');
 assert.match(js,/function enterRoom\(slug,manage=false\)/);
 assert.match(js,/if\(typeof join!=='function'\)/);
 assert.match(js,/try\{join\(slug\);\}/);
 assert.match(js,/if\(node\.hasAttribute\('data-sf216-join'\)\)\{enterRoom\(node\.dataset\.sf216Join\);return;\}/);
 assert.match(js,/if\(node\.hasAttribute\('data-sf216-manage'\)\)\{enterRoom\(node\.dataset\.sf216Manage,true\);return;\}/);
 assert.match(js,/data-sf216-join/);
 assert.match(js,/data-sf216-manage/);
});

test('manage only opens after the actual server acknowledgement',()=>{
 const js=read('public/sonorafan-rooms-discovery-216.js');
 const html=read('public/index.html');
 assert.match(js,/window\.sf216OnRoomJoined=function\(data\)/);
 assert.match(js,/window\.sf216ManageRoomAfterJoin!==data\.slug/);
 assert.match(html,/socket\.on\('joinedRoom'/);
 assert.match(html,/window\.sf216OnRoomJoined\?\.\(data\)/);
 assert.match(html,/sonorafan-rooms-discovery-216\.js\?v=234\.0/);
});
