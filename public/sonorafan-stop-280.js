/* SonoraFan Games 280 — Stop: Clássico, Musical e Festival. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const modes={classic:'Stop Clássico',music:'Stop Musical',festival:'Stop Festival'};
const s={socket:null,id:'',me:'',game:null,list:[],answers:{},error:'',visible:false};
let overlay;
const inRoom=()=>$('screen-room')?.classList.contains('active');
const slug=()=>inRoom()?String(window.sf100PlayerSnapshot?.()?.currentRoomData?.slug||''):'';
function api(action,data={}){
 return new Promise((resolve,reject)=>{
  if(!s.socket?.connected)return reject(Error('Sem conexão com o Stop.'));
  s.socket.timeout(10000).emit(action,data,(err,response)=>{
   if(err)return reject(Error('Servidor não respondeu.'));
   if(!response?.ok)return reject(Error(response?.error||'Falha no jogo.'));
   resolve(response);
  });
 });
}
function issue(error){s.error=error?.message||String(error);render();}
function reset(){s.id='';s.me='';s.game=null;s.answers={};try{sessionStorage.removeItem('sf280stop')}catch(_){}}
async function list(){
 try{const res=await api('stop:list');s.list=res.games||[];render()}catch(err){issue(err)}
}
function connect(){
 if(s.socket)return;
 if(typeof io!=='function'){issue(Error('Serviço de jogo indisponível.'));return;}
 s.socket=io('/stop',{withCredentials:true,autoConnect:false,reconnection:true});
 s.socket.on('connect',async()=>{
  s.error='';
  if(s.id){try{const v=await api('stop:join',{id:s.id});s.me=v.playerId}catch(e){reset();issue(e);return}}
  else list();
  render();
 });
 s.socket.on('connect_error',e=>issue(e));
 s.socket.on('disconnect',()=>{if(s.visible)issue(Error('Reconectando…'))});
 s.socket.on('stop:closed',()=>{reset();issue(Error('Partida encerrada.'))});
 s.socket.on('stop:state',game=>{
  if(game.id!==s.game?.id||game.round!==s.game?.round||game.phase!==s.game?.phase)s.answers={};
  s.game=game;s.id=game.id;s.error='';
  try{sessionStorage.setItem('sf280stop',game.id)}catch(_){}
  render();
 });
 s.socket.connect();
}
function open(){
 if(!overlay)mount();s.visible=true;overlay.hidden=false;document.body.classList.add('sf280-open');
 if(!s.id)try{s.id=sessionStorage.getItem('sf280stop')||''}catch(_){}
 connect();if(s.socket?.connected&&!s.id)list();render();
 $('sf280Close')?.focus();
}
function close(){s.visible=false;overlay.hidden=true;document.body.classList.remove('sf280-open');}
async function join(id){
 try{const v=await api('stop:join',{id:String(id||'').trim().toUpperCase()});s.id=v.id;s.me=v.playerId;s.error='';render()}catch(e){issue(e)}
}
async function create(kind){
 try{
  const roomSlug=kind==='room'?slug():null;
  if(kind==='room'&&!roomSlug)throw Error('Entre primeiro em uma sala musical.');
  const v=await api('stop:create',{roomSlug,mode:$('sf280Mode')?.value||'music',duration:Number($('sf280Duration')?.value||90),rounds:Number($('sf280Rounds')?.value||5)});
  s.id=v.id;s.me=v.playerId;s.error='';render();
 }catch(e){issue(e)}
}
const remaining=()=>Math.max(0,Math.ceil(((s.game?.stopAt||s.game?.deadline)||0-Date.now())/1000));
function seconds(){
 const g=s.game,deadline=g?.stopAt||g?.deadline||0;
 const n=Math.max(0,Math.ceil((deadline-Date.now())/1000));
 return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
}
function lobby(){
 return '<div class="sf280-hero"><span>SONORAFAN GAMES</span><h2>STOP! <em>Jogue com a galera</em></h2><p>Escolha uma modalidade e desafie até 10 amigos. Música e chat continuam funcionando na sua sala.</p></div>'+
 '<div class="sf280-settings"><label>Modalidade<select id="sf280Mode"><option value="classic">Stop Clássico</option><option value="music" selected>Stop Musical</option><option value="festival">Stop Festival</option></select></label>'+
 '<label>Tempo por rodada<select id="sf280Duration"><option value="60">60 segundos</option><option value="90" selected>90 segundos</option><option value="120">120 segundos</option></select></label>'+
 '<label>Rodadas<select id="sf280Rounds"><option value="3">3</option><option value="5" selected>5</option><option value="7">7</option><option value="10">10</option></select></label></div>'+
 '<div class="sf280-buttons"><button class="sf280-primary" data-stop="create">＋ Criar partida</button>'+
 (slug()?'<button data-stop="create-room">♫ Jogar nesta sala</button><button data-stop="find-room">Encontrar partida da sala</button>':'')+'</div>'+
 '<div class="sf280-code"><label>Código para entrar</label><div><input id="sf280Code" placeholder="Código de 6 caracteres" maxlength="6"><button data-stop="join-code">Entrar</button></div></div>'+
 '<h3>Partidas públicas</h3><div class="sf280-public">'+(s.list.length?s.list.map(x=>'<button data-stop-join="'+esc(x.id)+'"><strong>'+esc(modes[x.mode])+'</strong><small>#'+esc(x.id)+' · '+x.count+'/10 · '+esc(x.phase)+'</small><b>Entrar →</b></button>').join(''):'<p>Nenhuma partida aberta. Crie a primeira!</p>')+'</div>';
}
function players(g){
 return '<div class="sf280-players">'+g.players.map(p=>'<span>'+esc(p.name)+(p.id===g.host?' 👑':'')+(p.submitted?' ✓':'')+'</span>').join('')+'</div>';
}
function gameView(){
 const g=s.game;if(!g)return '<p>Conectando à partida…</p>';
 const me=g.players.find(p=>p.id===s.me),host=g.host===s.me;
 const top='<div class="sf280-heading"><div><small>'+esc(modes[g.mode])+' · #'+esc(g.id)+'</small><h2>'+({lobby:'Sala de espera',playing:'Rodada em andamento',review:'Conferência das respostas',results:'Ranking'}[g.phase]||'Stop')+'</h2></div><button data-stop="copy">Convidar ↗</button></div><div class="sf280-info"><span>Rodada '+g.round+'/'+g.maxRounds+'</span><span>'+g.players.length+'/10 pessoas</span><span>'+g.duration+' segundos</span></div>';
 if(g.phase==='lobby')return top+players(g)+'<p>Convide mais alguém e inicie a partida. São necessários 2 jogadores.</p>'+(host?'<button class="sf280-primary" data-stop="start" '+(g.players.length<2?'disabled':'')+'>Iniciar partida ▶</button>':'<p>Aguardando o anfitrião iniciar…</p>')+'<button data-stop="leave">Sair da partida</button>';
 if(g.phase==='playing')return top+'<div class="sf280-letter"><span>LETRA</span><b>'+esc(g.letter)+'</b><strong id="sf280Clock">'+seconds()+'</strong></div>'+
 '<div class="sf280-answers">'+g.categories.map((c,i)=>'<label><span>'+esc(c)+'</span><input maxlength="80" autocomplete="off" data-stop-answer="'+i+'" placeholder="Com a letra '+esc(g.letter)+'…" value="'+esc(s.answers[i]||'')+'" '+(me?.submitted?'disabled':'')+'></label>').join('')+'</div>'+
 '<button class="sf280-primary sf280-stop" data-stop="submit" '+(me?.submitted?'disabled':'')+'>'+(me?.submitted?'✓ STOP enviado!':'✋ STOP! Terminei')+'</button>'+players(g)+'<p>Quem apertar STOP inicia 10 segundos para todos finalizarem.</p>';
 if(g.phase==='review')return top+'<p>Respostas válidas somam 10 pontos, repetidas somam 5. Avalie as respostas duvidosas dos outros jogadores.</p><div class="sf280-review">'+g.review.map((row,i)=>'<section><h3>'+esc(row.category)+'</h3>'+(row.items.length?row.items.map(item=>'<div class="sf280-item"><div><strong>'+esc(item.text)+'</strong><small>'+esc(item.name)+(item.duplicate?' · Repetida':'')+'</small></div><b>'+ (item.valid?'✓':'✕') +'</b>'+(item.playerId!==s.me?'<button data-stop-vote="'+i+'" data-player="'+esc(item.playerId)+'" data-valid="1">👍</button><button data-stop-vote="'+i+'" data-player="'+esc(item.playerId)+'" data-valid="0">👎</button>':'')+'</div>').join(''):'<p>Sem respostas.</p>')+'</section>').join('')+'</div>'+
 (host?'<button class="sf280-primary" data-stop="score">Concluir votação e contar pontos</button>':'<p>Aguardando a conferência do anfitrião…</p>');
 return top+'<div class="sf280-podium">🏆 Classificação</div><div class="sf280-ranks">'+g.players.slice().sort((a,b)=>b.score-a.score).map((p,i)=>'<div><b>'+(i+1)+'º</b><strong>'+esc(p.name)+'</strong><span>'+p.score+' pontos</span></div>').join('')+'</div>'+
 '<div class="sf280-roundscores">'+(g.scores||[]).map(p=>'<div>'+esc(p.name)+' <b>+'+p.roundPoints+'</b></div>').join('')+'</div>'+
 (host&&g.round<g.maxRounds?'<button class="sf280-primary" data-stop="start">Próxima rodada →</button>':'')+
 (g.round>=g.maxRounds?'<p>Fim de jogo! Crie outra partida para continuar.</p>':'')+
 '<button data-stop="leave">Sair da partida</button>';
}
function render(){
 if(!$('sf280Content'))return;
 $('sf280Content').innerHTML=(s.error?'<div class="sf280-error" role="alert">'+esc(s.error)+'</div>':'')+(s.id?gameView():lobby());
 const b=$('sf280Back');if(b)b.hidden=!s.id;
}
async function flush(){
 for(const [index,text] of Object.entries(s.answers))await api('stop:answer',{index:Number(index),text});
}
async function act(action){
 try{
  if(action==='close'){close();return}
  if(action==='create'){await create('standalone');return}
  if(action==='create-room'){await create('room');return}
  if(action==='find-room'){const x=await api('stop:room',{slug:slug()});if(!x.id)throw Error('Não há Stop ativo nesta sala.');await join(x.id);return}
  if(action==='join-code'){await join($('sf280Code')?.value);return}
  if(action==='start'||action==='score'){await api(action==='start'?'stop:start':'stop:score');return}
  if(action==='submit'){await flush();await api('stop:submit');return}
  if(action==='leave'){await api('stop:leave');reset();render();list();return}
  if(action==='copy'){const url=new URL(location.href);url.searchParams.set('stop',s.id);try{await navigator.clipboard.writeText(url.href);s.error='Link copiado!'}catch(_){s.error='Código: '+s.id}render()}
 }catch(e){issue(e)}
}
function mount(){
 overlay=document.createElement('div');overlay.id='sf280Overlay';overlay.hidden=true;
 overlay.innerHTML='<div class="sf280-shade" data-stop="close"></div><section class="sf280-dialog" role="dialog" aria-modal="true" aria-label="Jogo Stop"><header><strong>🎮 SonoraFan Games</strong><div><button id="sf280Back" data-stop="leave" hidden>Sair da partida</button><button id="sf280Close" data-stop="close" aria-label="Fechar">✕</button></div></header><div id="sf280Content"></div></section>';
 document.body.append(overlay);
 overlay.addEventListener('click',e=>{
  const vote=e.target.closest('[data-stop-vote]');
  if(vote){api('stop:vote',{index:Number(vote.dataset.stopVote),playerId:vote.dataset.player,valid:vote.dataset.valid==='1'}).catch(issue);return}
  const joining=e.target.closest('[data-stop-join]');if(joining){join(joining.dataset.stopJoin);return}
  const button=e.target.closest('[data-stop]');if(button)act(button.dataset.stop);
 });
 overlay.addEventListener('input',e=>{const field=e.target.closest('[data-stop-answer]');if(field)s.answers[Number(field.dataset.stopAnswer)]=field.value});
 overlay.addEventListener('change',e=>{const field=e.target.closest('[data-stop-answer]');if(field)api('stop:answer',{index:Number(field.dataset.stopAnswer),text:field.value}).catch(issue)});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&s.visible)close()});
 setInterval(()=>{if(s.visible&&s.game?.phase==='playing'){const el=$('sf280Clock');if(el){el.textContent=seconds();el.classList.toggle('low',seconds()==='00:10'||seconds().startsWith('00:0'))}}},500);
 const room=document.createElement('button');room.className='sf280-launch sf280-room-launch';room.type='button';room.textContent='🎮 Jogar Stop';room.addEventListener('click',open);
 $('screen-room')?.querySelector('.header-right')?.prepend(room);
 const lobby=document.createElement('button');lobby.className='sf280-launch sf280-lobby-launch';lobby.type='button';lobby.textContent='🎮 Stop & Play';lobby.addEventListener('click',open);$('screen-lobby')?.append(lobby);
 const query=new URLSearchParams(location.search).get('stop');if(query&&/^[0-9A-F]{6}$/i.test(query)){s.id=query.toUpperCase();open()}
}
window.sf280OpenStop=open;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
