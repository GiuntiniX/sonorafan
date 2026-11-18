'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const {ROOM_GENRES_109,normalizeRoomGenre109,legacyRoomGenre109}=require('../room-genres-109');

test('Lobby: full catalog remains consistent across server, create-room form and discovery',()=>{
 const html=read('public/index.html'),lobby=read('public/sonorafan-lobby-107.js');
 const create=html.slice(html.indexOf('id="sf109GenrePicker"'),html.indexOf('id="sf109GenreError"'));
 assert.equal(ROOM_GENRES_109.length,32);
 const formIds=[...create.matchAll(/name="sf109RoomGenre" value="([a-z0-9]+)"/g)].map(m=>m[1]);
 const lobbySource=lobby.slice(lobby.indexOf('const styles=['),lobby.indexOf('const state='));
 const tiles=[...lobbySource.matchAll(/\['([a-z0-9]+)','[^']*','[^']+',art\./g)].map(x=>x[1]);
 assert.deepEqual(formIds,ROOM_GENRES_109.map(g=>g.id));
 assert.deepEqual(tiles,ROOM_GENRES_109.map(g=>g.id));
 for(const g of ROOM_GENRES_109)assert.equal(normalizeRoomGenre109(g.id),g.id);
});

test('Lobby: Todos os estilos expands the complete gallery and collapses on next click',()=>{
 const js=read('public/sonorafan-lobby-107.js');
 const css=read('public/sonorafan-lobby-107.css');
 assert(js.includes('id="sf107ShowStyles"'));
 assert(js.includes("case 'styles-toggle':"));
 assert(js.includes("state.stylesExpanded=!state.stylesExpanded"));
 assert(js.includes("state.genre='';state.all=false;sync()"));
 assert(js.includes('available.slice(0,7)'));
 assert(js.includes('state.stylesExpanded||q?available'));
 assert(js.includes("'Mostrar menos estilos ↑'"));
 assert(js.includes("'Todos os estilos ('+styles.length+') ›'"));
 assert(js.includes('id="sf107StyleSearch"'));
 assert(js.includes('data-sf107-genre='));
 assert(js.includes('aria-expanded'));
 assert(css.includes('.sf107-style-search'));
 assert(css.includes('.sf107-style-list'));
 assert(css.includes('prefers-reduced-motion'));
});

test('Lobby: room counts are derived from live public rooms and genre filters are exact',()=>{
 const js=read('public/sonorafan-lobby-107.js');
 assert(js.includes("allRooms()"));
 assert(js.includes("counts.set(room.genre"));
 assert(js.includes("if(state.genre&&r.genre!==state.genre)return false"));
 assert(js.includes('r.currentTrack?.artist'));
 assert(js.includes('room.listenerCount')||js.includes('r.listenerCount'));
 assert(js.includes('state.search'));
 assert(!js.includes('Lobby 6.0'));
});

test('Lobby: conservative migration preserves named legacy genres without inventing unspecified genre',()=>{
 assert.equal(legacyRoomGenre109('Noite Funk',''),'funk');
 assert.equal(legacyRoomGenre109('Pagode na laje',''),'pagode');
 assert.equal(legacyRoomGenre109('Noite de Metal',''),'metal');
 assert.equal(legacyRoomGenre109('Lo-fi para estudar',''),'lofi');
 assert.equal(legacyRoomGenre109('Salinha de música','tema visual roxo'),null);
});

test('Platform: hide visible version names while preserving ranking and lobby functionality',()=>{
 const files=['public/index.html','public/sonorafan-lobby-107.js',
   'public/sonorafan-ranking-60.js','public/sonorafan-profile-library-112.js'];
 for(const f of files){
   const src=read(f);
   // Source-code comments may carry an internal version marker; the customer-facing markup may not.
   const ui=src.replace(/\/\*[\s\S]*?\*\//g,'');
   assert.doesNotMatch(ui, /Ranking 6\.0|Lobby 6\.0/i,f);
 }
 const html=read('public/index.html');
 assert(html.includes('id="lbModal"'));
 assert(html.includes('sonorafan-ranking-60.js'));
 const lobby=read('public/sonorafan-lobby-107.js');
 assert(lobby.includes("case 'ranking'"));
 assert(lobby.includes("case 'create'"));
 assert(lobby.includes("case 'clubs'"));
 assert(lobby.includes("case 'scroll'"));
});
