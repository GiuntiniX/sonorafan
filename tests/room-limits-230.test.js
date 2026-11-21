'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=p=>fs.readFileSync(path.join(root,p),'utf8');
const { MAX_ROOMS,MAX_PEOPLE_PER_ROOM,canCreateRoom,activeRoomCount,canJoinRoom }=require('../room-limits-230');

test('30 rooms globally, including the system room, never auto-delete existing rooms',()=>{
  assert.equal(MAX_ROOMS,30);
  assert.equal(canCreateRoom(new Map(Array.from({length:29},(_,i)=>[String(i),{}]))),true);
  assert.equal(canCreateRoom(new Map(Array.from({length:30},(_,i)=>[String(i),{}]))),false);
  assert.equal(canCreateRoom(new Map(Array.from({length:31},(_,i)=>[String(i),{}]))),false);
  const server=source('server.js');
  assert.match(server,/if \(!canCreateRoom\(rooms\)\) return res\.status\(409\)/);
  assert.match(server,/roomCatalogReady/);
  assert.match(server,/nenhuma sala será removida automaticamente/);
});

test('50 real socket connections per room, and rejoining does not consume another seat',()=>{
  assert.equal(MAX_PEOPLE_PER_ROOM,50);
  const ids=new Set(Array.from({length:50},(_,i)=>'socket'+i));
  const io={sockets:{adapter:{rooms:new Map([['bts',ids]])}}};
  assert.equal(activeRoomCount(io,'bts'),50);
  assert.equal(canJoinRoom(io,'bts','another'),false);
  assert.equal(canJoinRoom(io,'bts','socket1'),true);
  ids.delete('socket1');
  assert.equal(canJoinRoom(io,'bts','another'),true);
  assert.equal(activeRoomCount(io,'missing'),0);
});

test('joining, leaving and moderation always recalculate adapter occupancy',()=>{
  const server=source('server.js'),client=source('public/index.html');
  assert.match(server,/if \(!canJoinRoom\(io,slug,socket\.id\)\)/);
  assert.match(server,/if \(!queue\.includes\(socket\)\) queue\.push\(socket\)/);
  assert.match(server,/if \(currentRoom && currentRoom !== slug\)/);
  assert.match(server,/syncRoomOccupancy\(oldSlug\)/);
  assert.match(server,/syncRoomOccupancy\(slug\)/);
  assert.match(server,/clearWaitingSocket\(socket\)/);
  assert.match(server,/socket\.emit\('joinError'/);
  assert.match(client,/socket\.on\('joinError'/);
  assert.match(client,/sf230CreatingRoom/);
  assert.match(client,/\/api\/rooms\/limits/);
  assert.match(server,/MAX_PEOPLE_PER_ROOM/);
});

test('client receives an accurate capacity message and tracked local env is removed',()=>{
  const client=source('public/index.html');
  assert.match(client,/Até 30 salas na plataforma e 50 pessoas por sala/);
  assert.match(client,/socket\.on\('waitingRoom'/);
  assert.equal(fs.existsSync(path.join(root,'arquivo.env')),false);
  assert.match(source('.gitignore'),/^arquivo\.env$/m);
});
