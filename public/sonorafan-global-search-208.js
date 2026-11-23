/* SonoraFan 282 — busca global consistente em páginas públicas.
 * Campos principais compartilham o mesmo índice federado de recursos autorizados.
 * Filtros locais continuam operando; ferramentas de música, DM e admin são contextuais.
 */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
const contains=(haystack,q)=>norm(haystack).includes(norm(q));
const MAIN_IDS=new Set(['sf107Search','sf200Search','sf235Search','sf216Search','sf191ClubSearch','sf71ClubSearch']);
let panel=null,source=null,results=[],index=0,seq=0,timer=null,controller=null,visible=false;
const names={room:'Salas',club:'Fan Clubs',event:'Agenda Musical',person:'Pessoas',favorite:'Minhas favoritas'};
const validInput=node=>node?.tagName==='INPUT'&&MAIN_IDS.has(node.id)&&node.type==='search';
async function json(url,signal){
 const res=await fetch(url,{credentials:'include',cache:'no-store',signal});
 if(!res.ok)throw new Error('Fonte indisponível');
 return res.json();
}
function close(){
 visible=false;
 if(panel)panel.hidden=true;
 if(source?.isConnected)source.setAttribute('aria-expanded','false');
}
function reposition(){
 if(source&&!source.isConnected){source=$(source.id)||null;}
 if(!visible||!panel||!source?.isConnected){if(visible)close();return;}
 const r=source.getBoundingClientRect();
 if(r.width<30||r.bottom<0||r.top>innerHeight){close();return;}
 const width=Math.min(Math.max(r.width,330),Math.max(280,innerWidth-16));
 const left=Math.max(8,Math.min(r.left,innerWidth-width-8));
 const freeBelow=innerHeight-r.bottom;
 const above=freeBelow<225&&r.top>freeBelow+100;
 panel.style.position='fixed';
 panel.style.width=width+'px';
 panel.style.left=left+'px';
 panel.style.right='auto';
 panel.style.top=above?'auto':Math.min(innerHeight-45,r.bottom+7)+'px';
 panel.style.bottom=above?(innerHeight-r.top+7)+'px':'auto';
 panel.style.maxHeight=Math.max(140,Math.min(460,(above?r.top:freeBelow)-18))+'px';
}
function show(message){
 if(!panel)return;
 panel.hidden=false;
 panel.innerHTML='<p class="sf208-search-state" role="status">'+esc(message)+'</p>';
 visible=true;
 if(source?.isConnected)source.setAttribute('aria-expanded','true');
 reposition();
}
function labelFields(){
 for(const id of MAIN_IDS){
  const input=$(id);if(!input)continue;
  input.setAttribute('aria-label','Buscar em todo o SonoraFan');
  input.setAttribute('aria-autocomplete','list');
  input.setAttribute('aria-controls','sf208SearchResults');
  input.setAttribute('aria-expanded',String(visible&&source===input));
  input.closest('label')?.classList.add('sf282-unified-search');
 }
}
function render(){
 if(!panel)return;
 const html=['room','club','event','person','favorite'].map(type=>{
  const subset=results.map((x,i)=>({...x,i})).filter(x=>x.type===type);
  if(!subset.length)return '';
  return '<section class="sf208-search-group" aria-label="'+names[type]+'"><h3>'+names[type]+'</h3>'+
    subset.map(x=>'<button type="button" role="option" data-sf208-index="'+x.i+'" aria-selected="'+(x.i===index)+
      '"><span class="sf208-search-icon" aria-hidden="true">'+esc(x.icon)+'</span><span><strong>'+esc(x.title)+
      '</strong><small>'+esc(x.desc)+'</small></span><b aria-hidden="true">›</b></button>').join('')+'</section>';
 }).join('');
 panel.innerHTML=html?html+'<footer>↑ ↓ navegar · Enter abrir · Esc fechar</footer>':
   '<p class="sf208-search-state">Nenhum resultado disponível para esse termo.</p>';
 panel.hidden=false;visible=true;
 if(source?.isConnected)source.setAttribute('aria-expanded','true');
 reposition();
}
function activate(item){
 if(!item)return;
 close();
 if(item.type==='room'){window.joinRoom?.(item.id);return;}
 if(item.type==='club'){
   window.sf125Navigate?.('clubs');
   window.sf71OpenFanClub?.(item.id);
   return;
 }
 if(item.type==='event'){
   window.sf125Navigate?.('agenda');
   window.sf200OpenEvent?.(item.id);return;
 }
 if(item.type==='person'){window.sf53OpenInbox?.(item.id,item.title);return;}
 if(item.type==='favorite')window.sf125Navigate?.('library');
}
async function search(term){
 const request=++seq;
 controller?.abort();controller=new AbortController();
 const signal=controller.signal;
 if(term.length<2){results=[];close();return;}
 show('Pesquisando salas, Fan Clubs, eventos, pessoas e favoritas…');
 const calls=[
  '/api/rooms',
  '/api/fan-clubs?q='+encodeURIComponent(term),
  '/api/music-agenda',
  '/api/social/search?q='+encodeURIComponent(term),
  '/api/favorites'
 ];
 const settled=await Promise.allSettled(calls.map(path=>json(path,signal)));
 if(source&&!source.isConnected)source=$(source.id)||null;
 if(request!==seq||signal.aborted||!source?.isConnected)return;
 const [r,c,e,p,f]=settled;
 const rooms=r.status==='fulfilled'?(Array.isArray(r.value)?r.value:r.value?.rooms||[]):[];
 const clubs=c.status==='fulfilled'?(Array.isArray(c.value)?c.value:c.value?.clubs||[]):[];
 const events=e.status==='fulfilled'?(Array.isArray(e.value)?e.value:e.value?.events||[]):[];
 const people=p.status==='fulfilled'?(Array.isArray(p.value)?p.value:p.value?.users||p.value?.people||[]):[];
 const favorites=f.status==='fulfilled'?(Array.isArray(f.value)?f.value:f.value?.favorites||f.value?.tracks||[]):[];
 const matches=(items,keys,max)=>items.filter(x=>contains(keys(x).join(' '),term)).slice(0,max);
 const roomHits=matches(rooms.filter(x=>!x.isPrivate),x=>[x.name,x.genre,x.description,x.currentTrack?.title,x.currentTrack?.artist],7);
 const clubHits=matches(clubs,x=>[x.title,x.artist,x.description,x.genre],7);
 const eventHits=matches(events,x=>[x.title,x.description,x.artist,x.clubName,x.roomName,x.genre],7);
 const peopleHits=matches(people,x=>[x.name,x.nickname,x.bio],6);
 const favHits=matches(favorites,x=>[x.title,x.artist],6);
 results=[
  ...roomHits.filter(x=>x.slug).map(x=>({type:'room',id:x.slug,title:x.name||'Sala',desc:'Sala musical · '+(x.genre||'Geral'),icon:'♫'})),
  ...clubHits.filter(x=>x.id).map(x=>({type:'club',id:x.id,title:x.title||'Fan Club',desc:(x.artist||'Comunidade')+' · '+(x.memberCount||0)+' membros',icon:'♧'})),
  ...eventHits.filter(x=>x.id&&(x.clubId||x.roomSlug)).map(x=>({type:'event',id:x.type+':'+(x.clubId||x.roomSlug)+':'+x.id,
     title:x.title||'Evento musical',desc:(x.type==='fanclub'?'Fan Club':'Sala')+' · '+new Date(Number(x.startAt)).toLocaleDateString('pt-BR'),icon:'▦'})),
  ...peopleHits.filter(x=>x.id).map(x=>({type:'person',id:x.id,title:x.name||x.nickname||'Pessoa',desc:x.bio||'Comunidade SonoraFan',icon:'◉'})),
  ...favHits.filter(x=>x.id).map(x=>({type:'favorite',id:x.id,title:x.title||'Música favorita',desc:x.artist||'Minha biblioteca',icon:'♫'}))
 ];
 index=0;
 if(!results.length&&settled.every(x=>x.status==='rejected')){show('Não foi possível consultar a busca. Tente novamente.');return;}
 render();
 if(settled.some(x=>x.status==='rejected')){
  const footer=panel?.querySelector('footer');
  if(footer)footer.textContent+=' · Algumas fontes indisponíveis';
 }
}
function schedule(term){
 clearTimeout(timer);seq++;controller?.abort();
 const q=String(term||'').trim().slice(0,90);
 if(q.length<2){results=[];close();return;}
 timer=setTimeout(()=>search(q),240);
}
function takeSource(input){
 if(source!==input){
  source?.setAttribute('aria-expanded','false');
  source=input;
 }
 labelFields();
}
function init(){
 const headerInput=$('sf107Search');
 if(headerInput)headerInput.placeholder='Buscar em todo o SonoraFan…';
 panel=document.createElement('div');
 panel.id='sf208SearchResults';panel.className='sf208-search-results sf282-search-results';
 panel.setAttribute('role','listbox');panel.hidden=true;
 document.body.appendChild(panel);
 labelFields();
 document.addEventListener('focusin',event=>{
  if(!validInput(event.target))return;
  takeSource(event.target);
  if(event.target.value.trim().length>=2)schedule(event.target.value);
 });
 // Capture phase makes search independent of local rerenders of agenda or Fan Club.
 document.addEventListener('input',event=>{
  if(!validInput(event.target))return;
  takeSource(event.target);
  schedule(event.target.value);
 },true);
 document.addEventListener('keydown',event=>{
  if(source&&event.target?.id===source.id&&event.target!==source)source=event.target;
  if(!visible||!source||event.target!==source)return;
  if(event.key==='Escape'){event.preventDefault();close();return;}
  if(!results.length)return;
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){
   event.preventDefault();
   index=(index+(event.key==='ArrowDown'?1:-1)+results.length)%results.length;
   panel.querySelectorAll('[data-sf208-index]').forEach(el=>el.setAttribute('aria-selected',String(Number(el.dataset.sf208Index)===index)));
   panel.querySelector('[data-sf208-index="'+index+'"]')?.scrollIntoView({block:'nearest'});
  }
  if(event.key==='Enter'){event.preventDefault();activate(results[index]);}
 },true);
 panel.addEventListener('click',event=>{
  const option=event.target.closest('[data-sf208-index]');
  if(option)activate(results[Number(option.dataset.sf208Index)]);
 });
 document.addEventListener('pointerdown',event=>{
  if(!panel.contains(event.target)&&event.target!==source&&!event.target.closest('.sf282-unified-search'))close();
 },true);
 document.addEventListener('scroll',reposition,true);
 window.addEventListener('resize',reposition,{passive:true});
 window.addEventListener('sf282:search-close',close);
 window.sf282GlobalSearch={search:term=>{const input=$('sf107Search');if(input){takeSource(input);input.value=term;input.focus();schedule(term);}},close};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();