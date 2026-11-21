/* SonoraFan v235 · Página geral de Fan Clubs, alimentada por APIs reais. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gallery={stage:'/art-129/sonorafan-stage.svg',kpop:'/art-132/sonorafan-room-kpop.avif',pop:'/art-33/poster-electro.webp',rock:'/art-33/poster-rock.webp',indie:'/art-33/poster-indie.webp',brasil:'/art-33/poster-brasil.webp',electronic:'/art-33/poster-electro.webp',festival:'/art-40/poster-festival.svg'};
const genreArt={kpop:gallery.kpop,pop:gallery.pop,rock:gallery.rock,metal:gallery.rock,indie:gallery.indie,mpb:gallery.brasil,hiphop:gallery.brasil,funk:gallery.brasil,sertanejo:gallery.brasil,eletronica:gallery.electronic};
const state={clubs:[],notices:[],posts:[],events:[],search:'',tab:'all',featured:0,loading:false,loadedAt:0,error:'',fetchId:0,detail:false,feedLoading:false,bootstrapped:false,request:0};
function safeUrl(value){try{const u=new URL(String(value||''));return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
function cover(c){
 const fallback=genreArt[c.genre]||gallery.festival;
 if(c.coverType==='gallery')return gallery[c.coverGalleryId]||fallback;
 if(c.coverType==='external')return safeUrl(c.coverImageUrl)||fallback;
 if(c.coverVersion&&/^[a-f0-9-]{36}$/i.test(c.id))return '/api/fan-clubs/'+encodeURIComponent(c.id)+'/cover?v='+encodeURIComponent(c.coverVersion);
 return fallback;
}
function num(v){return Math.max(0,Number(v)||0).toLocaleString('pt-BR')}
function time(v){const n=Number(v)||0;if(!n)return '';const min=Math.round((Date.now()-n)/60000);return min<2?'agora':min<60?'há '+min+' min':min<1440?'há '+Math.floor(min/60)+' h':new Date(n).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});}
function valid(id){return /^[a-f0-9-]{36}$/i.test(String(id||''));}
function mine(c){return c.joined||c.owner;}
function getVisible(){let arr=state.clubs.filter(c=>(state.tab!=='mine'||mine(c)));if(state.search){const q=state.search.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();arr=arr.filter(c=>[c.title,c.artist,c.description,c.genre].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q));}return arr;}
function favCover(c){return '<img src="'+esc(cover(c))+'" alt="" loading="lazy" decoding="async" data-sf235-fallback="'+esc(genreArt[c.genre]||gallery.festival)+'">';}
function card(c){
 return '<article class="sf235-club" data-sf235-item="'+esc(c.id)+'"><div class="sf235-club-art">'+favCover(c)+'<span>'+esc(c.genre||'Música')+'</span></div>'+
 '<div class="sf235-club-body"><strong>'+esc(c.title)+'</strong><small>'+esc(c.artist||'Comunidade musical')+'</small>'+
 '<p>'+esc(c.description||'Conecte-se com fãs, compartilhe músicas e participe da comunidade.')+'</p>'+
 '<div class="sf235-club-footer"><span>♧ '+num(c.memberCount)+' membros</span><button type="button" data-sf235-open="'+esc(c.id)+'">'+(mine(c)?'Acessar':'Conhecer')+' →</button></div></div></article>';
}
function noticeRow(n){
 const title=String(n.title||'Notificação'),msg=String(n.message||'');
 return '<div class="sf235-notice'+(!n.read?' is-unread':'')+'"><span class="sf235-notice-icon">'+(n.type==='event'?'▦':n.type==='invite'?'♧':'✦')+'</span>'+
 '<span><strong>'+esc(title)+'</strong><small>'+esc(msg)+'</small></span><time>'+time(n.createdAt)+'</time></div>';
}
function postCard(p){
 const c=state.clubs.find(x=>x.id===p.clubId)||{};
 return '<article class="sf235-post"><div class="sf235-post-head"><span class="sf235-post-face">♫</span><span><strong>'+esc(p.authorName||'Participante')+'</strong>'+
 '<small>'+esc(c.title||'Fanclub')+' · '+time(p.createdAt)+'</small></span></div>'+
 '<h4>'+esc(p.title||p.text?.slice(0,80)||'Nova publicação')+'</h4>'+
 '<p>'+esc((p.text||'').slice(0,150))+'</p>'+
 '<div class="sf235-post-footer"><span>♡ '+num(p.likeCount??p.likes)+' curtidas</span><button type="button" data-sf235-open="'+esc(p.clubId)+'">Ver publicação →</button></div></article>';
}
function eventCard(e){
 const c=state.clubs.find(x=>x.id===e.clubId)||{};
 const d=new Date(Number(e.startAt));
 return '<button type="button" class="sf235-event" data-sf235-open="'+esc(e.clubId)+'"><span class="sf235-event-date"><b>'+d.toLocaleDateString('pt-BR',{day:'2-digit'})+'</b><small>'+d.toLocaleDateString('pt-BR',{month:'short'}).replace('.','')+'</small></span>'+
 '<span><strong>'+esc(e.title)+'</strong><small>'+esc(c.title||'Fanclub')+' · '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+'</small></span></button>';
}
function render(){
 const home=$('sf235Home');if(!home||state.detail)return;
 const filtered=getVisible().sort((a,b)=>Number(b.memberCount||0)-Number(a.memberCount||0));
 const featured=filtered[state.featured%Math.max(1,filtered.length)]||null;
 const joined=state.clubs.filter(mine);
 const notices=state.notices.slice(0,3);
 home.innerHTML='<div class="sf235-layout"><div class="sf235-main">'+
  '<section class="sf235-hero"><div class="sf235-hero-art">'+(featured?favCover(featured):'<img src="/art-44/festival-crowd.webp" alt="">')+'</div>'+
  '<div class="sf235-hero-content"><span class="sf235-kicker">✦ FAN CLUBS · SONORAFAN</span><h1>'+esc(featured?.title||'Sua comunidade começa aqui')+'</h1>'+
  '<p>'+esc(featured?.description||'Descubra comunidades musicais, converse com fãs e viva experiências juntos.')+'</p>'+
  (featured?'<div class="sf235-hero-meta">♧ '+num(featured.memberCount)+' membros <span>· '+esc(featured.artist||'Música')+'</span></div>':'')+
  '<div class="sf235-hero-actions">'+(featured?'<button type="button" data-sf235-open="'+esc(featured.id)+'">Conhecer Fanclub →</button>':'<button type="button" data-sf235-create>Criar meu Fanclub →</button>')+
  '<button type="button" class="sf235-ghost" data-sf235-scroll="discover">Explorar comunidades</button></div></div>'+ 
  (filtered.length>1?'<div class="sf235-hero-switch"><button type="button" data-sf235-feature="prev" aria-label="Fanclub anterior">‹</button><span>'+((state.featured%filtered.length)+1)+' / '+filtered.length+'</span><button type="button" data-sf235-feature="next" aria-label="Próximo Fanclub">›</button></div>':'')+'</section>'+
  '<div class="sf235-tabs" role="group" aria-label="Áreas do Fanclub">'+
  '<button type="button" data-sf235-tab="all" aria-pressed="'+(state.tab==='all')+'">◈ Descobrir</button>'+
  '<button type="button" data-sf235-tab="mine" aria-pressed="'+(state.tab==='mine')+'">♧ Meus Fanclubs <small>'+joined.length+'</small></button>'+
  '<button type="button" data-sf235-tab="posts" aria-pressed="'+(state.tab==='posts')+'">✦ Publicações</button><button type="button" data-sf235-tab="events" aria-pressed="'+(state.tab==='events')+'">▦ Eventos</button></div>'+
  '<section class="sf235-section" id="sf235Discover"><div class="sf235-section-head"><div><span>✦ DESCUBRA A SUA GALERA</span><h2>Fan Clubs para conhecer</h2><p>Comunidades reais criadas pelos fãs do SonoraFan.</p></div>'+
  '<button type="button" data-sf235-create>＋ Criar Fanclub</button></div>'+
  '<label class="sf235-search"><span>⌕</span><input id="sf235Search" type="search" maxlength="60" placeholder="Buscar Fanclub, artista ou gênero…" value="'+esc(state.search)+'" aria-label="Buscar comunidades"></label>'+
  '<div class="sf235-clubs">'+(filtered.length?filtered.slice(0,12).map(card).join(''):'<div class="sf235-empty">Nenhum Fanclub encontrado nesta seleção. Experimente outra busca ou crie sua comunidade.</div>')+'</div>'+
  (filtered.length>12?'<p class="sf235-footnote">Mostrando 12 de '+filtered.length+' comunidades. Refine sua busca para encontrar mais.</p>':'')+'</section>'+
  '<div class="sf235-bottom"><section class="sf235-section sf235-notices-card"><div class="sf235-section-head"><div><h2>✉ Convites e notificações</h2><p>Acompanhe novidades e convites dos seus fãs.</p></div>'+
  '<button type="button" data-sf235-notifications>Ver todas →</button></div><div class="sf235-notices">'+(notices.length?notices.map(noticeRow).join(''):'<p class="sf235-empty">Nenhuma notificação recente.</p>')+'</div>'+
  '<button type="button" class="sf235-outline" data-sf235-notifications>Abrir notificações →</button></section>'+
  '<section class="sf235-section"><div class="sf235-section-head"><div><h2>♫ Sua comunidade musical</h2><p>Retome seus Fanclubs e descubra o que acontece neles.</p></div></div>'+
  '<div class="sf235-mine">'+(joined.length?joined.slice(0,4).map(c=>'<button type="button" data-sf235-open="'+esc(c.id)+'"><span class="sf235-mine-art">'+favCover(c)+'</span><strong>'+esc(c.title)+'</strong></button>').join(''):'<p class="sf235-empty">Você ainda não participa de Fanclubs.</p>')+
  '<button type="button" class="sf235-add" data-sf235-create><span>＋</span> Criar Fanclub</button></div>'+
  '<button type="button" class="sf235-outline" data-sf235-tab="mine">Meus Fanclubs →</button></section></div>'+
  '<section class="sf235-section sf235-feed" id="sf235Feed"><div class="sf235-section-head"><div><h2>✦ Publicações em destaque</h2><p>Conversas recentes dos Fanclubs dos quais você participa.</p></div></div>'+
  '<div class="sf235-posts">'+(state.posts.length?state.posts.slice(0,4).map(postCard).join(''):'<p class="sf235-empty">As publicações dos seus Fanclubs aparecerão aqui.</p>')+'</div></section></div>'+
  '<aside class="sf235-right"><section class="sf235-side-card"><h3>◉ Seu espaço no SonoraFan</h3><div class="sf235-stat-grid"><div><b>'+joined.length+'</b><span>Fanclubs</span></div><div><b>'+state.clubs.length+'</b><span>Comunidades</span></div></div>'+
  '<button type="button" data-sf235-create>＋ Criar Fanclub</button></section>'+
  '<section class="sf235-side-card" id="sf235Events"><div class="sf235-section-head"><h3>▦ Próximos eventos</h3></div>'+
  (state.events.length?state.events.slice(0,4).map(eventCard).join(''):'<p class="sf235-empty">Nenhum evento futuro nos seus Fanclubs.</p>')+'</section>'+
  '<section class="sf235-side-card"><h3>♧ Comunidades em destaque</h3>'+
  (filtered.length?filtered.slice(0,4).map(c=>'<button class="sf235-side-club" type="button" data-sf235-open="'+esc(c.id)+'"><span>'+favCover(c)+'</span><strong>'+esc(c.title)+'</strong><small>'+num(c.memberCount)+' fãs</small></button>').join(''):'<p class="sf235-empty">Descubra seu primeiro Fanclub.</p>')+
  '</section></aside></div>';
 if(state.error){
   const errorBanner=document.createElement('div');
   errorBanner.className='sf235-recovery';
   errorBanner.setAttribute('role','alert');
   errorBanner.innerHTML='<strong>Não foi possível atualizar os Fanclubs.</strong> '+esc(state.error)+
    ' <button type="button" data-sf235-retry>Tentar novamente</button>';
   home.prepend(errorBanner);
 }
 home.dataset.sf235View=['all','mine','posts','events'].includes(state.tab)?state.tab:'all';
 attachImageFallback(home);
}
function attachImageFallback(home){home.querySelectorAll('img[data-sf235-fallback]').forEach(img=>img.addEventListener('error',()=>{if(img.dataset.fallbackUsed)return;img.dataset.fallbackUsed='1';img.src=img.dataset.sf235Fallback;},{once:true}));}
async function fetchExtras(){
 const nonce=++state.fetchId;const mineClubs=state.clubs.filter(mine).slice(0,3);
 const requests=[
  fetch('/api/social/notifications',{credentials:'same-origin'}).then(r=>r.ok?r.json():[]).catch(()=>[])
 ];
 for(const c of mineClubs){
  requests.push(fetch('/api/fan-clubs/'+encodeURIComponent(c.id)+'/posts',{credentials:'same-origin'})
    .then(r=>r.ok?r.json():{}).then(d=>(d.posts||[]).slice(0,4).map(p=>({...p,clubId:c.id}))).catch(()=>[]));
  requests.push(fetch('/api/fan-clubs/'+encodeURIComponent(c.id)+'/events',{credentials:'same-origin'})
    .then(r=>r.ok?r.json():{}).then(d=>(d.events||[]).filter(x=>Number(x.startAt)>Date.now()).map(e=>({...e,clubId:c.id}))).catch(()=>[]));
 }
 const results=await Promise.all(requests);if(nonce!==state.fetchId||state.detail)return;
 state.notices=Array.isArray(results[0])?results[0]:[];
 state.posts=results.slice(1).filter((_,i)=>i%2===0).flat().sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));
 state.events=results.slice(1).filter((_,i)=>i%2===1).flat().sort((a,b)=>Number(a.startAt)-Number(b.startAt));
 render();
}
async function loadIndependent(){
 if(state.loading||state.detail)return;
 state.loading=true;
 const current=++state.request;
 try{
  const response=await fetch('/api/fan-clubs',{credentials:'same-origin',cache:'no-store'});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||'Não foi possível buscar Fanclubs (HTTP '+response.status+').');
  if(state.detail||current!==state.request)return;
  state.clubs=Array.isArray(data.clubs)?data.clubs.filter(c=>valid(c?.id)):[];
  state.error='';
  state.loadedAt=Date.now();
  render();
  fetchExtras();
 }catch(e){
  if(!state.detail&&current===state.request){
   state.error=e.message;
   render();
  }
 }finally{state.loading=false;}
}
function update(clubs){
 state.clubs=Array.isArray(clubs)?clubs.filter(c=>valid(c?.id)):[];
 state.featured=0;state.error='';
 if(state.detail)return;
 render();state.loadedAt=Date.now();fetchExtras();
}
function ensureHome(){
 const panel=$('sfFanClubsPanel'),list=$('sf71ClubList');
 if(!panel||!list)return null;
 let home=$('sf235Home');
 if(!home){
  home=document.createElement('div');
  home.id='sf235Home';home.className='sf235-home';
  home.setAttribute('aria-label','Página inicial dos Fanclubs');
  home.hidden=true;
 }
 // A página geral precisa ser irmã do hub antigo, e não filha dele:
 // o shell 126 alterna a visibilidade do hub ao navegar.
 const layout=document.querySelector('.sf5-community-layer.sf126-fan-layer .sf126-club-layout');
 const hub=$('sfSocialHub');
 if(layout&&hub&&hub.parentElement===layout){
  if(home.parentElement!==layout||home.nextElementSibling!==hub)layout.insertBefore(home,hub);
 }else if(home.parentElement!==panel){
  list.before(home);
 }
 return home;
}
function show(){
 const home=ensureHome(),panel=$('sfFanClubsPanel');if(!home||!panel)return;
 state.detail=false;
 home.hidden=false;panel.classList.add('sf235-home-active');
 document.querySelector('.sf5-community-layer.sf126-fan-layer .sf126-club-layout')?.classList.add('sf235-standalone-home');
 try{render()}catch(e){
  console.error('[Fanclubs home] Falha de renderização:',e);
  // Nunca deixar a página vazia: revelar a listagem tradicional.
  panel.classList.remove('sf235-home-active');
  document.querySelector('.sf235-standalone-home')?.classList.remove('sf235-standalone-home');
  home.hidden=true;
  panel.querySelector('#sf71ClubList')?.removeAttribute('hidden');
  return;
 }
 if(!state.clubs.length||Date.now()-state.loadedAt>30000)loadIndependent();
}
function hide(){
 state.detail=true;state.fetchId++;state.request++;
 $('sf235Home')?.setAttribute('hidden','');
 $('sfFanClubsPanel')?.classList.remove('sf235-home-active');
 document.querySelector('.sf235-standalone-home')?.classList.remove('sf235-standalone-home');
}
function init(){
 const panel=$('sfFanClubsPanel'),list=$('sf71ClubList'),home=ensureHome();
 if(!panel||!list||!home||state.bootstrapped)return;
 state.bootstrapped=true;
 home.hidden=true;
 home.addEventListener('click',event=>{
  const b=event.target.closest('button[data-sf235-open],button[data-sf235-feature],button[data-sf235-retry],button[data-sf235-create],button[data-sf235-notifications],button[data-sf235-tab],button[data-sf235-scroll]');
  if(!b||!home.contains(b))return;
  // Evita que o menu e os delegadores antigos da área de comunidade
  // consumam o mesmo clique e desmontem a home.
  event.stopPropagation();
  if(b.hasAttribute('data-sf235-feature')){const total=getVisible().length;if(total){state.featured=(state.featured+(b.dataset.sf235Feature==='next'?1:total-1))%total;render();}return;}
  if(b.hasAttribute('data-sf235-open')){
   const id=b.dataset.sf235Open;
   if(!valid(id))return;
   if(typeof window.sf71OpenFanClub==='function')window.sf71OpenFanClub(id);
   else{state.error='A abertura do Fanclub não está disponível. Atualize a página.';render();}
   return;
  }
  if(b.hasAttribute('data-sf235-retry')){state.error='';loadIndependent();return;}
  if(b.hasAttribute('data-sf235-create')){
   const create=$('sf71CreateClub');
   if(!create){state.error='O cadastro de Fanclubs está indisponível. Atualize a página.';render();return;}
   create.click();return;
  }
  if(b.hasAttribute('data-sf235-notifications')){window.sf15OpenNotifications?.();return;}
  if(b.hasAttribute('data-sf235-tab')){
   const tab=b.dataset.sf235Tab;
   if(!['all','mine','posts','events'].includes(tab))return;
   state.tab=tab;
   if(tab==='mine')state.search='';
   render();
   const section=tab==='posts'?'sf235Feed':tab==='events'?'sf235Events':'sf235Discover';
   $(section)?.scrollIntoView({block:'start',behavior:'smooth'});
   return;
  }
  if(b.hasAttribute('data-sf235-scroll')){const id={discover:'sf235Discover',feed:'sf235Feed',events:'sf235Events'}[b.dataset.sf235Scroll];$(id)?.scrollIntoView({block:'start',behavior:'smooth'});}
 });
 home.addEventListener('input',event=>{if(event.target.id!=='sf235Search')return;const input=event.target;state.search=input.value.slice(0,60);const pos=input.selectionStart;render();const next=$('sf235Search');next?.focus({preventScroll:true});next?.setSelectionRange(pos,pos);});
 window.sf235UpdateFanclubs=update;window.sf235ShowHome=show;window.sf235HideHome=hide;
 // A página pode ser exibida antes da inicialização do módulo de Fanclubs.
 // Reconciliar com o DOM em vez de depender da ordem dos callbacks.
 if(!$('sf71ClubDetail')?.hidden)hide();
 else if(!panel.hidden)show();
 const observer=new MutationObserver(()=>{
  if(panel.hidden)return;
  const detail=$('sf71ClubDetail');
  if(detail&&!detail.hidden){if(!state.detail)hide();return;}
  if(state.detail||$('sf235Home')?.hidden||!panel.classList.contains('sf235-home-active'))show();
 });
 observer.observe(panel,{attributes:true,attributeFilter:['hidden']});
 observer.observe($('sf71ClubDetail'),{attributes:true,attributeFilter:['hidden']});
 window.addEventListener('pageshow',()=>{if(!panel.hidden&&$('sf71ClubDetail')?.hidden)show();});
 
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
