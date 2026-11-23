'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {MODES,norm,initial,installStopGames}=require('../stop-games-280');

test('Stop oferece três modalidades com categorias específicas',()=>{
 assert.deepEqual(Object.keys(MODES).sort(),['classic','festival','music']);
 for(const mode of Object.values(MODES)){
  assert.ok(mode.categories.length>=6);
  assert.equal(new Set(mode.categories).size,mode.categories.length);
 }
 assert.ok(MODES.music.categories.includes('Artista ou banda'));
 assert.ok(MODES.classic.categories.includes('Animal'));
 assert.ok(MODES.festival.categories.includes('Música'));
});

test('letras são verificadas ignorando acentos e capitalização',()=>{
 assert.equal(norm('  MÚSICA   BOA '),'musica boa');
 assert.equal(initial('  Árvore','A'),true);
 assert.equal(initial('Érico','E'),true);
 assert.equal(initial('Arara','B'),false);
});

test('o jogo usa namespace próprio e evita expor e-mails',()=>{
 const source=fs.readFileSync(path.join(__dirname,'..','stop-games-280.js'),'utf8');
 assert.match(source,/io\.of\('\/stop'\)/);
 assert.match(source,/sessions\.get\(getCookie\(socket\)\)/);
 assert.match(source,/publicId\(email\)/);
 assert.match(source,/connected\.has\(socket\.id\)/);
});

test('frontend de Stop está carregado no SonoraFan',()=>{
 const root=path.resolve(__dirname,'..');
 const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
 assert.match(html,/sonorafan-stop-280\.js\?v=280\.0/);
 assert.match(html,/sonorafan-stop-280\.css\?v=280\.0/);
 for(const file of ['public/sonorafan-stop-280.js','stop-games-280.js']){
  const text=fs.readFileSync(path.join(root,file),'utf8');
  assert.doesNotThrow(()=>new Function(text));
 }
});
