'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('library is mounted inside the existing Profile rather than a second overlay',()=>{
  const code=read('public/sonorafan-profile-library-112.js');
  assert.match(code,/panel\(\)\?\.querySelector\('\.sf43-profile-body\.sf108-ready'\)/);
  assert.match(code,/hero\.after\(nav,lib,dna,achievements,community\)/);
  assert.match(code,/window\.sf112OpenProfile=open/);
  assert.doesNotMatch(code,/document\.body\.append\(lib\)/);
});

test('real account APIs feed Mixtapes, Favorites, Collections and saved rooms',()=>{
  const code=read('public/sonorafan-profile-library-112.js');
  for(const endpoint of ['/api/favorites','/api/favorite-genres','/api/studio100/mixtapes','/api/experience95/profile'])
    assert.ok(code.includes(endpoint),'Missing '+endpoint);
  for(const key of ['mixtapes','favorites','genres','profile'])
    assert.ok(code.includes("state.data."+key));
  assert.match(code,/p\.pinnedRooms/);
  assert.match(code,/p\.totalAdded/);
});

test('library does not invent albums, listening hours or fake playlists',()=>{
  const code=read('public/sonorafan-profile-library-112.js');
  assert.doesNotMatch(code,/\b128 h\b|\b317\b|\b53 Álbuns\b|Horas salvas/);
  assert.match(code,/Contribuições/);
  assert.match(code,/Músicas curtidas/);
  assert.match(code,/Sua mixtape salva/);
});

test('existing features open actual handlers with account-safe navigation',()=>{
  const code=read('public/sonorafan-profile-library-112.js');
  assert.match(code,/window\.sf100OpenMixtape\?\.\(id\)/);
  assert.match(code,/window\.sf95OpenHub\?\.\('studio'\)/);
  assert.match(code,/typeof toggleFavorites==='function'/);
  assert.match(code,/typeof joinRoom==='function'/);
  assert.match(code,/window\.sf43CloseProfile\?\.\(\)/);
  assert.match(code,/state\.request\+\+;state\.loaded=false/);
});

test('lobby has three main destinations and Biblioteca is inside the profile',()=>{
  const lobby=read('public/sonorafan-lobby-107.js');
  const index=read('public/index.html');
  const nav=lobby.slice(lobby.indexOf('<nav aria-label="Navegação do lobby">'),
                        lobby.indexOf('</nav>',lobby.indexOf('<nav aria-label="Navegação do lobby">')));
  assert.ok(nav.includes('data-sf107="top"'));
  assert.ok(nav.includes('data-sf107="scroll"'));
  assert.ok(nav.includes('data-sf107="community"'));
  assert.ok(!nav.includes('data-sf107="library"'));
  assert.match(lobby,/sf112OpenProfile\('library'\)/);
  assert.ok(index.includes('sonorafan-profile-library-112.js'));
  assert.ok(index.includes('sonorafan-profile-library-112.css'));
});

test('library CSS uses responsive grids and hides nonactive sections',()=>{
  const css=read('public/sonorafan-profile-library-112.css');
  assert.match(css,/sf112-tab-library/);
  assert.match(css,/sf112-tab-achievements/);
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/\.sf112-hero/);
});
