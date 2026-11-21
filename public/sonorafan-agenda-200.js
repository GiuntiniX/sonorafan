/* SonoraFan Agenda Musical 200 — eventos reais dos Fan Clubs e das salas. */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const now=()=>Date.now();
const today=()=>new Date();
const fmt=(v,opts)=>new Intl.DateTimeFormat('pt-BR',opts).format(new Date(v));
const hour=v=>fmt(v,{hour:'2-digit',minute:'2-digit'});
const shortDate=v=>fmt(v,{weekday:'short',day:'2-digit',month:'short'});
const monthTitle=d=>new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(d);
const key=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const fromKey=s=>new Date(s+'T12:00:00');
const gallery={stage:'/art-129/sonorafan-stage.svg',kpop:'/art-132/sonorafan-room-kpop.avif',
 pop:'/art-33/poster-electro.webp',rock:'/art-33/poster-rock.webp',indie:'/art-33/poster-indie.webp',
 brasil:'/art-33/poster-brasil.webp',electronic:'/art-33/poster-electro.webp',
 festival:'/art-40/poster-festival.svg'};
const genreLabel={kpop:'K-Pop',pop:'Pop',rock:'Rock',indie:'Indie',metal:'Metal',punk:'Punk',
 sertanejo:'Sertanejo',funk:'Funk',mpb:'MPB',hiphop:'Hip-Hop',rap:'Rap',trap:'Trap',eletronica:'Eletrônica',
 pagode:'Pagode',samba:'Samba',forro:'Forró',gospel:'Gospel',reggae:'Reggae',
 jazz:'Jazz',blues:'Blues',rnb:'R&B',lofi:'Lo-fi',latina:'Música Latina',classica:'Clássica',outros:'Outros'};
const artFor=e=>{
 if(e.type==='fanclub'){
   if(e.coverType==='gallery'&&gallery[e.coverGalleryId])return gallery[e.coverGalleryId];
   if(e.coverType==='external'){
     try{const u=new URL(e.coverImageUrl);if(u.protocol==='https:'&&!u.username&&!u.password&&u.hostname.includes('.'))return u.href;}catch(_){}
   }
   if(e.coverVersion&&/^[a-f0-9-]{36}$/i.test(String(e.clubId)))return '/api/fan-clubs/'+encodeURIComponent(e.clubId)+'/cover?v='+encodeURIComponent(e.coverVersion);
 }
 const g=String(e.genre||'').toLowerCase();
 return gallery[g]||({eletronica:gallery.electronic,hiphop:gallery.brasil,sertanejo:gallery.brasil,
  funk:gallery.brasil,mpb:gallery.brasil,reggae:gallery.festival,metal:gallery.rock})[g]||gallery.festival;
};
const fallback=e=>gallery[String(e.genre||'').toLowerCase()]||gallery.festival;
const state={events:[],type:'all',genre:'all',q:'',month:new Date(today().getFullYear(),today().getMonth(),1),
 day:key(today()),loading:false,error:'',open:false,request:0,lastLoad:0};
const localeDate=v=>fmt(v,{day:'2-digit',month:'short',year:'numeric'});
const img=(e,extra='')=>`<img class="sf200-photo" src="${esc(artFor(e))}" data-sf200-fallback="${esc(fallback(e))}" referrerpolicy="no-referrer" loading="lazy" decoding="async" alt="" ${extra}>`;
const isLive=e=>e.type==='room'&&Number(e.startAt)<=now()&&now()<Number(e.startAt)+(Number(e.durationMinutes)||90)*60000;
const eligible=e=>Number(e.startAt)>now()-3600000;
const origin=e=>e.type==='fanclub'?'Fan Club: '+(e.clubName||'Comunidade')+' · '+(e.artist||'Música'):'Sala: '+(e.roomName||'Sala musical')+' · por '+(e.hostName||'Organizador');
const tag=e=>`<span class="sf200-tag sf200-tag-${e.type}">${e.type==='fanclub'?'♧ Fan Club':'♫ Sala'}</span>`;
const userStatus=e=>e.going?'✓ Confirmado':e.type==='fanclub'&&!e.joined?'Entrar no Fan Club':'Participar';
const actionButtons=(e,compact=false)=>`<button class="sf200-primary" type="button" data-sf200-rsvp="${esc(e.type+':'+(e.clubId||e.roomSlug)+':'+e.id)}">${userStatus(e)}</button><button type="button" data-sf200-details="${esc(e.type+':'+(e.clubId||e.roomSlug)+':'+e.id)}">Ver evento</button>${compact?'':`<button type="button" data-sf200-calendar="${esc(e.type+':'+(e.clubId||e.roomSlug)+':'+e.id)}">▦ Adicionar à agenda</button>`}`;
const eventKey=e=>e.type+':'+(e.clubId||e.roomSlug)+':'+e.id;
const choose=()=>state.events.filter(e=>(state.type==='all'||e.type===state.type)
 &&(state.genre==='all'||String(e.genre||'outros')===state.genre)
 &&(!state.q||[e.title,e.description,e.clubName,e.artist,e.roomName,e.hostName,e.genre].join(' ').toLocaleLowerCase('pt-BR').includes(state.q.toLocaleLowerCase('pt-BR'))));
const card=(e,small=false)=>`<article class="sf200-event-card ${small?'sf200-event-small':''}">
  ${img(e)}<div class="sf200-event-body">${tag(e)}<h3>${esc(e.title)}</h3>
  <p class="sf200-origin">${esc(origin(e))}</p>
  <p class="sf200-meta">▦ ${esc(shortDate(e.startAt))} · ${esc(hour(e.startAt))} <span>♧ ${Number(e.attendees)||0} confirmados</span></p>
  <div class="sf200-event-actions">${actionButtons(e,small)}</div></div></article>`;
const calendar=events=>{
 const m=state.month.getMonth(),year=state.month.getFullYear(),first=new Date(year,m,1),offset=first.getDay();
 const days=new Date(year,m+1,0).getDate(),cells=Math.ceil((offset+days)/7)*7;
 const countMap=new Map();for(const e of events){const k=key(new Date(e.startAt));countMap.set(k,(countMap.get(k)||0)+1);}
 let html='<div class="sf200-calendar-days">'+['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(s=>'<span>'+s+'</span>').join('')+'</div><div class="sf200-calendar-grid">';
 for(let i=0;i<cells;i++){
  const day=i-offset+1;
  if(day<1||day>days){html+='<span class="sf200-calendar-blank"></span>';continue;}
  const k=key(new Date(year,m,day)),n=countMap.get(k)||0,selected=k===state.day;
  html+=`<button type="button" data-sf200-date="${k}" class="${selected?'selected':''}" aria-pressed="${selected}" aria-label="${day} de ${monthTitle(state.month)}: ${n} eventos"><span>${day}</span>${n?'<i aria-hidden="true">'+(n>1?'••':'•')+'</i>':''}</button>`;
 }
 return html+'</div>';
};
async function load(force=false){
 if(state.loading||!force&&now()-state.lastLoad<45000)return;
 state.loading=true;state.error='';render();const rid=++state.request;
 try{const r=await fetch('/api/music-agenda',{credentials:'include',cache:'no-store'});
  const data=await r.json();if(!r.ok)throw Error(data.error||'Não foi possível abrir a agenda.');
  if(rid!==state.request)return;
  state.events=(Array.isArray(data.events)?data.events:[]).filter(e=>Number.isFinite(Number(e.startAt))).sort((a,b)=>a.startAt-b.startAt);
  state.lastLoad=now();
 }catch(e){state.error=e.message||'Não foi possível carregar os eventos.';}
 finally{state.loading=false;render();}
}
function render(){
 const host=$('sf200Agenda');if(!host)return;
 const ev=choose(),upcoming=ev.filter(eligible),featured=upcoming[0];
 const availableGenres=[...new Set(state.events.map(e=>String(e.genre||'outros')))].filter(Boolean).sort((a,b)=>(genreLabel[a]||a).localeCompare(genreLabel[b]||b,'pt-BR'));
 const selected=ev.filter(e=>key(new Date(e.startAt))===state.day);
 const [day,mon]=[fromKey(state.day),monthTitle(state.month)];
 host.innerHTML=`<header class="sf200-head">
  <div class="sf200-title"><span class="sf200-calendar-icon">▦</span><div><h1>Agenda Musical</h1><p>Encontros de Fan Clubs, sessões e eventos das salas SonoraFan.</p></div></div>
  <button class="sf200-back" type="button" data-sf200-close>← Voltar ao lobby</button>
 </header>
 <div class="sf200-filters">
 <div class="sf200-tabs" role="group" aria-label="Origem do evento">
  ${[['all','▦ Todos'],['fanclub','♧ Fan Clubs'],['room','♫ Salas']].map(([v,n])=>`<button type="button" data-sf200-type="${v}" aria-pressed="${state.type===v}" class="${state.type===v?'active':''}">${n}</button>`).join('')}
 </div>
 <label class="sf200-genre-label">Estilo <select id="sf200Genre" aria-label="Filtrar por gênero"><option value="all">Todos os estilos</option>${availableGenres.map(g=>`<option value="${esc(g)}" ${state.genre===g?'selected':''}>${esc(genreLabel[g]||g)}</option>`).join('')}</select></label>
 <label class="sf200-search">⌕ <input id="sf200Search" type="search" aria-label="Buscar eventos" placeholder="Buscar evento, artista ou sala..." maxlength="90" value="${esc(state.q)}"></label>
 </div>
 ${state.loading&&state.events.length===0?'<p class="sf200-empty" role="status">Carregando a agenda musical…</p>':''}
 ${state.error?`<div class="sf200-empty" role="alert">${esc(state.error)} <button type="button" data-sf200-refresh>Tentar novamente</button></div>`:''}
 <div class="sf200-content">
   <div class="sf200-left">
    <section class="sf200-featured">
     ${featured?`${img(featured)}<div class="sf200-featured-content"><span class="sf200-eyebrow">${isLive(featured)?'● AO VIVO AGORA':'DESTAQUE DA AGENDA'}</span><h2>${esc(featured.title)}</h2><p>${esc(origin(featured))}</p><p>▦ ${esc(localeDate(featured.startAt))} · ${esc(hour(featured.startAt))}</p><div class="sf200-feature-buttons">${actionButtons(featured,true)}</div></div>`:
      '<div class="sf200-featured-content"><span class="sf200-eyebrow">AGENDA MUSICAL</span><h2>Nenhum evento agendado</h2><p>Os encontros criados nos Fan Clubs e salas aparecerão automaticamente aqui.</p><button type="button" data-sf200-refresh>Atualizar eventos</button></div>'}
    </section>
    <section class="sf200-upcoming"><header><h2>▦ Próximos eventos da agenda</h2><span>${upcoming.length} ${upcoming.length===1?'evento':'eventos'}</span></header>
      <div class="sf200-upcoming-list">${upcoming.length?upcoming.slice(0,18).map(e=>card(e,true)).join(''):'<p class="sf200-empty">Nenhum evento encontrado com esses filtros.</p>'}</div>
    </section>
   </div>
   <aside class="sf200-right">
    <section class="sf200-month">
     <header><button type="button" data-sf200-month="-1" aria-label="Mês anterior">‹</button><h2>${esc(mon)}</h2><button type="button" data-sf200-month="1" aria-label="Próximo mês">›</button></header>
     ${calendar(ev)}<div class="sf200-legend"><span>● Dia com evento</span><span>● Data selecionada</span></div>
    </section>
    <section class="sf200-day-events"><header><h2>▦ Eventos de ${esc(fmt(day,{day:'numeric',month:'long'}))}</h2><small>${selected.length} ${selected.length===1?'evento':'eventos'}</small></header>
      <div class="sf200-day-list">${selected.length?selected.map(e=>card(e,true)).join(''):'<p class="sf200-empty">Nenhum evento nesta data. Selecione outro dia no calendário.</p>'}</div>
    </section>
   </aside>
 </div>
 <div class="sf200-detail-layer" id="sf200DetailLayer" hidden></div>`;
}
function open(){
 const agenda=$('sf200Agenda'),content=document.querySelector('#screen-lobby .sf28-lobby-content');
 if(!agenda||!content)return;
 state.open=true;content.classList.add('sf200-is-open');agenda.hidden=false;
 agenda.scrollIntoView({block:'nearest'});content.scrollTo({top:0});
 load(true);render();
}
function close(){
 state.open=false;const content=document.querySelector('#screen-lobby .sf28-lobby-content');
 content?.classList.remove('sf200-is-open');if($('sf200Agenda'))$('sf200Agenda').hidden=true;
}
function lookup(k){return state.events.find(e=>eventKey(e)===k);}
function download(e){
 const stamp=n=>new Date(n).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 const clean=s=>String(s||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/[,;]/g,'\\$&');
 const mins=Math.max(30,Math.min(240,Number(e.durationMinutes)||90));
 const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SonoraFan//Agenda Musical//PT-BR','BEGIN:VEVENT',
  'UID:'+e.type+'-'+e.id+'@sonorafan','DTSTAMP:'+stamp(now()),'DTSTART:'+stamp(Number(e.startAt)),
  'DTEND:'+stamp(Number(e.startAt)+mins*60000),'SUMMARY:'+clean(e.title),
  'DESCRIPTION:'+clean(origin(e)+' — '+(e.description||'')),'BEGIN:VALARM','TRIGGER:-PT30M',
  'ACTION:DISPLAY','DESCRIPTION:Lembrete SonoraFan','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n')+'\r\n';
 const url=URL.createObjectURL(new Blob([ics],{type:'text/calendar;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='sonorafan-agenda.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function detail(e){
 const layer=$('sf200DetailLayer');if(!layer)return;
 layer.hidden=false;layer.innerHTML=`<div class="sf200-dialog" role="dialog" aria-modal="true" aria-label="Detalhes do evento">
  <button type="button" class="sf200-dialog-close" data-sf200-dismiss aria-label="Fechar detalhes">✕</button>
  ${img(e)}<div class="sf200-dialog-info">${tag(e)}<h2>${esc(e.title)}</h2><p>${esc(origin(e))}</p>
   <p>▦ ${esc(localeDate(e.startAt))} · ${esc(hour(e.startAt))} · ${Number(e.durationMinutes)||90} minutos</p>
   <p>${esc(e.description||'Encontro musical criado pela comunidade SonoraFan.')}</p>
   <p>♧ ${Number(e.attendees)||0} participantes confirmados</p>
   <div class="sf200-event-actions">${actionButtons(e)}</div>
   ${e.type==='room'?`<button type="button" data-sf200-room="${esc(e.roomSlug)}">Entrar na sala musical</button>`:
    `<button type="button" data-sf200-club="${esc(e.clubId)}">Visitar Fan Club</button>`}</div></div>`;
 layer.querySelector('.sf200-dialog-close')?.focus();
}
async function rsvp(e){
 if(e.type==='fanclub'&&(!e.joined||e.blocked)){
  if(e.blocked){alert('Você não pode participar deste Fan Club.');return;}
  close();window.sf107OpenFanClub?.(e.clubId);return;
 }
 try{
  const route=e.type==='fanclub'?'/api/fan-clubs/'+encodeURIComponent(e.clubId)+'/events/'+encodeURIComponent(e.id)+'/rsvp':
    '/api/social/events/'+encodeURIComponent(e.id)+'/rsvp';
  const r=await fetch(route,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({going:!e.going})});
  const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'Não foi possível atualizar sua presença.');
  e.going=!!data.going;e.attendees=Number(data.attendees)||0;state.lastLoad=now();render();
 }catch(err){alert(err.message||'Erro ao confirmar presença.');}
}
function handle(event){
 const btn=event.target.closest('button');if(!btn)return;
 if(btn.hasAttribute('data-sf200-close')){close();return;}
 if(btn.hasAttribute('data-sf200-refresh')){load(true);return;}
 if(btn.hasAttribute('data-sf200-type')){state.type=btn.dataset.sf200Type;render();return;}
 if(btn.hasAttribute('data-sf200-month')){
  const next=new Date(state.month.getFullYear(),state.month.getMonth()+Number(btn.dataset.sf200Month),1);
  state.month=next;state.day=key(next);render();return;
 }
 if(btn.hasAttribute('data-sf200-date')){state.day=btn.dataset.sf200Date;render();return;}
 if(btn.hasAttribute('data-sf200-dismiss')){render();return;}
 if(btn.hasAttribute('data-sf200-details')){const e=lookup(btn.dataset.sf200Details);if(e)detail(e);return;}
 if(btn.hasAttribute('data-sf200-calendar')){const e=lookup(btn.dataset.sf200Calendar);if(e)download(e);return;}
 if(btn.hasAttribute('data-sf200-rsvp')){const e=lookup(btn.dataset.sf200Rsvp);if(e)rsvp(e);return;}
 if(btn.hasAttribute('data-sf200-club')){close();window.sf107OpenFanClub?.(btn.dataset.sf200Club);return;}
 if(btn.hasAttribute('data-sf200-room')){close();window.joinRoom?.(btn.dataset.sf200Room);}
}
function init(){
 const content=document.querySelector('#screen-lobby .sf28-lobby-content');if(!content||$('sf200Agenda'))return;
 const node=document.createElement('section');node.id='sf200Agenda';node.className='sf200-agenda';node.hidden=true;node.setAttribute('aria-label','Agenda Musical');
 content.insertBefore(node,content.firstChild);node.addEventListener('click',handle);
 node.addEventListener('change',event=>{if(event.target.id==='sf200Genre'){state.genre=event.target.value;render();}});
 node.addEventListener('input',event=>{if(event.target.id==='sf200Search'){
  const input=event.target,selection=input.selectionStart;state.q=input.value;render();
  const next=$('sf200Search');next?.focus({preventScroll:true});try{next?.setSelectionRange(selection,selection);}catch(_){}
 }});
 node.addEventListener('error',event=>{const img=event.target;
  if(img?.matches?.('img.sf200-photo')&&img.dataset.sf200Fallback&&img.src!==new URL(img.dataset.sf200Fallback,location.href).href)
   img.src=img.dataset.sf200Fallback;
 },true);
 window.sf200OpenAgenda=open;window.sf200CloseAgenda=close;
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('sf200DetailLayer')?.hidden){render();}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();