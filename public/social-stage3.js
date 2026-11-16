/* SonoraFan 111 — notifications for DMs, chat mentions, replies and social activity. */
(()=>{'use strict';
const el=(tag,cls,txt)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=String(txt);return x;};
const get=async(path,opts)=>{const r=await fetch(path,{credentials:'include',cache:'no-store',...opts});
 const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||(r.status===401?'Faça login para ver notificações.':'Não foi possível carregar notificações.'));return d;};
const post=(p,b)=>get(p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
const info=(m,t='error')=>typeof toast==='function'?toast(m,t):console.info(m);
const peer=id=>typeof id==='string'&&/^[a-f0-9]{24}$/i.test(id);
const room=id=>typeof id==='string'&&id.length>1&&id.length<150;
const club=id=>typeof id==='string'&&/^[a-f0-9-]{36}$/i.test(id);
const types={message:['✉','Mensagem privada'],mention:['@','Menção ou resposta'],
 invite:['♧','Convite'],follow:['♡','Seguidor'],event:['▦','Evento'],fanclub:['♧','Fan Club']};
const state={alerts:[],drawer:null,filter:'all',busy:false,inInvite:false,loading:false,
 lastFetch:0,pending:false,previousFocus:null};
const navButton=el('button','sf15-bell','🔔 Notificações');
navButton.type='button';navButton.title='Notificações da comunidade';navButton.addEventListener('click',open);
const kind=a=>a.type==='message'?'message':a.type==='mention'?'mention':'other';
const shown=()=>state.alerts.filter(a=>state.filter==='all'||kind(a)===state.filter);
const unread=()=>state.alerts.filter(a=>!a.read).length;
const cap=n=>n>99?'99+':String(n);
function mount(){
 const nav=document.querySelector('#screen-room .sf5-navigation');
 if(nav&&!nav.contains(navButton)){nav.querySelector('button[onclick*="sf5OpenCommunity"]')?.after(navButton);}
 const old=document.querySelector('#screen-lobby .header-right');
 if(old&&!old.querySelector('.sf15-lobby-bell')){
   const b=el('button','sf15-lobby-bell','🔔');b.type='button';b.title='Notificações';
   b.addEventListener('click',open);old.append(b);
 }
 renderBadge();
}
function renderBadge(){
 const n=unread();navButton.textContent='🔔 Notificações'+(n?' ('+cap(n)+')':'');
 const label='Notificações'+(n?' · '+n+' não lidas':' · nenhuma não lida');
 for(const btn of document.querySelectorAll('.sf15-lobby-bell,#sf107NoticeButton')){
   btn.setAttribute('aria-label',label);btn.title=label;
   const badge=btn.querySelector('.sf111-count');
   if(badge){badge.textContent=cap(n);badge.hidden=!n;}
 }
 document.dispatchEvent(new CustomEvent('sf111:updated',{detail:{alerts:state.alerts,unread:n}}));
}
async function load(force=false){
 if(state.loading){state.pending=state.pending||force;return;}
 if(!force&&Date.now()-state.lastFetch<5000)return;
 state.loading=true;
 try{
  const data=await get('/api/social/notifications');
  if(!Array.isArray(data))throw Error('A lista de notificações está indisponível.');
  state.alerts=data.filter(a=>a&&typeof a.id==='string').slice(0,70);
  state.lastFetch=Date.now();renderBadge();if(state.drawer&&!state.inInvite)paint();
 }catch(e){
  if(/Faça login/i.test(e.message)){state.alerts=[];state.lastFetch=0;renderBadge();}
  if(state.drawer&&!state.inInvite&&!state.alerts.length){
   state.drawer.querySelector('.sf15-content')?.replaceChildren(el('p','sf15-empty',e.message));
  }
 }finally{
  state.loading=false;if(state.pending){state.pending=false;load(true);}
 }
}
function close(){
 const d=state.drawer;if(!d)return;d.remove();state.drawer=null;state.inInvite=false;
 document.removeEventListener('keydown',onKey);
 if(state.previousFocus?.isConnected)state.previousFocus.focus();
}
function onKey(e){
 if(e.key==='Escape'){e.preventDefault();close();return;}
 if(e.key!=='Tab'||!state.drawer)return;
 const focus=[...state.drawer.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled)')]
 .filter(x=>!x.hidden&&x.getClientRects().length);
 if(!focus.length)return;
 if(e.shiftKey&&document.activeElement===focus[0]){e.preventDefault();focus[focus.length-1].focus();}
 else if(!e.shiftKey&&document.activeElement===focus[focus.length-1]){e.preventDefault();focus[0].focus();}
}
function open(){
 mount();if(state.drawer){close();return;}
 state.previousFocus=document.activeElement;
 const overlay=el('div','sf15-overlay sf111-overlay');
 const panel=el('section','sf15-panel sf111-panel');panel.setAttribute('role','dialog');
 panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Central de notificações');
 const head=el('header','sf15-head sf111-head');
 const title=el('div','sf111-heading');
 title.append(el('small','','SONORAFAN · SUA COMUNIDADE'),el('h2','','Notificações'),
  el('p','','Mensagens, menções e tudo que importa.'));
 const x=el('button','sf15-close','×');x.type='button';x.setAttribute('aria-label','Fechar notificações');x.addEventListener('click',close);
 head.append(title,x);
 const toolbar=el('div','sf15-toolbar sf111-toolbar');
 const tabs=el('div','sf111-filters');tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Filtrar notificações');
 for(const [key,label] of [['all','Todas'],['message','✉ Privadas'],['mention','@ Menções'],['other','Outras']]){
  const b=el('button','sf111-filter',label);b.type='button';b.dataset.category=key;
  b.addEventListener('click',()=>{state.filter=key;paint();});tabs.append(b);
 }
 const actions=el('div','sf111-bar-actions');
 const all=el('button','sf111-mark-all','✓ Marcar todas como lidas');
 all.type='button';all.addEventListener('click',markAll);
 const invite=el('button','sf15-invite','＋ Convidar amigo');
 invite.type='button';invite.addEventListener('click',inviteFriend);
 actions.append(all,invite);toolbar.append(tabs,actions);
 const content=el('div','sf15-content sf111-content');
 content.setAttribute('aria-live','polite');
 panel.append(head,toolbar,content);overlay.append(panel);
 overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
 document.body.append(overlay);state.drawer=overlay;state.inInvite=false;
 document.addEventListener('keydown',onKey);x.focus();paint();load(true);
}
async function markOne(a){
 if(a.read||state.busy)return !!a.read;
 state.busy=true;
 try{await post('/api/social/notifications/read',{ids:[a.id]});a.read=true;renderBadge();return true;}
 catch(e){info(e.message);return false;}
 finally{state.busy=false;}
}
async function markAll(){
 if(state.busy)return;
 const ids=shown().filter(a=>!a.read).map(a=>a.id).slice(0,70);
 if(!ids.length)return;state.busy=true;
 try{
  await post('/api/social/notifications/read',{ids});
  const done=new Set(ids);state.alerts.forEach(a=>{if(done.has(a.id))a.read=true;});
  renderBadge();paint();
 }catch(e){info(e.message);}
 finally{state.busy=false;}
}
async function navigate(a){
 if(!a.read){if(!await markOne(a))return;}
 close();
 if(a.type==='message'){
   if(peer(a.peerId))window.sf53OpenInbox?.(a.peerId);
   else window.sf53OpenInbox?.(); // Older notifications have no peer metadata.
   return;
 }
 if(room(a.roomSlug)){
   if(typeof joinRoom==='function')joinRoom(a.roomSlug);
   else info('Abra a sala pelo Lobby.');
   return;
 }
 if(club(a.fanClubId)){
   if(typeof window.sf110OpenCommunity==='function')window.sf110OpenCommunity('fanclubs');
   else window.sf5OpenCommunity?.();
   window.sfSocialSwitchTab?.('fanclubs');window.sf71OpenFanClub?.(a.fanClubId);
   return;
 }
 if(a.type==='follow'){
   if(typeof window.sf110OpenCommunity==='function')window.sf110OpenCommunity('friends');
   else window.sf5OpenCommunity?.();
   return;
 }
 if(a.type==='event'){
   if(typeof window.sf110OpenCommunity==='function')window.sf110OpenCommunity('events');
   else window.sf5OpenCommunity?.();
 }
}
function since(ms){
 const t=Number(ms),d=Date.now()-t;
 if(!Number.isFinite(t)||t<=0)return '';
 if(d>=0&&d<60000)return 'Agora';
 if(d>=0&&d<3600000)return 'há '+Math.max(1,Math.floor(d/60000))+' min';
 if(d>=0&&d<86400000)return 'há '+Math.floor(d/3600000)+' h';
 return new Date(t).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
}
function paint(){
 const box=state.drawer?.querySelector('.sf15-content');if(!box)return;
 state.inInvite=false;box.replaceChildren();
 const labels={all:'Todas',message:'✉ Privadas',mention:'@ Menções',other:'Outras'};
 for(const tab of state.drawer.querySelectorAll('[data-category]')){
  const active=tab.dataset.category===state.filter;
  tab.classList.toggle('active',active);tab.setAttribute('aria-pressed',String(active));
  const count=tab.dataset.category==='all'?unread():state.alerts.filter(a=>kind(a)===tab.dataset.category&&!a.read).length;
  tab.textContent=labels[tab.dataset.category]+(count?' · '+cap(count):'');
 }
 const all=shown(),bar=state.drawer.querySelector('.sf111-mark-all');
 if(bar)bar.disabled=!all.some(a=>!a.read)||state.busy;
 if(!all.length){
  box.append(el('div','sf15-empty sf111-empty',
   state.filter==='message'?'Nenhuma mensagem privada por enquanto.':
   state.filter==='mention'?'Quando alguém mencionar ou responder você em uma sala, aparecerá aqui.':
   state.filter==='other'?'Nenhuma outra novidade no momento.':
   'Sem novidades por enquanto. Suas mensagens e menções aparecerão aqui.'));
  return;
 }
 for(const a of all){
  const card=el('article','sf15-item sf111-item'+(a.read?'':' sf15-unread'));
  const head=el('div','sf111-item-head');
  const [symbol,category]=types[a.type]||['♬','Atualização'];
  const icon=el('span','sf111-type-icon sf111-type-'+(types[a.type]?a.type:'other'),symbol);
  const infoBox=el('div','sf111-item-info');
  infoBox.append(el('span','sf111-type-name',category),el('strong','',a.title||category),el('p','',a.message||''));
  const meta=el('div','sf111-item-meta');
  meta.append(el('small','',since(a.createdAt)));if(!a.read)meta.append(el('i','sf111-unread-dot'));
  head.append(icon,infoBox,meta);card.append(head);
  const actions=el('div','sf15-actions sf111-item-actions');
  const label=a.type==='message'?'Abrir conversa':a.type==='mention'?'Ver na sala':
              a.roomSlug?'Entrar na sala':a.fanClubId?'Abrir Fan Club':
              a.type==='follow'?'Ver comunidade':'Ver detalhes';
  const go=el('button','sf111-primary',label);go.type='button';go.addEventListener('click',()=>navigate(a));actions.append(go);
  if(!a.read){
   const mark=el('button','sf111-mark','Marcar lida');mark.type='button';
   mark.addEventListener('click',async()=>{mark.disabled=true;if(await markOne(a))paint();else mark.disabled=false;});
   actions.append(mark);
  }
  card.append(actions);box.append(card);
 }
}
async function inviteFriend(){
 const box=state.drawer?.querySelector('.sf15-content');if(!box)return;
 state.inInvite=true;box.replaceChildren();
 box.append(el('h3','','Convidar para ouvir junto'));
 const guide=el('p','sf15-help','Convide alguém que você segue para uma sala pública.');
 const selectRoom=el('select');selectRoom.setAttribute('aria-label','Escolher sala');
 const selectUser=el('select');selectUser.setAttribute('aria-label','Escolher amigo');
 const send=el('button','sf15-send','Enviar convite');send.type='button';send.disabled=true;
 const back=el('button','sf15-back','Voltar');back.type='button';back.addEventListener('click',paint);
 const form=el('div','sf15-form');form.append(selectRoom,selectUser,send,back);box.append(guide,form);
 try{
  const [friends,rooms]=await Promise.all([get('/api/social/following'),get('/api/rooms')]);
  for(const r of rooms.filter(r=>!r.isPrivate&&room(r.slug))){
   const o=el('option','',r.name);o.value=r.slug;selectRoom.append(o);
  }
  for(const f of friends.filter(x=>peer(x.id))){
   const o=el('option','',f.name);o.value=f.id;selectUser.append(o);
  }
  if(!selectRoom.options.length||!selectUser.options.length){
   guide.textContent='Siga alguém e tenha uma sala pública para enviar um convite.';return;
  }
  send.disabled=false;send.addEventListener('click',async()=>{
   if(send.disabled)return;send.disabled=true;
   try{await post('/api/social/invite-friend',{userId:selectUser.value,roomSlug:selectRoom.value});
    info('Convite enviado!','success');paint();
   }catch(e){guide.textContent=e.message;send.disabled=false;}
  });
 }catch(e){guide.textContent=e.message;}
}
let registered=false;
function realtime(){
 if(registered||typeof socket==='undefined'||!socket?.on)return;
 registered=true;let last=0;
 const refresh=()=>{if(Date.now()-last<500)return;last=Date.now();load(true);};
 socket.on('sf111Notification',refresh);
 socket.on('sf53AuthOK',refresh);
}
function init(){
 mount();window.sf15OpenNotifications=open;
 window.sf15RefreshNotifications=()=>load(true);
 window.sf15OpenNotification=id=>{const item=state.alerts.find(a=>a.id===id);if(item)navigate(item);else open();};
 window.sf15MarkPrivateRead=async id=>{
   if(!peer(id))return;
   const notices=state.alerts.filter(a=>a.type==='message'&&a.peerId===id&&!a.read);
   const ids=notices.map(a=>a.id).slice(0,70);
   if(!ids.length)return;
   try{
     await post('/api/social/notifications/read',{ids});
     const done=new Set(ids);
     state.alerts.forEach(a=>{if(done.has(a.id))a.read=true;});
     renderBadge();if(state.drawer&&!state.inInvite)paint();
   }catch(_){}
 };
 realtime();load(true);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)load(true);});
 setInterval(()=>{if(!document.hidden)load();},20000);
 document.addEventListener('sf111:refresh',()=>load(true));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();