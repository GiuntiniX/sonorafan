'use strict';
// SonoraFan Games 280: partidas Stop isoladas do player, chat e fila musical.
// Estado efêmero do jogo: nenhuma credencial ou resposta é armazenada no Firestore.
const crypto = require('node:crypto');
const MODES = Object.freeze({
  classic:{label:'Stop Clássico',categories:['Nome','Cidade','País','Animal','Comida','Objeto','Cor']},
  music:{label:'Stop Musical',categories:['Artista ou banda','Música','Álbum','Festival','Instrumento','Gênero musical']},
  festival:{label:'Stop Festival',categories:['Nome','Cidade','Animal','Comida','Artista ou banda','Música','Festival']}
});
const LETTERS='ABCDEFGHIJLMNOPRSTUV';
const clean=(s,n=80)=>String(s??'').replace(/[<>\x00-\x1f\x7f]/g,' ').trim().slice(0,n);
const norm=s=>clean(s,100).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ').trim();
const initial=(s,letter)=>norm(s).startsWith(String(letter||'').toLowerCase());
function installStopGames(io,{sessions,users,rooms}){
 const ns=io.of('/stop'),games=new Map(),connected=new Map();
 const capacities={min:2,max:10},limitGames=60;
 const ackError=(ack,message)=>{if(typeof ack==='function')ack({ok:false,error:message});};
 const respond=(ack,data)=>{if(typeof ack==='function')ack({ok:true,...data});};
 const getCookie=socket=>{const raw=socket.handshake.headers.cookie||'';const match=raw.match(/(?:^|;\s*)sessionToken=([^;]+)/);return match?decodeURIComponent(match[1]):'';};
 const emailOf=s=>sessions.get(getCookie(s));
 const roomKey=g=>'stop:'+g.id;
 const publicId=email=>crypto.createHash('sha256').update(String(email)).digest('hex').slice(0,14);
 const publicGame=g=>({id:g.id,kind:g.kind,roomSlug:g.roomSlug||null,mode:g.mode,
  categories:g.categories,round:g.round,maxRounds:g.maxRounds,duration:g.duration,
  phase:g.phase,letter:g.letter,deadline:g.deadline,stopAt:g.stopAt,
  host:publicId(g.host),players:[...g.players.values()].map(p=>({id:p.id,name:p.name,ready:p.ready,score:p.score,submitted:p.submitted})),
  review:g.phase==='review'?g.review.map(row=>({category:row.category,items:row.items.map(item=>({...item,voters:undefined}))})):[],
  scores:g.scores||[],updatedAt:Date.now()});
 const broadcast=g=>ns.to(roomKey(g)).emit('stop:state',publicGame(g));
 const cancel=g=>{if(g.timer){clearTimeout(g.timer);g.timer=null;}};
 const destroy=g=>{cancel(g);games.delete(g.id);ns.to(roomKey(g)).emit('stop:closed');};
 function schedule(g,delay,callback){
  cancel(g);g.timer=setTimeout(()=>{g.timer=null;if(games.get(g.id)===g)callback();},delay);
  g.timer.unref?.();
 }
 function finishRound(g){
  if(g.phase!=='playing')return;
  g.phase='review';g.deadline=0;g.stopAt=0;
  const players=[...g.players.values()];
  g.review=g.categories.map((category,i)=>{
   const items=players.map(p=>({playerId:p.id,name:p.name,text:clean(p.answers[i],80)})).filter(item=>item.text);
   const counts=new Map();
   for(const item of items)if(initial(item.text,g.letter))counts.set(norm(item.text),(counts.get(norm(item.text))||0)+1);
   return {category,items:items.map(item=>({...item,valid:initial(item.text,g.letter),duplicate:initial(item.text,g.letter)&&(counts.get(norm(item.text))||0)>1,votes:0}))};
  });
  broadcast(g);
 }
 function startRound(g){
  if(g.phase!=='lobby'&&g.phase!=='results')return;
  if(g.players.size<2)return;
  g.round+=1;g.phase='playing';g.scores=[];
  const candidates=LETTERS.split('').filter(letter=>letter!==g.letter);
  g.letter=candidates[crypto.randomInt(candidates.length)];
  for(const p of g.players.values()){p.answers=g.categories.map(()=>'');p.submitted=false;p.ready=false;}
  g.stopAt=0;g.deadline=Date.now()+g.duration*1000;broadcast(g);
  schedule(g,g.duration*1000,()=>finishRound(g));
 }
 function reviewComplete(g){
  if(g.phase!=='review')return;
  const roundScores=[];
  for(const p of g.players.values()){
   let gained=0;
   for(const row of g.review){
    const item=row.items.find(x=>x.playerId===p.id);
    if(item?.valid)gained+=item.duplicate?5:10;
   }
   p.score+=gained;roundScores.push({id:p.id,name:p.name,roundPoints:gained,total:p.score});
  }
  g.scores=roundScores.sort((a,b)=>b.total-a.total);
  g.phase='results';broadcast(g);
 }
 function access(socket,g){
  if(!g)return 'Partida não encontrada.';
  const email=emailOf(socket);if(!email)return 'Entre na sua conta para jogar.';
  if(g.kind==='room'){
   const room=rooms.get(g.roomSlug);if(!room)return 'A sala musical não existe mais.';
   const online=[...io.sockets.sockets.values()].some(s=>s.userEmail===email&&s.rooms.has(g.roomSlug));
   if(!online)return 'Entre na sala musical antes de jogar.';
  }
  return null;
 }
 ns.use((socket,next)=>{const email=emailOf(socket);if(!email)return next(new Error('Faça login para jogar Stop.'));if(users.get(email)?.banned)return next(new Error('Conta sem permissão.'));socket.stopEmail=email;next();});
 ns.on('connection',socket=>{
  const email=socket.stopEmail;
  socket.on('stop:create',(options={},ack)=>{
   if(connected.has(socket.id))return ackError(ack,'Saia da partida atual primeiro.');
   if(games.size>=limitGames)return ackError(ack,'Muitas partidas simultâneas. Tente novamente.');
   const mode=MODES[options.mode]?options.mode:'classic';
   const kind=options.roomSlug?'room':'standalone';
   const roomSlug=kind==='room'?clean(options.roomSlug,120):null;
   if(roomSlug){
    const room=rooms.get(roomSlug);
    if(!room)return ackError(ack,'Sala musical não encontrada.');
    const joined=[...io.sockets.sockets.values()].some(s=>s.userEmail===email&&s.rooms.has(roomSlug));
    if(!joined)return ackError(ack,'Entre na sala musical antes de criar a partida.');
    if([...games.values()].some(g=>g.kind==='room'&&g.roomSlug===roomSlug))return ackError(ack,'Esta sala já tem uma partida. Entre na existente.');
   }
   const allowed=MODES[mode].categories;
   const requested=Array.isArray(options.categories)?[...new Set(options.categories.filter(x=>allowed.includes(x)))]:allowed;
   const categories=requested.length>=4?requested:allowed;
   const maxRounds=Math.min(10,Math.max(1,Math.trunc(Number(options.rounds)||5)));
   const duration=[60,90,120].includes(Number(options.duration))?Number(options.duration):90;
   let id;
   do{id=crypto.randomBytes(3).toString('hex').toUpperCase();}while(games.has(id));
   const p={id:publicId(email),name:clean(users.get(email)?.nome||email.split('@')[0],32),score:0,answers:[],ready:false,submitted:false};
   const g={id,kind,roomSlug,mode,categories:[...categories],round:0,maxRounds,duration,phase:'lobby',letter:'',deadline:0,stopAt:0,host:email,players:new Map([[email,p]]),review:[],scores:[],timer:null,createdAt:Date.now()};
   games.set(id,g);connected.set(socket.id,id);socket.join(roomKey(g));respond(ack,{id,playerId:publicId(email)});broadcast(g);
  });
  socket.on('stop:join',(input={},ack)=>{
   const id=clean(input.id,20).toUpperCase(),g=games.get(id);const err=access(socket,g);
   if(err)return ackError(ack,err);
   if(connected.has(socket.id)&&connected.get(socket.id)!==id)return ackError(ack,'Saia da outra partida primeiro.');
   if(!g.players.has(email)&&g.players.size>=capacities.max)return ackError(ack,'Partida cheia (até 10 jogadores).');
   if(!g.players.has(email)&&g.phase!=='lobby'&&g.phase!=='results')return ackError(ack,'Aguarde a próxima rodada para entrar.');
   if(!g.players.has(email))g.players.set(email,{id:publicId(email),name:clean(users.get(email)?.nome||email.split('@')[0],32),score:0,answers:g.categories.map(()=>''),ready:false,submitted:false});
   connected.set(socket.id,id);socket.join(roomKey(g));respond(ack,{id,playerId:publicId(email)});broadcast(g);
  });
  socket.on('stop:list',(ack)=>{
   const result=[...games.values()].filter(g=>g.kind==='standalone').map(g=>({id:g.id,mode:g.mode,phase:g.phase,count:g.players.size,max:capacities.max}));
   respond(ack,{games:result});
  });
  socket.on('stop:room',(data={},ack)=>{
   const roomSlug=clean(data.slug,120);
   const g=[...games.values()].find(x=>x.kind==='room'&&x.roomSlug===roomSlug);
   respond(ack,{id:g?.id||null});
  });
  const own=()=>{const id=connected.get(socket.id),g=games.get(id);return g&&g.players.has(email)?g:null;};
  socket.on('stop:start',(_,ack)=>{const g=own();if(!g)return ackError(ack,'Entre na partida.');if(g.host!==email)return ackError(ack,'Apenas o anfitrião inicia.');if(g.phase==='results'&&g.round>=g.maxRounds)return ackError(ack,'A partida terminou.');if(g.players.size<2)return ackError(ack,'São necessários pelo menos 2 jogadores.');startRound(g);respond(ack,{});});
  socket.on('stop:answer',(data={},ack)=>{
   const g=own();if(!g||g.phase!=='playing'||Date.now()>=g.deadline||g.stopAt&&Date.now()>=g.stopAt)return ackError(ack,'Rodada encerrada.');
   const player=g.players.get(email);if(player.submitted)return ackError(ack,'Suas respostas já foram enviadas.');
   const i=Number(data.index);if(!Number.isInteger(i)||i<0||i>=g.categories.length)return ackError(ack,'Categoria inválida.');
   player.answers[i]=clean(data.text,80);respond(ack,{});
  });
  socket.on('stop:submit',(_,ack)=>{
   const g=own();if(!g||g.phase!=='playing')return ackError(ack,'Sem rodada ativa.');
   const p=g.players.get(email);p.submitted=true;
   if(!g.stopAt){g.stopAt=Math.min(g.deadline,Date.now()+10000);schedule(g,Math.max(0,g.stopAt-Date.now()),()=>finishRound(g));}
   respond(ack,{});broadcast(g);
  });
  socket.on('stop:vote',(data={},ack)=>{
   const g=own();if(!g||g.phase!=='review')return ackError(ack,'Não há respostas para conferir.');
   const row=g.review[Number(data.index)],item=row?.items.find(x=>x.playerId===data.playerId);
   if(!item||item.playerId===publicId(email))return ackError(ack,'Voto inválido.');
   if(!item.voters)item.voters=new Map();
   if(item.voters.has(email))return ackError(ack,'Você já avaliou esta resposta.');
   const valid=Boolean(data.valid);item.voters.set(email,valid);
   const yes=[...item.voters.values()].filter(Boolean).length,no=item.voters.size-yes;
   if(yes>no)item.valid=true;
   if(no>yes)item.valid=false;
   item.votes=item.voters.size;
   respond(ack,{});broadcast(g);
  });
  socket.on('stop:score',(_,ack)=>{const g=own();if(!g)return ackError(ack,'Entre na partida.');if(g.host!==email)return ackError(ack,'Apenas o anfitrião pode encerrar a conferência.');if(g.phase!=='review')return ackError(ack,'Aguarde a conferência.');reviewComplete(g);respond(ack,{});});
  socket.on('stop:leave',(_,ack)=>{leave();respond(ack,{});});
  function leave(){
   const id=connected.get(socket.id);if(!id)return;
   connected.delete(socket.id);const g=games.get(id);if(!g)return;socket.leave(roomKey(g));
   // Só remover o jogador quando nenhuma outra conexão dele estiver na partida.
   if([...connected.entries()].some(([sid,gid])=>gid===id&&ns.sockets.get(sid)?.stopEmail===email))return;
   g.players.delete(email);
   if(!g.players.size){destroy(g);return;}
   if(g.host===email)g.host=g.players.keys().next().value;
   if(g.phase==='playing'&&g.players.size<2)finishRound(g);
   broadcast(g);
  }
  socket.on('disconnect',leave);
 });
 setInterval(()=>{const cutoff=Date.now()-12*3600000;for(const g of games.values())if(g.createdAt<cutoff)destroy(g);},3600000).unref?.();
 return {MODES,games};
}
module.exports={installStopGames,MODES,norm,initial};
