/* SonoraFan 71 — Comunidade em 3 áreas: Amigos / Fan Clubs / Eventos. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id), panel=$('sfFanClubsPanel');if(!panel)return;
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const state={query:'',mine:false,clubs:[],activeId:null,detail:null,busy:false,searchTimer:null,previousFocus:null,stream:null,poll:null,refreshTimer:null};
 const status=(s='',error=false)=>{const el=$('sf71ClubStatus');if(el){el.textContent=s;el.classList.toggle('is-error',!!error);}};
 const themes={vinyl:'Vinil',stage:'Palco',cassette:'Cassete',waves:'Ondas'};
 const byId=id=>state.clubs.find(c=>c.id===id);
 async function api(url,opts={}){
   const r=await fetch(url,{credentials:'include',...opts,headers:{...(opts.body?{'Content-Type':'application/json'}:{}),...(opts.headers||{})}});
   const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'Erro ao carregar a comunidade.');return data;
 }
 const post=(url,data)=>api(url,{method:'POST',body:JSON.stringify(data||{})});
 const action=async (fn,msg)=>{if(state.busy)return;state.busy=true;status('Salvando…');
   try{await fn();status(msg||'Atualizado.');}catch(e){status(e.message,true);}finally{state.busy=false;}};
 function stopLive(){
   state.stream?.close();state.stream=null;
   if(state.poll)clearInterval(state.poll);state.poll=null;
   if(state.refreshTimer)clearTimeout(state.refreshTimer);state.refreshTimer=null;
 }
 function scheduleRefresh(id,kind){
   if(state.activeId!==id)return;
   if(state.refreshTimer)clearTimeout(state.refreshTimer);
   state.refreshTimer=setTimeout(async()=>{
     state.refreshTimer=null;
     if(state.activeId!==id)return;
     if(kind==='post'){
       await loadPosts(id);
       status('♫ O mural recebeu uma atualização.');
     }else{
       // A alteração pode afetar sua permissão de acesso.
       await openDetail(id);
     }
   },450);
 }
 function startLive(id){
   stopLive();if(state.activeId!==id||!state.detail?.club?.joined)return;
   const label=$('sf72ClubLiveStatus');
   if(typeof EventSource!=='undefined'){
     const stream=new EventSource('/api/fan-clubs/'+encodeURIComponent(id)+'/stream',{withCredentials:true});
     state.stream=stream;
     stream.addEventListener('open',()=>{if(label)label.textContent='Mural conectado';});
     stream.addEventListener('post',()=>scheduleRefresh(id,'post'));
     stream.addEventListener('members',()=>scheduleRefresh(id,'members'));
     stream.addEventListener('rooms',()=>scheduleRefresh(id,'rooms'));
     stream.addEventListener('error',()=>{if(label)label.textContent='Reconectando…';});
   }else{
     if(label)label.textContent='Atualização periódica';
     state.poll=setInterval(()=>{if(state.activeId===id&&!document.hidden)loadPosts(id);},25000);
   }
 }
 const showList=()=>{stopLive();$('sf71ClubList').hidden=false;$('sf71ClubDetail').hidden=true;state.activeId=null;state.detail=null;};
 function clubCard(c){return `<article class="sf71-club-card" data-sf71-id="${esc(c.id)}">
   <div class="sf71-club-art sf71-theme-${esc(c.theme)}" aria-hidden="true"><span>${c.theme==='stage'?'♫':c.theme==='cassette'?'▣':c.theme==='waves'?'〰':'◉'}</span></div>
   <div class="sf71-club-copy"><small>FAN CLUB · NÃO OFICIAL</small><strong>${esc(c.title)}</strong><span>Para fãs de ${esc(c.artist)}</span>
    <p>${esc(c.description||'Converse, conheça outros fãs e compartilhe músicas.')}</p>
    <div class="sf71-club-meta"><span>👥 ${Number(c.memberCount)||0} membros</span><span>♫ ${Number(c.roomCount)||0} salas</span>${c.joined?'<span>✓ Participando</span>':''}</div>
   </div><button type="button" data-sf71-open="${esc(c.id)}" aria-label="Abrir ${esc(c.title)}">Ver Fan Club</button></article>`;}
 async function loadClubs(){
   const box=$('sf71ClubList');if(!box)return;
   status('Carregando Fan Clubs…');
   try{const params=new URLSearchParams();if(state.query)params.set('q',state.query);if(state.mine)params.set('mine','true');
     const response=await api('/api/fan-clubs?'+params);
     state.clubs=Array.isArray(response.clubs)?response.clubs:[];
     box.innerHTML=state.clubs.length?state.clubs.map(clubCard).join(''):
       `<div class="sf71-empty"><strong>${state.mine?'Você ainda não participa de Fan Clubs.':'Nenhum Fan Club encontrado.'}</strong><p>Crie uma comunidade para seu artista favorito ou pesquise outro nome.</p></div>`;
     status(state.clubs.length===1?'1 Fan Club encontrado':`${state.clubs.length} Fan Clubs encontrados`);
   }catch(e){box.innerHTML='<p class="sf71-empty">Não foi possível carregar as comunidades.</p>';status(e.message,true);}
 }
 function message(text){const box=document.createElement('div');box.className='sf71-inline-message';box.setAttribute('role','alert');box.textContent=text;return box;}
 function modal(title,fields,onSubmit){
   const existing=$('sf71Modal');existing?.remove();
   const overlay=document.createElement('div');overlay.id='sf71Modal';overlay.className='sf71-modal-overlay';overlay.innerHTML=`<section class="sf71-modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header><h3>${esc(title)}</h3><button type="button" class="sf71-modal-close" aria-label="Fechar">✕</button></header><form class="sf71-modal-form">${fields}<p class="sf71-form-status" role="status" aria-live="polite"></p><div class="sf71-modal-actions"><button type="button" class="sf71-cancel">Cancelar</button><button type="submit" class="sf71-action-primary">Salvar</button></div></form></section>`;
   const focus=document.activeElement;
   const close=()=>{overlay.remove();focus?.focus?.();};
   overlay.querySelector('.sf71-modal-close').addEventListener('click',close);
   overlay.querySelector('.sf71-cancel').addEventListener('click',close);
   overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
   overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}});
   overlay.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const submit=e.target.querySelector('[type="submit"]');submit.disabled=true;
     try{await onSubmit(new FormData(e.target));close();}catch(err){overlay.querySelector('.sf71-form-status').textContent=err.message;submit.disabled=false;}});
   document.body.append(overlay);overlay.querySelector('input,select,textarea')?.focus();return overlay;
 }
 function openCreate(){modal('Criar Fan Club',`<label>Artista ou banda<input name="artist" maxlength="65" minlength="2" required placeholder="Ex.: Linkin Park"></label>
   <label>Nome da comunidade<input name="title" maxlength="75" minlength="3" required placeholder="Ex.: Fãs de Linkin Park Brasil"></label>
   <label>Descrição<textarea name="description" maxlength="280" rows="2" placeholder="O que une os fãs por aqui?"></textarea></label>
   <label>Regras da comunidade<textarea name="rules" maxlength="300" rows="2" placeholder="Respeito, sem spam e com muito som…"></textarea></label>
   <label>Identidade visual<select name="theme"><option value="vinyl">Vinil</option><option value="stage">Palco</option><option value="cassette">Cassete</option><option value="waves">Ondas</option></select></label>
   <small class="sf71-unofficial">Fan Club criado por fãs, sem associação oficial ao artista.</small>`,async fd=>{
      const d=await post('/api/fan-clubs',Object.fromEntries(fd.entries()));
      state.mine=false;$('sf71ClubMine').setAttribute('aria-pressed','false');await loadClubs();await openDetail(d.club.id);
   });}
 function membersHtml(d){if(!d.club.joined&&!d.club.owner)return '';
   const members=(d.club.members||[]).map(m=>`<div class="sf71-member"><span>${esc(m.avatar||'🎧')}</span><strong>${esc(m.name)}</strong>
     ${d.club.owner&&m.id!==d.club.ownerId?`<button type="button" data-sf71-block="${esc(m.id)}">Remover</button>`:''}</div>`).join('');
   const blocked=(d.club.blockedMembers||[]).map(m=>`<div class="sf71-member"><span>⛔</span><strong>${esc(m.name)}</strong><button type="button" data-sf71-unblock="${esc(m.id)}">Desbloquear</button></div>`).join('');
   return `<details class="sf71-members"><summary>Participantes (${d.club.memberCount})</summary><div class="sf71-members-list">${members}${blocked}</div></details>`;
 }
 function postHtml(post){return `<article class="sf71-post" data-sf71-post="${esc(post.id)}"><div class="sf71-post-head"><strong>♫ ${esc(post.authorName)}</strong><time>${new Date(Number(post.createdAt)||Date.now()).toLocaleString('pt-BR')}</time></div><p>${esc(post.text)}</p>${post.editable?`<button type="button" data-sf71-delete-post="${esc(post.id)}">Excluir publicação</button>`:''}</article>`;}
 function roomHtml(room,owner){return `<div class="sf71-room"><div><strong>♫ ${esc(room.name)}</strong><small>${room.isPlaying?'● Tocando agora':'Sala disponível'} · ${Number(room.listenerCount)||0} ouvintes</small>${room.track?`<small>${esc(room.track.title)}</small>`:''}</div>
   <div class="sf71-room-actions"><button type="button" data-sf71-room="${esc(room.slug)}">Entrar</button>${owner?`<button type="button" data-sf71-unlink="${esc(room.slug)}" title="Desvincular sala">×</button>`:''}</div></div>`;}
 async function openDetail(id){
   stopLive();state.activeId=id;const box=$('sf71ClubDetail');box.hidden=false;$('sf71ClubList').hidden=true;box.innerHTML='<p class="sf71-empty">Carregando comunidade…</p>';
   try{const d=await api('/api/fan-clubs/'+encodeURIComponent(id));state.detail=d;
     const c=d.club;
     box.innerHTML=`<button type="button" class="sf71-back" data-sf71-back>← Voltar aos Fan Clubs</button>
       <div class="sf71-detail-hero sf71-theme-${esc(c.theme)}"><div class="sf71-detail-symbol" aria-hidden="true">♫</div><div><span>FAN CLUB NÃO OFICIAL</span><h3>${esc(c.title)}</h3><p>Para fãs de ${esc(c.artist)} · ${c.memberCount} participantes</p></div></div>
       <p class="sf71-detail-desc">${esc(c.description||'Um lugar para reunir fãs, músicas e boas conversas.')}</p>
       ${c.rules?`<div class="sf71-rule"><strong>Regras da comunidade</strong><p>${esc(c.rules)}</p></div>`:''}
       <div class="sf71-detail-actions">${c.owner?'<span class="sf71-owner">★ Você administra este Fan Club</span>':`<button type="button" class="sf71-action-primary" data-sf71-join>${c.joined?'Sair do Fan Club':'Participar do Fan Club'}</button>`}
         <button type="button" data-sf71-events>📅 Ver eventos</button></div>
       <div class="sf71-detail-columns"><section class="sf71-feed"><div class="sf71-rooms-head"><h4>Conversa da comunidade</h4>${c.joined?'<span class="sf72-live-label" id="sf72ClubLiveStatus">Conectando…</span>':''}</div>
         ${c.joined?`<form id="sf71PostForm"><label for="sf71PostText" class="sf71-sr-only">Publicar no Fan Club</label><textarea id="sf71PostText" maxlength="600" minlength="3" rows="3" placeholder="Compartilhe uma música, uma descoberta ou um assunto sobre o artista…" required></textarea><button type="submit" class="sf71-action-primary">Publicar</button></form><div id="sf71Posts" aria-live="polite">Carregando conversa…</div>`:'<p class="sf71-empty">Participe do Fan Club para ler e publicar no mural.</p>'}
       </section><aside class="sf71-room-list"><div class="sf71-rooms-head"><h4>Salas do Fan Club</h4>${c.owner?'<button type="button" data-sf71-addroom>＋ Vincular sala</button>':''}</div>
         <div>${c.rooms?.length?c.rooms.map(r=>roomHtml(r,c.owner)).join(''):'<p class="sf71-empty">Nenhuma sala vinculada ainda.</p>'}</div>
         ${(c.events||[]).length?`<div class="sf71-club-events"><h4>Próximos encontros</h4>${c.events.map(ev=>`<div class="sf71-club-event"><strong>${esc(ev.title)}</strong><small>${new Date(Number(ev.startAt)).toLocaleString('pt-BR')} · ${esc(ev.roomName)}</small></div>`).join('')}<button type="button" data-sf71-events>Ver agenda e confirmar presença</button></div>`:''}
         ${membersHtml(d)}
       </aside></div>`;
     if(c.joined){await loadPosts(id);if(state.activeId===id)startLive(id);}
   }catch(e){box.innerHTML=`<p class="sf71-empty" role="alert">${esc(e.message)}</p><button type="button" class="sf71-back" data-sf71-back>← Voltar</button>`;}
 }
 async function loadPosts(id){try{const d=await api('/api/fan-clubs/'+encodeURIComponent(id)+'/posts');if(state.activeId!==id)return;const box=$('sf71Posts');if(!box)return;
   box.innerHTML=d.posts?.length?d.posts.map(postHtml).join(''):'<p class="sf71-empty">Ainda não há publicações. Inicie a conversa!</p>';
  }catch(e){const box=$('sf71Posts');if(box)box.textContent=e.message;}}
 async function chooseRoom(){
   let rooms;try{rooms=await api('/api/social/my-rooms');}catch(e){status(e.message,true);return;}
   if(!rooms.length){status('Você precisa criar ou administrar uma sala pública antes de vinculá-la.',true);return;}
   modal('Vincular sala pública',`<label>Escolha uma sala<select name="slug">${rooms.map(r=>`<option value="${esc(r.slug)}">${esc(r.name)}</option>`).join('')}</select></label>
     <p>Você pode vincular até 3 salas públicas a este Fan Club.</p>`,async fd=>{
       await post('/api/fan-clubs/'+encodeURIComponent(state.activeId)+'/rooms',{slug:fd.get('slug')});await openDetail(state.activeId);
     });
 }
 async function onDetailClick(e){const t=e.target.closest('button');if(!t)return;const id=state.activeId;if(!id)return;
   if(t.matches('[data-sf71-back]')){showList();await loadClubs();return;}
   if(t.hasAttribute('data-sf71-events')){window.sfSocialSwitchTab?.('events');return;}
   if(t.hasAttribute('data-sf71-refresh')){await loadPosts(id);return;}
   if(t.hasAttribute('data-sf71-room')){const slug=t.dataset.sf71Room;document.querySelector('.sf5-community-layer .sf5-close')?.click();if(typeof joinRoom==='function')joinRoom(slug);return;}
   if(t.hasAttribute('data-sf71-addroom')){await chooseRoom();return;}
   if(t.hasAttribute('data-sf71-join')){await action(async()=>{
     if(state.detail?.club.joined)await api('/api/fan-clubs/'+encodeURIComponent(id)+'/join',{method:'DELETE'});
     else await post('/api/fan-clubs/'+encodeURIComponent(id)+'/join',{});
     await openDetail(id);await loadClubs();
   },'Participação atualizada.');return;}
   const del=t.dataset.sf71DeletePost;
   if(del){if(!confirm('Excluir esta publicação?'))return;
     await action(async()=>{await api('/api/fan-clubs/'+encodeURIComponent(id)+'/posts/'+encodeURIComponent(del),{method:'DELETE'});await loadPosts(id);},'Publicação excluída.');return;}
   const unlink=t.dataset.sf71Unlink;
   if(unlink){await action(async()=>{await api('/api/fan-clubs/'+encodeURIComponent(id)+'/rooms/'+encodeURIComponent(unlink),{method:'DELETE'});await openDetail(id);},'Sala desvinculada.');return;}
   const block=t.dataset.sf71Block,unblock=t.dataset.sf71Unblock;
   if(block||unblock){if(block&&!confirm('Remover este participante e impedir novas entradas?'))return;
     await action(async()=>{await post('/api/fan-clubs/'+encodeURIComponent(id)+'/moderation',{userId:block||unblock,action:block?'block':'unblock'});await openDetail(id);},'Moderação atualizada.');}
 }
 function init(){
   $('sf71CreateClub')?.addEventListener('click',openCreate);
   $('sf71ClubSearch')?.addEventListener('input',e=>{state.query=e.target.value.trim();clearTimeout(state.searchTimer);state.searchTimer=setTimeout(()=>loadClubs(),250);});
   $('sf71ClubMine')?.addEventListener('click',e=>{state.mine=!state.mine;e.currentTarget.setAttribute('aria-pressed',String(state.mine));loadClubs();});
   $('sf71ClubList')?.addEventListener('click',async e=>{const b=e.target.closest('[data-sf71-open]');if(b)await openDetail(b.dataset.sf71Open);});
   $('sf71ClubDetail')?.addEventListener('click',onDetailClick);
   $('sf71ClubDetail')?.addEventListener('submit',async e=>{if(e.target.id!=='sf71PostForm')return;e.preventDefault();const id=state.activeId,text=$('sf71PostText').value.trim();if(text.length<3)return;
     const submit=e.target.querySelector('[type="submit"]');submit.disabled=true;
     try{await post('/api/fan-clubs/'+encodeURIComponent(id)+'/posts',{text});$('sf71PostText').value='';await loadPosts(id);}
     catch(err){status(err.message,true);}finally{submit.disabled=false;}
   });
   window.sf71LoadFanClubs=()=>{showList();loadClubs();};
   window.sf71OpenFanClub=id=>{if(/^[a-f0-9-]{36}$/.test(String(id||'')))openDetail(id);};
   window.sf71StopLive=stopLive;
   document.addEventListener('click',e=>{
     if(e.target.closest('.sf5-community-layer .sf5-close') || e.target.classList.contains('sf5-community-layer'))stopLive();
     const tab=e.target.closest('#sfSocialHub [data-sf-tab]');
     if(tab&&tab.dataset.sfTab!=='fanclubs')stopLive();
   },true);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
