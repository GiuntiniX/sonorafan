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
 assert.match(source,/const emailOf=s=>sessions\.get\(getCookie\(s\)\)/);
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

test('partidas multiplayer exigem autenticação, anfitrião e 2 participantes',()=>{
 const accounts=new Map([['a','ana@example.com'],['b','bia@example.com']]);
 const ns={
  sockets:new Map(),events:{},middleware:null,
  use(fn){this.middleware=fn},on(name,fn){this.events[name]=fn},
  to(){return {emit(){}}}
 };
 const io={of(name){assert.equal(name,'/stop');return ns},sockets:{sockets:new Map()}};
 const {games}=installStopGames(io,{
  sessions:{get:token=>accounts.get(token)||null},
  users:new Map([['ana@example.com',{nome:'Ana'}],['bia@example.com',{nome:'Bia'}]]),
  rooms:new Map(),
  db:null
 });
 function makeSocket(id){
  const socket={id,handshake:{headers:{cookie:'sessionToken='+id}},events:{},
    on(name,fn){this.events[name]=fn},emit(){},join(){},leave(){}};
  ns.middleware(socket,err=>assert.equal(err,undefined));
  ns.sockets.set(id,socket);
  ns.events.connection(socket);
  return socket;
 }
 const ana=makeSocket('a'),bia=makeSocket('b');
 let created;
 ana.events['stop:create']({mode:'music',categories:['Música','Festival','Instrumento','Gênero musical'],rounds:3,duration:60},value=>created=value);
 assert.equal(created.ok,true);
 assert.equal(created.playerId.includes('@'),false);
 assert.equal(games.size,1);
 const g=games.get(created.id);
 assert.equal(g.categories.length,4);
 let denied;
 ana.events['stop:start']({},value=>denied=value);
 assert.equal(denied.ok,false);
 let joined;
 bia.events['stop:join']({id:created.id},value=>joined=value);
 assert.equal(joined.ok,true);
 bia.events['stop:start']({},value=>denied=value);
 assert.equal(denied.ok,false);
 ana.events['stop:start']({},value=>denied=value);
 assert.equal(denied.ok,true);
 assert.equal(g.phase,'playing');
 assert.equal(g.round,1);
 assert.ok(g.deadline>Date.now());
 let answer;
 ana.events['stop:answer']({index:0,text:'Uma banda'},value=>answer=value);
 assert.equal(answer.ok,true);
 ana.events['stop:submit']({},value=>answer=value);
 assert.equal(answer.ok,true);
 assert.ok(g.stopAt>0);
 ana.events['stop:leave']({},value=>answer=value);
 assert.equal(answer.ok,true);
 bia.events['stop:leave']({},value=>answer=value);
 assert.equal(answer.ok,true);
 assert.equal(games.size,0);
});
