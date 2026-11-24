/* SonoraFan 303 — Central de interações em qualquer página logada.
 * Conteúdo e permissão vêm do servidor; sem inserir mensagens falsas no chat.
 * Um card discreto, dispensável, que não pausa nem cobre o player. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const dismissed=new Set(),claimed=new Set(),claiming=new Set();
let campaigns=[],currentId='',loading=false,lastFetched=0;
try{(JSON.parse(sessionStorage.getItem('sf303Dismissed')||'[]')||[]).forEach(x=>dismissed.add(x));}catch{}
async function claimBonus(c){
 if(!c||c.type!=='mission'||!c.voted||!c.bonusXP||claimed.has(c.id)||claiming.has(c.id))return;
 claiming.add(c.id);
 try{
  const res=await fetch('/api/community303/'+encodeURIComponent(c.id)+'/claim',{
   method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:'{}'
  });
  if(res.ok)claimed.add(c.id);
 }catch(_){}
 finally{claiming.delete(c.id);}
}
function storeDismissed(){
 try{sessionStorage.setItem('sf303Dismissed',JSON.stringify([...dismissed].slice(-80)));}catch{}
}
const host=()=>{
 let el=$('sf303CommunityCard');
 if(el)return el;
 el=document.createElement('section');
 el.id='sf303CommunityCard';
 el.setAttribute('role','complementary');
 el.setAttribute('aria-label','Interações da comunidade SonoraFan');
 el.hidden=true;
 document.body.append(el);
 el.addEventListener('click',onClick);
 return el;
};
function appVisible(){
 return !!document.querySelector('#screen-lobby.active, #screen-room.active');
}
function fmt(n){return Number(n||0).toLocaleString('pt-BR');}
function renderResults(c){
 const total=Number(c.totalVotes||0);
 return '<div class="sf303-results" aria-label="Resultados da enquete">'+c.choices.map((choice,i)=>{
  const value=Number(c.counts?.[i]||0),pct=total?Math.round(value*100/total):0;
  return '<div class="sf303-result"><div><span>'+esc(choice)+'</span><strong>'+pct+'%</strong></div><div class="sf303-result-bar"><i style="width:'+pct+'%"></i></div></div>';
 }).join('')+'<small>'+fmt(total)+' voto(s) registrado(s)</small></div>';
}
function render(){
 const el=host();
 if(!appVisible()){el.hidden=true;return;}
 const c=campaigns.find(x=>!dismissed.has(x.id));
 if(!c){el.hidden=true;currentId='';return;}
 currentId=c.id;
 const opts=c.choices||[];
 const label={poll:'Enquete SonoraFan',battle:'Batalha Musical',announcement:'Comunicado da comunidade',mission:'Missão especial'}[c.type]||'SonoraFan';
 const status=c.scope==='room'?' · Sala atual':c.scope==='club'?' · Fan Club':' · Comunidade';
 el.className='sf303-live-card sf303-'+c.channel;
 if(document.querySelector('#screen-room.active'))el.classList.add('sf303-room-view');
 el.hidden=false;
 el.innerHTML='<div class="sf303-live-header"><strong>♫ '+label+status+'</strong><button data-sf303-close type="button" aria-label="Dispensar e continuar ouvindo">✕</button></div>'+
 '<div class="sf303-live-body"><h2>'+esc(c.title)+'</h2>'+
 (c.description?'<p>'+esc(c.description)+'</p>':'')+
 (c.type==='mission'?'<small class="sf303-bonus">⭐ '+fmt(c.bonusXP)+' XP'+(c.badgeName?' · Medalha: '+esc(c.badgeName):'')+'</small>':'')+
 (c.type==='announcement'?'<button class="sf303-okay" data-sf303-close type="button">Entendi</button>':
 c.voted?renderResults(c):
 '<fieldset><legend class="sf303-sr">Escolha uma opção</legend>'+
 opts.map((x,i)=>'<label class="sf303-option"><input type="radio" name="sf303Choice" value="'+i+'"><span>'+esc(x)+'</span></label>').join('')+
 '</fieldset><button class="sf303-vote" type="button" data-sf303-vote>Votar agora</button>')+
 '<p class="sf303-live-note" id="sf303LiveNote" role="status" aria-live="polite"></p></div>';
}
function note(msg){const n=$('sf303LiveNote');if(n)n.textContent=msg;}
async function onClick(e){
 const button=e.target.closest('button');if(!button)return;
 const c=campaigns.find(x=>x.id===currentId);if(!c)return;
 if(button.hasAttribute('data-sf303-close')){
   dismissed.add(c.id);storeDismissed();render();return;
 }
 if(button.hasAttribute('data-sf303-vote')){
   const option=host().querySelector('input[name="sf303Choice"]:checked');
   if(!option){note('Escolha uma alternativa para votar.');return;}
   button.disabled=true;note('Registrando participação...');
   try{
     const resp=await fetch('/api/community303/'+encodeURIComponent(c.id)+'/vote',{
       method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',
       body:JSON.stringify({option:Number(option.value)})
     });
     const data=await resp.json();
     if(!resp.ok)throw Error(data.error||'Não foi possível votar.');
     c.voted=true;c.counts=data.counts;c.totalVotes=data.totalVotes;
     if(data.bonusApplied)claimed.add(c.id);
     else if(c.type==='mission')claimBonus(c);
     render();note('Voto registrado! Obrigado por participar.');
   }catch(e){button.disabled=false;note(e.message);}
 }
}
async function refresh(force=false){
 if(loading||!appVisible()||document.hidden)return;
 if(!force&&Date.now()-lastFetched<12000)return;
 loading=true;lastFetched=Date.now();
 try{
   const res=await fetch('/api/community303/active',{credentials:'include',cache:'no-store'});
   if(res.status===401){campaigns=[];host().hidden=true;return;}
   if(!res.ok)return;
   const data=await res.json();campaigns=Array.isArray(data.campaigns)?data.campaigns:[];
   campaigns.forEach(c=>{if(c.type==='mission'&&c.voted)claimBonus(c);});
   render();
 }catch(_){}
 finally{loading=false;}
}
let lastPage='';
function trackSection(){
 if(!document.querySelector('#screen-lobby.active'))return;
 const classes=$('screen-lobby')?.classList,active=document.querySelector('#sf125MobileBar [data-sf125-go].is-active, #sf125Sidebar [data-sf125-go].is-active');
 let section=active?.dataset?.sf125Go||'lobby';
 if(classes?.contains('sf216-explore-mode'))section='rooms';
 else if(classes?.contains('sf207-profile-page'))section='profile';
 else if(classes?.contains('sf207-clubs-page'))section='clubs';
 else if(classes?.contains('sf207-ranking-page'))section='ranking';
 if(!['lobby','rooms','clubs','profile','ranking','agenda'].includes(section))return;
 if(section===lastPage)return;lastPage=section;
 fetch('/api/community303/visit',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({section})}).catch(()=>{});
}
function init(){
 host();
 refresh();
 const sockets=typeof socket!=='undefined'?socket:null;
 sockets?.on('sf303:changed',()=>refresh(true));
 sockets?.on('connect',()=>refresh(true));
 sockets?.on('roomState',()=>{refresh();});
 sockets?.on('sf303:operation',()=>{refresh(true);});
 const lobby=$('screen-lobby'),room=$('screen-room');
 if(lobby)new MutationObserver(()=>{refresh();trackSection();}).observe(lobby,{attributes:true,attributeFilter:['class']});
 if(room)new MutationObserver(refresh).observe(room,{attributes:true,attributeFilter:['class']});
 document.addEventListener('click',e=>{
   if(e.target.closest('[data-sf125-go]'))setTimeout(()=>{trackSection();refresh();},180);
 },{passive:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){refresh();trackSection();}});
 const interval=setInterval(()=>{refresh();trackSection();},25000);
 window.addEventListener('beforeunload',()=>clearInterval(interval),{once:true});
 trackSection();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
