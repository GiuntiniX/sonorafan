'use strict';
/* Explicit room genre and conservative compatibility for old rooms. A visual theme
   never implies a musical style. */
const ROOM_GENRES_109 = Object.freeze([
  {id:'indie',label:'Indie'}, {id:'rock',label:'Rock'},
  {id:'pop',label:'Pop'}, {id:'mpb',label:'MPB'},
  {id:'eletronica',label:'Eletrônica'}, {id:'alternativo',label:'Alternativo'},
  {id:'festival',label:'Festivais'},
  {id:'funk',label:'Funk'}, {id:'rap',label:'Rap'},
  {id:'trap',label:'Trap'}, {id:'hiphop',label:'Hip-hop'},
  {id:'pagode',label:'Pagode'}, {id:'samba',label:'Samba'},
  {id:'sertanejo',label:'Sertanejo'}, {id:'forro',label:'Forró'},
  {id:'reggae',label:'Reggae'}, {id:'metal',label:'Metal'},
  {id:'punk',label:'Punk'}, {id:'jazz',label:'Jazz'},
  {id:'blues',label:'Blues'}, {id:'kpop',label:'K-pop'},
  {id:'rnb',label:'R&B'}, {id:'lofi',label:'Lo-fi'},
  {id:'house',label:'House'}, {id:'techno',label:'Techno'},
  {id:'trance',label:'Trance'}, {id:'disco',label:'Disco'},
  {id:'afrobeat',label:'Afrobeats'}, {id:'latina',label:'Música Latina'},
  {id:'gospel',label:'Gospel'}, {id:'classica',label:'Clássica'},
  {id:'anos80',label:'Anos 80'}
]);
const ids=new Set(ROOM_GENRES_109.map(x=>x.id));
const normalizeRoomGenre109=value=>typeof value==='string'&&ids.has(value)?value:null;
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function legacyRoomGenre109(name,description){
  const n=fold(name+' '+(description||''));
  const guesses=[
    ['festival',/festival|festa|lolla|shows?/],
    ['eletronica',/eletron|techno|house|edm|dance|dj set/],
    ['pagode',/\bpagode\b/],['samba',/\bsamba\b/],
    ['forro',/\bforro\b/],['sertanejo',/\bsertanejo\b/],
    ['funk',/\bfunk\b/],['trap',/\btrap\b/],['hiphop',/hip[ -]?hop/],
    ['rap',/\brap\b/],['reggae',/\breggae\b/],
    ['metal',/\bmetal\b/],['punk',/\bpunk\b/],
    ['jazz',/\bjazz\b/],['blues',/\bblues\b/],
    ['kpop',/k[ -]?pop/],['rnb',/r[& ]?b|rhythm and blues/],
    ['lofi',/lo[ -]?fi/],['house',/\bhouse\b/],
    ['techno',/\btechno\b/],['trance',/\btrance\b/],
    ['disco',/\bdisco\b/],['afrobeat',/afrobeats?/],
    ['latina',/\blatina\b|reggaeton/],
    ['gospel',/\bgospel\b/],['classica',/\bclassica\b|\bclassico\b/],
    ['anos80',/anos? 80|80s/],
    ['mpb',/\bmpb\b|bossa nova|musica brasileira/],
    ['alternativo',/alternativo|alternative/],
    ['indie',/indie/],['rock',/rock|grunge/],
    ['pop',/\bpop\b|hits/]
  ];
  return guesses.find(([id,pattern])=>pattern.test(n))?.[0]||null;
}
module.exports={ROOM_GENRES_109,normalizeRoomGenre109,legacyRoomGenre109};
