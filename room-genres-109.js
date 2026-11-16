'use strict';
/* Explicit room genre and conservative compatibility for old rooms. A visual theme
   never implies a musical style. */
const ROOM_GENRES_109 = Object.freeze([
  {id:'indie',label:'Indie'}, {id:'rock',label:'Rock'},
  {id:'pop',label:'Pop'}, {id:'mpb',label:'MPB'},
  {id:'eletronica',label:'Eletrônica'}, {id:'alternativo',label:'Alternativo'},
  {id:'festival',label:'Festivais'}
]);
const ids=new Set(ROOM_GENRES_109.map(x=>x.id));
const normalizeRoomGenre109=value=>typeof value==='string'&&ids.has(value)?value:null;
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function legacyRoomGenre109(name,description){
  const n=fold(name+' '+(description||''));
  const guesses=[
    ['festival',/festival|festa|lolla|shows?/],
    ['eletronica',/eletron|techno|house|edm|dance|dj set/],
    ['mpb',/\bmpb\b|samba|bossa nova|musica brasileira/],
    ['alternativo',/alternativo|alternative/],
    ['indie',/indie/],['rock',/rock|metal|punk|grunge/],
    ['pop',/\bpop\b|hits/]
  ];
  return guesses.find(([id,pattern])=>pattern.test(n))?.[0]||null;
}
module.exports={ROOM_GENRES_109,normalizeRoomGenre109,legacyRoomGenre109};
