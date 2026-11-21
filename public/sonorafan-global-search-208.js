/* SonoraFan 208 — busca unificada, pesquisa somente dados autorizados. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const html=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let timer=null,serial=0,results=[],current=0,open=false;
const select=()=>document.querySelector('.sf107-search');
function close(){open=false;$('sf208SearchResults')?.setAttribute('hidden','');$('sf107Search')?.setAttribute('aria-expanded','false');}
const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
const contains=(s,q)=>normalize(s).includes(normalize(q));
const fetchJSON=async(url,signal)=>{const r=await fetch(url,{credentials:'include',signal,cache:'no-store'});if(!r.ok)throw Error('Dados temporariamente indisponíveis');return r.json();};
let aborter=null;
async function search(q){
 const target=$('sf208SearchResults');if(!target)return;
 if(q.length<2){results=[];close();return;}
 const id=++serial;aborter?.abort();aborter=new AbortController();const signal=aborter.signal;
 target.hidden=false;open=true;target.innerHTML='<p class="sf208-search-state">Buscando em salas, Fan Clubs, eventos e pessoas…</p>';
 $('sf107Search')?.setAttribute('aria-expanded','true');
 const calls=[
 fetchJSON('/api/rooms',signal),
 fetchJSON('/api/fan-clubs?q='+encodeURIComponent(q),signal),
 fetchJSON('/api/music-agenda',signal),
 fetchJSON('/api/social/search?q='+encodeURIComponent(q),signal)
 ];
 const a=await Promise.allSettled(calls);if(id!==serial||signal.aborted)return;
 const rooms=a[0].status==='fulfilled'&&Array.isArray(a[0].value)?a[0].value.filter(r=>!r.isPrivate&&contains([r.name,r.genre,r.description,r.currentTrack?.title,r.currentTrack?.artist].join(' '),q)).slice(0,8):[];
 const clubs=a[1].status==='fulfilled'?a[1].value?.clubs?.slice(0,8)||[]:[];
 const events=a[2].status==='fulfilled'?a[2].value?.events?.filter(e=>contains([e.title,e.description,e.artist,e.clubName,e.roomName,e.genre].join(' '),q)).slice(0,8)||[]:[];
 const people=a[3].status==='fulfilled'&&Array.isArray(a[3].value)?a[3].value.slice(0,8):[];
 results=[...rooms.map(r=>({type:'room',id:r.slug,title:r.name,desc:'Sala musical · '+(r.genre||'Geral'),icon:'♫'})),
 ...clubs.map(c=>({type:'club',id:c.id,title:c.title,desc:(c.artist||'Fan Club')+' · '+(c.memberCount||0)+' membros',icon:'♧'})),
 ...events.map(e=>({type:'event',id:e.type+':'+(e.clubId||e.roomSlug)+':'+e.id,title:e.title,desc:(e.type==='fanclub'?'Fan Club':'Sala')+' · '+new Date(Number(e.startAt)).toLocaleDateString('pt-BR'),icon:'▦'})),
 ...people.map(u=>({type:'person',id:u.id,title:u.name,desc:u.bio||'Perfil SonoraFan',icon:'◉'}))];
 current=0;
 const labels={room:'Salas',club:'Fan Clubs',event:'Eventos',person:'Pessoas'};
 const sections=['room','club','event','person'].map(type=>{
  const items=results.map((v,i)=>({...v,i})).filter(v=>v.type===type);
  return items.length?'<section class="sf208-search-group"><h3>'+labels[type]+'</h3>'+items.map(x=>
   '<button type="button" role="option" aria-selected="'+(x.i===current)+'" data-sf208-index="'+x.i+'"><span class="sf208-search-icon">'+x.icon+'</span><span><strong>'+html(x.title)+'</strong><small>'+html(x.desc)+'</small></span><b>›</b></button>').join('')+'</section>':'';
 }).join('');
 const failed=a.filter(v=>v.status==='rejected').length;
 target.innerHTML=results.length?sections+'<footer>↑ ↓ navegar · Enter abrir · Esc fechar'+(failed?' · Algumas fontes indisponíveis':'')+'</footer>':
 '<p class="sf208-search-state">'+(failed===4?'Não foi possível consultar a busca. Tente novamente.':'Nenhum resultado. Tente outro termo ou artista.')+'</p>';
}
function activate(item){
 if(!item)return;close();
 if(item.type==='room'){window.joinRoom?.(item.id);return;}
 if(item.type==='club'){
  window.sf125Navigate?.('clubs');
  window.sf71OpenFanClub?.(item.id);return;
 }
 if(item.type==='event'){
  window.sf125Navigate?.('agenda');window.sf200OpenEvent?.(item.id);return;
 }
 if(item.type==='person')window.sf53OpenInbox?.(item.id,item.title);
}
function init(){
 const input=$('sf107Search'),parent=select();if(!input||!parent)return;
 input.placeholder='Buscar salas, Fan Clubs, eventos e pessoas…';
 input.setAttribute('aria-label','Buscar em toda a plataforma SonoraFan');
 input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls','sf208SearchResults');
 const layer=document.createElement('div');layer.id='sf208SearchResults';layer.className='sf208-search-results';layer.setAttribute('role','listbox');layer.hidden=true;parent.after(layer);
 const align=()=>{layer.style.left=parent.offsetLeft+'px';layer.style.width=parent.offsetWidth+'px';};
 align();window.addEventListener('resize',align,{passive:true});
 // Não interrompe o filtro de salas já existente no lobby.
 input.addEventListener('input',()=>{const q=input.value.trim().slice(0,70);clearTimeout(timer);if(q.length<2){serial++;aborter?.abort();close();return;}timer=setTimeout(()=>search(q),240);});
 input.addEventListener('focus',()=>{align();if(input.value.trim().length>1)search(input.value.trim());});
 input.addEventListener('keydown',e=>{
  if(e.key==='Escape'){close();return;}
  if(!open||!results.length)return;
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();current=(current+(e.key==='ArrowDown'?1:-1)+results.length)%results.length;layer.querySelectorAll('[data-sf208-index]').forEach(b=>b.setAttribute('aria-selected',String(Number(b.dataset.sf208Index)===current)));layer.querySelector('[data-sf208-index="'+current+'"]')?.scrollIntoView({block:'nearest'});}
  if(e.key==='Enter'){e.preventDefault();activate(results[current]);}
 });
 layer.addEventListener('click',e=>{const b=e.target.closest('[data-sf208-index]');if(b)activate(results[Number(b.dataset.sf208Index)]);});
 document.addEventListener('pointerdown',e=>{if(!parent.contains(e.target)&&!layer.contains(e.target))close();},true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();