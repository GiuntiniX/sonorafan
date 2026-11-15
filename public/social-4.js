/* SonoraFan Social 4 — segue pessoas, atividade pública, eventos e RSVP */
(()=>{'use strict';
const byId=id=>document.getElementById(id), hub=byId('sfSocialHub');if(!hub)return;
let following=[],events=[],eventController=null;const esc=s=>{const d=document.createElement('div');d.textContent=String(s??'');return d.innerHTML;};
const alertUser=(s,kind='success')=>{if(typeof toast==='function')toast(s,kind);else console.info(s);};
async function api(url,options={}){const r=await fetch(url,{credentials:'include',...options});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'Erro ao conectar');return data;}
const post=(url,body)=>api(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
function switchTab(tab){
 if(!['friends','fanclubs','events'].includes(tab))tab='friends';
 byId('sfFriendsPanel').hidden=tab!=='friends';
 byId('sfEventsPanel').hidden=tab!=='events';
 const clubPanel=byId('sfFanClubsPanel');if(clubPanel)clubPanel.hidden=tab!=='fanclubs';
 hub.querySelectorAll('[data-sf-tab]').forEach(b=>{const active=b.dataset.sfTab===tab;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));});
 if(tab==='events')loadEvents();else if(tab==='fanclubs')window.sf71LoadFanClubs?.();else loadFollowing();
}
window.sfSocialSwitchTab=switchTab;
hub.querySelectorAll('[data-sf-tab]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.sfTab)));
const personCard=(p,subscribed)=>{
 const card=document.createElement('article');card.className='sf-social-card sf69-friend-card';
 const ava=document.createElement('span');ava.className='sf-avatar';ava.textContent=p.avatar||'🎧';card.appendChild(ava);
 const body=document.createElement('div');body.className='sf-person';
 const name=document.createElement('strong');name.textContent=p.name;body.appendChild(name);
 const info=document.createElement('small');
 const visible=!!(p.online && subscribed);
 info.textContent=visible ? (p.activity?'● Online · Em '+p.activity.roomName:'● Online agora') : (p.activity?'Em sessão pública':'Offline ou presença oculta');
 info.className=visible?'sf69-status-online':'sf69-status-away';
 body.appendChild(info);card.appendChild(body);
 const actions=document.createElement('div');actions.className='sf69-friend-actions';
 const follow=document.createElement('button');follow.type='button';follow.className='sf69-follow';
 follow.textContent=subscribed?'Seguindo ✓':'Seguir +';
 follow.addEventListener('click',async()=>{follow.disabled=true;try{await post('/api/social/follow',{id:p.id,follow:!subscribed});await loadFollowing();const q=byId('sfFriendQuery')?.value.trim();if(q?.length>=2)await searchFriends();}catch(e){alertUser(e.message,'error');}finally{follow.disabled=false;}});
 if(subscribed){
   const dm=document.createElement('button');dm.type='button';dm.textContent='Mensagem';dm.className='sf69-primary';dm.setAttribute('aria-label','Enviar mensagem para '+p.name);
   dm.addEventListener('click',()=>{if(typeof window.sf53OpenInbox==='function'){document.querySelector('.sf5-community-layer .sf5-close')?.click();window.sf53OpenInbox(p.id,p.name);}else alertUser('Caixa de mensagens indisponível.','error');});
   actions.append(dm);
   if(p.activity){
     const go=document.createElement('button');go.type='button';go.textContent='Entrar na sala';go.setAttribute('aria-label','Entrar na sala pública de '+p.name);
     go.addEventListener('click',()=>{if(typeof joinRoom==='function'){document.querySelector('.sf5-community-layer .sf5-close')?.click();joinRoom(p.activity.roomSlug);}});actions.append(go);
   }else if(visible){
     const invite=document.createElement('button');invite.type='button';invite.textContent='Convidar';invite.setAttribute('aria-label','Convidar '+p.name+' para uma sala pública');
     invite.addEventListener('click',()=>openInviteModal(p));actions.append(invite);
   }
 }
 actions.append(follow);card.appendChild(actions);return card;
};
async function loadFollowing(){
 const box=byId('sfFriendsList');if(!box)return;
 try{
  following=await api('/api/social/following');
  following.sort((a,b)=>Number(!!b.online)-Number(!!a.online)||a.name.localeCompare(b.name,'pt-BR'));
  const onlineCount=following.filter(u=>u.online).length;
  const heading=byId('sf69OnlineCount');if(heading)heading.textContent=onlineCount===1?'1 amigo online':onlineCount+' amigos online';
  box.replaceChildren();
  if(!following.length){box.innerHTML='<div class="sf-social-empty">Você ainda não segue ninguém. Busque um nickname para encontrar amigos e combinar músicas.</div>';return;}
  following.forEach(p=>box.appendChild(personCard(p,true)));
 }catch(e){box.textContent='Não foi possível carregar seus amigos.';}
}
async function openInviteModal(person){
 const previous=document.getElementById('sf69InviteOverlay');previous?.remove();
 const overlay=document.createElement('div');overlay.id='sf69InviteOverlay';overlay.className='sf69-invite-overlay';
 const panel=document.createElement('section');panel.className='sf69-invite-dialog';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Convidar para uma sala');
 const title=document.createElement('h3');title.textContent='Convidar '+person.name;
 const help=document.createElement('p');help.textContent='Escolha uma sala pública para ouvir música junto.';
 const select=document.createElement('select');select.setAttribute('aria-label','Escolher sala pública');
 const controls=document.createElement('div');controls.className='sf69-invite-controls';
 const cancel=document.createElement('button');cancel.textContent='Cancelar';cancel.type='button';
 const submit=document.createElement('button');submit.textContent='Enviar convite';submit.type='button';submit.disabled=true;
 const close=()=>overlay.remove();cancel.addEventListener('click',close);overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
 const onEscape=e=>{if(e.key==='Escape'){close();}};overlay.addEventListener('keydown',onEscape);
 submit.addEventListener('click',async()=>{submit.disabled=true;try{await post('/api/social/invite-friend',{userId:person.id,roomSlug:select.value});alertUser('Convite enviado para '+person.name);close();}catch(e){help.textContent=e.message;submit.disabled=false;}});
 controls.append(cancel,submit);panel.append(title,help,select,controls);overlay.append(panel);document.body.appendChild(overlay);cancel.focus();
 try{
  const rooms=await api('/api/rooms');const publicRooms=Array.isArray(rooms)?rooms.filter(r=>!r.isPrivate):[];
  publicRooms.forEach(r=>{const opt=document.createElement('option');opt.value=r.slug;opt.textContent=r.name;select.append(opt);});
  if(!publicRooms.length)help.textContent='Não há salas públicas disponíveis para convidar.';
  else submit.disabled=false;
 }catch(e){help.textContent='Não foi possível carregar salas públicas.';}
}
async function searchFriends(){const box=byId('sfFriendSearchResults');const q=byId('sfFriendQuery').value.trim();if(q.length<2){box.textContent='Digite pelo menos 2 letras.';return;}box.textContent='Buscando pessoas...';try{const results=await api('/api/social/search?q='+encodeURIComponent(q));box.replaceChildren();if(!results.length){box.innerHTML='<div class="sf-social-empty">Ninguém encontrado com esse nome.</div>';return;}const followed=new Set(following.map(x=>x.id));results.forEach(p=>box.appendChild(personCard(p,followed.has(p.id))));}catch(e){box.textContent=e.message;}}
const friendsPanel=byId('sfFriendsPanel');
if(friendsPanel && !byId('sf69OnlineCount')){
 const banner=document.createElement('div');banner.className='sf69-online-head';
 banner.innerHTML='<span aria-hidden="true" class="sf69-online-dot"></span><strong id="sf69OnlineCount">Verificando amigos conectados…</strong><small>Converse ou convide para uma sala</small>';
 friendsPanel.insertBefore(banner,byId('sfFriendsList'));
}
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
window.sfSocialRefresh=()=>{if(byId('screen-lobby')?.classList.contains('active')){if(!byId('sfFanClubsPanel')?.hidden)window.sf71LoadFanClubs?.();else if(byId('sfEventsPanel').hidden)loadFollowing();else loadEvents();}};
// Atualiza a presença quando o painel social estiver visível; sem expor salas privadas.
setInterval(()=>{const box=byId('sfFriendsPanel');if(box && !box.hidden && box.getClientRects().length && document.visibilityState==='visible')loadFollowing();},25000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden && !byId('sfFriendsPanel')?.hidden)loadFollowing();});
loadFollowing();
})();
