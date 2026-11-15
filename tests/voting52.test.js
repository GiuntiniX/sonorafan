const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
const client = fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const start = source.indexOf("  socket.on('voteSong', ({ id, type, room }) => {");
const end = source.indexOf("  // ===== TYPING INDICATOR",start);
assert(start>0 && end>start,'Handler deve existir no servidor');
const handler=source.slice(start,end);
function setup() {
 const events={}; const emitted=[]; const points=[];
 const queue=[{id:'ABCDEFghijk',title:'Faixa 1'},{id:'HGFEDCba987',title:'Faixa 2'}];
 const state={queue,currentIndex:0,totalVotesGiven:0};
 const votes={};
 const socket={userEmail:'test@example.com', userName:'Aline',on:(name,fn)=>{events[name]=fn},emit:(name,v)=>emitted.push({name,v})};
 const io={to:(room)=>({emit:(name,v)=>emitted.push({name,v})})};
 const context={ socket,io,rooms:new Map([['teste',state]]),currentRoom:'teste',getRoomVotes:()=>votes,DISLIKE_THRESHOLD:10,addPoints:(...args)=>points.push(args), addSystemMsg:()=>{}, broadcastState:()=>{}, console };
 vm.runInNewContext(handler,context);
 return {socket,vote:(type,id='HGFEDCba987')=>events.voteSong({id,type,room:'teste'}),votes,points,emitted,state};
}
{
 const s=setup();
 s.vote('up');assert.equal(s.votes.HGFEDCba987.up.length,1);assert.equal(s.points.length,1);
 s.vote('up');assert.equal(s.votes.HGFEDCba987.up.length,0);assert.equal(s.points.length,1);
 s.vote('down');assert.equal(s.votes.HGFEDCba987.down.length,1);
 s.vote('up');assert.equal(s.votes.HGFEDCba987.down.length,0);assert.equal(s.votes.HGFEDCba987.up.length,1);
 s.vote('banana');assert.equal(s.votes.HGFEDCba987.up.length,1);
 s.vote('down','ABCDEFghijk');assert.equal(s.votes.ABCDEFghijk,undefined,'Faixa atual não recebe voto');
 console.log('OK: registrar, desfazer, trocar, rejeitar tipo e bloquear faixa atual');
}
{
 const s=setup();
 for(let i=0;i<9;i++) {
  s.socket.userName='Pessoa'+i;
  s.vote('down');
 }
 assert.equal(s.state.queue.length,2,'Antes do 10º voto a faixa ainda existe');
 assert.equal(s.votes.HGFEDCba987.down.length,9,'Nove votos registrados');
 s.socket.userName='Pessoa9'; s.vote('down');
 assert.equal(s.state.queue.length,1,'10º voto deve retirar faixa futura');
 assert.equal(s.votes.HGFEDCba987,undefined,'Votos da faixa retirada são removidos');
 assert(s.emitted.some(x => x.name==='voteUpdate' && x.v.removed),'Evento de remoção propagado');
 console.log('OK: regra real de remoção ao 10º voto');
}
assert(client.includes('sf52-vote-controls'),'Markup novo de votação');
assert(!client.includes('sf50-focus-toggle'),'Modo Foco removido do HTML');
console.log('OK: controles da UI e remoção do Modo Foco');
