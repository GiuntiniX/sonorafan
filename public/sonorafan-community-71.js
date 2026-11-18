/* SonoraFan 71 — Comunidade em 3 áreas: Amigos / Fan Clubs / Eventos. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id), panel=$('sfFanClubsPanel');if(!panel)return;
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const state={query:'',mine:false,clubs:[],activeId:null,detail:null,busy:false,searchTimer:null,previousFocus:null,stream:null,poll:null,refreshTimer:null,onlyMusic:false,feedFilter:'all',feedSearch:'',posts:[],activePane:'mural',polls:[],tracks:[],commentsOpen:null};
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
     stream.addEventListener('deleted',()=>{stopLive();showList();loadClubs();status('Este Fan Club foi excluído.');});
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
       if(statusEl){statusEl.textContent=err.message||'Não foi possível concluir a operação.';submit.disabled=false;submit.textContent=submit.classList.contains('sf75-delete-confirm')?'Excluir definitivamente':'Salvar';}
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
     await loadClubs();
     window.sf107RefreshFanClubs?.();
     document.dispatchEvent(new CustomEvent('sf71:created',{detail:{id:result.id}}));
     if(document.getElementById('screen-lobby')?.classList.contains('active')
       && typeof window.sf107OpenFanClub==='function'){
       window.sf107OpenFanClub(result.id);
     }else{
       await openDetail(result.id);
     }
     status(warning||'Fan Club criado! Personalize a capa e convide outros fãs.',!!warning);
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
 function musicCard(p){
 const id=p.musicVideoId;if(!id||!/^[A-Za-z0-9_-]{11}$/.test(id))return '';
 return `<div class="sf160-music-card"><img loading="lazy" alt="" src="https://i.ytimg.com/vi/${id}/mqdefault.jpg"><div><strong>♫ Música compartilhada</strong><a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener noreferrer">Ouvir no YouTube ↗</a></div></div>`;
 }
 function postHtml(p){const mix=String(p.text||'').match(/[?&]mix=([a-f0-9-]{36})/i);
 return `<article class="sf71-post ${p.pinned?'sf151-pinned':''}" data-sf71-post="${esc(p.id)}">
 ${p.pinned?'<span class="sf151-pin-label">📌 Publicação fixada</span>':''}
 <div class="sf71-post-head"><strong>♫ ${esc(p.authorName)}</strong><time>${new Date(Number(p.createdAt)||Date.now()).toLocaleString('pt-BR')}</time></div><p>${esc(p.text)}</p>${musicCard(p)}
 ${mix?`<button type="button" data-sf71-mix="${esc(mix[1])}">♫ Abrir mixtape compartilhada</button>`:''}
 <div class="sf151-post-actions"><button type="button" data-sf151-like="${esc(p.id)}" aria-pressed="${!!p.liked}">♡ ${Math.max(0,Number(p.likeCount)||0)} curtidas</button>
 <button type="button" data-sf160-comments="${esc(p.id)}" aria-expanded="${state.commentsOpen===p.id}">💬 Comentários</button>
 ${p.canPin?`<button type="button" data-sf151-pin="${esc(p.id)}" data-pinned="${!!p.pinned}">${p.pinned?'Desafixar':'📌 Fixar'}</button>`:''}
 ${p.editable?`<button type="button" data-sf71-delete-post="${esc(p.id)}">Excluir</button>`:''}</div>
 ${state.commentsOpen===p.id?`<section class="sf160-comments" data-comments-for="${esc(p.id)}">Carregando comentários…</section>`:''}</article>`;}
 function roomHtml(room,owner){return `<div class="sf71-room"><div><strong>♫ ${esc(room.name)}</strong><small>${room.isPlaying?'● Tocando agora':'Sala disponível'} · ${Number(room.listenerCount)||0} ouvintes</small>${room.track?`<small>${esc(room.track.title)}</small>`:''}</div>
   <div class="sf71-room-actions"><button type="button" data-sf71-room="${esc(room.slug)}">Entrar</button>${owner?`<button type="button" data-sf71-unlink="${esc(room.slug)}" title="Desvincular sala">×</button>`:''}</div></div>`;}
 function renderFeed(){
 const box=$('sf71Posts');if(!box)return;
 const q=state.feedSearch.toLocaleLowerCase('pt-BR');
 let posts=state.posts.filter(p=>!q||[p.text,p.authorName].some(v=>String(v||'').toLocaleLowerCase('pt-BR').includes(q)));
 if(state.feedFilter==='music'||state.onlyMusic)posts=posts.filter(p=>p.musicVideoId||/[?&]mix=/.test(String(p.text||'')));
 if(state.feedFilter==='pinned')posts=posts.filter(p=>p.pinned);
 if(state.feedFilter==='popular')posts=[...posts].sort((a,b)=>(b.likeCount||0)-(a.likeCount||0));
 box.innerHTML=posts.length?posts.map(postHtml).join(''):'<p class="sf71-empty">Nenhuma publicação neste filtro.</p>';
 if(state.commentsOpen)loadComments(state.activeId,state.commentsOpen);
 }
 async function loadComments(id,postId){
 const box=$('sf71Posts')?.querySelector('[data-comments-for="'+postId+'"]');if(!box)return;
 try{const d=await api('/api/fan-clubs/'+encodeURIComponent(id)+'/posts/'+encodeURIComponent(postId)+'/comments');
 if(state.activeId!==id||state.commentsOpen!==postId)return;
 box.innerHTML=`<h5>Comentários</h5>${(d.comments||[]).length?d.comments.map(c=>`<div class="sf160-comment"><strong>${esc(c.authorName)}</strong><p>${esc(c.text)}</p>${c.editable?`<button type="button" data-sf160-delete-comment="${esc(c.id)}">Remover</button>`:''}</div>`).join(''):'<p>Seja o primeiro a comentar.</p>'}<form data-sf160-comment-form="${esc(postId)}"><input name="text" aria-label="Comentário" maxlength="350" minlength="2" required placeholder="Escreva uma resposta…"><button type="submit">Responder</button></form>`;
 }catch(e){box.textContent=e.message;}
 }
 async function loadExtras(id){
 try{
 const [p,m]=await Promise.all([api('/api/fan-clubs/'+encodeURIComponent(id)+'/polls'),api('/api/fan-clubs/'+encodeURIComponent(id)+'/music')]);
 if(state.activeId!==id)return;state.polls=p.polls||[];state.tracks=m.tracks||[];renderExtras();
 }catch(e){if(state.activeId===id&&$('sf160Extras'))$('sf160Extras').textContent='Não foi possível carregar as enquetes e músicas.';}
 }
 function renderExtras(){
 const el=$('sf160Extras');if(!el)return;const c=state.detail?.club;
 if(state.activePane==='music'){
 el.innerHTML=`<section class="sf160-extra-panel"><h4>♫ Mais compartilhadas</h4><p>Recomendações reais do mural.</p><div class="sf160-music-grid">${state.tracks.length?state.tracks.map((t,i)=>`<a class="sf160-track" href="https://www.youtube.com/watch?v=${t.videoId}" target="_blank" rel="noopener noreferrer"><img loading="lazy" alt="" src="https://i.ytimg.com/vi/${t.videoId}/mqdefault.jpg"><span><strong>#${i+1} · ${t.shares} compartilhamentos</strong><small>${t.likes} curtidas · Ouvir ↗</small></span></a>`).join(''):'<p>Nenhuma música compartilhada ainda.</p>'}</div></section>`;
 }else if(state.activePane==='polls'){
 el.innerHTML=`<section class="sf160-extra-panel"><div class="sf160-extra-head"><h4>🗳 Enquetes</h4>${c?.canDelete?'<button type="button" data-sf160-create-poll>＋ Criar</button>':''}</div>${state.polls.length?state.polls.map(p=>`<article class="sf160-poll"><strong>${esc(p.question)}</strong><div class="sf160-poll-options">${p.options.map((v,i)=>`<button type="button" data-sf160-vote="${esc(p.id)}" data-choice="${i}" ${p.voted?'disabled':''}>${esc(v)} <small>${p.counts[i]||0} votos</small></button>`).join('')}</div>${p.voted?'<small>Voto registrado</small>':''}${p.canDelete?`<button type="button" data-sf160-delete-poll="${esc(p.id)}">Excluir enquete</button>`:''}</article>`).join(''):'<p>Sem enquetes por enquanto.</p>'}</section>`;
 }else if(state.activePane==='events'){el.innerHTML='<section class="sf160-extra-panel"><h4>📅 Programação</h4><p>Veja as sessões da comunidade na coluna lateral.</p><button type="button" data-sf71-events>Ver agenda</button></section>';}
 else if(state.activePane==='members'){el.innerHTML='<section class="sf160-extra-panel"><h4>👥 Participantes</h4><p>A lista de membros e as opções de moderação ficam na coluna lateral.</p></section>';}
 else el.innerHTML='';
 }
 function switchPane(pane){
 state.activePane=pane;
 document.querySelectorAll('#sf71ClubDetail [data-sf160-pane]').forEach(t=>t.setAttribute('aria-selected',String(t.dataset.sf160Pane===pane)));
 const feed=$('sf160FeedArea');if(feed)feed.hidden=pane!=='mural';renderExtras();
 }
 async function openDetail(id){
   stopLive();state.activeId=id;state.activePane='mural';state.feedFilter='all';state.feedSearch='';state.commentsOpen=null;const box=$('sf71ClubDetail');box.hidden=false;$('sf71ClubList').hidden=true;box.innerHTML='<p class="sf71-empty">Carregando comunidade…</p>';
   try{const d=await api('/api/fan-clubs/'+encodeURIComponent(id));state.detail=d;
     const c=d.club;
     box.innerHTML=`<button type="button" class="sf71-back" data-sf71-back>← Voltar aos Fan Clubs</button>
       <div class="sf71-detail-hero sf71-theme-${esc(c.theme)} ${c.coverVersion?'sf73-with-cover':''}">${imageCover(c)}<div class="sf71-detail-symbol" aria-hidden="true">♫</div><div class="sf73-hero-info"><span>FAN CLUB NÃO OFICIAL</span><h3>${esc(c.title)}</h3><p>Para fãs de ${esc(c.artist)} · ${c.memberCount} participantes</p></div></div>
       <p class="sf71-detail-desc">${esc(c.description||'Um lugar para reunir fãs, músicas e boas conversas.')}</p>
       ${c.rules?`<div class="sf71-rule"><strong>Regras da comunidade</strong><p>${esc(c.rules)}</p></div>`:''}
       <div class="sf71-detail-actions">${c.owner?'<span class="sf71-owner">★ Você administra este Fan Club</span>':`<button type="button" class="sf71-action-primary" data-sf71-join>${c.joined?'Sair do Fan Club':'Participar do Fan Club'}</button>`}
         <button type="button" data-sf71-events>📅 Ver eventos</button>
         ${c.owner?`<button type="button" data-sf73-change-cover>🖼 ${c.coverVersion?'Trocar':'Adicionar'} capa</button>${c.coverVersion?'<button type="button" data-sf73-remove-cover>Remover capa</button>':''}<input id="sf73DetailCover" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Escolher imagem de capa" hidden>`:''}
         ${c.canDelete?'<button type="button" class="sf75-delete-club" data-sf75-delete-club>🗑 Excluir Fan Club</button>':''}</div>
       <div class="sf71-detail-columns"><section class="sf71-feed"><div class="sf71-rooms-head"><h4>Conversa da comunidade</h4>${c.joined?'<span class="sf72-live-label" id="sf72ClubLiveStatus">Conectando…</span>':''}</div>
         ${c.joined?`<form id="sf71PostForm"><div class="sf140-post-tools"><button type="button" data-sf140-share-song>♫ Compartilhar música da sala</button><small>Revise a mensagem antes de publicar</small></div><label for="sf71PostText" class="sf71-sr-only">Publicar no Fan Club</label><textarea id="sf71PostText" maxlength="600" minlength="3" rows="3" placeholder="Compartilhe uma música, uma descoberta ou um assunto sobre o artista…" required></textarea><button type="submit" class="sf71-action-primary">Publicar</button></form><div class="sf150-mural-filter"><button type="button" data-sf150-music-filter aria-pressed="false">♫ Só recomendações musicais</button></div><div id="sf71Posts" aria-live="polite">Carregando conversa…</div>`:'<p class="sf71-empty">Participe do Fan Club para ler e publicar no mural.</p>'}
       </section><aside class="sf71-room-list"><div class="sf71-rooms-head"><h4>Salas do Fan Club</h4>${c.owner?'<button type="button" data-sf71-addroom>＋ Vincular sala</button>':''}</div>
         <div>${c.rooms?.length?c.rooms.map(r=>roomHtml(r,c.owner)).join(''):'<p class="sf71-empty">Nenhuma sala vinculada ainda.</p>'}</div>
         <div class="sf71-club-events"><h4>Programação do Fan Club</h4>
           ${(c.events||[]).length?c.events.map(ev=>`<div class="sf71-club-event">
             <strong>${esc(ev.title)}</strong>
             <small>${esc(new Date(Number(ev.startAt)).toLocaleString('pt-BR'))} · ${esc(ev.roomName)} · ${Math.max(0,Number(ev.attendees)||0)} confirmados</small>
             <div class="sf141-event-actions">
               <button type="button" data-sf141-club-rsvp="${esc(ev.id)}" data-going="${ev.going?'false':'true'}">${ev.going?'✓ Confirmado':'Confirmar presença'}</button>
               <button type="button" data-sf141-club-room="${esc(ev.roomSlug)}">Entrar na sala</button>
               <button type="button" data-sf142-club-calendar="${esc(ev.id)}">Lembrar no calendário</button>
             </div>
           </div>`).join(''):'<p class="sf71-empty">Nenhum encontro programado para as salas deste Fan Club.</p>'}
           <button type="button" data-sf71-events>Ver agenda completa</button>
         </div>
         ${membersHtml(d)}
       </aside></div>`;
     if(c.joined){await loadPosts(id);if(state.activeId===id)startLive(id);}
   }catch(e){box.innerHTML=`<p class="sf71-empty" role="alert">${esc(e.message)}</p><button type="button" class="sf71-back" data-sf71-back>← Voltar</button>`;}
 }
 async function loadPosts(id){try{const d=await api('/api/fan-clubs/'+encodeURIComponent(id)+'/posts');if(state.activeId!==id)return;const box=$('sf71Posts');if(!box)return;
   const posts=Array.isArray(d.posts)?d.posts:[];
   const visible=state.onlyMusic?posts.filter(p=>/youtube\.com\/watch|youtu\.be\/|[?&]mix=/.test(String(p.text||''))):posts;
   box.innerHTML=visible.length?visible.map(postHtml).join(''):state.onlyMusic?
     '<p class="sf71-empty">Nenhuma recomendação musical neste mural.</p>':
     '<p class="sf71-empty">Ainda não há publicações. Inicie a conversa!</p>';
   const button=$('sf71ClubDetail')?.querySelector('[data-sf150-music-filter]');
   if(button)button.setAttribute('aria-pressed',String(state.onlyMusic));
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
   if(t.hasAttribute('data-sf150-music-filter')){
     state.onlyMusic=!state.onlyMusic;await loadPosts(id);return;
   }
   if(t.hasAttribute('data-sf71-mix')){
     const mixId=t.dataset.sf71Mix;
     document.querySelector('.sf5-community-layer .sf5-close')?.click();
     window.sf100OpenMixtape?.(mixId);return;
   }
   if(t.hasAttribute('data-sf75-delete-club')){
     const club=state.detail?.club;
     if(!club?.canDelete)return;
     const title=String(club.title||'');
     const overlay=modal('Excluir Fan Club',`<p class="sf75-delete-warning">A exclusão é permanente e remove a comunidade, seus membros, o mural e a imagem de capa. As salas vinculadas continuarão existindo.</p>
       <p class="sf75-delete-name">Digite <strong>${esc(title)}</strong> para confirmar:</p>
       <label>Nome exato da comunidade<input name="confirmation" required autocomplete="off" spellcheck="false" placeholder="Nome do Fan Club"></label>`,async fd=>{
       if(String(fd.get('confirmation')||'')!==title)throw Error('O nome digitado não corresponde ao Fan Club.');
       await api('/api/fan-clubs/'+encodeURIComponent(id),{method:'DELETE',body:JSON.stringify({confirmation:title})});
       return true;
     },async()=>{showList();await loadClubs();status('Fan Club excluído. As salas musicais foram preservadas.');});
     const submit=overlay.querySelector('[type="submit"]');
     if(submit){submit.textContent='Excluir definitivamente';submit.classList.add('sf75-delete-confirm');}
     return;
   }
   if(t.hasAttribute('data-sf73-change-cover')){$('sf73DetailCover')?.click();return;}
   if(t.hasAttribute('data-sf73-remove-cover')){
     if(!confirm('Remover a imagem de capa deste Fan Club?'))return;
     await action(async()=>{await api('/api/fan-clubs/'+encodeURIComponent(id)+'/cover',{method:'DELETE'});await openDetail(id);},'Capa removida.');return;
   }
   if(t.matches('[data-sf71-back]')){showList();await loadClubs();return;}
   if(t.hasAttribute('data-sf142-club-calendar')){
     const event=state.detail?.club?.events?.find(ev=>ev.id===t.dataset.sf142ClubCalendar);
     if(!event||typeof window.sf100DownloadEventCalendar!=='function'){
       status('Não foi possível preparar o lembrete. Abra a agenda completa.',true);return;
     }
     window.sf100DownloadEventCalendar(event);
     status('Evento preparado para calendário com lembrete de 30 minutos.');
     return;
   }
   if(t.hasAttribute('data-sf141-club-rsvp')){
     const eventId=t.dataset.sf141ClubRsvp;
     if(!/^[a-f0-9-]{36}$/i.test(eventId))return;
     await action(async()=>{
       t.disabled=true;
       await post('/api/social/events/'+encodeURIComponent(eventId)+'/rsvp',{going:t.dataset.going==='true'});
       await openDetail(id);
     },'Presença atualizada na programação.');
     return;
   }
   if(t.hasAttribute('data-sf141-club-room')){
     const slug=t.dataset.sf141ClubRoom;
     if(!state.detail?.club?.rooms?.some(r=>r.slug===slug))return;
     document.querySelector('.sf5-community-layer .sf5-close')?.click();
     if(typeof joinRoom==='function')joinRoom(slug);
     return;
   }
   if(t.hasAttribute('data-sf71-events')){window.sfSocialSwitchTab?.('events');return;}
   if(t.hasAttribute('data-sf140-share-song')){
     const room=typeof currentRoomData!=='undefined'?currentRoomData:null;
     const track=room?.queue?.[Math.max(0,Number(room.currentIndex)||0)];
     const field=$('sf71PostText');
     if(!field)return;
     if(!track||!/^[A-Za-z0-9_-]{11}$/.test(String(track.id||''))){
       status('Entre em uma sala com uma música tocando para compartilhar.',true);return;
     }
     const snippet='♫ Estou ouvindo: '+String(track.title||'Música').slice(0,100)+
       ' — '+String(track.artist||'Artista').slice(0,70)+
       '\nhttps://www.youtube.com/watch?v='+track.id;
     field.value=(field.value.trim()?field.value.trim()+'\n\n':'')+snippet;
     field.value=field.value.slice(0,600);
     field.focus({preventScroll:true});
     field.scrollIntoView({block:'nearest',behavior:'smooth'});
     status('Música inserida. Revise e publique no mural quando quiser.');
     return;
   }
   if(t.hasAttribute('data-sf151-like')){
     const postId=t.dataset.sf151Like;
     await action(async()=>{
       t.disabled=true;
       await post('/api/fan-clubs/'+encodeURIComponent(id)+'/posts/'+encodeURIComponent(postId)+'/like',{});
       await loadPosts(id);
     },'Reação atualizada.');return;
   }
   if(t.hasAttribute('data-sf151-pin')){
     if(!state.detail?.club?.canDelete)return;
     const postId=t.dataset.sf151Pin,pinned=t.dataset.pinned!=='true';
     await action(async()=>{
       t.disabled=true;
       await post('/api/fan-clubs/'+encodeURIComponent(id)+'/posts/'+encodeURIComponent(postId)+'/pin',{pinned});
       await loadPosts(id);
     },pinned?'Publicação fixada.':'Publicação desafixada.');return;
   }
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
