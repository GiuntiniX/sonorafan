'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {ROOM_GENRES_109,normalizeRoomGenre109,legacyRoomGenre109}=require('../room-genres-109');
test('genre catalog matches seven labels presented in lobby',()=>{
 assert.deepEqual(ROOM_GENRES_109.map(x=>x.id),
 ['indie','rock','pop','mpb','eletronica','alternativo','festival']);
 assert.equal(new Set(ROOM_GENRES_109.map(x=>x.id)).size,7);
});
test('new rooms must provide one allowed explicit genre',()=>{
 for(const invalid of ['',null,undefined,'techno','trance','indie;rock','ROCK',{},123])
  assert.equal(normalizeRoomGenre109(invalid),null);
 for(const {id} of ROOM_GENRES_109)assert.equal(normalizeRoomGenre109(id),id);
});
test('old rooms get conservative style classification from their names only',()=>{
 assert.equal(legacyRoomGenre109('Noite do Rock',''), 'rock');
 assert.equal(legacyRoomGenre109('Festival Sonora',''), 'festival');
 assert.equal(legacyRoomGenre109('Sala Eletrônica',''), 'eletronica');
 assert.equal(legacyRoomGenre109('Lounge SonoraFan',''),null);
 assert.equal(legacyRoomGenre109('Boa música','tema do chat roxo'),null);
});
test('server persists and publishes the genre, lobby filters by its saved value',()=>{
 const root=path.join(__dirname,'..');
 const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
 const lobby=fs.readFileSync(path.join(root,'public/sonorafan-lobby-107.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
 assert.match(server,/genre=normalizeRoomGenre109\(req\.body\?\.genre\)/);
 assert.match(server,/room\.genre = genre/);
 assert.match(server,/genre: normalizeRoomGenre109\(r\.genre\)/);
 assert.match(server,/genre: r\.genre \|\| null/);
 assert.match(lobby,/if\(state\.genre&&r\.genre!==state\.genre\)return false/);
 assert.match(html,/name="sf109RoomGenre"/);
 assert.match(html,/const genre = document\.querySelector/);
});
