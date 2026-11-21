/* SonoraFan 53.0 — Mensagens privadas, respostas, reações, menções, contatos e moderação. */
(() => {
  'use strict';
  const API='/api/chat53', $=id=>document.getElementById(id);
  const EMOJIS=['❤️','😂','🔥','👏','🎶'];
  const state={id:null,cfg:null,peer:null,peerName:'',tab:'inbox',threads:[],contacts:[],connected:false,reply:null,unread:0,lastFocus:null};
  const clean=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validId=id=>typeof id==='string'&&/^[a-f0-9]{24}$/.test(id);
  const shortDate=v=>v?new Date(v).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  async function request(path,{method='GET',body}={}){
    const r=await fetch(API+path,{method,credentials:'include',headers:{...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(data.error||'Não foi possível completar a ação.');
    return data;
  }
  const tell=(text,isError=false)=>{const el=$('sf53Status');if(el){el.textContent=text;el.classList.toggle('is-error',isError);}else if(typeof window.toast==='function')window.toast(text,isError?'error':'success');};
  const toast=msg=>{if(typeof window.toast==='function')window.toast(msg,'success');else tell(msg);};
  const isOpen=()=>!$('sf53Inbox')?.hidden;
  const curMe=()=>state.id;

  async function login(){
    try {
      const cfg=await request('/me');
      state.id=cfg.id;state.cfg=cfg;
      if($('sf53Policy'))$('sf53Policy').value=cfg.allowDM||'everyone';
      if($('sf53PrivateNotices'))$('sf53PrivateNotices').checked=cfg.notify!==false;
      await authSocket();
      await refreshInbox();
      return true;
    }catch(e){if(isOpen())tell(e.message,true);return false;}
  }
  async function authSocket(){
    try{
      const r=await fetch('/api/socket-token',{credentials:'include'});
      if(!r.ok)return;
      const {token}=await r.json();
      if(typeof socket!=='undefined'&&socket.connected&&token){socket.emit('sf53Auth',{token});}
    }catch(e){}
  }
  function unreadUI(){
    document.querySelectorAll('.sf53-unread').forEach(el=>{el.hidden=state.unread===0;el.textContent=state.unread>9?'9+':String(state.unread);});
    const tab=document.querySelector('.sf53-inbox-tabs [data-sf53-tab="inbox"]');
    if(tab)tab.textContent=state.unread?'Conversas ('+state.unread+')':'Conversas';
  }
  async function refreshInbox(){
    if(!state.id)return;
    try{state.threads=await request('/inbox');state.unread=state.threads.filter(x=>x.unread).length;unreadUI();
      if(state.tab==='inbox')renderList();
    }catch(e){if(/sessão|login|autentic|Faça login/i.test(e.message)){state.id=null;state.cfg=null;state.threads=[];state.unread=0;unreadUI();$('sf53InboxList')?.replaceChildren();if(isOpen())closeInbox();}else if(isOpen())tell(e.message,true);}
  }
  async function loadContacts(){
    try{state.contacts=await request('/contacts');if(state.tab==='contacts')renderList();}
    catch(e){tell(e.message,true);}
  }
  function rowHtml(u,{contact=false}={}){
    return `<button type="button" class="sf53-thread ${state.peer===u.id?'is-selected':''}" data-sf53-user="${clean(u.id)}"><span class="sf53-avatar">${clean(u.avatar||'🎧')}</span><span class="sf53-thread-main"><strong>${clean(u.name||'Ouvinte')}</strong><small>${contact?(u.online?'● Em sala pública agora':'Pessoa da sua comunidade'):clean(u.preview||'Conversa privada')}</small></span>${u.unread?'<span class="sf53-dot" aria-label="Mensagem não lida"></span>':''}</button>`;
  }
  function renderList(items){
    const holder=$('sf53InboxList');if(!holder)return;
    const arr=items|| (state.tab==='contacts'?state.contacts:state.threads);
    holder.innerHTML=arr.length?arr.map(u=>rowHtml(u,{contact:state.tab==='contacts'})).join(''):`<p class="sf53-empty-small">${state.tab==='contacts'?'Siga pessoas na comunidade para encontrá-las aqui.':'Sem conversas ainda. Busque um nickname para começar.'}</p>`;
  }
  function tab(name){
    state.tab=name;
    document.querySelectorAll('.sf53-inbox-tabs [data-sf53-tab]').forEach(el=>el.classList.toggle('is-active',el.dataset.sf53Tab===name));
    const settings=name==='settings';
    $('sf53InboxSidebar').hidden=settings;
    $('sf53Settings').hidden=!settings;
    if(settings){$('sf53Welcome').hidden=true;$('sf53Conversation').hidden=true;}
    else if(state.peer){$('sf53Welcome').hidden=true;$('sf53Conversation').hidden=false;}
    else {$('sf53Welcome').hidden=false;$('sf53Conversation').hidden=true;}
    if(name==='contacts')loadContacts();else if(name==='inbox')refreshInbox();
    if(!settings)renderList();
  }
  async function openInbox(id=null,name=''){
    if(!state.id && !(await login()))return toast('Faça login para usar mensagens privadas.');
    state.lastFocus=document.activeElement;
    $('sf53Inbox').hidden=false;
    document.body.classList.add('sf53-inbox-open');
    tab(state.tab==='settings'?'inbox':state.tab);
    $('sf53Inbox').querySelector('.sf53-close')?.focus();
    if(validId(id) && id!==state.id)await openThread(id,name);
  }
  function closeInbox(){
    $('sf53Inbox').hidden=true;
    document.body.classList.remove('sf53-inbox-open');
    if(state.lastFocus?.isConnected)state.lastFocus.focus();
  }
  function back(){
    state.peer=null;state.peerName='';
    $('sf53Conversation').hidden=true;$('sf53Welcome').hidden=false;
    $('sf53Inbox').classList.remove('sf53-show-thread');
    renderList();
  }
  function avatarName(id){return state.threads.find(x=>x.id===id)?.name||state.contacts.find(x=>x.id===id)?.name||'Participante';}
  async function openThread(id,name=''){
    if(!validId(id)||id===state.id)return;
    state.peer=id;state.peerName=name||avatarName(id);
    $('sf53PeerName').textContent=state.peerName;
    $('sf53Settings').hidden=true;$('sf53Welcome').hidden=true;$('sf53Conversation').hidden=false;
    $('sf53Inbox').classList.add('sf53-show-thread');
    $('sf53Messages').innerHTML='<p class="sf53-empty-small">Carregando mensagens…</p>';
    renderList();
    const blocked=state.cfg?.blocked?.includes(id);
    $('sf53BlockPeer').textContent=blocked?'Desbloquear':'Bloquear';
    try{
      const resp=await request('/messages/'+encodeURIComponent(id));
      if(state.peer!==id)return;
      $('sf53PeerName').textContent=resp.other.name||state.peerName;
      $('sf53Messages').innerHTML='';
      resp.messages.forEach(renderPrivate);
      if(!resp.messages.length)$('sf53Messages').innerHTML='<p class="sf53-empty-small">Comece uma conversa respeitosa e musical 🎶</p>';
      $('sf53Messages').scrollTop=$('sf53Messages').scrollHeight;
      request('/messages/'+encodeURIComponent(id)+'/read',{method:'POST'}).then(()=>{refreshInbox();window.sf15MarkPrivateRead?.(id);}).catch(()=>{});
    }catch(e){tell(e.message,true);$('sf53Messages').textContent=e.message;}
  }
  function renderPrivate(m){
    const c=$('sf53Messages');if(!c||c.querySelector('[data-sf53-mid="'+CSSescapeId(m.id)+'"]'))return;
    c.querySelector('.sf53-empty-small')?.remove();
    const mine=m.from===state.id;
    const el=document.createElement('article');
    el.className='sf53-private-message '+(mine?'is-mine':'');el.dataset.sf53Mid=m.id;
    const text=document.createElement('p');text.textContent=m.text;
    const meta=document.createElement('small');meta.textContent=(mine?'Você':'Participante')+' · '+shortDate(m.createdAt);
    const report=document.createElement('button');report.type='button';report.textContent='Denunciar';report.className='sf53-report-dm';report.hidden=mine;
    report.addEventListener('click',()=>reportMessage('dm',m.id,state.peer));
    el.append(text,meta,report);c.appendChild(el);
  }
  function CSSescapeId(id){return String(id||'').replace(/[^\w-]/g,'');}
  async function sendDm(e){
    e.preventDefault();const id=state.peer,text=$('sf53DmText').value.trim();if(!id||!text)return;
    const button=$('sf53DmForm').querySelector('[type=submit]');button.disabled=true;
    try{const data=await request('/messages',{method:'POST',body:{to:id,text}});$('sf53DmText').value='';renderPrivate(data.message);$('sf53Messages').scrollTop=$('sf53Messages').scrollHeight;refreshInbox();}
    catch(err){tell(err.message,true);}finally{button.disabled=false;}
  }
  async function changeBlock(id,block){
    try{await request('/block',{method:'POST',body:{userId:id,block}});
      const arr=state.cfg?.blocked||[]; if(!state.cfg)state.cfg={blocked:[],allowDM:'everyone',notify:true};
      state.cfg.blocked=block?[...new Set([...arr,id])]:arr.filter(v=>v!==id);
      if(state.peer===id)$('sf53BlockPeer').textContent=block?'Desbloquear':'Bloquear';
      tell(block?'Participante bloqueado.':'Participante desbloqueado.');
    }catch(e){tell(e.message,true);}
  }
  async function saveSettings(){
    try{await request('/settings',{method:'PATCH',body:{allowDM:$('sf53Policy').value,notify:$('sf53PrivateNotices').checked}});state.cfg.allowDM=$('sf53Policy').value;state.cfg.notify=$('sf53PrivateNotices').checked;tell('Preferências de privacidade salvas.');}
    catch(e){tell(e.message,true);}
  }
  async function searchUsers(query){
    const dest=$('sf53SearchResults');if(!dest)return;
    if(query.trim().length<2){dest.innerHTML='';return;}
    try{const r=await fetch('/api/social/search?q='+encodeURIComponent(query.trim()),{credentials:'include'});const result=r.ok?await r.json():[];
      dest.innerHTML='<small>Resultados</small>'+(result.length?result.map(u=>rowHtml(u)).join(''):'<p class="sf53-empty-small">Nenhuma pessoa encontrada.</p>');
    }catch(e){dest.innerHTML='<p class="sf53-empty-small">Busca indisponível.</p>';}
  }
  function currentUserIdFromNick(){
    const nick=$('sf51SelectedNickname')?.textContent?.trim();
    const user=(window.sf53RoomUsers||[]).find(u=>u.name===nick);
    return {id:user?.id||null,nick};
  }
  function cancelReply(){state.reply=null;window.sf53ReplyId=null;$('sf53ReplyPreview').hidden=true;}
  function replyTo(id,name,text){window.sf53ReplyId=id;state.reply=id;
    $('sf53ReplyPreview').hidden=false;$('sf53ReplyName').textContent=name;$('sf53ReplyText').textContent=text.slice(0,140);
    $('chatInput')?.focus();
  }
  // 55.0: only existing reactions stay visible as compact counts.
  // New reactions are available through a single contextual popover.
  function renderReactions(div,id,reactions={}){
    let panel=div.querySelector('.sf53-reactions');
    if(!panel){panel=document.createElement('div');panel.className='sf53-reactions sf55-react-summary';div.querySelector('.msg-content')?.appendChild(panel);}
    panel.replaceChildren();
    let count=0;
    for(const emoji of EMOJIS){
      const users=Array.isArray(reactions?.[emoji])?reactions[emoji]:[];
      if(!users.length)continue;
      count+=users.length;
      const button=document.createElement('button');button.type='button';button.dataset.sf53Emoji=emoji;button.dataset.sf53Mid=id;
      button.textContent=emoji+' '+users.length;
      button.className=users.includes(state.id)?'is-mine':'';
      button.setAttribute('aria-label',`Reagir com ${emoji}. ${users.length} reações`);
      button.setAttribute('aria-pressed',String(users.includes(state.id)));
      panel.appendChild(button);
    }
    panel.hidden=count===0;
  }
  function closeReactionPickers(except){
    document.querySelectorAll('.sf55-reaction-menu:not([hidden])').forEach(menu=>{
      if(menu===except)return;
      menu.hidden=true;
      const trigger=menu.closest('.sf55-reaction-wrap')?.querySelector('[data-sf55-reaction-toggle]');
      trigger?.setAttribute('aria-expanded','false');
    });
  }
  function renderPublic(div,msg){
    if(msg.isSystem||msg.isMusic||!div.querySelector('.msg-content'))return;
    const actions=div.querySelector('.msg-actions');
    if(!actions)return;
    if(msg.replyTo){const r=document.createElement('blockquote');r.className='sf53-quote';
      const strong=document.createElement('strong');strong.textContent=msg.replyTo.user||'Pessoa';
      const p=document.createElement('span');p.textContent=msg.replyTo.text||'';
      r.append(strong,p);div.querySelector('.msg-header')?.after(r);
    }
    const replyBtn=document.createElement('button');replyBtn.type='button';replyBtn.className='sf53-reply-btn';replyBtn.textContent='↩ Responder';replyBtn.dataset.sf53Reply=div.dataset.msgId;
    const report=document.createElement('button');report.type='button';report.className='sf53-public-report';report.textContent='Denunciar';report.dataset.sf53Report=div.dataset.msgId;
    const reactionWrap=document.createElement('span');reactionWrap.className='sf55-reaction-wrap';
    const reactionTrigger=document.createElement('button');reactionTrigger.type='button';reactionTrigger.className='sf55-reaction-trigger';
    reactionTrigger.textContent='☺ Reagir';reactionTrigger.dataset.sf55ReactionToggle='1';
    reactionTrigger.setAttribute('aria-label','Escolher reação para esta mensagem');reactionTrigger.setAttribute('aria-expanded','false');
    const reactionMenu=document.createElement('span');reactionMenu.className='sf55-reaction-menu';reactionMenu.hidden=true;
    reactionMenu.setAttribute('role','group');reactionMenu.setAttribute('aria-label','Escolher reação');
    for(const emoji of EMOJIS){const option=document.createElement('button');option.type='button';
      option.dataset.sf53Emoji=emoji;option.dataset.sf53Mid=div.dataset.msgId;option.textContent=emoji;
      option.setAttribute('aria-label','Reagir com '+emoji);reactionMenu.appendChild(option);}
    reactionWrap.append(reactionTrigger,reactionMenu);
    actions.append(replyBtn,reactionWrap,report);
    renderReactions(div,div.dataset.msgId,msg.reactions);
  }
  async function reportMessage(type,id,otherId){
    const reason=prompt('Descreva brevemente o motivo da denúncia (spam, ofensa ou outro):');
    if(reason===null)return;
    if(!reason.trim())return tell('Informe o motivo da denúncia.',true);
    try{await request('/report',{method:'POST',body:{type,otherId:otherId||null,messageId:id,roomSlug:typeof currentRoom!=='undefined'?currentRoom:null,reason:reason.trim()}});toast('Denúncia enviada para moderação.');}
    catch(e){tell(e.message,true);}
  }
  async function refreshReports(){
    const holder=$('sf53AdminReports');if(!holder)return;
    try{
      const r=await fetch('/api/admin/chat-reports',{credentials:'include'});
      if(!r.ok)throw new Error('Acesso indisponível');
      const items=await r.json();
      const validUser=id=>typeof id==='string'&&/^[a-f0-9]{24}$/i.test(id);
      const person=(label,name,id)=>{
        return '<div class="sf53-admin-person"><span>'+label+': <strong>'+clean(name||'Identificação indisponível')+'</strong></span>'+
        (validUser(id)?' <button type="button" data-sf53-contact="'+clean(id)+'" data-sf53-contact-name="'+clean(name||'Participante')+'">✉ Conversar no privado</button>':'')+'</div>';
      };
      holder.innerHTML=items.length?items.map(item=>`
        <article class="sf53-report-admin">
          <div><strong>${item.type==='dm'?'Mensagem privada':'Mensagem pública'}</strong>
          <small>${item.status==='resolved'?'Resolvida':'Pendente'} · ${shortDate(item.createdAt)}</small></div>
          <div class="sf53-admin-people">
            ${person('Quem denunciou',item.reporterName,item.reporterId)}
            ${person('Pessoa denunciada',item.reportedName,item.reportedId)}
          </div>
          <p class="sf53-admin-evidence">${clean(item.evidenceText||'')}</p>
          <small>Motivo: ${clean(item.reason||'Não informado')}</small>
          <div class="sf53-admin-actions"><button data-sf53-resolve="${clean(item.id)}" data-status="${item.status==='resolved'?'open':'resolved'}">${item.status==='resolved'?'Reabrir':'Marcar como resolvida'}</button></div>
        </article>`).join(''):'<p class="sf53-empty-small">Nenhuma denúncia registrada.</p>';
    }catch(e){holder.textContent='Denúncias indisponíveis.';}
  }
  function setupEvents(){
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeReactionPickers();});
    $('sf53RefreshReports')?.addEventListener('click',refreshReports);
    document.addEventListener('click',async e=>{
      const contact=e.target.closest('[data-sf53-contact]');
      if(contact){
        const id=contact.dataset.sf53Contact;
        if(!validId(id))return;
        // O contato abre o chat privado existente. Não cria acesso administrativo
        // oculto à conversa e respeita as preferências da conta.
        if(typeof window.closeAdmin==='function')window.closeAdmin();
        await window.sf53OpenInbox?.(id,contact.dataset.sf53ContactName||'Participante');
        return;
      }
      const b=e.target.closest('[data-sf53-resolve]');if(b){
        try{const r=await fetch('/api/admin/chat-reports/'+encodeURIComponent(b.dataset.sf53Resolve)+'/resolve',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:b.dataset.status})});if(!r.ok)throw new Error('Erro ao atualizar');await refreshReports();}
        catch(err){tell(err.message,true);}
      }
    });
    document.querySelectorAll('[data-sf12-view="moderation"]').forEach(el=>el.addEventListener('click',refreshReports));
    $('sf53Inbox')?.addEventListener('click',e=>{if(e.target===$('sf53Inbox'))closeInbox();});
    $('sf53Inbox')?.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();closeInbox();}
      if(e.key==='Tab'){
        const els=[...$('sf53Inbox').querySelectorAll('button:not([hidden]):not([disabled]),input:not([hidden]),textarea:not([hidden]),select:not([hidden])')].filter(el=>el.getClientRects().length);
        if(!els.length)return;
        const first=els[0],last=els[els.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
    });
    document.querySelectorAll('[data-sf53-tab]').forEach(el=>el.addEventListener('click',()=>tab(el.dataset.sf53Tab)));
    $('sf53DmForm')?.addEventListener('submit',sendDm);
    $('sf53BlockPeer')?.addEventListener('click',()=>state.peer&&changeBlock(state.peer,!state.cfg.blocked.includes(state.peer)));
    $('sf53SaveSettings')?.addEventListener('click',saveSettings);
    let timer;
    $('sf53SearchPeople')?.addEventListener('input',e=>{clearTimeout(timer);timer=setTimeout(()=>searchUsers(e.target.value),320);});
    $('sf53Inbox')?.addEventListener('click',e=>{
      const b=e.target.closest('[data-sf53-user]');if(b){openThread(b.dataset.sf53User,b.querySelector('strong')?.textContent||'');tab('inbox');}
    });
    document.addEventListener('click',async e=>{
      const a=e.target.closest('[data-sf53-nick]');
      if(a){e.preventDefault();const {id,nick}=currentUserIdFromNick();if(!id){tell('Não foi possível identificar essa conta na sala.',true);return;}
        if(a.dataset.sf53Nick==='dm')openInbox(id,nick);
        else if(a.dataset.sf53Nick==='block'){
          const block=!state.cfg?.blocked?.includes(id);
          if(confirm(block?'Bloquear '+nick+'?':'Desbloquear '+nick+'?'))changeBlock(id,block);
        }else if(a.dataset.sf53Nick==='follow'){
          try{const r=await fetch('/api/social/follow',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,follow:true})});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'Não foi possível enviar a solicitação.');toast(data.status==='accepted'?'Vocês já são amigos.':data.status==='incoming'?'Essa pessoa já enviou uma solicitação para você. Veja em Meu Perfil → Amigos.':'Solicitação de amizade enviada para '+nick+'.');}catch(err){tell(err.message,true);}
        }
        return;
      }
      const picker=e.target.closest('[data-sf55-reaction-toggle]');
      if(picker){e.stopPropagation();const menu=picker.closest('.sf55-reaction-wrap')?.querySelector('.sf55-reaction-menu');
        if(!menu)return;
        const opening=menu.hidden;closeReactionPickers();menu.hidden=!opening;
        if(opening){
          const area=picker.closest('.chat-messages-inner')?.getBoundingClientRect();
          const rect=picker.getBoundingClientRect();
          menu.classList.toggle('sf55-reaction-down',!!area && rect.top-area.top<65);
        }
        picker.setAttribute('aria-expanded',String(opening));return;
      }
      const react=e.target.closest('[data-sf53-emoji]');if(react){e.stopPropagation();closeReactionPickers();
        if(typeof socket!=='undefined')socket.emit('sf53Reaction',{messageId:react.dataset.sf53Mid,emoji:react.dataset.sf53Emoji});return;
      }
      if(!e.target.closest('.sf55-reaction-wrap'))closeReactionPickers();
      const reply=e.target.closest('[data-sf53-reply]');if(reply){const msg=reply.closest('.msg');replyTo(reply.dataset.sf53Reply,msg?.querySelector('.sf51-nick-label')?.textContent||'Participante',msg?.querySelector('.msg-text')?.textContent||'');return;}
      const report=e.target.closest('[data-sf53-report]');if(report)reportMessage('room',report.dataset.sf53Report);
    });
  }
  function setupSocket(){
    if(typeof socket==='undefined')return;
    socket.on('connect',()=>{state.connected=false;authSocket();});
    socket.on('sf53AuthOK',({id}={})=>{state.connected=true;if(id)state.id=id;});
    socket.on('sf53AuthFail',()=>{state.connected=false;});
    socket.on('sf53PrivateNew',data=>{
      const m=data?.message; if(!m)return;
      if(state.peer && (m.from===state.peer||m.to===state.peer) && isOpen()){
        renderPrivate(m);$('sf53Messages').scrollTop=$('sf53Messages').scrollHeight;
        if(m.from!==state.id)request('/messages/'+encodeURIComponent(state.peer)+'/read',{method:'POST'}).then(()=>window.sf15MarkPrivateRead?.(state.peer)).catch(()=>{});
      }else if(m.from!==state.id&&!window.sf15OpenNotifications){toast('✉ Nova mensagem privada de '+(data.name||'um participante'));}
      refreshInbox();
    });
    socket.on('sf53ReactionUpdate',data=>{
      if(!data?.messageId)return;
      document.querySelectorAll('.msg').forEach(el=>{if(el.dataset.msgId===data.messageId)renderReactions(el,data.messageId,data.reactions);});
    });
    socket.on('sf53Mention',data=>{
      if(!data?.from)return;
      if(!window.sf15OpenNotifications)toast('🔔 '+data.from+' mencionou você no chat da sala.');
    });
  }
  function init(){
    window.sf53OpenInbox=openInbox;window.sf53CloseInbox=closeInbox;window.sf53Back=back;
    window.sf53CancelReply=cancelReply;window.sf53RenderMessage=renderPublic;
    setupEvents();setupSocket();
    login().catch(()=>{});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.id)refreshInbox();});
    setInterval(()=>{if(state.id)refreshInbox();else login().catch(()=>{});},45000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
