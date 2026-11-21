/* SonoraFan 71 — Comunidade em 3 áreas: Amigos / Fan Clubs / Eventos. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id), panel=$('sfFanClubsPanel');if(!panel)return;
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const state={query:'',mine:false,clubs:[],activeId:null,detail:null,busy:false,searchTimer:null,previousFocus:null,stream:null,poll:null,refreshTimer:null,feedFilter:'all',feedSearch:'',posts:[],postCursor:null,postHasMore:false,forumSearch:false,forumSearching:false,focusPost:null,related:[],replyTo:null,quoteTo:null,forumSearchCursor:null,forumSearchHasMore:false,activePane:'mural',polls:[],ideas:[],clubEvents:[],insights:null,contributors:[],reports:[],commentsOpen:null,postRequestId:0,searchRequestId:0,openingId:0};
 const status=(s='',error=false)=>{const el=$('sf71ClubStatus');if(el){el.textContent=s;el.classList.toggle('is-error',!!error);}};
 const roomThemeData=[["geral","Festival padrão","#7c3aed","#180f25","#ff6b35"],["indie","Indie e festival","#c256e7","#170e27","#fb8074"],["metal","Heavy metal","#ed3a39","#130b0c","#ff9035"],["emo","Emo","#ef54a5","#101014","#f3e6ec"],["mpb","MPB","#efb34f","#182d23","#7aca88"],["eletronica","Eletrônica","#15d7f8","#0c1027","#b34dff"],["rock","Rock clássico","#f04b42","#1f1213","#edbb57"],["pop","Pop","#f264d7","#271127","#ffb654"],["rap","Rap e hip-hop","#f8a434","#1c1721","#ec6667"],["funk","Funk","#ff4ba9","#1a1030","#27d3d4"],["pagode","Pagode e samba","#f5bb55","#122b27","#52ca9c"],["sertanejo","Sertanejo","#ee9850","#342019","#deb96c"],["reggae","Reggae","#e7c742","#14271f","#48b875"],["jazz","Jazz e blues","#d4ad72","#131c2b","#7ba2cf"],["forro","Forró","#ed8b4c","#322019","#efca6a"],["bts","BTS · Palco roxo","#a975ff","#0d0926","#f5a8ff"],["kpop","K-pop · Seul neon","#ff60bd","#130d30","#6cddff"],["jpop","J-pop · Luzes de Tóquio","#ff8962","#10182f","#75d6f5"],["trap","Trap · Cidade noturna","#f8d347","#0e0b1c","#a073ff"],["lofi","Lo-fi · Luar","#8da8f2","#151b37","#edb5ba"],["cor-preto","Preto · Meia-noite","#9da3b2","#090b12","#53586c"],["cor-vermelho","Vermelho · Inferno","#ff4c61","#200b15","#ff9a54"],["cor-azul","Azul · Elétrico","#4d9aff","#09162c","#54d8ff"],["cor-verde","Verde · Aurora","#5ee3a6","#08231c","#c4f46b"],["cor-roxo","Roxo · Nebulosa","#ad73ff","#180c2f","#ff80dd"],["cor-rosa","Rosa · Doce","#ff6db8","#2e1026","#ffa2d9"],["cor-dourado","Dourado · Holofotes","#f1c16c","#24180e","#ff935b"],["kpop-sakura-arena","K-pop · Arena Sakura","#fd60c6","#101039","#46d6ff"],["bts-purple-monument","BTS · Monumento roxo","#a25dff","#120829","#e5a7ff"],["jpop-tokyo-night","J-pop · Noite em Tóquio","#ed65e5","#0a1b45","#57bfff"],["trap-crown-stage","Trap · Palco da coroa","#f6a339","#210c27","#ba5dff"],["lofi-golden-listening","Lo-fi · Audição dourada","#ffc06c","#1a1530","#ba79dd"],["lofi-moonlight-live","Lo-fi · Luar ao vivo","#bd96f6","#131d36","#ffb674"],["kpop-cherry-city","K-pop · Cidade das cerejeiras","#ff70dc","#0c153c","#47d7ed"],["bts-lights-festival","BTS · Festival de luzes","#aa6cff","#170a35","#e9adff"],["jpop-fuji-stage","J-pop · Festival Fuji","#f38ac9","#122a4e","#75c9ff"],["trap-street-crown","Trap · Coroa das ruas","#ffb34d","#241126","#ba61f8"],["lofi-riverside","Lo-fi · Luar à beira-rio","#f7be85","#101d3d","#a886fa"],["lofi-acoustic-garden","Lo-fi · Jardim acústico","#ffba77","#171b32","#a89aff"]];
  const themes=Object.fromEntries(roomThemeData.map(([id,label])=>[id,label]));
  const themeOptions=(selected='geral')=>roomThemeData.map(([id,label])=>'<option value="'+esc(id)+'" '+(id===selected?'selected':'')+'>'+esc(label)+'</option>').join('');
  const themeName=id=>themes[id]||themes.geral;
 const genres={kpop:'K-Pop',pop:'Pop',rock:'Rock',indie:'Indie / Alternativo',sertanejo:'Sertanejo',funk:'Funk',mpb:'MPB',hiphop:'Hip-Hop',eletronica:'Eletrônica',pagode:'Pagode',samba:'Samba',forro:'Forró',gospel:'Gospel',reggae:'Reggae',metal:'Metal',punk:'Punk',jazz:'Jazz',blues:'Blues',rnb:'R&B',lofi:'Lo-fi',latina:'Música Latina',classica:'Clássica',outros:'Outros'};
 const gallery={stage:'/art-129/sonorafan-stage.svg',kpop:'/art-132/sonorafan-room-kpop.avif',pop:'/art-33/poster-electro.webp',rock:'/art-33/poster-rock.webp',indie:'/art-33/poster-indie.webp',brasil:'/art-33/poster-brasil.webp',electronic:'/art-33/poster-electro.webp',festival:'/art-40/poster-festival.svg'};
 const preferred={kpop:'kpop',pop:'pop',rock:'rock',metal:'rock',punk:'rock',indie:'indie',eletronica:'electronic',funk:'brasil',mpb:'brasil',hiphop:'brasil',pagode:'brasil',samba:'brasil',forro:'brasil',sertanejo:'brasil',latina:'brasil'};
 const fallback=club=>gallery[preferred[club?.genre]||'stage'];
 const safeUrl=value=>{try{const u=new URL(String(value||''));return u.protocol==='https:'&&!u.username&&!u.password&&u.hostname.includes('.')&&!/(^|\.)(localhost|local|internal|test|invalid)$/.test(u.hostname)?u.href:'';}catch(_){return '';}};
 const coverForm=(kind='default',id='',url='')=>`<fieldset class="sf192-choices"><legend>Imagem de capa</legend>
   <label><input type="radio" name="coverType" value="default" ${kind==='default'?'checked':''}> Automática pelo gênero musical</label>
   <label><input type="radio" name="coverType" value="gallery" ${kind==='gallery'?'checked':''}> Escolher na galeria SonoraFan</label>
   <div class="sf192-gallery">${Object.entries(gallery).map(([key,src])=>`<label><input type="radio" name="coverGalleryId" value="${key}" ${id===key?'checked':''}><img src="${src}" alt="Capa ${key}" loading="lazy"><span>${key}</span></label>`).join('')}</div>
   <label><input type="radio" name="coverType" value="external" ${kind==='external'?'checked':''}> Usar URL da internet (HTTPS)</label>
   <label class="sf192-link">Endereço direto da imagem<input type="url" name="coverImageUrl" maxlength="500" placeholder="https://exemplo.com/imagem.webp" value="${esc(url)}"></label>
   <img class="sf192-preview" alt="Prévia da capa">
   <small>Use somente imagens autorizadas; links externos podem parar de funcionar. A capa padrão é usada automaticamente em caso de erro.</small>
 </fieldset>`;
 const chosenCover=fd=>{const type=String(fd.get('coverType')||'default');
   if(type==='gallery'){const coverGalleryId=String(fd.get('coverGalleryId')||'stage');if(!gallery[coverGalleryId])throw Error('Escolha uma capa.');return {coverType:type,coverGalleryId};}
   if(type==='external'){const coverImageUrl=safeUrl(fd.get('coverImageUrl'));if(!coverImageUrl||coverImageUrl.length>500)throw Error('Informe um endereço HTTPS válido.');return {coverType:type,coverImageUrl};}
   return {coverType:'default'};
 };
 const wireCover=overlay=>{const update=()=>{const f=overlay.querySelector('form'),type=f.querySelector('[name="coverType"]:checked')?.value||'default';
   f.querySelector('.sf192-gallery').hidden=type!=='gallery';f.querySelector('.sf192-link').hidden=type!=='external';
   const id=f.querySelector('[name="coverGalleryId"]:checked')?.value||'stage',url=f.querySelector('[name="coverImageUrl"]')?.value||'';
   f.querySelector('.sf192-preview').src=type==='gallery'?(gallery[id]||gallery.stage):type==='external'?(safeUrl(url)||gallery.stage):fallback({genre:f.querySelector('[name="genre"]')?.value});};
   overlay.addEventListener('change',e=>{if(e.target.matches('input,select'))update();});overlay.querySelector('[name="coverImageUrl"]').addEventListener('input',update);
   overlay.querySelector('.sf192-preview').addEventListener('error',e=>{e.target.onerror=null;e.target.src=gallery.stage;});update();
 };
 const byId=id=>state.clubs.find(c=>c.id===id);
 const coverUrl=club=>club?.coverType==='gallery'?(gallery[club.coverGalleryId]||fallback(club)):club?.coverType==='external'?(safeUrl(club.coverImageUrl)||fallback(club)):club?.coverVersion?'/api/fan-clubs/'+encodeURIComponent(club.id)+'/cover?v='+encodeURIComponent(String(club.coverVersion)):fallback(club);
 const badgeUrl=club=>safeUrl(club?.badgeImageUrl);
  const badgeMark=club=>badgeUrl(club)?'<img class="sf244-badge-image" src="'+esc(badgeUrl(club))+'" loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="Imagem do Fanclub">':'♫';
  const imageCover=(club,small=false)=>`<img class="sf73-cover-img" src="${esc(coverUrl(club))}" data-sf192-fallback="${esc(fallback(club))}" referrerpolicy="no-referrer" alt="Capa do Fan Club ${esc(club.title)}" ${small?'loading="lazy"':''} decoding="async">`;
 document.addEventListener('error',event=>{
   const img=event.target;
   if(img?.matches?.('img.sf244-badge-image')){img.parentElement.textContent='♫';return;}
   if(img?.matches?.('img.sf73-cover-img')&&img.dataset.sf192Fallback&&img.src!==new URL(img.dataset.sf192Fallback,location.href).href)img.src=img.dataset.sf192Fallback;
 },true);
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
 async function compressPostPhoto(file){
   if(!['image/jpeg','image/png','image/webp'].includes(file?.type))throw Error('Escolha uma foto JPG, PNG ou WebP.');
   if(file.size>8*1024*1024)throw Error('A foto original não pode passar de 8 MB.');
   const url=URL.createObjectURL(file);
   try{
     const img=await new Promise((resolve,reject)=>{const node=new Image();node.onload=()=>resolve(node);node.onerror=()=>reject(Error('Não foi possível ler a foto.'));node.src=url;});
     if(!img.naturalWidth||!img.naturalHeight)throw Error('Foto inválida.');
     for(const maxWidth of [1100,900,720,560]){
       const scale=Math.min(1,maxWidth/Math.max(img.naturalWidth,img.naturalHeight));
       const canvas=document.createElement('canvas');
       canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
       const ctx=canvas.getContext('2d');if(!ctx)throw Error('Não foi possível processar a foto.');
       ctx.drawImage(img,0,0,canvas.width,canvas.height);
       for(const quality of [.8,.65,.5,.35]){
         const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));
         if(blob?.size>0&&blob.size<=175*1024)return blob;
       }
     }
     throw Error('Não foi possível otimizar esta foto. Experimente outra imagem.');
   }finally{URL.revokeObjectURL(url);}
 }
 async function uploadPostPhoto(clubId,postId,blob){
   const response=await fetch('/api/fan-clubs/'+encodeURIComponent(clubId)+'/posts/'+encodeURIComponent(postId)+'/image',{
     method:'POST',credentials:'include',headers:{'Content-Type':'image/webp'},body:blob
   });
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(data.error||'Falha ao anexar a foto.');
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
   const data=await r.json().catch(()=>({}));
   if(!r.ok){
     const detail=r.status===429?'Muitas tentativas em pouco tempo. Tente novamente em aproximadamente 1 minuto.':
       r.status===401?'Sessão expirada. Entre novamente na sua conta.':
       r.status===404?'Recurso não encontrado. Verifique se o servidor foi atualizado.':
       r.status>=500?'Falha temporária no servidor da comunidade.':
       (data.error||'Não foi possível concluir esta operação.');
     throw Error(detail+' (HTTP '+r.status+')');
   }
   return data;
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
     if(document.hidden)return;
     if(state.busy){scheduleRefresh(id,kind);return;}
     const editing=$('sf71PostForm');
     const reply=document.querySelector('#sf71Posts [data-sf160-comment-form] input[name="text"]');
     if((reply&&reply.value.trim())||(editing&&!editing.classList.contains('sf227-composer-collapsed')&&editing.contains(document.activeElement))){
       scheduleRefresh(id,kind);return;
     }
     if(kind==='post'){
       if(state.focusPost)await refreshFocusedPost(id);
       else if(state.forumSearch)await searchForum(id);
       else await loadPosts(id);
     }else if(kind==='extras')await loadExtras(id);
     else if(kind==='rooms')await refreshClubRooms(id);
     else await refreshClubMetadata(id);
   },450);
 }
 async function refreshFocusedPost(id){
   const postId=state.focusPost?.id;if(!postId||state.activeId!==id)return;
   try{
     const d=await api('/api/fan-clubs/'+encodeURIComponent(id)+'/posts/'+encodeURIComponent(postId));
     if(state.activeId!==id||state.focusPost?.id!==postId)return;
     state.focusPost=d.post;renderFocusedPost();
   }catch(e){status(e.message,true);}
 }
 async function refreshClubMetadata(id){
   if(state.activeId!==id)return;
   try{
     const d=await api('/api/fan-clubs/'+encodeURIComponent(id));
     if(state.activeId!==id)return;
     if(state.detail?.club?.joined!==d.club?.joined){await openDetail(id);return;}
     state.detail=d;renderSocialWidgets();renderCommunityAside();
     const name=$('sf71ClubDetail')?.querySelector('.sf73-hero-info h3');
     if(name)name.textContent=d.club.title;
     const count=$('sf71ClubDetail')?.querySelector('.sf227-hero-meta b');
     if(count)count.textContent='♧ '+(Number(d.club.memberCount)||0)+' membros';
   }catch(e){status(e.message,true);}
 }
 function startLive(id){
   stopLive();if(state.activeId!==id||!state.detail?.club?.joined)return;
   const label=$('sf72ClubLiveStatus');
   if(typeof EventSource!=='undefined'){
     const stream=new EventSource('/api/fan-clubs/'+encodeURIComponent(id)+'/stream',{withCredentials:true});
     state.stream=stream;
     stream.addEventListener('open',()=>{if(label)label.textContent='Mural conectado';});
     stream.addEventListener('post',()=>scheduleRefresh(id,'post'));
     stream.addEventListener('ideas',()=>scheduleRefresh(id,'extras'));
     stream.addEventListener('polls',()=>scheduleRefresh(id,'extras'));
     stream.addEventListener('events',()=>scheduleRefresh(id,'extras'));
     stream.addEventListener('members',()=>scheduleRefresh(id,'members'));
     stream.addEventListener('rooms',()=>scheduleRefresh(id,'rooms'));
     stream.addEventListener('cover',()=>scheduleRefresh(id,'cover'));
     stream.addEventListener('deleted',()=>{stopLive();showList();loadClubs();status('Este Fan Club foi excluído.');});
     stream.addEventListener('error',()=>{if(label)label.textContent='Reconectando…';});
   }else{
     if(label)label.textContent='Atualização periódica';
     state.poll=setInterval(()=>{
       if(state.activeId===id&&!document.hidden){
         scheduleRefresh(id,'post');loadExtras(id).catch(()=>{});
       }
     },30000);
   }
 }
 const showList=()=>{stopLive();$('sf71ClubList').hidden=false;$('sf71ClubDetail').hidden=true;state.activeId=null;state.detail=null;window.sf235ShowHome?.();};
 function clubCard(c){return `<article class="sf71-club-card" data-sf71-id="${esc(c.id)}">
   <div class="sf71-club-art sf71-theme-${esc(c.theme)} ${'sf73-with-cover'}">${imageCover(c,true)}<span aria-hidden="true">♫</span></div>
   <div class="sf71-club-copy"><small>FAN CLUB · NÃO OFICIAL</small><strong>${esc(c.title)}</strong><span>Para fãs de ${esc(c.artist)}</span>
    <p>${esc(c.description||'Converse, conheça outros fãs e compartilhe músicas.')}</p>
    <div class="sf71-club-meta"><span>👥 ${Number(c.memberCount)||0} membros</span><span>♫ ${Number(c.roomCount)||0} salas</span><span>${esc(genres[c.genre]||'Outros')}</span>${c.joined?'<span>✓ Participando</span>':''}</div>
   </div><button type="button" data-sf71-open="${esc(c.id)}" aria-label="Abrir ${esc(c.title)}">Ver Fan Club</button></article>`;}
 async function loadClubs(){
   const box=$('sf71ClubList');if(!box)return;
   status('Carregando Fan Clubs…');
   try{const params=new URLSearchParams();if(state.query)params.set('q',state.query);if(state.mine)params.set('mine','true');
     const response=await api('/api/fan-clubs?'+params);
     state.clubs=Array.isArray(response.clubs)?response.clubs:[];
     window.sf235UpdateFanclubs?.(state.clubs);
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
   const opts=Object.entries(genres).map(([id,name])=>`<option value="${id}">${esc(name)}</option>`).join('');
   const overlay=modal('Criar Fan Club',`<label>Artista ou banda<input name="artist" maxlength="65" minlength="2" required placeholder="Ex.: BTS"></label>
   <label>Nome da comunidade<input name="title" maxlength="75" minlength="3" required placeholder="Ex.: Armys"></label>
   <label>Descrição<textarea name="description" maxlength="280" rows="2"></textarea></label>
   <label>Regras da comunidade<textarea name="rules" maxlength="300" rows="2"></textarea></label>
   <label>Gênero musical<select name="genre" required>${opts}</select></label>
   <label>Identidade visual · cores das salas<select name="theme">${themeOptions()}</select></label>
   <div id="sf208CreateThemePreview" class="sf208-theme-preview sf71-theme-geral"><span>♫ Prévia da identidade</span><strong>Seu Fan Club</strong><small>Escolha um estilo; suas cores mudam sem cobrir a imagem.</small></div>
   ${coverForm()}<small class="sf71-unofficial">Fan Club criado por fãs, sem associação oficial ao artista.</small>`,async fd=>{
     const payload={};for(const key of ['artist','title','description','rules','theme','genre'])payload[key]=fd.get(key)||'';
     Object.assign(payload,chosenCover(fd));const d=await post('/api/fan-clubs',payload);return {id:d.club.id};
   },async result=>{
     state.mine=false;$('sf71ClubMine')?.setAttribute('aria-pressed','false');
     await loadClubs();window.sf107RefreshFanClubs?.();
     document.dispatchEvent(new CustomEvent('sf71:created',{detail:{id:result.id}}));
     if(document.getElementById('screen-lobby')?.classList.contains('active')&&typeof window.sf107OpenFanClub==='function')window.sf107OpenFanClub(result.id);
     else await openDetail(result.id);
     status('Fan Club criado! Convide outros fãs.');
   });
   const theme=overlay.querySelector('[name=theme]'),preview=overlay.querySelector('#sf208CreateThemePreview');
   theme?.addEventListener('change',()=>{if(preview)preview.className='sf208-theme-preview sf71-theme-'+theme.value;});
   overlay.querySelector('[name=title]')?.addEventListener('input',e=>{const el=preview?.querySelector('strong');if(el)el.textContent=e.target.value.trim()||'Seu Fan Club';});
   wireCover(overlay);return overlay;
 }
 function changeCover(id,club){
   const kind=['gallery','external'].includes(club.coverType)?club.coverType:'default';
   const overlay=modal('Alterar capa',coverForm(kind,club.coverGalleryId,club.coverImageUrl),async fd=>{
     await post('/api/fan-clubs/'+encodeURIComponent(id)+'/cover-choice',chosenCover(fd));return true;
   },async()=>{await openDetail(id);await loadClubs();window.sf107RefreshFanClubs?.();status('Capa atualizada.');});
   wireCover(overlay);
 }

 document.addEventListener('error',event=>{
   const img=event.target;
   if(!img?.matches?.('#sf71ClubDetail .sf226-member-avatar img, #sf71ClubDetail .sf227-mini-photo img, #sf71ClubDetail .sf227-online-strip img, #sf71ClubDetail .sf228-author-avatar img'))return;
   const box=img.parentElement;if(!box)return;
   img.remove();
   const fallback=document.createElement('span');
   fallback.textContent='🎧';fallback.setAttribute('aria-hidden','true');
   box.appendChild(fallback);
 },true);
 const memberId=id=>typeof id==='string'&&/^[a-f0-9]{24}$/.test(id);
 function memberTile(m,club){
   const id=memberId(m.id)?m.id:'',name=String(m.name||'Participante'),src=String(m.avatarUrl||'');
   const validImage=/^\/api\/profile108\/photo\/[a-f0-9]{24}\?v=\d+$/.test(src)||/^\/avatars-108\/[a-z0-9-]{1,60}\.svg$/.test(src);
   const avatar=validImage?'<img src="'+esc(src)+'" alt="Foto de '+esc(name)+'" loading="lazy" decoding="async">':'<span aria-hidden="true">'+esc(m.avatar||'🎧')+'</span>';
   const moderator=(club.moderators||[]).some(mod=>mod.id===m.id);
   const role=m.id===club.ownerId?'Criador':moderator?'Administrador do Fanclub':m.isSelf?'Você':'Membro';
   const actions=m.isSelf?'<span class="sf226-myself">Seu perfil</span>':
     '<button type="button" data-sf226-dm="'+esc(id)+'" data-sf226-name="'+esc(name)+'">✉ Conversar</button>'+
     '<button type="button" data-sf226-add="'+esc(id)+'">♡ Amizade</button>';
   const moderate=club.canManageAdmins&&id&&m.id!==club.ownerId?
     '<button type="button" class="sf226-manage" data-sf170-moderator="'+esc(id)+'" data-enabled="'+(!moderator)+'" '+(!moderator&&(club.moderators||[]).length>=2?'disabled title="Retire um administrador antes de nomear outro"':'')+'>'+
     (moderator?'Retirar administração':(club.moderators||[]).length>=2?'Limite de 2 atingido':'Tornar administrador')+'</button>':'';
   return '<article class="sf226-member-card"><div class="sf226-member-avatar">'+avatar+'</div>'+
     '<strong title="'+esc(name)+'">'+esc(name)+'</strong>'+
     '<small class="sf226-member-role">'+role+'</small>'+
     '<div class="sf226-member-actions">'+(id?actions:'')+
     '<button type="button" data-sf160-mention="'+esc(name)+'">@ Mencionar</button>'+moderate+'</div></article>';
 }
 function membersHtml(d){if(!d.club.joined&&!d.club.owner)return '';
   const members=(d.club.members||[]).map(m=>`<div class="sf71-member"><span>${esc(m.avatar||'🎧')}</span><strong>${esc(m.name)}</strong>
     ${d.club.canModerate&&m.id!==d.club.ownerId&&(!((d.club.moderators||[]).some(x=>x.id===m.id))||d.club.canManageAdmins)?`<button type="button" data-sf71-block="${esc(m.id)}">Remover</button>`:''}</div>`).join('');
   const blocked=(d.club.blockedMembers||[]).map(m=>`<div class="sf71-member"><span>⛔</span><strong>${esc(m.name)}</strong><button type="button" data-sf71-unblock="${esc(m.id)}">Desbloquear</button></div>`).join('');
   return `<details class="sf71-members"><summary>Participantes (${d.club.memberCount})</summary><div class="sf71-members-list">${members}${blocked}</div></details>`;
 }
 const forumTypes={
   conversa:{icon:'💬',title:'Conversa',description:'Um papo livre com outros fãs.',css:'conversa'},
   duvida:{icon:'❔',title:'Dúvida',description:'Pergunte à comunidade e encontre respostas.',css:'duvida'},
   novidade:{icon:'✨',title:'Novidade',description:'Conte uma notícia ou atualização aos fãs.',css:'novidade'},
   evento:{icon:'📅',title:'Evento',description:'Converse sobre shows e encontros.',css:'evento'},
   ideia:{icon:'💡',title:'Ideia',description:'Compartilhe propostas com a comunidade.',css:'ideia'}
 };
 const topicFor=topic=>forumTypes[topic]||forumTypes.conversa;
 const validVideoId=id=>/^[A-Za-z0-9_-]{11}$/.test(String(id||''));
 const videoEmbed=p=>validVideoId(p.youtubeId)?`<div class="sf252-video-wrap"><iframe
  src="https://www.youtube-nocookie.com/embed/${esc(p.youtubeId)}"
  title="Vídeo do YouTube na publicação de ${esc(p.authorName||'um fã')}"
  loading="lazy" referrerpolicy="strict-origin-when-cross-origin"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  allowfullscreen></iframe></div>`:'';
 const youtubeLinkId=value=>{
  if(!value)return '';
  try{
   const url=new URL(value);
   if(url.protocol!=='https:'||url.username||url.password||url.port)return '';
   const host=url.hostname.toLowerCase(),path=url.pathname.split('/').filter(Boolean);
   const youtube=['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(host);
   const short=['youtu.be','www.youtu.be'].includes(host);
   let id='';
   if(short&&path.length===1)id=path[0];
   else if(youtube&&path.length===1&&path[0]==='watch')id=url.searchParams.get('v')||'';
   else if(youtube&&path.length===2&&['shorts','live','embed','v'].includes(path[0]))id=path[1];
   return validVideoId(id)?id:'';
  }catch(_){return '';}
 };
 function postHtml(p){
   const type=topicFor(p.topic),question=(p.topic==='duvida');
   return `<article class="sf71-post sf180-post sf180-type-${type.css} ${p.pinned?'sf151-pinned':''} ${p.resolved?'sf180-resolved':''}" data-sf71-post="${esc(p.id)}">
     <div class="sf71-post-head"><span class="sf228-author-avatar">${socialAvatar((state.detail?.club?.members||[]).find(m=>m.id===p.authorId)||{avatar:"🎧",name:p.authorName})}</span><span class="sf228-author-meta"><strong>${esc(p.authorName)}</strong><time>${new Date(Number(p.createdAt)||Date.now()).toLocaleString('pt-BR')}</time></span></div>
     <div class="sf180-post-meta"><span class="sf180-topic-label">${type.icon} ${type.title}</span></div>
     ${p.pinned?'<span class="sf151-pin-label">📌 Destaque da comunidade</span>':''}
     <button type="button" class="sf600-topic-title" data-sf600-open="${esc(p.id)}">${esc(p.title||String(p.text||'').slice(0,95)||'Discussão da comunidade')}</button>
     <div class="sf600-tags">${(p.tags||[]).map(tag=>`<button type="button" data-sf600-tag="${esc(tag)}">#${esc(tag)}</button>`).join('')}</div>
     <p>${esc(p.text)}</p>${safeUrl(p.imageUrl)?`<img class="sf170-post-image" loading="lazy" referrerpolicy="no-referrer" alt="Imagem da publicação" src="${esc(safeUrl(p.imageUrl))}">`:p.hasImage?`<img class="sf170-post-image" loading="lazy" alt="Imagem antiga" src="/api/fan-clubs/${encodeURIComponent(state.activeId)}/posts/${encodeURIComponent(p.id)}/image">`:''}${videoEmbed(p)}
     ${p.editedAt?'<small class="sf180-edited">✎ Publicação editada</small>':''}
     ${question?`<div class="sf180-question-status" role="status">${p.resolved?'✓ Dúvida respondida':'⌛ Aguardando respostas'}</div>`:''}
     <div class="sf151-post-actions">
       <button type="button" data-sf600-favorite="${esc(p.id)}" aria-pressed="${!!p.favorite}">${p.favorite?'★ Salvo':'☆ Salvar'}</button>
       ${p.unread?'<span class="sf600-unread">● Não lido</span>':''}
       <button type="button" data-sf151-like="${esc(p.id)}" aria-pressed="${!!p.liked}">♡ ${Math.max(0,Number(p.likeCount)||0)} curtidas</button>
       <button type="button" data-sf160-comments="${esc(p.id)}" aria-expanded="${state.commentsOpen===p.id}">💬 ${p.replyCount||0} respostas</button>
       <button type="button" data-sf600-share="${esc(p.id)}">🔗 Link</button>
       <button type="button" data-sf160-report="${esc(p.id)}">⚑ Denunciar</button>
       ${question&&p.canResolve?`<button type="button" data-sf180-resolve="${esc(p.id)}" data-resolved="${!!p.resolved}">${p.resolved?'Reabrir dúvida':'✓ Marcar respondida'}</button>`:''}
       ${p.canPin?`<button type="button" data-sf151-pin="${esc(p.id)}" data-pinned="${!!p.pinned}">${p.pinned?'Desafixar':'📌 Fixar'}</button>`:''}
       ${p.authorCanEdit?`<button type="button" data-sf180-edit-post="${esc(p.id)}">✎ Editar</button>`:''}
       ${p.editable?`<button type="button" data-sf71-delete-post="${esc(p.id)}">Excluir</button>`:''}
     </div>
     ${state.commentsOpen===p.id?`<section class="sf160-comments" data-comments-for="${esc(p.id)}">Carregando respostas…</section>`:''}
   </article>`;
 }
 function roomHtml(room,owner){return `<div class="sf71-room">${room.track?.videoId?`<img class="sf160-room-cover" loading="lazy" alt="" src="https://i.ytimg.com/vi/${room.track.videoId}/mqdefault.jpg">`:''}<div><strong>♫ ${esc(room.name)}</strong><small>${room.isPlaying?'● Tocando agora':'Sala disponível'} · ${Number(room.listenerCount)||0} ouvintes</small>${room.track?`<small>${esc(room.track.title)}</small>`:''}</div>
   <div class="sf71-room-actions"><button type="button" data-sf71-room="${esc(room.slug)}">Entrar</button>${owner?`<button type="button" data-sf71-unlink="${esc(room.slug)}" title="Desvincular sala">×</button>`:''}</div></div>`;}
 function renderTopicPreview(){
   const type=topicFor($('sf170Topic')?.value);
   const box=$('sf180TopicPreview');
   if(box){box.className='sf180-topic-preview sf180-type-'+type.css;
     box.innerHTML=`<strong>${type.icon} ${type.title}</strong><small>${type.description}</small>`;}
 }

 function socialAvatar(m){
   const name=String(m?.name||'Fã'),src=String(m?.avatarUrl||'');
   const valid=/^\/api\/profile108\/photo\/[a-f0-9]{24}\?v=\d+$/.test(src)||/^\/avatars-108\/[a-z0-9-]{1,60}\.svg$/.test(src);
   return valid?'<img src="'+esc(src)+'" loading="lazy" decoding="async" alt="Foto de '+esc(name)+'">':
     '<span aria-hidden="true">'+esc(m?.avatar||'🎧')+'</span>';
 }
 function renderSocialWidgets(){
   const club=state.detail?.club, left=$('sf227Left'),right=$('sf227Right');
   if(!club||!left||!right)return;
   const members=(club.members||[]),events=state.clubEvents.slice().filter(e=>Number(e.startAt)>=Date.now()-3600000).sort((a,b)=>Number(a.startAt)-Number(b.startAt));
   const rooms=club.rooms||[],activity=state.posts.slice(0,3),tags=new Map();
   state.posts.forEach(post=>(post.tags||[]).forEach(tag=>{const key=String(tag).trim().slice(0,35);if(key)tags.set(key,(tags.get(key)||0)+1);}));
   const topTags=[...tags].sort((a,b)=>b[1]-a[1]).slice(0,5);
   // A enquete mais recente fica acessível no mural, com o mesmo botão de voto da aba Enquetes.
   // A API já retorna as enquetes pela data de criação; manter ordenação defensiva.
   const featuredPoll=[...(state.polls||[])].sort((a,b)=>
     Number(a.closed)-Number(b.closed)||Number(b.createdAt||0)-Number(a.createdAt||0))[0]||null;
   const card=(title,link,body)=>'<section class="sf227-widget"><header><h4>'+title+'</h4>'+link+'</header>'+body+'</section>';
   const goto=(pane,label)=>'<button type="button" data-sf160-pane="'+pane+'">'+label+' →</button>';
   left.innerHTML=
    card('👥 Membros em destaque',goto('members','Ver todos'),
     members.length?'<div class="sf227-avatar-strip">'+members.slice(0,4).map(m=>
      '<button type="button" class="sf227-mini-member" data-sf227-member="'+esc(m.id)+'" title="Ver opções para '+esc(m.name)+'">'+
      '<span class="sf227-mini-photo">'+socialAvatar(m)+'</span><small>'+esc(m.name)+'</small></button>').join('')+'</div>':
      '<p class="sf227-empty">Nenhum perfil disponível ainda.</p>')+
    card('▦ Próximos eventos',goto('events','Ver agenda'),
      events.length?events.slice(0,3).map(ev=>'<button type="button" class="sf227-event-item" data-sf160-pane="events">'+
       '<span class="sf227-event-date"><b>'+new Date(Number(ev.startAt)).toLocaleDateString('pt-BR',{day:'2-digit'})+'</b><small>'+new Date(Number(ev.startAt)).toLocaleDateString('pt-BR',{month:'short'}).replace('.','')+'</small></span>'+
       '<span><strong>'+esc(ev.title)+'</strong><small>'+new Date(Number(ev.startAt)).toLocaleString('pt-BR')+'</small></span></button>').join(''):
       '<p class="sf227-empty">Nenhum evento futuro agendado.</p>')+
    card('♫ Salas de música',goto('rooms','Ver salas'),rooms.length?
      rooms.slice(0,3).map(room=>'<div class="sf227-room-item"><span class="sf227-room-disc">♫</span>'+
       '<span><strong>'+esc(room.name)+'</strong><small>'+Math.max(0,Number(room.listenerCount)||0)+' ouvintes</small></span>'+
       '<button type="button" data-sf141-club-room="'+esc(room.slug)+'" aria-label="Entrar em '+esc(room.name)+'">▶</button></div>').join(''):
       '<p class="sf227-empty">Este Fanclub ainda não vinculou salas.</p>');
   right.innerHTML=
     card('◉ Membros da comunidade',goto('members','Ver todos'),
       '<div class="sf227-online-strip">'+(members.length?members.slice(0,6).map(m=>
         '<button type="button" data-sf227-member="'+esc(m.id)+'" title="'+esc(m.name)+'">'+socialAvatar(m)+'</button>').join(''):
          '<p class="sf227-empty">Aguardando membros.</p>')+'</div><small class="sf227-context">'+
         Math.max(0,Number(club.memberCount)||0)+' membros · Presença online não disponível</small>')+
     card('✦ Novidades do Fanclub',goto('mural','Ver mural'),
       activity.length?activity.map(p=>'<button type="button" class="sf227-activity" data-sf600-open="'+esc(p.id)+'">'+
        '<span>✦</span><span><strong>'+esc((p.title||p.text||'Nova discussão').slice(0,78))+'</strong>'+
        '<small>'+esc(p.authorName||'Participante')+' · '+new Date(Number(p.createdAt)||Date.now()).toLocaleDateString('pt-BR')+'</small></span></button>').join(''):
        '<p class="sf227-empty">As novidades aparecerão conforme os fãs publicarem.</p>')+
     card('🗳 Enquete em destaque',goto('polls','Ver todas'),
       featuredPoll?
         '<p class="sf232-poll-intro">'+(featuredPoll.closed?'Resultados da última enquete':'Vote sem sair do mural. Sua opinião conta!')+'</p>'+
         pollCard(featuredPoll,true):
         '<div class="sf232-poll-empty"><p>As enquetes da comunidade aparecerão aqui.</p>'+
         (club.canModerate?'<button type="button" data-sf160-create-poll>＋ Criar enquete</button>':
           goto('polls','Ver enquetes'))+'</div>')+
     card('↗ Tópicos em alta',goto('mural','Ver mais'),
       topTags.length?'<ol class="sf227-trending">'+topTags.map(([tag,count],i)=>
         '<li><span>'+String(i+1)+'</span><button type="button" data-sf600-tag="'+esc(tag)+'">#'+esc(tag)+'</button>'+
         '<small>'+count+' '+(count===1?'post':'posts')+'</small></li>').join('')+'</ol>':
        '<p class="sf227-empty">As tags mais usadas aparecerão aqui.</p>');
 }

 function renderFeed(){
   if(state.focusPost){renderFocusedPost();return;}

   const box=$('sf71Posts');if(!box)return;
   const activeReply=box.querySelector('[data-sf160-comment-form] input[name="text"]');
   if(activeReply&&activeReply.value.trim())return;
   const q=state.feedSearch.toLocaleLowerCase('pt-BR');
   const all=state.posts;
   const topicOptions=['conversa','duvida','novidade','evento','ideia'];
   const countEl=$('sf180ForumCounts');
   if(countEl){
     countEl.innerHTML=`<button type="button" data-sf180-filter="all" aria-pressed="${state.feedFilter==='all'}">Todas</button>`+topicOptions.map(key=>`<button type="button" data-sf180-filter="${key}" aria-pressed="${state.feedFilter===key}">${topicFor(key).icon} ${topicFor(key).title} <strong>${all.filter(p=>(p.topic||'conversa')===key).length}</strong></button>`).join('');
   }
   const queryMatch=p=>!q||[p.title,p.text,p.authorName,topicFor(p.topic).title,...(p.tags||[])].some(v=>String(v||'').toLocaleLowerCase('pt-BR').includes(q));
   let posts=state.forumSearch?all:all.filter(p=>queryMatch(p));
   if(!state.forumSearch&&topicOptions.includes(state.feedFilter))posts=posts.filter(p=>(p.topic||'conversa')===state.feedFilter);
   if(state.feedFilter==='pinned')posts=posts.filter(p=>p.pinned);
   if(state.feedFilter==='popular'&&!state.forumSearch)posts=[...posts].sort((a,b)=>(b.likeCount||0)-(a.likeCount||0)||(b.createdAt||0)-(a.createdAt||0));
   const activeType=topicOptions.includes(state.feedFilter)?topicFor(state.feedFilter):null;
   const empty=activeType?`Ainda não há publicações de ${activeType.title.toLowerCase()} neste filtro.`:
     q?'Nenhuma publicação encontrada. Experimente outro termo.':'Ainda não há publicações nesta visualização.';
   box.innerHTML=(posts.length?posts.map(postHtml).join(''):`<p class="sf180-empty" role="status">${esc(empty)}</p>`)+
     ((state.forumSearch?state.forumSearchHasMore:state.postHasMore)?'<button type="button" class="sf170-load-more" data-sf600-more>Carregar mais discussões do histórico</button>':'');
   const summary=$('sf180FeedSummary');
   if(summary)summary.textContent=state.forumSearch?
     `${posts.length} resultados do histórico${state.forumSearchHasMore?' · buscar próximas páginas':''}`:
     `${posts.length} de ${all.length} publicações carregadas${state.postHasMore?' · existem mais publicações':''}`;
   if(state.commentsOpen&&posts.some(p=>p.id===state.commentsOpen))loadComments(state.activeId,state.commentsOpen);
 }
 function topicUrl(clubId,topicId){
   return location.origin+location.pathname+'#fanclub/'+encodeURIComponent(clubId)+'/topic/'+encodeURIComponent(topicId);
 }
 function renderFocusedPost(){
   const box=$('sf71Posts'),post=state.focusPost;if(!box||!post)return;
   const activeReply=box.querySelector('[data-sf160-comment-form] input[name="text"]');
   if(activeReply&&activeReply.value.trim())return;
   $('sf71ClubDetail')?.classList.add('sf600-reading');
   const related=state.related||[];
   box.innerHTML=`<section class="sf600-topic-detail" aria-label="Discussão aberta">
     <div class="sf600-topic-toolbar"><button type="button" data-sf600-back>← Voltar ao fórum</button>
       <button type="button" data-sf600-share="${esc(post.id)}">🔗 Copiar link permanente</button></div>
     ${postHtml(post)}
     <section class="sf600-related"><h5>Discussões relacionadas</h5>
       ${related.length?related.map(p=>`<button type="button" data-sf600-open="${esc(p.id)}">${esc(p.title)} <small>· ${topicFor(p.topic).title}</small></button>`).join(''):'<p>Não há discussões relacionadas na amostra recente.</p>'}</section>
   </section>`;
   state.commentsOpen=post.id;
   const node=box.querySelector('[data-sf71-post]');
   if(node&&!node.querySelector('.sf160-comments')){node.insertAdjacentHTML('beforeend',`<section class="sf160-comments" data-comments-for="${esc(post.id)}">Carregando respostas…</section>`);}
   loadComments(state.activeId,post.id);
 }
 async function openTopic(id,postId,push=true){
   if(!id||!postId)return;
   try{
     const data=await api('/api/fan-clubs/'+encodeURIComponent(id)+'/posts/'+encodeURIComponent(postId));
     if(state.activeId!==id)return;
     state.focusPost=data.post;state.replyTo=null;state.quoteTo=null;state.related=[];
     const cached=state.posts.find(p=>p.id===postId);if(cached)cached.unread=false;
     state.commentsOpen=postId;switchPane('mural');
     if(push)history.pushState({sf600:true},'',topicUrl(id,postId));
     renderFocusedPost();$('sf71Posts')?.scrollIntoView({behavior:'smooth',block:'start'});
     try{
       const related=await api('/api/fan-clubs/'+encodeURIComponent(id)+'/posts/'+encodeURIComponent(postId)+'/related');
       if(state.focusPost?.id===postId){state.related=related.related||[];renderFocusedPost();}
     }catch(e){/* A discussão continua acessível se sugestões relacionadas falharem. */}
   }catch(e){status(e.message,true);}
 }
 function closeTopic(changeUrl=true){
   state.focusPost=null;state.replyTo=null;state.quoteTo=null;state.commentsOpen=null;
   $('sf71ClubDetail')?.classList.remove('sf600-reading');
   if(changeUrl&&/^#fanclub\//.test(location.hash))history.pushState({},'',location.pathname+location.search);
   renderFeed();
 }
 async function searchForum(id,append=false){
   if(!id)return;
   const params=new URLSearchParams(),q=state.feedSearch;
   if(q)params.set('q',q);
   if(['conversa','duvida','novidade','evento','ideia'].includes(state.feedFilter))params.set('topic',state.feedFilter);
   if(state.feedFilter==='popular')params.set('sort','popular');
   if(state.feedFilter==='unanswered')params.set('sort','unanswered');
   if(state.feedFilter==='active')params.set('sort','active');
   if(state.feedFilter==='saved')params.set('saved','1');
   if(state.feedFilter==='unread')params.set('unread','1');
   if(state.feedTag)params.set('tag',state.feedTag);
   if(append&&state.forumSearchCursor)params.set('before',state.forumSearchCursor);
   const request=++state.searchRequestId;
   state.forumSearching=true;
   try{
     const data=await api('/api/fan-clubs/'+encodeURIComponent(id)+'/forum/search?'+params.toString());
     if(state.activeId!==id||request!==state.searchRequestId)return;
     state.forumSearch=true;
     state.posts=append?[...state.posts,...data.posts.filter(p=>!state.posts.some(old=>old.id===p.id))]:data.posts;
     state.forumSearchCursor=data.nextBefore||null;state.forumSearchHasMore=!!data.hasMore;
     renderFeed();
    }catch(e){if(state.activeId===id&&request===state.searchRequestId)status(e.message,true);}
   finally{if(request===state.searchRequestId)state.forumSearching=false;}
 }
 async function resetForumSearch(id){
   state.forumSearch=false;state.feedTag='';state.forumSearchCursor=null;
   ++state.searchRequestId;
   await loadPosts(id);
 }
 async function loadComments(id,postId){
   const box=$('sf71Posts')?.querySelector('[data-comments-for="'+postId+'"]');if(!box)return;
   try{
     const d=await api('/api/fan-clubs/'+encodeURIComponent(id)+'/posts/'+encodeURIComponent(postId)+'/comments');
     if(state.activeId!==id||state.commentsOpen!==postId)return;
     const postData=state.focusPost?.id===postId?state.focusPost:state.posts.find(p=>p.id===postId);
     const choose=postData?.topic==='duvida'&&postData?.canResolve;
     const comments=[...(d.comments||[])].sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
     const byId=new Map(comments.map(c=>[c.id,c]));
     const html=comments.map(c=>{
       const parent=byId.get(c.parentId);
       const depth=Math.min(3,Math.max(0,Number(c.depth)||0));
       return `<div class="sf160-comment sf600-reply ${c.best?'sf180-best-answer':''}" style="--sf600-depth:${depth}">
         <strong>${esc(c.authorName)}</strong>${parent?`<span class="sf600-in-reply">em resposta a ${esc(parent.authorName)}</span>`:''}
         ${c.best?'<span class="sf180-best-label">✓ Resposta escolhida</span>':''}
         ${c.quoteText?`<blockquote class="sf600-quote">${esc(c.quoteText)}</blockquote>`:''}
         <p>${esc(c.text)}</p>
         <div class="sf180-answer-actions">
           <button type="button" data-sf600-reply-to="${esc(c.id)}" data-author="${esc(c.authorName)}">↳ Responder</button>
           <button type="button" data-sf600-quote="${esc(c.id)}">❝ Citar</button>
           ${choose?`<button type="button" data-sf180-best-answer="${esc(c.id)}" data-post-id="${esc(postId)}">${c.best?'✓ Melhor resposta':'Marcar como resposta'}</button>`:''}
           ${c.editable?`<button type="button" data-sf160-delete-comment="${esc(c.id)}">Remover</button>`:''}
         </div></div>`;
     }).join('');
     const selected=comments.find(c=>c.id===state.replyTo);
     const quoted=comments.find(c=>c.id===state.quoteTo);
     box.innerHTML=`<h5>Respostas da comunidade · ${comments.length}</h5>
       ${html||'<p>Seja o primeiro a responder.</p>'}
       ${selected||quoted?`<div class="sf600-reply-context">${selected?`Respondendo a ${esc(selected.authorName)}`:''}
         ${quoted?` · Citando: ${esc(quoted.text.slice(0,110))}`:''}
         <button type="button" data-sf600-cancel-reply>Cancelar</button></div>`:''}
       <form data-sf160-comment-form="${esc(postId)}">
         <input name="text" aria-label="Nova resposta" maxlength="350" minlength="2" required placeholder="Escreva uma resposta…">
         <button type="submit">Responder</button>
       </form>`;
   }catch(e){
      if(state.activeId!==id)return;
      box.innerHTML='<p role="alert">'+esc(e.message)+'</p><button type="button" data-sf160-retry-comments="'+esc(postId)+'">↻ Tentar carregar respostas</button>';
    }
 }
 async function loadExtras(id){
 try{
 const prefix='/api/fan-clubs/'+encodeURIComponent(id);
 const jobs=await Promise.allSettled([api(prefix+'/polls'),api(prefix+'/ideas'),api(prefix+'/events'),
   state.detail?.club?.canModerate?api(prefix+'/insights'):Promise.resolve(null),api(prefix+'/contributors'),
   state.detail?.club?.canDelete?api(prefix+'/reports'):Promise.resolve({reports:[]})]);
   if(state.activeId!==id)return;
   const [p,ideas,events,insights,contributors,reports]=jobs.map(x=>x.status==='fulfilled'?x.value:null);
   if(p)state.polls=Array.isArray(p.polls)?p.polls:[];
   if(ideas)state.ideas=Array.isArray(ideas.ideas)?ideas.ideas:[];
   if(events)state.clubEvents=Array.isArray(events.events)?events.events:[];
   if(jobs[3].status==='fulfilled')state.insights=insights;
   if(contributors)state.contributors=Array.isArray(contributors.ranking)?contributors.ranking:[];
   if(reports)state.reports=Array.isArray(reports.reports)?reports.reports:[];
   renderExtras();renderCommunityAside();renderSocialWidgets();
   if(jobs.some(x=>x.status==='rejected'))status('Alguns módulos não carregaram; o mural continua disponível.',true);
 }catch(e){if(state.activeId===id)status('Falha ao atualizar módulos adicionais: '+e.message,true);}
 }
 function renderCommunityAside(){
 const aside=$('sf170CommunityAside');if(!aside)return;
 const c=state.detail?.club;if(!c?.joined&&!c?.owner){aside.innerHTML='';return;}
 if(state.activePane==='events'){
   const rooms=c.rooms||[],mine=state.clubEvents.filter(e=>e.going);
   aside.innerHTML=`<div class="sf202-event-aside">
     <section class="sf202-side-panel"><h4>⚙ Gerenciamento do Fan Club</h4>
     ${c.canModerate?`<label>Sala padrão para eventos
       <select id="sf202DefaultRoom" aria-label="Sala padrão para eventos">
       <option value="">Nenhuma sala padrão</option>
       ${rooms.map(room=>`<option value="${esc(room.slug)}" ${room.slug===c.defaultRoomSlug?'selected':''}>${esc(room.name)}</option>`).join('')}</select></label>`:
        `<p>Sala padrão: ${esc(rooms.find(room=>room.slug===c.defaultRoomSlug)?.name||'Não definida')}</p>`}
     <button type="button" data-sf170-notifications data-enabled="${!c.notificationsEnabled}">${c.notificationsEnabled?'🔔 Minhas notificações ativadas':'🔕 Ativar notificações do Fan Club'}</button>
     <p>Ao confirmar presença, você recebe os dados do evento e da sala vinculada. Eventos futuros aparecem na sua agenda pessoal.</p>
     </section>
     <section class="sf202-side-panel"><header><h4>♧ Minha participação</h4><button type="button" data-sf170-global-events>Ver agenda geral ›</button></header>
       ${mine.length?mine.map(e=>`<div class="sf202-joined-event"><strong>${esc(e.title)}</strong><small>▦ ${new Date(Number(e.startAt)).toLocaleString('pt-BR')}</small>
       ${e.roomSlug?`<button type="button" data-sf141-club-room="${esc(e.roomSlug)}">♫ Entrar na sala</button>`:''}</div>`).join(''):'<p>Nenhum encontro confirmado ainda.</p>'}
     </section></div>`;
   return;
  }
  const active=state.polls.filter(p=>!p.closed).slice(0,2),ideas=state.ideas.slice(0,5);
 aside.innerHTML=`<div class="sf170-aside-title"><div><small>ESPAÇO DA COMUNIDADE</small><h4>💡 Ideias dos fãs</h4></div><button type="button" data-sf170-new-idea>＋ Sugerir</button></div>
 <p class="sf170-intro">O que podemos fazer juntos neste Fan Club?</p>
 <div class="sf170-ideas">${ideas.length?ideas.map(i=>`<article class="sf170-idea"><strong>${esc(i.title)}</strong><p>${esc(i.description||'')}</p><small>${esc(i.authorName)} · ${i.votes} apoios · ${i.status==='planned'?'Planejada':i.status==='done'?'Realizada':i.status==='closed'?'Encerrada':'Em discussão'}</small><div class="sf170-inline-actions"><button type="button" data-sf170-vote-idea="${esc(i.id)}" aria-pressed="${i.voted}" ${i.status!=='open'?'disabled':''}>${i.voted?'✓ Apoiada':'♡ Apoiar ideia'}</button>${i.canManage&&i.status==='open'?`<button type="button" data-sf170-plan-idea="${esc(i.id)}">Planejar</button>`:''}${i.canManage&&i.status==='planned'?`<button type="button" data-sf170-done-idea="${esc(i.id)}">Concluir</button>`:''}</div></article>`).join(''):'<p class="sf170-empty">Nenhuma ideia ainda. Seja o primeiro a sugerir!</p>'}</div>
 <div class="sf170-aside-title sf170-poll-title"><h4>🗳 Enquetes em destaque</h4><button type="button" data-sf160-pane="polls">Ver todas</button></div>
 <div class="sf170-polls">${active.length?active.map(p=>pollCard(p,true)).join(''):'<p class="sf170-empty">Nenhuma enquete em andamento.</p>'}</div>
 ${c.canModerate?'<button class="sf170-create-poll" type="button" data-sf160-create-poll>＋ Criar enquete</button>':''}`;
 }

 function pollCard(p,compact=false){
   const total=Math.max(0,Number(p.totalVotes)||0);
   const showResults=!!(p.voted||p.closed||p.canEdit);
   const opt=p.options||[];
   const labels=opt.map((value,i)=>{
     const count=Math.max(0,Number(p.counts?.[i])||0);
     const percent=total?Math.round(count*100/total):0;
     const chosen=p.myVote===i;
     return '<button type="button" class="sf231-poll-choice'+(chosen?' sf231-selected':'')+'" data-sf160-vote="'+esc(p.id)+'" data-choice="'+i+'"'+(p.voted||p.closed?' disabled':'')+
       ' aria-label="'+esc(value)+(showResults?', '+percent+' por cento':'')+'">'+
       '<span class="sf231-poll-bar" style="width:'+(showResults?percent:0)+'%"></span>'+
       '<span class="sf231-poll-text">'+(chosen?'✓ ':'')+esc(value)+'</span>'+
       (showResults?'<small>'+percent+'% · '+count+'</small>':'<span class="sf231-choice-mark" aria-hidden="true">○</span>')+'</button>';
   }).join('');
   const statusText=p.closed?'Encerrada':p.closesAt?'Até '+new Date(Number(p.closesAt)).toLocaleString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'Sem prazo definido';
   return '<article class="'+(compact?'sf170-poll ':'sf160-poll ')+'sf231-poll" data-sf231-poll="'+esc(p.id)+'">'+
     '<div class="sf231-poll-heading"><span class="sf231-poll-icon">▤</span><div><strong>'+esc(p.question)+'</strong><small>'+statusText+'</small></div></div>'+
     '<div class="sf231-poll-options">'+labels+'</div>'+
     '<div class="sf231-poll-footer"><span>'+total+' '+(total===1?'voto':'votos')+(p.voted?' · ✓ Você votou':'')+'</span>'+
     '<div class="sf231-poll-actions">'+
     (p.canEdit?'<button type="button" data-sf231-edit-poll="'+esc(p.id)+'">✎ Editar</button>':'')+
     (p.canEdit?'<button type="button" data-sf231-close-poll="'+esc(p.id)+'">'+(p.closed?'Reabrir':'Encerrar')+'</button>':'')+
     (p.canDelete?'<button type="button" class="sf231-poll-delete" data-sf160-delete-poll="'+esc(p.id)+'">Excluir</button>':'')+
     '</div></div></article>';
 }

 function filteredPolls(){
   const mode=state.pollFilter||'all';
   return [...state.polls].filter(p=>mode==='all'||(mode==='active'?!p.closed:p.closed))
     .sort((a,b)=>Number(a.closed)-Number(b.closed)||Number(b.createdAt)-Number(a.createdAt));
 }
 function pollFilterToolbar(){
   const active=state.polls.filter(p=>!p.closed).length;
   const opts=[['all','Todas',state.polls.length],['active','Abertas',active],['closed','Encerradas',state.polls.length-active]];
   return '<div class="sf231-filters" role="group" aria-label="Filtrar enquetes">'+
      opts.map(item=>'<button type="button" data-sf231-filter="'+item[0]+'" aria-pressed="'+((state.pollFilter||'all')===item[0])+'">'+
        item[1]+' <span>'+item[2]+'</span></button>').join('')+'</div>';
 }

 function openPollEditor(poll=null){
   const editing=!!poll,hasVotes=editing&&Number(poll.totalVotes)>0;
   const opts=editing?[...(poll.options||[])]:['',''];
   const field=(value,i)=>'<div class="sf231-option-row"><label>Alternativa '+(i+1)+
      '<input name="sf231Option" data-sf231-option maxlength="80" required value="'+esc(value)+'"'+(hasVotes?' readonly':'')+'></label>'+
      (!hasVotes?'<button type="button" data-sf231-remove-option aria-label="Remover alternativa '+(i+1)+'">✕</button>':'')+'</div>';
   const fields='<p class="sf231-help">'+(editing?'Atualize a pergunta e o prazo da enquete.':'Escolha de 2 a 8 alternativas para a comunidade votar.')+'</p>'+
     '<label>Pergunta<input name="question" required maxlength="140" minlength="8" value="'+esc(poll?.question||'')+'" placeholder="O que você quer perguntar aos fãs?"></label>'+
     (hasVotes?'<p class="sf231-lock-hint">🔒 Esta enquete já recebeu votos. As alternativas não podem ser alteradas.</p>':'')+
     '<div class="sf231-option-list">'+opts.map(field).join('')+'</div>'+
     (!hasVotes?'<button type="button" class="sf231-add-option" data-sf231-add-option>＋ Adicionar alternativa</button>':'')+
     '<small class="sf231-option-count" aria-live="polite"></small>'+
     '<label>Encerramento<select name="duration">'+
     (editing?'<option value="keep">Manter prazo atual</option>':'')+
     '<option value="none"'+(!editing?' selected':'')+'>Sem prazo</option>'+
     [1,3,7,14].map(days=>'<option value="'+days+'">'+days+' '+(days===1?'dia':'dias')+' a partir de agora</option>').join('')+
     (editing?'<option value="close">Encerrar agora</option>':'')+
     '</select></label>';
   const overlay=modal(editing?'Editar enquete':'Criar enquete',fields,async fd=>{
     const form=overlay.querySelector('form');
     const options=[...form.querySelectorAll('[data-sf231-option]')].map(el=>el.value.trim());
     if(options.length<2||options.length>8||options.some(v=>!v)||new Set(options.map(v=>v.toLocaleLowerCase('pt-BR'))).size!==options.length)
       throw Error('Informe de 2 a 8 alternativas diferentes.');
     const question=String(fd.get('question')||'').trim();
     if(question.length<8)throw Error('A pergunta precisa ter ao menos 8 caracteres.');
     const duration=String(fd.get('duration')||'none');
     const url='/api/fan-clubs/'+encodeURIComponent(state.activeId)+'/polls'+(editing?'/'+encodeURIComponent(poll.id):'');
     if(editing)await api(url,{method:'PATCH',body:JSON.stringify({question,...(!hasVotes?{options}:{}),duration})});
     else await post(url,{question,options,durationDays:duration==='none'?null:Number(duration)});
     return true;
   },async()=>{await loadExtras(state.activeId);switchPane('polls');status(editing?'Enquete atualizada.':'Enquete publicada.');});
   const list=overlay.querySelector('.sf231-option-list'),counter=overlay.querySelector('.sf231-option-count');
   const refresh=()=>{
     const rows=[...list.querySelectorAll('.sf231-option-row')];
     rows.forEach((row,i)=>{
       row.querySelector('label').firstChild.textContent='Alternativa '+(i+1);
       const remove=row.querySelector('[data-sf231-remove-option]');
       if(remove){remove.disabled=rows.length<=2;remove.setAttribute('aria-label','Remover alternativa '+(i+1));}
     });
     const add=overlay.querySelector('[data-sf231-add-option]');
     if(add)add.disabled=rows.length>=8;
     if(counter)counter.textContent=rows.length+' de 8 alternativas';
   };
   overlay.addEventListener('click',event=>{
     if(event.target.closest('[data-sf231-add-option]')){
       if(list.children.length>=8)return;
       const div=document.createElement('div');div.innerHTML=field('',list.children.length);
       list.appendChild(div.firstElementChild);refresh();
       list.lastElementChild.querySelector('input')?.focus();
     }
     const remove=event.target.closest('[data-sf231-remove-option]');
     if(remove&&list.children.length>2){remove.closest('.sf231-option-row')?.remove();refresh();}
   });
   refresh();
 }

 function renderExtras(){
 const el=$('sf160Extras');if(!el)return;const c=state.detail?.club;
 if(state.activePane==='polls'){
 el.innerHTML=`<section class="sf160-extra-panel sf231-polls-page"><div class="sf160-extra-head"><div><h4>🗳 Enquetes do Fanclub</h4><p>Participe das decisões, confira resultados e acompanhe os assuntos favoritos dos fãs.</p></div>${c?.canModerate?'<button type="button" data-sf160-create-poll>＋ Criar enquete</button>':''}</div>${pollFilterToolbar()}<div class="sf231-poll-grid">${filteredPolls().length?filteredPolls().map(p=>pollCard(p)).join(''):'<p class="sf231-empty">Nenhuma enquete publicada. Crie a primeira para começar a conversa.</p>'}</div></section>`;
 }else if(state.activePane==='events'){
 const events=state.clubEvents,linked=c?.events||[];
 el.innerHTML=`<section class="sf160-extra-panel sf202-club-agenda">
 <div class="sf160-extra-head sf202-agenda-head"><div><span class="sf202-eyebrow">SONORAFAN · COMUNIDADE</span><h4>▦ Agenda do Fan Club</h4><p>Encontros da comunidade com salas integradas.</p></div>${c?.canModerate?'<button type="button" class="sf202-create-event" data-sf170-create-event>＋ Criar evento</button>':''}</div>
 <div class="sf202-agenda-pills"><button type="button" data-sf170-global-events>Todos os eventos da plataforma ↗</button><span>${events.length} encontros do Fan Club</span></div>
 ${events.length?events.map(ev=>`<article class="sf71-club-event sf202-event-card">
 <div class="sf202-event-art"><img src="${esc(coverUrl(c))}" alt="" loading="lazy" referrerpolicy="no-referrer"></div>
 <div class="sf202-event-main"><span class="sf202-event-kicker">♧ Fan Club · ${esc(c.title)}</span><strong>${esc(ev.title)}</strong>
 <p>${esc(ev.description||'Encontro especial para nossa comunidade.')}</p>
 <small>▦ ${new Date(Number(ev.startAt)).toLocaleString('pt-BR')} · ${ev.attendees} confirmados</small>
 <span class="sf202-room-pill">♫ Sala vinculada: ${esc(ev.roomName||'Nenhuma sala vinculada')}</span>
 </div><div class="sf202-event-controls"><button type="button" class="sf202-confirm" data-sf170-rsvp="${esc(ev.id)}" data-going="${!ev.going}">${ev.going?'✓ Presença confirmada':'Confirmar presença'}</button>
 ${ev.roomSlug?`<button type="button" data-sf141-club-room="${esc(ev.roomSlug)}">♫ Entrar na sala</button>`:''}
 <button type="button" data-sf170-calendar="${esc(ev.id)}">▦ Adicionar à agenda</button>
 ${ev.canEdit?`<button type="button" class="sf203-edit-club" data-sf203-edit-event="${esc(ev.id)}">✎ Editar evento</button>`:''}
  ${ev.canDelete?`<button type="button" data-sf170-delete-event="${esc(ev.id)}">Cancelar evento</button>`:''}</div>
 </article>`).join(''):'<div class="sf202-agenda-empty"><strong>O primeiro encontro começa aqui</strong><p>Organize uma sessão para os fãs, vincule uma sala e convide a comunidade.</p>'+ (c?.canModerate?'<button type="button" data-sf170-create-event>＋ Criar primeiro evento</button>':'<button type="button" data-sf170-global-events>Explorar agenda musical</button>')+'</div>'}
 ${linked.length?'<h4 class="sf202-linked-title">♫ Sessões em salas vinculadas</h4>':''}
 ${linked.map(ev=>`<article class="sf71-club-event sf202-linked-event"><strong>${esc(ev.title)}</strong><small>▦ ${new Date(Number(ev.startAt)).toLocaleString('pt-BR')} · ${esc(ev.roomName)} · ${Number(ev.attendees)||0} participantes</small><div class="sf141-event-actions"><button type="button" data-sf141-club-rsvp="${esc(ev.id)}" data-going="${!ev.going}">${ev.going?'✓ Confirmado':'Confirmar presença'}</button><button type="button" data-sf142-club-calendar="${esc(ev.id)}">Adicionar à agenda</button><button type="button" data-sf141-club-room="${esc(ev.roomSlug)}">Entrar na sala</button></div></article>`).join('')}
 </section>`;
 }
 
 else if(state.activePane==='rooms'){
   const list=c?.rooms||[],admin=!!c?.canModerate;
   const cards=list.map(room=>{
     const primary=c.defaultRoomSlug===room.slug;
     return '<article class="sf204-room-entry"><div class="sf204-room-copy"><strong>♫ '+esc(room.name)+'</strong>'+
       '<small>'+(Number(room.listenerCount)||0)+' ouvintes · '+(room.isPlaying?'Tocando agora':'Disponível')+'</small>'+
       (primary?'<span class="sf204-primary-label">★ Sala principal</span>':'')+'</div>'+
       '<div class="sf204-room-actions"><button type="button" data-sf141-club-room="'+esc(room.slug)+'">Entrar na sala</button>'+
       (admin?'<button type="button" data-sf204-replace-room="'+esc(room.slug)+'">✎ Trocar sala</button>'+
         '<button type="button" data-sf204-make-default="'+(primary?'':esc(room.slug))+'">'+(primary?'Retirar padrão':'★ Tornar principal')+'</button>'+
         '<button type="button" class="sf204-danger" data-sf204-unlink-room="'+esc(room.slug)+'">Desvincular</button>':'')+
       '</div></article>';
   }).join('');
   el.innerHTML='<section class="sf160-extra-panel sf202-club-rooms sf204-room-manager">'+
     '<div class="sf204-manager-head"><div><span class="sf202-eyebrow">GERENCIAMENTO MUSICAL</span><h4>♫ Salas do Fan Club</h4>'+
     '<p>Vincule até três salas públicas e escolha a sala principal da comunidade.</p></div>'+
     (admin&&list.length<3?'<button type="button" class="sf204-primary" data-sf71-addroom>＋ Vincular sala</button>':'')+'</div>'+
     '<p class="sf204-room-counter">'+list.length+' de 3 salas vinculadas</p>'+
     (list.length?cards:'<div class="sf202-agenda-empty"><strong>Nenhuma sala vinculada</strong><p>Adicione uma sala que você administra para organizar eventos.</p>'+
       (admin?'<button type="button" data-sf71-addroom>＋ Vincular primeira sala</button>':'')+'</div>')+
     (admin?'<p class="sf204-help">Trocar uma sala não exclui eventos existentes. Confira os locais dos próximos encontros após a alteração.</p>':'')+
     '</section>';
 }
 else if(state.activePane==='members'){
 const rank=state.contributors;
 el.innerHTML=`<section class="sf160-extra-panel"><h4>🏆 Destaques do Fan Club</h4><p>Atividade real recente, não XP ou pontuação global.</p>
 ${rank.length?rank.map((v,i)=>`<div class="sf160-rank"><strong>#${i+1} ${esc(v.name)}</strong><small>${v.posts} posts · ${v.comments} respostas · ${v.likesReceived} curtidas recebidas</small></div>`).join(''):'<p>A comunidade ainda não tem contribuições suficientes.</p>'}
 <h4>👥 Participantes (${c?.memberCount||0})</h4>
 ${c?.canManageAdmins?`<section class="sf253-admin-panel"><h4>👑 Gestão de administradores</h4><p>Administradores adicionais: ${(c.moderators||[]).length} de 2 vagas utilizadas. Selecione um participante abaixo e escolha <strong>Tornar administrador</strong> ou <strong>Retirar administração</strong>. O dono e a administração global têm controle sobre a equipe.</p><div class="sf253-admin-list">${(c.moderators||[]).length?(c.moderators||[]).map(m=>`<span>★ ${esc(m.name||'Administrador')}</span>`).join(''):'<span>Não há administradores adicionais.</span>'}</div></section>`:''}
 ${c?.canModerate&&state.insights?`<div class="sf170-insights"><h4>📊 Indicadores da comunidade</h4><div><span>${state.insights.members} membros</span><span>${state.insights.recent.posts} posts recentes</span><span>${state.insights.recent.comments} respostas recentes</span><span>${state.insights.recent.ideas} ideias recentes</span><span>${state.insights.openReports} denúncias abertas</span></div><small>Amostra de até ${state.insights.sampleLimit} registros por categoria. Visível apenas à moderação.</small></div>`:''}
 <div class="sf226-members-intro"><p>Conheça outros fãs, converse no privado ou envie um convite de amizade.</p><span>${Math.min((c?.members||[]).length,50)} perfis exibidos</span></div>
 <div class="sf226-member-grid">${(c?.members||[]).map(m=>memberTile(m,c)).join('')}</div>
 ${c?.canModerate?`<div class="sf160-moderation"><h4>⚑ Moderação</h4><p>Denúncias recebidas (somente administradores)</p>${state.reports.length?state.reports.map(r=>`<div class="sf160-report"><strong>${esc(r.reason)}</strong><small>${esc(r.status)}</small>${r.status==='open'?`<button type="button" data-sf160-resolve="${esc(r.id)}">Marcar como resolvida</button>`:''}</div>`).join(''):'<p>Nenhuma denúncia recebida.</p>'}</div>`:''}
 ${c?.canModerate&&c?.blockedMembers?.length?`<div class="sf170-blocked"><h4>Membros bloqueados</h4>${c.blockedMembers.map(m=>`<div class="sf160-member"><strong>${esc(m.name)}</strong><button type="button" data-sf71-unblock="${esc(m.id)}">Desbloquear</button></div>`).join('')}</div>`:''}
 </section>`;
 }
 else el.innerHTML='';
 }
 function switchPane(pane){
 state.activePane=pane;
 if($('sf71ClubDetail'))$('sf71ClubDetail').dataset.sf228Pane=pane;
 document.querySelectorAll('#sf71ClubDetail [data-sf160-pane]').forEach(t=>t.setAttribute('aria-selected',String(t.dataset.sf160Pane===pane)));
 const feed=$('sf160FeedArea');if(feed)feed.hidden=pane!=='mural';renderExtras();renderCommunityAside();renderSocialWidgets();
 }
 async function openDetail(id){
   const request=++state.openingId;
   const freshClub=state.activeId!==id;stopLive();state.activeId=id;
   ++state.postRequestId;++state.searchRequestId;state.postCursor=null;state.postHasMore=false;state.activePane='mural';state.pollFilter='all';state.posts=[];state.polls=[];state.clubEvents=[];state.ideas=[];state.feedFilter='all';state.feedSearch='';state.commentsOpen=null;state.focusPost=null;state.forumSearch=false;state.forumSearchCursor=null;state.replyTo=null;state.quoteTo=null;window.sf235HideHome?.();const box=$('sf71ClubDetail');box.dataset.sf228Pane='mural';box.classList.remove('sf600-reading');box.hidden=false;$('sf71ClubList').hidden=true;if(freshClub)box.closest('.sf5-community-scroll')?.scrollTo({top:0,behavior:'instant'});box.innerHTML='<p class="sf71-empty">Carregando comunidade…</p>';
   let rendered=false;
   try{const d=await api('/api/fan-clubs/'+encodeURIComponent(id));
     if(request!==state.openingId||state.activeId!==id)return;
     state.detail=d;const c=d.club;
     box.innerHTML=`<button type="button" class="sf71-back" data-sf71-back>← Voltar aos Fan Clubs</button>
       <div class="sf71-detail-hero sf71-theme-${esc(c.theme)} sf73-with-cover sf227-hero ${!['gallery','external','legacy'].includes(c.coverType)&&!c.coverVersion?'sf228-reference-art':''}">${imageCover(c)}<div class="sf227-hero-mark" aria-label="Imagem do Fanclub">${badgeMark(c)}</div><div class="sf73-hero-info"><span>SONORAFAN · COMUNIDADE DE FÃS</span><h3>${esc(c.title)}</h3><p>Para fãs de ${esc(c.artist)} · ${esc(genres[c.genre]||'Outros')}</p><div class="sf227-hero-meta"><b>♧ ${Math.max(0,Number(c.memberCount)||0)} membros</b><span>${c.joined||c.owner?'✓ Você faz parte':'♡ Participe da comunidade'}</span></div></div><div class="sf228-hero-actions">
${c.joined||c.owner?'<span class="sf228-following">✓ Membro</span>':'<button type="button" data-sf71-join class="sf228-join">♡ Participar</button>'}
<button type="button" class="sf228-hero-share" data-sf208-share aria-label="Compartilhar Fanclub">Compartilhar</button>
 ${c.canEditProfile?'<button type="button" class="sf228-join" data-sf204-edit-identity>✎ Editar Fanclub</button>':''}
${(c.joined||c.owner)&&c.rooms?.length?'<button type="button" class="sf228-join" data-sf141-club-room="'+esc(c.rooms.find(r=>r.slug===c.defaultRoomSlug)?.slug||c.rooms[0].slug)+'">♫ Entrar na sala</button>':''}
</div></div>
       <nav class="sf160-tabs" role="tablist" aria-label="Áreas do Fan Club">${[['mural','▣ Mural'],['members','♧ Membros'],['rooms','♫ Salas'],['events','▦ Agenda'],['polls','▤ Enquetes']].map(([id,label])=>`<button type="button" role="tab" data-sf160-pane="${id}" aria-selected="${id==='mural'}">${label}</button>`).join('')}</nav>
       <details class="sf228-settings"><summary>⚙ Opções, regras e administração do Fanclub</summary><div class="sf228-settings-content">
       <p class="sf71-detail-desc">${esc(c.description||'Um lugar para reunir fãs, músicas e boas conversas.')}</p>
       ${c.canEditProfile?`<button type="button" class="sf180-edit-profile" data-sf180-edit-profile>✎ Editar bio e regras</button>`:''}
        ${c.canEditProfile?'<button type="button" class="sf204-identity-button" data-sf204-edit-identity>⚙ Editar identidade e imagem</button>':''}
       ${c.profileUpdatedAt?`<small class="sf180-profile-updated">Informações atualizadas em ${new Date(c.profileUpdatedAt).toLocaleDateString('pt-BR')}</small>`:''}
       <details class="sf170-welcome"><summary>👋 Conheça esta comunidade</summary><div><p>Boas-vindas ao Fan Club de ${esc(c.artist)}! Aqui você pode conversar sobre o artista, tirar dúvidas, propor ideias e participar dos encontros.</p><p><strong>Comunidade:</strong> ${esc(c.title)} · ${Math.max(0,Number(c.memberCount)||0)} participantes</p><p><strong>Primeiros passos:</strong> leia as regras, participe do mural e confira ideias e enquetes ao lado. A fila musical continua nas salas do SonoraFan.</p></div></details>
       ${c.rules?`<details class="sf71-rule sf160-rules"><summary>📋 Regras da comunidade</summary><p>${esc(c.rules)}</p></details>`:''}


        <div class="sf71-detail-actions">${c.canModerate?'<span class="sf71-owner">★ '+(c.owner?'Dono':c.moderator?'Administrador do Fanclub':'Administração global')+'</span>':`<button type="button" class="sf71-action-primary" data-sf71-join>${c.joined?'Sair do Fan Club':'Participar do Fan Club'}</button>`}
         ${c.canManageAdmins?'<button type="button" data-sf160-pane="members">👑 Administradores do Fan Club</button>':''}
          ${c.canModerate?'<button type="button" data-sf160-pane="rooms">♫ Gerenciar salas</button>':''}
          ${c.canModerate?'<button type="button" data-sf208-invite>✉ Convidar usuários</button>':''}
          <button type="button" data-sf208-share>⌁ Compartilhar Fan Club</button>
         <button type="button" class="sf202-club-agenda-link" data-sf170-show-events>▦ Agenda do Fan Club</button>${c.joined?`<button type="button" data-sf170-notifications data-enabled="${!c.notificationsEnabled}">${c.notificationsEnabled?'🔔 Notificações ativadas':'🔕 Notificações silenciadas'}</button>`:''}
         ${c.canEditProfile?`<button type="button" data-sf73-change-cover>🖼 Alterar capa</button><button type="button" data-sf73-remove-cover>Usar capa padrão</button>`:''}
         ${c.canDelete?'<button type="button" class="sf75-delete-club" data-sf75-delete-club>🗑 Excluir Fan Club</button>':''}</div>

       </div></details>
       <div class="sf71-detail-columns sf227-social-grid"><aside id="sf227Left" class="sf227-side sf227-left" aria-label="Membros, eventos e salas"></aside><section class="sf71-feed sf227-feed"><div id="sf160FeedArea"><div class="sf71-rooms-head"><h4>Fórum da comunidade</h4>${c.joined?'<span class="sf72-live-label" id="sf72ClubLiveStatus">Conectando…</span>':''}</div>
         ${c.joined?`<div class="sf227-composer-bar"><span class="sf227-composer-icon">♫</span><button type="button" data-sf227-compose>Compartilhar algo com a comunidade...</button><button type="button" aria-label="Publicar foto" data-sf227-photo>▧</button><button type="button" aria-label="Agenda" data-sf160-pane="events">▦</button><button type="button" aria-label="Enquetes" data-sf160-pane="polls">▤</button><button type="button" class="sf227-compose-main" data-sf227-compose>Publicar</button></div>`:''}
         ${c.joined?`<form id="sf71PostForm" class="sf227-composer-collapsed"><div class="sf140-post-tools"><small>Compartilhe uma novidade, opinião ou pergunta com a comunidade.</small></div><label for="sf600Title">Título da discussão<input id="sf600Title" name="title" maxlength="110" minlength="6" required placeholder="Resuma sua discussão em um título"></label>
         <label for="sf600Tags">Tags (separadas por vírgula, até cinco)<input id="sf600Tags" name="tags" maxlength="140" placeholder="show, ingressos, turnê"></label>
         <label for="sf71PostText" class="sf71-sr-only">Publicar no Fan Club</label><label for="sf170Topic" class="sf71-sr-only">Assunto da publicação</label><select id="sf170Topic" aria-label="Assunto da publicação"><option value="conversa">Conversa</option><option value="duvida">Dúvida</option><option value="novidade">Novidade</option><option value="evento">Evento</option><option value="ideia">Ideia</option></select><div class="sf180-topic-preview" id="sf180TopicPreview" aria-live="polite"><strong>💬 Conversa</strong><small>Um papo livre com outros fãs.</small></div><textarea id="sf71PostText" maxlength="600" minlength="3" rows="3" placeholder="Sobre o que você quer conversar com os fãs?" required></textarea><label class="sf170-photo-label" for="sf170PostImageUrl">📷 URL HTTPS da imagem (opcional)</label><input id="sf170PostImageUrl" name="imageUrl" type="url" maxlength="1500" placeholder="https://exemplo.com/imagem.webp" aria-label="Endereço HTTPS da imagem"><small>Use um link direto para uma imagem pública.</small><label class="sf252-video-label" for="sf252PostYoutubeUrl">▶ Vídeo do YouTube (opcional)</label><input id="sf252PostYoutubeUrl" name="youtubeUrl" type="url" maxlength="1000" inputmode="url" placeholder="https://www.youtube.com/watch?v=..." aria-label="Link de vídeo do YouTube"><small>Cole o link do vídeo, Shorts ou transmissão ao vivo. O player aparecerá na publicação.</small><button type="submit" class="sf71-action-primary">Publicar</button></form><div class="sf160-feed-tools"><label for="sf160FeedSearch" class="sf71-sr-only">Buscar publicações</label><input id="sf160FeedSearch" type="search" placeholder="Buscar publicação ou autor…" autocomplete="off"><label for="sf160FeedFilter" class="sf71-sr-only">Filtrar publicações</label><select id="sf160FeedFilter"><option value="all">Todos os posts</option><option value="conversa">💬 Conversas</option><option value="duvida">❔ Dúvidas</option><option value="novidade">✨ Novidades</option><option value="evento">📅 Eventos</option><option value="ideia">💡 Ideias</option><option value="pinned">📌 Fixados</option><option value="popular">Mais curtidos</option><option value="active">Recentemente ativos</option><option value="unanswered">Dúvidas sem resposta</option><option value="saved">Meus favoritos</option><option value="unread">Não lidos</option></select><button type="button" data-sf180-clear-filter>Limpar filtros</button>
         <button type="button" data-sf600-search>🔎 Buscar no histórico completo</button></div><div id="sf180ForumCounts" class="sf180-forum-counts" aria-label="Filtrar por categorias"></div><div id="sf180FeedSummary" class="sf180-feed-summary" aria-live="polite"></div><div id="sf71Posts" aria-live="polite">Carregando conversa…</div>`:'<p class="sf71-empty">Participe do Fan Club para ler e publicar no mural.</p>'}
       </div><div id="sf160Extras" aria-live="polite"></div></section><div class="sf227-side sf227-right"><aside id="sf227Right" aria-label="Novidades e assuntos em destaque"></aside><aside id="sf170CommunityAside" class="sf71-room-list sf170-community-aside" aria-label="Ideias e enquetes da comunidade"><p>Carregando ideias e enquetes…</p></aside></div></div>`;
     rendered=true;
     renderSocialWidgets();
     if(c.joined){
       const feedArea=$('sf160FeedArea');if(feedArea)feedArea.hidden=false;
          await Promise.allSettled([loadPosts(id),loadExtras(id)]);
         if(state.activeId===id)startLive(id);
         const match=decodeURIComponent(location.hash).match(/^#fanclub\/([a-f0-9-]{36})\/topic\/([A-Za-z0-9_-]{1,100})$/);
         if(match?.[1]===id){switchPane('mural');await openTopic(id,match[2],false);}
       }
   }catch(e){
      if(request!==state.openingId||state.activeId!==id)return;
      if(!rendered){
        box.innerHTML=`<p class="sf71-empty" role="alert">${esc(e.message)}</p><button type="button" data-sf71-retry-detail>Tentar novamente</button><button type="button" class="sf71-back" data-sf71-back>← Voltar</button>`;
      }
      // Uma falha em painel, eventos ou fórum não pode apagar a comunidade já renderizada.
      status(e.message,true);
    }
 }
 async function loadPosts(id,append=false){
   if(!id||state.activeId!==id)return;
   const request=++state.postRequestId;
   try{
     const url='/api/fan-clubs/'+encodeURIComponent(id)+'/posts'+(append&&state.postCursor?'?before='+encodeURIComponent(state.postCursor):'');
     const d=await api(url);
     if(state.activeId!==id||request!==state.postRequestId)return;
     const next=Array.isArray(d.posts)?d.posts:[];
     state.posts=append?[...state.posts,...next.filter(p=>!state.posts.some(old=>old.id===p.id))]:next;
     state.postCursor=d.nextBefore||null;state.postHasMore=!!d.hasMore;
     if(state.focusPost){
       const current=state.posts.find(p=>p.id===state.focusPost.id);
       if(current)state.focusPost=current;
     }
     renderFeed();
   }catch(e){
     if(state.activeId!==id||request!==state.postRequestId)return;
     if(append)status(e.message,true);
     else if(!state.posts.length){
       const box=$('sf71Posts');
       if(box)box.innerHTML='<p class="sf180-empty" role="alert">'+esc(e.message)+'</p>'+
         '<button type="button" data-sf71-refresh>↻ Tentar carregar mural</button>';
     }else status('Falha ao atualizar o mural: '+e.message,true);
   }
 }
 async function refreshClubRooms(id){
  const data=await api('/api/fan-clubs/'+encodeURIComponent(id));
  if(state.activeId!==id)return;
  state.detail=data;renderExtras();renderCommunityAside();window.sf107RefreshFanClubs?.();
 }
 async function chooseRoom(replacing=''){
  if(!state.detail?.club?.canModerate)return;
  let rooms;try{rooms=await api('/api/social/my-rooms');}catch(e){status(e.message,true);return;}
  const linked=state.detail.club.rooms||[],used=new Set(linked.map(r=>r.slug));
  const choices=rooms.filter(r=>r.slug&&r.slug.toLowerCase()!=='lobby'&&!used.has(r.slug));
  if(!choices.length){status('Não há outra sala pública sob sua administração para vincular. Crie uma sala ou escolha outra.',true);return;}
  const previous=linked.find(r=>r.slug===replacing);
  const options=choices.map(r=>'<option value="'+esc(r.slug)+'">'+esc(r.name)+'</option>').join('');
  modal(replacing?'Trocar sala vinculada':'Vincular sala pública',
   '<p>'+(replacing?'Substituir '+esc(previous?.name||'a sala atual')+' por uma sala pública que você administra.':
     'Adicione uma sala pública administrada por você.')+'</p>'+
   '<label>Selecione a sala<select name="slug" required>'+options+'</select></label>'+
   '<small>Eventos já agendados não são alterados automaticamente. Revise os encontros futuros após a troca.</small>',
   async fd=>{
    const clubId=state.activeId,url='/api/fan-clubs/'+encodeURIComponent(clubId)+'/rooms';
    if(replacing)await api(url+'/'+encodeURIComponent(replacing),{method:'PATCH',body:JSON.stringify({slug:fd.get('slug')})});
    else await post(url,{slug:fd.get('slug')});
    return clubId;
   },async id=>{await refreshClubRooms(id);document.dispatchEvent(new CustomEvent('sf71:rooms-updated',{detail:{clubId:id}}));status(replacing?'Sala substituída.':'Sala vinculada.');});
 }
 async function onDetailClick(e){const t=e.target.closest('button');if(!t)return;const id=state.activeId;if(!id)return;
  if(t.hasAttribute('data-sf71-retry-detail')){await openDetail(id);return;}
  if(t.hasAttribute('data-sf227-compose')||t.hasAttribute('data-sf227-photo')){
    const form=$('sf71PostForm');if(!form)return;
    form.classList.remove('sf227-composer-collapsed');
    if(t.hasAttribute('data-sf227-photo'))$('sf170PostImageUrl')?.focus({preventScroll:true});
    else $('sf600Title')?.focus({preventScroll:true});
    form.scrollIntoView({behavior:'smooth',block:'nearest'});
    return;
  }
  if(t.hasAttribute('data-sf227-member')){
    const peer=t.dataset.sf227Member;
    if(!memberId(peer))return;
    switchPane('members');
    const card=$('sf160Extras')?.querySelector('.sf226-member-card [data-sf226-dm="'+peer+'"]')?.closest('.sf226-member-card');
    card?.scrollIntoView({behavior:'smooth',block:'nearest'});
    return;
  }

  if(t.hasAttribute('data-sf226-dm')){
    const peer=t.dataset.sf226Dm;
    if(!memberId(peer)||!state.detail?.club?.members?.some(m=>m.id===peer&&!m.isSelf))return;
    if(typeof window.sf53OpenInbox!=='function'){status('Mensagens privadas indisponíveis no momento.',true);return;}
    window.sf53OpenInbox(peer,t.dataset.sf226Name||'Participante');
    return;
  }
  if(t.hasAttribute('data-sf226-add')){
    const peer=t.dataset.sf226Add;
    if(!memberId(peer)||!state.detail?.club?.members?.some(m=>m.id===peer&&!m.isSelf))return;
    t.disabled=true;
    try{
      const response=await fetch('/api/social/follow',{
        method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:peer,follow:true})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(data.error||'Não foi possível solicitar amizade.');
      if(data.status==='incoming'){status('Este membro já solicitou sua amizade. Aceite em Meu Perfil → Amigos.');}
      else if(data.status==='accepted'){status('Vocês já são amigos.');t.textContent='✓ Amigos';}
      else{status('Solicitação de amizade enviada.');t.textContent='✓ Solicitado';}
    }catch(err){status(err.message,true);t.disabled=false;}
    return;
  }

  if(t.hasAttribute('data-sf600-open')){
    await openTopic(id,t.dataset.sf600Open);return;
  }
  if(t.hasAttribute('data-sf600-back')){
    closeTopic();return;
  }
  if(t.hasAttribute('data-sf600-share')){
    const link=topicUrl(id,t.dataset.sf600Share);
    try{await navigator.clipboard.writeText(link);status('Link permanente copiado.');}
    catch(e){prompt('Copie o link permanente da discussão:',link);}
    return;
  }
  if(t.hasAttribute('data-sf600-favorite')){
    const postId=t.dataset.sf600Favorite;
    const p=state.focusPost?.id===postId?state.focusPost:state.posts.find(x=>x.id===postId);
    if(!p)return;
    await action(async()=>{
      const data=await post('/api/fan-clubs/'+encodeURIComponent(id)+'/posts/'+encodeURIComponent(postId)+'/favorite',{favorite:!p.favorite});
      p.favorite=data.favorite;
      if(state.focusPost?.id===postId)renderFocusedPost();else renderFeed();
    },'Favoritos atualizados.');return;
  }
  if(t.hasAttribute('data-sf600-tag')){
    state.feedTag=t.dataset.sf600Tag;state.feedFilter='all';
    if($('sf160FeedFilter'))$('sf160FeedFilter').value='all';
    closeTopic();await searchForum(id);return;
  }
  if(t.hasAttribute('data-sf600-search')){
    closeTopic();await searchForum(id);return;
  }
  if(t.hasAttribute('data-sf600-more')){
    if(state.forumSearch)await searchForum(id,true);else await loadPosts(id,true);
    return;
  }
  if(t.hasAttribute('data-sf600-reply-to')||t.hasAttribute('data-sf600-quote')){
    const replying=t.dataset.sf600ReplyTo||t.dataset.sf600Quote;
    state.replyTo=replying;
    state.quoteTo=t.hasAttribute('data-sf600-quote')?replying:null;
    await loadComments(id,state.commentsOpen);
    $('sf71Posts')?.querySelector('form[data-sf160-comment-form] input[name=text]')?.focus();

    return;
  }
  if(t.hasAttribute('data-sf600-cancel-reply')){
    state.replyTo=null;state.quoteTo=null;
    await loadComments(id,state.commentsOpen);return;
  }

 
 
 if(t.hasAttribute('data-sf208-invite')){
  if(!state.detail?.club?.canModerate)return;
  const overlay=modal('Convidar para '+state.detail.club.title,
   '<p>Pesquise pessoas pelo nome. O convite chega por notificação; elas escolhem se querem participar.</p>'+
   '<label>Buscar usuário<input name="query" type="search" maxlength="40" placeholder="Nome ou nickname" autocomplete="off"></label>'+
   '<div class="sf208-invite-results" role="listbox"></div><input type="hidden" name="userId">'+
   '<p class="sf208-invite-choice" role="status">Selecione alguém da lista.</p>',
   async fd=>{if(!fd.get('userId'))throw Error('Selecione uma pessoa.');await post('/api/fan-clubs/'+encodeURIComponent(id)+'/invite',{userId:fd.get('userId')});},
   ()=>status('Convite enviado com sucesso.'));
  const input=overlay.querySelector('[name=query]'),box=overlay.querySelector('.sf208-invite-results');
  let seq=0,timer,controller=null;
  input.addEventListener('input',()=>{
   const q=input.value.trim(),i=++seq;
   overlay.querySelector('[name=userId]').value='';clearTimeout(timer);controller?.abort();
   if(q.length<2){box.textContent='Digite pelo menos duas letras.';return;}
   timer=setTimeout(async()=>{
    controller=new AbortController();
    try{const response=await fetch('/api/social/search?q='+encodeURIComponent(q),{credentials:'include',signal:controller.signal});
      if(!response.ok)throw Error('Busca indisponível');
      const found=await response.json();if(i!==seq)return;
      box.innerHTML=found.length?found.map(person=>'<button type="button" data-sf208-person="'+esc(person.id)+'" data-sf208-name="'+esc(person.name)+'">◉ '+esc(person.name)+'</button>').join(''):'<p>Nenhuma pessoa encontrada.</p>';
    }catch(e){if(e.name!=='AbortError')box.textContent='Falha na busca de pessoas.';}
   },240);
  });
  box.addEventListener('click',e=>{const btn=e.target.closest('[data-sf208-person]');if(!btn)return;
    overlay.querySelector('[name=userId]').value=btn.dataset.sf208Person;
    overlay.querySelector('.sf208-invite-choice').textContent='Convidar: '+btn.dataset.sf208Name;
    box.querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===btn));
  });
  return;
 }
 if(t.hasAttribute('data-sf208-share')){
  const url=location.origin+location.pathname+'#fanclub/'+encodeURIComponent(id);
  try{await navigator.clipboard.writeText(url);status('Link do Fan Club copiado.');}
  catch(_){status('Link: '+url);}
  return;
 }
 if(t.hasAttribute('data-sf204-edit-identity')){
   const club=state.detail?.club;if(!club?.canEditProfile)return;
   const genreOpts=Object.entries(genres).map(([key,label])=>'<option value="'+esc(key)+'" '+(key===club.genre?'selected':'')+'>'+esc(label)+'</option>').join('');
   const themeOpts=themeOptions(club.theme);
   const themePreview='<div class="sf208-theme-preview sf71-theme-'+esc(club.theme)+'" id="sf208ThemePreview"><span>♫ Estilo do Fan Club</span><strong>'+esc(club.title)+'</strong><small>Cores e detalhes do visual mudam, mantendo a foto de capa visível.</small></div>';
   const themeOverlay=modal('Editar identidade do Fan Club',
     '<p>Atualize as informações que aparecem no lobby e na agenda.</p>'+
     '<label>Nome da comunidade<input name="title" maxlength="75" minlength="3" required value="'+esc(club.title)+'"></label>'+
     '<label>Artista ou banda<input name="artist" maxlength="65" minlength="2" required value="'+esc(club.artist)+'"></label>'+
     '<label>Gênero musical<select name="genre">'+genreOpts+'</select></label>'+
     '<label>Identidade visual · temas das salas<select name="theme">'+themeOpts+'</select></label>'+
     themePreview+
     '<label>Segunda imagem · ícone quadrado (URL HTTPS)<input type="url" name="badgeImageUrl" maxlength="500" placeholder="https://exemplo.com/icone.webp" value="'+esc(club.badgeImageUrl||'')+'"></label>'+
      '<small>Substitui a nota musical no topo do Fanclub. Deixe vazio para restaurar o ícone original. A capa principal continua independente.</small>',
     async fd=>{
        const raw=String(fd.get('badgeImageUrl')||'').trim();
        if(raw&&!safeUrl(raw))throw Error('A segunda imagem precisa de um endereço HTTPS público válido.');
        await api('/api/fan-clubs/'+encodeURIComponent(id)+'/identity',{method:'PATCH',body:JSON.stringify({
          title:fd.get('title'),artist:fd.get('artist'),genre:fd.get('genre'),theme:fd.get('theme'),badgeImageUrl:raw})});
        return id;
     },async ()=>{await openDetail(id);await loadClubs();window.sf107RefreshFanClubs?.();status('Identidade atualizada.');});
   const picker=themeOverlay.querySelector('[name=theme]'),sample=themeOverlay.querySelector('#sf208ThemePreview');
   picker?.addEventListener('change',()=>{if(sample)sample.className='sf208-theme-preview sf71-theme-'+picker.value;});
   return;
 }

 if(t.hasAttribute('data-sf180-edit-profile')){
   if(!state.detail?.club?.canEditProfile)return;
   const club=state.detail.club;
   modal('Editar bio e regras do Fan Club',`<p>Somente o criador e até dois coadministradores autorizados podem alterar estas informações.</p>
     <label>Bio da comunidade<textarea name="description" maxlength="280" rows="4">${esc(club.description||'')}</textarea></label>
     <label>Regras da comunidade<textarea name="rules" maxlength="300" rows="5">${esc(club.rules||'')}</textarea></label>`,async fd=>{
       await post('/api/fan-clubs/'+encodeURIComponent(id)+'/profile',{description:String(fd.get('description')||''),rules:String(fd.get('rules')||'')});return true;
     },async()=>{await openDetail(id);status('Bio e regras atualizadas.');});return;
 }
 if(t.hasAttribute('data-sf180-filter')){
   state.feedFilter=t.dataset.sf180Filter;
   const select=$('sf160FeedFilter');if(select)select.value=state.feedFilter;
   await searchForum(id);return;
 }
 if(t.hasAttribute('data-sf180-clear-filter')){
   state.feedFilter='all';state.feedSearch='';state.feedTag='';state.forumSearch=false;
   if($('sf160FeedFilter'))$('sf160FeedFilter').value='all';
   if($('sf160FeedSearch'))$('sf160FeedSearch').value='';
   await resetForumSearch(id);return;
 }
 if(t.hasAttribute('data-sf180-edit-post')){
   const p=state.focusPost?.id===t.dataset.sf180EditPost?state.focusPost:
     state.posts.find(p=>p.id===t.dataset.sf180EditPost);
   if(!p?.authorCanEdit)return;
   modal('Editar discussão',`<label>Título<input name="title" maxlength="110" minlength="6" required value="${esc(p.title||'')}"></label>
     <label>Tags (até cinco, separadas por vírgula)<input name="tags" maxlength="140" value="${esc((p.tags||[]).join(', '))}"></label>
     <label>Texto<textarea name="text" minlength="3" maxlength="600" rows="5" required>${esc(p.text)}</textarea></label>
     <small>Categoria e autoria são preservadas.</small>`,async fd=>{
     await post('/api/fan-clubs/'+encodeURIComponent(id)+'/posts/'+encodeURIComponent(p.id)+'/edit',{
       text:String(fd.get('text')||''),title:String(fd.get('title')||''),
       tags:String(fd.get('tags')||'').split(',').map(t=>t.trim()).filter(Boolean)
     });return true;
   },async()=>{
     if(state.focusPost?.id===p.id)await openTopic(id,p.id,false);
     else if(state.forumSearch)await searchForum(id);
     else await loadPosts(id);
     status('Discussão editada.');
   });return;
 }
 if(t.hasAttribute('data-sf180-resolve')){
   const p=state.posts.find(p=>p.id===t.dataset.sf180Resolve);
   if(!p?.canResolve||p.topic!=='duvida')return;
   await action(async()=>{
     await post('/api/fan-clubs/'+encodeURIComponent(id)+'/posts/'+encodeURIComponent(p.id)+'/resolve',{resolved:t.dataset.resolved!=='true'});
     await loadPosts(id);
   },p.resolved?'Dúvida reaberta.':'Dúvida marcada como respondida.');return;
 }
 if(t.hasAttribute('data-sf180-best-answer')){
   const p=state.posts.find(p=>p.id===t.dataset.postId);
   if(!p?.canResolve||p.topic!=='duvida')return;
   await action(async()=>{
     await post('/api/fan-clubs/'+encodeURIComponent(id)+'/posts/'+encodeURIComponent(p.id)+'/best-answer',{commentId:t.dataset.sf180BestAnswer});
     await loadPosts(id);
   },'Resposta escolhida e dúvida resolvida.');return;
 }
 if(t.hasAttribute('data-sf170-create-event')){
   if(typeof window.sf200CreateEvent==='function'){window.sf200CreateEvent(id);return;}
   window.sf200OpenAgenda?.();return;
  }
  if(t.hasAttribute('data-sf170-rsvp')){
   await action(async()=>{await post('/api/fan-clubs/'+encodeURIComponent(id)+'/events/'+encodeURIComponent(t.dataset.sf170Rsvp)+'/rsvp',{going:t.dataset.going==='true'});await loadExtras(id);},'Presença atualizada.');return;
 }
 if(t.hasAttribute('data-sf203-edit-event')){
   const event=state.clubEvents.find(x=>x.id===t.dataset.sf203EditEvent);
   if(event?.canEdit&&typeof window.sf200EditEvent==='function'){
    window.sf200EditEvent({...event,type:'fanclub',clubId:id,clubName:state.detail?.club?.title||'',artist:state.detail?.club?.artist||'',canManage:true});
   }
   return;
  }
  if(t.hasAttribute('data-sf170-delete-event')){
   if(!confirm('Cancelar este encontro?'))return;
   await action(async()=>{await api('/api/fan-clubs/'+encodeURIComponent(id)+'/events/'+encodeURIComponent(t.dataset.sf170DeleteEvent),{method:'DELETE'});await loadExtras(id);},'Encontro cancelado.');return;
 }
 if(t.hasAttribute('data-sf170-calendar')){
   const ev=state.clubEvents.find(e=>e.id===t.dataset.sf170Calendar);if(!ev)return;
   const icsDate=ms=>new Date(ms).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
   const encode=s=>String(s||'').replace(/[\\\\;,]/g,' ').replace(/\n/g,' ');
   const content=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SonoraFan//Fan Clubs//PT-BR','BEGIN:VEVENT',
     'UID:'+ev.id+'@sonorafan','DTSTAMP:'+icsDate(Date.now()),'DTSTART:'+icsDate(ev.startAt),
     'DTEND:'+icsDate(ev.startAt+ev.durationMinutes*60000),'SUMMARY:'+encode(ev.title),
     'DESCRIPTION:'+encode(ev.description),'BEGIN:VALARM','TRIGGER:-PT30M','ACTION:DISPLAY','DESCRIPTION:Encontro do Fan Club','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n');
   const file=new Blob([content],{type:'text/calendar;charset=utf-8'}),url=URL.createObjectURL(file),a=document.createElement('a');
   a.href=url;a.download='fanclub-encontro.ics';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
 }
 if(t.hasAttribute('data-sf170-more')){await loadPosts(id,true);return;}
 if(t.hasAttribute('data-sf170-notifications')){
   await action(async()=>{
     const enabled=t.dataset.enabled==='true';
     await post('/api/fan-clubs/'+encodeURIComponent(id)+'/notifications',{enabled});
     if(state.detail?.club)state.detail.club.notificationsEnabled=enabled;
     t.textContent=enabled?'🔔 Notificações ativadas':'🔕 Notificações silenciadas';
     t.dataset.enabled=String(!enabled);
   },'Preferência salva.');return;
 }
 if(t.hasAttribute('data-sf170-moderator')){
   const userId=t.dataset.sf170Moderator,enabled=t.dataset.enabled==='true';
   if(enabled&&(state.detail?.club?.moderators||[]).length>=2){status('Limite de 2 administradores adicionais. Remova um administrador antes de adicionar outro.',true);return;}
    if(!confirm(enabled?'Conceder administração deste Fanclub a este membro? Ele poderá editar e moderar a comunidade.':'Remover a permissão de administrador deste membro?'))return;
   await action(async()=>{await post('/api/fan-clubs/'+encodeURIComponent(id)+'/moderators',{userId,enabled});await openDetail(id);switchPane('members');},'Permissão atualizada.');return;
 }
 if(t.hasAttribute('data-sf170-new-idea')){
   modal('Sua ideia para o Fan Club','<label>Título<input name="title" minlength="6" maxlength="100" required placeholder="Qual é a sua sugestão?"></label><label>Detalhes<textarea name="description" maxlength="300" placeholder="Como funcionaria?"></textarea></label>',async fd=>{
     await post('/api/fan-clubs/'+encodeURIComponent(id)+'/ideas',{title:fd.get('title'),description:fd.get('description')});return true;
   },async()=>{await loadExtras(id);status('Ideia enviada à comunidade.');});return;
 }
 if(t.hasAttribute('data-sf170-vote-idea')){
   await action(async()=>{t.disabled=true;await post('/api/fan-clubs/'+encodeURIComponent(id)+'/ideas/'+encodeURIComponent(t.dataset.sf170VoteIdea)+'/vote',{});await loadExtras(id);},'Apoio atualizado.');return;
 }
 if(t.hasAttribute('data-sf170-plan-idea')||t.hasAttribute('data-sf170-done-idea')){
   const idea=t.dataset.sf170PlanIdea||t.dataset.sf170DoneIdea;
   await action(async()=>{await post('/api/fan-clubs/'+encodeURIComponent(id)+'/ideas/'+encodeURIComponent(idea)+'/status',{status:t.hasAttribute('data-sf170-done-idea')?'done':'planned'});await loadExtras(id);},'Status atualizado.');return;
 }
 if(t.hasAttribute('data-sf160-pane')){switchPane(t.dataset.sf160Pane);return;}
 if(t.hasAttribute('data-sf160-comments')){
    if(state.focusPost?.id!==t.dataset.sf160Comments)await openTopic(id,t.dataset.sf160Comments);
    else {state.commentsOpen=t.dataset.sf160Comments;renderFocusedPost();}
    return;
  }
 if(t.hasAttribute('data-sf160-retry-comments')){
    await loadComments(id,t.dataset.sf160RetryComments);return;
  }
  if(t.hasAttribute('data-sf160-delete-comment')){
 if(!confirm('Remover comentário?'))return;
 const cid=t.dataset.sf160DeleteComment;await action(async()=>{await api('/api/fan-clubs/'+encodeURIComponent(id)+'/comments/'+encodeURIComponent(cid),{method:'DELETE'});await loadComments(id,state.commentsOpen);},'Comentário removido.');return;
 }
 if(t.hasAttribute('data-sf160-mention')){
 const field=$('sf71PostText');switchPane('mural');
 if(field){field.value=(field.value.trim()?field.value.trim()+' ':'')+'@'+t.dataset.sf160Mention+' ';field.focus({preventScroll:true});}
 else status('Entre no Fan Club para mencionar participantes.',true);
 return;
 }
 if(t.hasAttribute('data-sf160-report')){
 const postId=t.dataset.sf160Report;
 modal('Denunciar publicação','<p>Informe o motivo. Apenas a moderação poderá consultar a denúncia.</p><label>Motivo<input name="reason" minlength="6" maxlength="200" required></label>',async fd=>{
 await post('/api/fan-clubs/'+encodeURIComponent(id)+'/posts/'+encodeURIComponent(postId)+'/report',{reason:fd.get('reason')});return true;
 },()=>status('Denúncia enviada à moderação.'));return;
 }
 if(t.hasAttribute('data-sf160-resolve')){
 await action(async()=>{await post('/api/fan-clubs/'+encodeURIComponent(id)+'/reports/'+encodeURIComponent(t.dataset.sf160Resolve)+'/resolve',{});await loadExtras(id);},'Denúncia resolvida.');return;
 }
 if(t.hasAttribute('data-sf160-create-poll')){
   if(!state.detail?.club?.canModerate)return;
   openPollEditor();return;
 }
 if(t.hasAttribute('data-sf231-filter')){
   const filter=t.dataset.sf231Filter;
   if(['all','active','closed'].includes(filter)){state.pollFilter=filter;renderExtras();}
   return;
 }
 if(t.hasAttribute('data-sf231-edit-poll')){
   const poll=state.polls.find(p=>p.id===t.dataset.sf231EditPoll);
   if(poll?.canEdit)openPollEditor(poll);
   return;
 }
 if(t.hasAttribute('data-sf231-close-poll')){
   const poll=state.polls.find(p=>p.id===t.dataset.sf231ClosePoll);
   if(!poll?.canEdit)return;
   if(!confirm(poll.closed?'Reabrir esta enquete mantendo todos os votos anteriores?':'Encerrar esta enquete? Os resultados continuarão disponíveis.'))return;
   await action(async()=>{
     await api('/api/fan-clubs/'+encodeURIComponent(id)+'/polls/'+encodeURIComponent(poll.id),{
       method:'PATCH',body:JSON.stringify({question:poll.question,duration:poll.closed?'none':'close'})
     });await loadExtras(id);
   },poll.closed?'Enquete reaberta.':'Enquete encerrada.');return;
 }
 if(t.hasAttribute('data-sf160-vote')){
 await action(async()=>{t.disabled=true;await post('/api/fan-clubs/'+encodeURIComponent(id)+'/polls/'+encodeURIComponent(t.dataset.sf160Vote)+'/vote',{choice:Number(t.dataset.choice)});await loadExtras(id);},'Voto registrado.');return;
 }
 if(t.hasAttribute('data-sf160-delete-poll')){
 if(!confirm('Excluir enquete?'))return;
 await action(async()=>{await api('/api/fan-clubs/'+encodeURIComponent(id)+'/polls/'+encodeURIComponent(t.dataset.sf160DeletePoll),{method:'DELETE'});await loadExtras(id);},'Enquete removida.');return;
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
   if(t.hasAttribute('data-sf73-change-cover')){changeCover(id,state.detail.club);return;}
   if(t.hasAttribute('data-sf73-remove-cover')){
     if(!confirm('Remover a imagem de capa deste Fan Club?'))return;
     await action(async()=>{await post('/api/fan-clubs/'+encodeURIComponent(id)+'/cover-choice',{coverType:'default'});await openDetail(id);await loadClubs();window.sf107RefreshFanClubs?.();},'Capa removida.');return;
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
   if(t.hasAttribute('data-sf170-show-events')){switchPane('events');return;}
    if(t.hasAttribute('data-sf170-global-events')){if(typeof window.sf200OpenAgenda==='function'){document.querySelector('.sf5-community-layer .sf5-close')?.click();window.sf200OpenAgenda();}else window.sfSocialSwitchTab?.('events');return;}
   if(t.hasAttribute('data-sf151-like')){
     const postId=t.dataset.sf151Like;
     await action(async()=>{
       t.disabled=true;
       await post('/api/fan-clubs/'+encodeURIComponent(id)+'/posts/'+encodeURIComponent(postId)+'/like',{});
       await loadPosts(id);
     },'Reação atualizada.');return;
   }
   if(t.hasAttribute('data-sf151-pin')){
     if(!state.detail?.club?.canModerate)return;
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

   if(t.hasAttribute('data-sf204-replace-room')){await chooseRoom(t.dataset.sf204ReplaceRoom);return;}
   if(t.hasAttribute('data-sf204-make-default')){
     if(!state.detail?.club?.canModerate)return;
     await action(async()=>{
       await post('/api/fan-clubs/'+encodeURIComponent(id)+'/default-room',{roomSlug:t.dataset.sf204MakeDefault});
       await refreshClubRooms(id);
       document.dispatchEvent(new CustomEvent('sf71:rooms-updated',{detail:{clubId:id,action:'default'}}));
     },'Sala principal atualizada.');return;
   }
   if(t.hasAttribute('data-sf204-unlink-room')){
     if(!state.detail?.club?.canModerate)return;
     const slug=t.dataset.sf204UnlinkRoom,room=state.detail?.club?.rooms?.find(r=>r.slug===slug);
     if(!confirm('Desvincular '+(room?.name||'esta sala')+' do Fan Club? Os eventos já criados continuarão registrados.'))return;
     await action(async()=>{
       await api('/api/fan-clubs/'+encodeURIComponent(id)+'/rooms/'+encodeURIComponent(slug),{method:'DELETE'});
       await refreshClubRooms(id);
       document.dispatchEvent(new CustomEvent('sf71:rooms-updated',{detail:{clubId:id,slug,action:'unlink'}}));
     },'Sala desvinculada.');return;
   }

   if(t.hasAttribute('data-sf71-join')){await action(async()=>{
     if(state.detail?.club.joined)await api('/api/fan-clubs/'+encodeURIComponent(id)+'/join',{method:'DELETE'});
     else await post('/api/fan-clubs/'+encodeURIComponent(id)+'/join',{});
     await openDetail(id);await loadClubs();
   },'Participação atualizada.');return;}
   const del=t.dataset.sf71DeletePost;
   if(del){if(!confirm('Excluir esta publicação?'))return;
     await action(async()=>{await api('/api/fan-clubs/'+encodeURIComponent(id)+'/posts/'+encodeURIComponent(del),{method:'DELETE'});if(state.focusPost?.id===del)closeTopic();await loadPosts(id);},'Publicação excluída.');return;}
   const unlink=t.dataset.sf71Unlink;
   if(unlink){await action(async()=>{
      await api('/api/fan-clubs/'+encodeURIComponent(id)+'/rooms/'+encodeURIComponent(unlink),{method:'DELETE'});
      await refreshClubRooms(id);
      document.dispatchEvent(new CustomEvent('sf71:rooms-updated',{detail:{clubId:id,slug:unlink,action:'unlink'}}));
    },'Sala desvinculada.');return;}
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
    document.addEventListener('sf203:event-updated',e=>{if(e.detail?.clubId===state.activeId&&state.activeId)loadExtras(state.activeId).catch(()=>{});});
   document.addEventListener('visibilitychange',()=>{
     if(document.hidden||!state.activeId||!state.detail?.club?.joined)return;
     scheduleRefresh(state.activeId,'post');loadExtras(state.activeId).catch(()=>{});
   });
   $('sf71ClubDetail')?.addEventListener('change',async e=>{
     if(e.target?.id!=='sf73DetailCover')return;
     const file=e.target.files?.[0],id=state.activeId;if(!file||!id)return;
     const input=e.target;input.disabled=true;status('Enviando imagem de capa…');
     try{await uploadCover(id,file);await openDetail(id);status('Capa atualizada com sucesso.');}
     catch(err){status(err.message,true);}finally{input.disabled=false;}
   });
   $('sf71ClubDetail')?.addEventListener('submit',async e=>{if(e.target.hasAttribute('data-sf160-comment-form')){
 e.preventDefault();const id=state.activeId,postId=e.target.dataset.sf160CommentForm;
 const text=String(new FormData(e.target).get('text')||'').trim();if(text.length<2)return;
 const btn=e.target.querySelector('[type="submit"]');if(btn)btn.disabled=true;
 try{await post('/api/fan-clubs/'+encodeURIComponent(id)+'/posts/'+encodeURIComponent(postId)+'/comments',{
       text,parentId:state.replyTo||null,quoteId:state.quoteTo||null
     });
     state.replyTo=null;state.quoteTo=null;
      const field=e.target.querySelector('input[name="text"]');if(field)field.value='';
      if(state.focusPost?.id===postId)await refreshFocusedPost(id);
      else await loadPosts(id);
      await loadComments(id,postId);
}
 catch(err){status(err.message,true);if(btn)btn.disabled=false;}return;
 }
 if(e.target.id!=='sf71PostForm')return;e.preventDefault();const id=state.activeId,text=$('sf71PostText').value.trim();if(text.length<3)return;
     const submit=e.target.querySelector('[type="submit"]');submit.disabled=true;
     try{
        const imageInput=String($('sf170PostImageUrl')?.value||'').trim();
         const imageUrl=imageInput?safeUrl(imageInput):'';
         if(imageInput&&!imageUrl)throw Error('A imagem precisa ter uma URL HTTPS pública válida.');
         const youtubeUrl=String($('sf252PostYoutubeUrl')?.value||'').trim();
         if(youtubeUrl&&!youtubeLinkId(youtubeUrl))throw Error('Informe um link HTTPS válido de um vídeo do YouTube.');
        const title=String($('sf600Title')?.value||'').trim();
         const tags=String($('sf600Tags')?.value||'').split(',').map(t=>t.trim()).filter(Boolean);
         const result=await post('/api/fan-clubs/'+encodeURIComponent(id)+'/posts',{text,title,tags,topic:$('sf170Topic')?.value||'conversa',imageUrl,youtubeUrl});
        $('sf71PostText').value='';if($('sf600Title'))$('sf600Title').value='';if($('sf600Tags'))$('sf600Tags').value='';
         if($('sf170PostImageUrl'))$('sf170PostImageUrl').value='';
         if($('sf252PostYoutubeUrl'))$('sf252PostYoutubeUrl').value='';
          $('sf71PostForm')?.classList.add('sf227-composer-collapsed');
        await loadPosts(id);
      }
     catch(err){status(err.message,true);}finally{submit.disabled=false;}
   });
   let forumSearchTimer=null;
   $('sf71ClubDetail')?.addEventListener('input',e=>{
     if(e.target.id==='sf160FeedSearch'){
       state.feedSearch=e.target.value.trim();
       clearTimeout(forumSearchTimer);
       forumSearchTimer=setTimeout(()=>searchForum(state.activeId),320);
     }
   });
   $('sf71ClubDetail')?.addEventListener('change',e=>{
     if(e.target.id==='sf160FeedFilter'){
       state.feedFilter=e.target.value;
       searchForum(state.activeId);
     }
     if(e.target.id==='sf170Topic')renderTopicPreview();
      if(e.target.id==='sf202DefaultRoom'){
        const slug=e.target.value,id=state.activeId;
        if(!id)return;
        post('/api/fan-clubs/'+encodeURIComponent(id)+'/default-room',{roomSlug:slug}).then(()=>{
          if(state.detail?.club)state.detail.club.defaultRoomSlug=slug;
          status('Sala padrão atualizada.');
        }).catch(err=>{status(err.message,true);renderCommunityAside();});
      }
   });
   window.sf71LoadFanClubs=()=>{showList();loadClubs();};
   window.sf71OpenFanClub=id=>{if(/^[a-f0-9-]{36}$/.test(String(id||'')))openDetail(id);};
   const handleForumRoute=async()=>{
     const match=decodeURIComponent(location.hash).match(/^#fanclub\/([a-f0-9-]{36})\/topic\/([A-Za-z0-9_-]{1,100})$/);
     if(match){
       window.sf110OpenCommunity?.('fanclubs');
       window.sf110ShowDetails?.('fanclubs');
       if(state.activeId!==match[1])await openDetail(match[1]);
       else if(state.focusPost?.id!==match[2])await openTopic(match[1],match[2],false);
     }else{
       const club=decodeURIComponent(location.hash).match(/^#fanclub\/([a-f0-9-]{36})$/);
       if(club){window.sf125Navigate?.('clubs');if(state.activeId!==club[1])await openDetail(club[1]);}
       else if(state.focusPost)closeTopic(false);
     }
   };
   window.addEventListener('popstate',handleForumRoute);
   window.addEventListener('hashchange',handleForumRoute);
   if(/^#fanclub\//.test(location.hash))setTimeout(handleForumRoute,300);
   window.sf71StopLive=stopLive;
   document.addEventListener('click',e=>{
     if(e.target.closest('.sf5-community-layer .sf5-close') || e.target.classList.contains('sf5-community-layer'))stopLive();
     const tab=e.target.closest('#sfSocialHub [data-sf-tab]');
     if(tab&&tab.dataset.sfTab!=='fanclubs')stopLive();
   },true);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
