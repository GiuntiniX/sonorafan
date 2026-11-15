/* SonoraFan 71 — Comunidade em 3 áreas: Amigos / Fan Clubs / Eventos. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id), panel=$('sfFanClubsPanel');if(!panel)return;
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const state={query:'',mine:false,clubs:[],activeId:null,detail:null,busy:false,searchTimer:null,previousFocus:null,stream:null,poll:null,refreshTimer:null};
 const status=(s='',error=false)=>{const el=$('sf71ClubStatus');if(el){el.textContent=s;el.classList.toggle('is-error',!!error);}};
 const themes={vinyl:'Vinil',stage:'Palco',cassette:'Cassete',waves:'Ondas'};
 const byId=id=>state.clubs.find(c=>c.id===id);
 const coverUrl=club=>club?.coverVersion ? '/api/fan-clubs/'+encodeURIComponent(club.id)+'/cover?v='+encodeURIComponent(String(club.coverVersion)) : '';
 const imageCover=(club,small=false)=>club?.coverVersion ? `<img class="sf73-cover-img" src="${coverUrl(club)}" alt="Capa do Fan Club ${esc(club.title)}" ${small?'loading="lazy"':''} decoding="async">` : '';
 async function compressCover(file){
   if(!file)return null;
   if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Escolha uma imagem JPG, PNG ou WebP.');
   if(file.size>8*1024*1024)throw Error('A imagem original não pode ultrapassar 8 MB.');
   const url=URL.createObjectURL(file);
   let img;
   try{
     img=await new Promise((resolve,reject)=>{const el=new Image();el.onload=()=>resolve(el);el.onerror=()=>reject(Error('Não foi possível ler a imagem.'));el.src=url;});
     if(img.naturalWidth<180||img.naturalHeight<90)throw Error('Escolha uma imagem com pelo menos 180 × 90 pixels.');
     let blob=null;
     for(const width of [1600,1320,1100,900]){
       const height=Math.round(width*0.42);const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
       const ctx=canvas.getContext('2d');if(!ctx)throw Error('Seu navegador não conseguiu processar esta imagem.');
       const imageRatio=img.naturalWidth/img.naturalHeight,ratio=width/height;
       const sw=imageRatio>ratio ? img.naturalHeight*ratio : img.naturalWidth;
       const sh=imageRatio>ratio ? img.naturalHeight : img.naturalWidth/ratio;
       const sx=(img.naturalWidth-sw)/2,sy=(img.naturalHeight-sh)/2;
       ctx.drawImage(img,sx,sy,sw,sh,0,0,width,height);
       for(const quality of [.83,.72,.60,.48]){
         const candidate=await new Promise(r=>canvas.toBlob(r,'image/webp',quality));
         if(candidate?.type==='image/webp'&&candidate.size>0){blob=candidate;if(blob.size<=175*1024)return blob;}
       }
     }
     throw Error('Não foi possível reduzir essa imagem ao tamanho aceito. Escolha outra foto.');
   }finally{URL.revokeObjectURL(url);}
 }
 async function uploadCover(id,file){
   const blob=await compressCover(file);
   const r=await fetch('/api/fan-clubs/'+encodeURIComponent(id)+'/cover',{
     method:'POST',credentials:'include',headers:{'Content-Type':'image/webp'},body:blob
   });
   const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Não foi possível salvar a capa.');
   return d;
 }

 async function api(url,opts={}){
   const r=await fetch(url,{credentials:'include',...opts,headers:{...(opts.body?{'Content-Type':'application/json'}:{}),...(opts.headers||{})}});
   const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(r.status===429?'Muitas tentativas em pouco tempo. Tente novamente em aproximadamente 1 minuto.':(data.error||'Erro ao carregar a comunidade.'));return data;
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
     stream.addEventListener('cover',()=>scheduleRefresh(id,'cover'));
     stream.addEventListener('error',()=>{if(label)label.textContent='Reconectando…';});
   }else{
     if(label)label.textContent='Atualização periódica';
     state.poll=setInterval(()=>{if(state.activeId===id&&!document.hidden)loadPosts(id);},25000);
   }
 }
 const showList=()=>{stopLive();$('sf71ClubList').hidden=false;$('sf71ClubDetail').hidden=true;state.activeId=null;state.detail=null;};
 function clubCard(c){return `<article class="sf71-club-card" data-sf71-id="${esc(c.id)}">
   <div class="sf71-club-art sf71-theme-${esc(c.theme)} ${c.coverVersion?'sf73-with-cover':''}">${imageCover(c,true)}<span aria-hidden="true">${c.theme==='stage'?'♫':c.theme==='cassette'?'▣':c.theme==='waves'?'〰':'◉'}</span></div>
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
 function modal(title,fields,onSubmit,afterSubmit){
   const existing=$('sf71Modal');existing?.remove();
   const overlay=document.createElement('div');overlay.id='sf71Modal';overlay.className='sf71-modal-overlay';
   overlay.innerHTML=`<section class="sf71-modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header><h3>${esc(title)}</h3><button type="button" class="sf71-modal-close" aria-label="Fechar">✕</button></header><form class="sf71-modal-form">${fields}<p class="sf71-form-status" role="status" aria-live="polite"></p><div class="sf71-modal-actions"><button type="button" class="sf71-cancel">Cancelar</button><button type="submit" class="sf71-action-primary">Salvar</button></div></form></section>`;
   const focus=document.activeElement;let busy=false;
   const close=()=>{if(busy)return;overlay.remove();focus?.focus?.();};
   overlay.querySelector('.sf71-modal-close').addEventListener('click',close);
   overlay.querySelector('.sf71-cancel').addEventListener('click',close);
   overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
   overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}
     if(e.key==='Tab'){const els=[...overlay.querySelectorAll('button,input,textarea,select')].filter(el=>!el.disabled&&el.getClientRects().length);
       const first=els[0],last=els[els.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
       else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
   });
   overlay.querySelector('form').addEventListener('submit',async e=>{
     e.preventDefault();if(busy)return;const submit=e.target.querySelector('[type="submit"]');
     busy=true;submit.disabled=true;submit.textContent='Salvando…';
     try{
       const result=await onSubmit(new FormData(e.target));
       busy=false;overlay.remove();focus?.focus?.();
       if(afterSubmit)await afterSubmit(result);
     }catch(err){
       const statusEl=overlay.querySelector('.sf71-form-status');
       if(statusEl){statusEl.textContent=err.message||'Não foi possível concluir a operação.';submit.disabled=false;submit.textContent='Salvar';}
       else status(err.message||'Falha ao abrir o Fan Club.',true);
       busy=false;
     }
   });
   document.body.append(overlay);overlay.querySelector('input,select,textarea')?.focus();return overlay;
 }
 function openCreate(){
   const overlay=modal('Criar Fan Club',`<label>Artista ou banda<input name="artist" maxlength="65" minlength="2" required placeholder="Ex.: Linkin Park"></label>
   <label>Nome da comunidade<input name="title" maxlength="75" minlength="3" required placeholder="Ex.: Fãs de Linkin Park Brasil"></label>
   <label>Descrição<textarea name="description" maxlength="280" rows="2" placeholder="O que une os fãs por aqui?"></textarea></label>
   <label>Regras da comunidade<textarea name="rules" maxlength="300" rows="2" placeholder="Respeito, sem spam e com muito som…"></textarea></label>
   <label>Identidade visual<select name="theme"><option value="vinyl">Vinil</option><option value="stage">Palco</option><option value="cassette">Cassete</option><option value="waves">Ondas</option></select></label>
   <label class="sf73-cover-field">Imagem de capa (opcional)<input type="file" id="sf73CreateCover" name="coverImage" accept="image/jpeg,image/png,image/webp"><small>Use uma foto do artista ou da comunidade. A imagem será ajustada para o formato panorâmico.</small><img id="sf73CoverPreview" alt="Prévia da capa escolhida" hidden></label>
   <small class="sf71-unofficial">Fan Club criado por fãs, sem associação oficial ao artista.</small>`,async fd=>{
     const file=fd.get('coverImage');
     if(file?.size && (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>8*1024*1024)) throw Error('Escolha uma imagem JPG, PNG ou WebP de até 8 MB.');
     const payload={};for(const key of ['artist','title','description','rules','theme'])payload[key]=fd.get(key)||'';
     const d=await post('/api/fan-clubs',payload);return {id:d.club.id,file:file?.size?file:null};
   },async result=>{
     let warning='';if(result.file){status('Preparando capa do Fan Club…');try{await uploadCover(result.id,result.file);}catch(e){warning='O Fan Club foi criado, mas a capa não foi enviada: '+e.message;}}
     state.mine=false;$('sf71ClubMine')?.setAttribute('aria-pressed','false');
     await loadClubs();await openDetail(result.id);status(warning||'Fan Club criado! Personalize a capa e convide outros fãs.',!!warning);
   });
   const input=overlay.querySelector('#sf73CreateCover'),img=overlay.querySelector('#sf73CoverPreview');let objectUrl=null;
   input?.addEventListener('change',()=>{
     if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null;}
     const file=input.files?.[0];if(file){objectUrl=URL.createObjectURL(file);img.src=objectUrl;img.hidden=false;}else{img.hidden=true;img.removeAttribute('src');}
   });
   return overlay;
 }
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
       <div class="sf71-detail-hero sf71-theme-${esc(c.theme)} ${c.coverVersion?'sf73-with-cover':''}">${imageCover(c)}<div class="sf71-detail-symbol" aria-hidden="true">♫</div><div class="sf73-hero-info"><span>FAN CLUB NÃO OFICIAL</span><h3>${esc(c.title)}</h3><p>Para fãs de ${esc(c.artist)} · ${c.memberCount} participantes</p></div></div>
       <p class="sf71-detail-desc">${esc(c.description||'Um lugar para reunir fãs, músicas e boas conversas.')}</p>
       ${c.rules?`<div class="sf71-rule"><strong>Regras da comunidade</strong><p>${esc(c.rules)}</p></div>`:''}
       <div class="sf71-detail-actions">${c.owner?'<span class="sf71-owner">★ Você administra este Fan Club</span>':`<button type="button" class="sf71-action-primary" data-sf71-join>${c.joined?'Sair do Fan Club':'Participar do Fan Club'}</button>`}
         <button type="button" data-sf71-events>📅 Ver eventos</button>
         ${c.owner?`<button type="button" data-sf73-change-cover>🖼 ${c.coverVersion?'Trocar':'Adicionar'} capa</button>${c.coverVersion?'<button type="button" data-sf73-remove-cover>Remover capa</button>':''}<input id="sf73DetailCover" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Escolher imagem de capa" hidden>`:''}</div>
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
       const clubId=state.activeId;await post('/api/fan-clubs/'+encodeURIComponent(clubId)+'/rooms',{slug:fd.get('slug')});return clubId;
     },async id=>{await openDetail(id);});
 }
 async function onDetailClick(e){const t=e.target.closest('button');if(!t)return;const id=state.activeId;if(!id)return;
   if(t.hasAttribute('data-sf73-change-cover')){$('sf73DetailCover')?.click();return;}
   if(t.hasAttribute('data-sf73-remove-cover')){
     if(!confirm('Remover a imagem de capa deste Fan Club?'))return;
     await action(async()=>{await api('/api/fan-clubs/'+encodeURIComponent(id)+'/cover',{method:'DELETE'});await openDetail(id);},'Capa removida.');return;
   }
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
   $('sf71ClubDetail')?.addEventListener('change',async e=>{
     if(e.target?.id!=='sf73DetailCover')return;
     const file=e.target.files?.[0],id=state.activeId;if(!file||!id)return;
     const input=e.target;input.disabled=true;status('Enviando imagem de capa…');
     try{await uploadCover(id,file);await openDetail(id);status('Capa atualizada com sucesso.');}
     catch(err){status(err.message,true);}finally{input.disabled=false;}
   });
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
