/* SonoraFan Social 4 — segue pessoas, atividade pública, eventos e RSVP */
(()=>{'use strict';
const byId=id=>document.getElementById(id), hub=byId('sfSocialHub');if(!hub)return;
let following=[],events=[],eventController=null;const esc=s=>{const d=document.createElement('div');d.textContent=String(s??'');return d.innerHTML;};
const alertUser=(s,kind='success')=>{if(typeof toast==='function')toast(s,kind);else console.info(s);};
async function api(url,options={}){const r=await fetch(url,{credentials:'include',...options});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'Erro ao conectar');return data;}
const post=(url,body)=>api(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
function switchTab(tab){byId('sfFriendsPanel').hidden=tab!=='friends';byId('sfEventsPanel').hidden=tab!=='events';hub.querySelectorAll('[data-sf-tab]').forEach(b=>b.classList.toggle('active',b.dataset.sfTab===tab));if(tab==='events')loadEvents();else loadFollowing();}
hub.querySelectorAll('[data-sf-tab]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.sfTab)));
const personCard=(p,subscribed)=>{const card=document.createElement('div');card.className='sf-social-card';
const ava=document.createElement('span');ava.className='sf-avatar';ava.textContent=p.avatar||'🎧';card.appendChild(ava);
const body=document.createElement('div');body.className='sf-person';const name=document.createElement('strong');name.textContent=p.name;body.appendChild(name);
const info=document.createElement('small');info.textContent=p.activity?'🟢 Ouvindo em '+p.activity.roomName:'Sem sessão pública agora';body.appendChild(info);card.appendChild(body);
const btn=document.createElement('button');btn.type='button';btn.textContent=subscribed?'Seguindo ✓':'Seguir +';btn.addEventListener('click',async()=>{btn.disabled=true;try{await post('/api/social/follow',{id:p.id,follow:!subscribed});await loadFollowing();if(byId('sfFriendQuery').value.trim().length>=2)await searchFriends();}catch(e){alertUser(e.message,'error');}finally{btn.disabled=false;}});card.appendChild(btn);
if(p.activity&&subscribed){const go=document.createElement('button');go.type='button';go.textContent='Entrar';go.title='Entrar na sala pública';go.addEventListener('click',()=>{if(typeof joinRoom==='function')joinRoom(p.activity.roomSlug);});card.appendChild(go);}return card;};
async function loadFollowing(){const box=byId('sfFriendsList');try{following=await api('/api/social/following');box.replaceChildren();if(!following.length){box.innerHTML='<div class="sf-social-empty">Você ainda não segue ninguém. Encontre pessoas pelo nome para acompanhar as sessões públicas.</div>';return;}following.forEach(p=>box.appendChild(personCard(p,true)));}catch(e){box.textContent='Entre na sua conta para acompanhar amigos.';}}
async function searchFriends(){const box=byId('sfFriendSearchResults');const q=byId('sfFriendQuery').value.trim();if(q.length<2){box.textContent='Digite pelo menos 2 letras.';return;}box.textContent='Buscando pessoas...';try{const results=await api('/api/social/search?q='+encodeURIComponent(q));box.replaceChildren();if(!results.length){box.innerHTML='<div class="sf-social-empty">Ninguém encontrado com esse nome.</div>';return;}const followed=new Set(following.map(x=>x.id));results.forEach(p=>box.appendChild(personCard(p,followed.has(p.id))));}catch(e){box.textContent=e.message;}}
byId('sfFriendSearch').addEventListener('click',searchFriends);byId('sfFriendQuery').addEventListener('keydown',e=>{if(e.key==='Enter')searchFriends();});
const eventFormat=ms=>new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(ms));
async function loadEvents(){const box=byId('sfEventsList');box.textContent='Carregando agenda...';try{events=await api('/api/social/events');box.replaceChildren();if(!events.length){box.innerHTML='<div class="sf-social-empty">Ainda não há eventos agendados. Que tal criar o primeiro encontro?</div>';return;}
 events.forEach(e=>{const card=document.createElement('article');card.className='sf-event-card';
 const date=document.createElement('span');date.className='sf-event-date';date.textContent='📆 '+eventFormat(e.startAt);card.appendChild(date);
 const title=document.createElement('h4');title.textContent=e.title;card.appendChild(title);
 if(e.description){const d=document.createElement('p');d.textContent=e.description;card.appendChild(d);}
 const meta=document.createElement('span');meta.className='sf-event-meta';meta.textContent='🎧 '+e.roomName+' · por '+e.hostName+' · '+e.attendees+' confirmados';card.appendChild(meta);
 const actions=document.createElement('div');actions.className='sf-event-actions';
 const going=document.createElement('button');going.type='button';going.className=e.going?'sf-going':'';going.textContent=e.going?'✓ Confirmado':'Confirmar presença';going.addEventListener('click',async()=>{going.disabled=true;try{await post('/api/social/events/'+encodeURIComponent(e.id)+'/rsvp',{going:!e.going});loadEvents();}catch(err){alertUser(err.message,'error');going.disabled=false;}});actions.appendChild(going);
 const join=document.createElement('button');join.type='button';join.textContent='Entrar na sala';join.addEventListener('click',()=>{if(typeof joinRoom==='function')joinRoom(e.roomSlug);});actions.appendChild(join);card.appendChild(actions);box.appendChild(card);});
 }catch(e){box.textContent=e.message;}}
function openEventModal(){if(byId('sfEventOverlay'))return;
 const overlay=document.createElement('div');overlay.id='sfEventOverlay';overlay.className='sf-event-overlay';const modal=document.createElement('div');modal.className='sf-event-modal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Criar evento musical');
 const heading=document.createElement('h3');heading.textContent='📅 Agendar evento musical';modal.appendChild(heading);
 const form=document.createElement('form');form.className='sf-event-form';
 const field=(label,node)=>{const l=document.createElement('label');l.textContent=label;l.appendChild(node);form.appendChild(l);return node;};
 const roomSelect=field('Sala pública que você administra',document.createElement('select'));roomSelect.required=true;
 const title=field('Nome do evento',document.createElement('input'));title.maxLength=70;title.minLength=3;title.required=true;title.placeholder='Ex.: Sexta do Indie';
 const date=field('Data e horário',document.createElement('input'));date.type='datetime-local';date.required=true;date.min=new Date(Date.now()+6*60000-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
 const desc=field('Descrição (opcional)',document.createElement('textarea'));desc.maxLength=240;desc.placeholder='O que vai rolar nesta sessão?';
 const actions=document.createElement('div');actions.className='sf-form-actions';const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancelar';cancel.addEventListener('click',()=>overlay.remove());const create=document.createElement('button');create.type='submit';create.textContent='Agendar evento';actions.append(cancel,create);form.appendChild(actions);
 form.addEventListener('submit',async ev=>{ev.preventDefault();create.disabled=true;try{await post('/api/social/events',{roomSlug:roomSelect.value,title:title.value,description:desc.value,startAt:new Date(date.value).toISOString()});overlay.remove();alertUser('Evento agendado!');loadEvents();}catch(e){alertUser(e.message,'error');create.disabled=false;}});
 modal.appendChild(form);overlay.appendChild(modal);overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});document.body.appendChild(overlay);
 api('/api/social/my-rooms').then(rs=>{roomSelect.replaceChildren();if(!rs.length){const o=document.createElement('option');o.textContent='Você não administra salas públicas';o.value='';roomSelect.appendChild(o);create.disabled=true;}rs.forEach(r=>{const o=document.createElement('option');o.value=r.slug;o.textContent=r.name;roomSelect.appendChild(o);});}).catch(e=>{alertUser(e.message,'error');create.disabled=true;});title.focus();}
byId('sfNewEvent').addEventListener('click',openEventModal);
window.sfSocialRefresh=()=>{if(byId('screen-lobby')?.classList.contains('active')){if(byId('sfEventsPanel').hidden)loadFollowing();else loadEvents();}};
loadFollowing();
})();
