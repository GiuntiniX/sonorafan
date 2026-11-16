(function SonoraFanStudio100(){
 'use strict';
 const $=id=>document.getElementById(id),q=s=>document.querySelector(s);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const trunc=(x,n=100)=>String(x??'').slice(0,n);
 const state={section:'mixtapes',room:null,profile:null,mixtapes:[],selected:null,matches:[],events:[],clubs:[],prefs:{match:false,alerts:false},
   loading:false,error:'',info:'',admin:false,quality:null,qualityAllowed:false,qualityDenied:false,lastAutoSync:0,lastAutoReport:0,
   seenAlerts:new Set(),alertsPrimed:false,activePanel:false};
 const safeId=x=>/^[a-f0-9-]{36}$/i.test(String(x));
 const ytId=x=>/^[a-zA-Z0-9_-]{11}$/.test(String(x));
 const roomActive=()=>!!$('screen-room')?.classList.contains('active');
 const roomSlug=()=>state.room?.slug||(typeof currentRoom!=='undefined'?currentRoom:'')||'';
 const currentTrack=()=>state.room?.queue?.[state.room.currentIndex??0]||null;
 const dev=()=>window.matchMedia('(max-width:690px)').matches?'mobile':window.matchMedia('(max-width:1100px)').matches?'tablet':'desktop';
 const date=when=>new Date(when).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
 const prefsKey='sf100-design-v1';
 let layout='ouvir',palette='aurora';
 try{let p=JSON.parse(localStorage.getItem(prefsKey)||'{}');layout=['ouvir','interagir'].includes(p.layout)?p.layout:'ouvir';palette=['aurora','festival'].includes(p.palette)?p.palette:'aurora';}catch(_){}
 const socketClient=()=>typeof socket!=='undefined'?socket:null;
 async function api(path,options){
   const r=await fetch(path,{credentials:'include',...(options||{})});
   const data=await r.json().catch(()=>null);
   if(!r.ok)throw Error(data?.error||'Serviço indisponível. Tente novamente.');
   return data;
 }
 const post=(path,data)=>api(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 const remove=(path)=>api(path,{method:'DELETE'});
 const htmlMsg=(title,detail)=>`<div class="sf100-empty"><strong>${esc(title)}</strong><p>${esc(detail)}</p></div>`;
 function notice(msg,bad=false){
   state.info=msg;const e=$('sf100Status');
   if(e){e.textContent=msg;e.classList.toggle('error',bad);}
   else if(typeof toast==='function')toast(msg,bad?'error':'success');
 }
 function applyLook(){
   for(const id of ['screen-room','screen-lobby']){
     const el=$(id);if(!el)continue;
     el.dataset.sf100Layout=layout;el.dataset.sf100Palette=palette;
   }
 }
 function render(host){
   host.innerHTML=`<div class="sf100-shell">
     <div class="sf100-intro"><span class="sf100-eyebrow">UM ESPAÇO PARA CRIAR, DESCOBRIR E CELEBRAR</span>
       <h3>Estúdio SonoraFan</h3><p>Novas experiências reunidas aqui, sem ocupar seu player, chat e fila.</p></div>
     <div class="sf100-nav" role="group" aria-label="Ferramentas do Estúdio">
       ${[['mixtapes','Mixtapes'],['match','Match'],['events','Sessões'],['alerts','Avisos'],['design','Visual'],['quality','Qualidade']]
       .filter(([id])=>id!=='quality'||state.qualityAllowed).map(([id,title])=>`<button type="button" class="${state.section===id?'active':''}" data-sf100-nav="${id}">${title}</button>`).join('')}
     </div>
     <div id="sf100Section" class="sf100-section"></div>
     <p id="sf100Status" class="sf100-status" role="status" aria-live="polite">${esc(state.info)}</p>
   </div>`;
   state.activePanel=true;
   renderSection();
 }
 function renderSection(){
   const e=$('sf100Section');if(!e)return;
   if(state.section==='mixtapes')return mixtapes(e);
   if(state.section==='match')return match(e);
   if(state.section==='events')return events(e);
   if(state.section==='alerts')return alerts(e);
   if(state.section==='quality')return quality(e);
   design(e);
 }
 async function refresh(){
   state.loading=true;state.error='';renderSection();
   try{
     if(state.section==='mixtapes') {state.mixtapes=(await api('/api/studio100/mixtapes')).items||[];}
     else if(state.section==='match'){
       state.prefs=await api('/api/studio100/preferences');
       state.matches=state.prefs.match&&roomSlug()?(await api('/api/studio100/match/'+encodeURIComponent(roomSlug()))).people||[]:[];
     }else if(state.section==='events')state.events=await api('/api/social/events');
     else if(state.section==='alerts')state.prefs=await api('/api/studio100/preferences');
     else if(state.section==='quality'){state.quality=await api('/api/admin/studio100/quality');state.qualityDenied=false;}
   }catch(err){state.error=err.message;if(state.section==='quality'&&/administrador|permissão/i.test(err.message))state.qualityDenied=true;}
   finally{state.loading=false;renderSection();}
 }
 function mixtapes(host){
   const current=roomActive()&&!state.room?.isPrivate,tracks=state.room?.queue||[];
   const saved=state.mixtapes||[];
   host.innerHTML=`<div class="sf100-section-top"><div><h4>Mixtapes colaborativas</h4>
     <p>Salve a seleção coletiva e compartilhe com a galera. Só quem participa da sala pode acrescentar faixas.</p></div>
     <button type="button" data-sf100-action="refresh">↻ Atualizar</button></div>
     ${current?`<form id="sf100CreateMix" class="sf100-form">
       <label>Nome da mixtape<input name="title" maxlength="65" minlength="3" required placeholder="Ex.: Indie depois da meia-noite"></label>
       <label>Descrição (opcional)<input name="description" maxlength="160" placeholder="Qual é a vibe?"></label>
       <button type="submit" ${!tracks.length?'disabled':''}>＋ Salvar fila atual (${tracks.length} músicas)</button>
     </form>`:htmlMsg('Entre em uma sala pública','Você pode criar uma mixtape com a fila de uma sala da qual participa.')}
     ${state.loading?htmlMsg('Carregando suas mixtapes','Consultando suas coleções.') :
       state.error?htmlMsg('Falha ao buscar mixtapes',state.error):
       saved.length?`<div class="sf100-mix-list">${saved.map(m=>`<article class="sf100-mix">
          <img src="https://img.youtube.com/vi/${encodeURIComponent(m.cover||'')}/mqdefault.jpg" loading="lazy" alt="">
          <div><strong>${esc(m.title)}</strong><small>${m.trackCount} faixas · ${m.shared?'Compartilhada':'Privada'}</small></div>
          <button type="button" data-sf100-action="mix-open" data-id="${esc(m.id)}">Abrir</button>
       </article>`).join('')}</div>`:htmlMsg('Suas mixtapes aparecem aqui','Salve uma fila musical e volte quando quiser.')}
     <div id="sf100MixDetail"></div>`;
   if(state.selected)renderMixDetail();
 }
 function renderMixDetail(){
   const e=$('sf100MixDetail'),m=state.selected;if(!e||!m)return;
   const hasRoom=roomActive()&&m.canEdit&&!state.room?.isPrivate;
   const roomTracks=state.room?.queue||[];
   e.innerHTML=`<section class="sf100-detail">
    <div class="sf100-section-top"><div><small>MIxTAPE · ${m.trackCount} FAIXAS</small><h4>${esc(m.title)}</h4><p>${esc(m.description||'Uma seleção colaborativa da comunidade.')}</p></div>
       <button type="button" data-sf100-action="mix-close">Fechar</button></div>
    <div class="sf100-actions">
      ${m.owner?`<button type="button" data-sf100-action="mix-share" data-id="${esc(m.id)}">${m.shared?'🔒 Deixar privada':'↗ Compartilhar por link'}</button>`:''}
      ${m.shared?`<button type="button" data-sf100-action="mix-copy" data-id="${esc(m.id)}">⧉ Copiar link</button>`:''}
      ${m.owner?`<button type="button" class="danger" data-sf100-action="mix-delete" data-id="${esc(m.id)}">Excluir</button>`:''}
      ${m.shared?`<button type="button" data-sf100-action="mix-club" data-id="${esc(m.id)}">♬ Enviar ao Fan Club</button>`:''}
    </div>
    ${hasRoom?`<div class="sf100-mix-add"><label for="sf100MixSong">Adicionar da fila desta sala</label>
      <select id="sf100MixSong"><option value="">Selecione uma faixa</option>
      ${roomTracks.filter(t=>ytId(t.id)&&!(m.tracks||[]).some(x=>x.id===t.id)).map(t=>`<option value="${esc(t.id)}">${esc(trunc(t.title,65))}</option>`).join('')}</select>
      <button type="button" data-sf100-action="mix-track">＋ Adicionar</button></div>`:''}
    <ol class="sf100-tracks">${(m.tracks||[]).map(t=>`<li><strong>${esc(t.title)}</strong><span>${esc(t.artist)} · ${esc(t.dj)}</span></li>`).join('')}</ol>
    <div id="sf100ClubChoice"></div>
   </section>`;
 }
 async function openMix(id){
   try{state.selected=await api('/api/studio100/mixtapes/'+encodeURIComponent(id));renderMixDetail();}
   catch(e){notice(e.message,true);}
 }
 function match(host){
   const enabled=state.prefs.match;
   host.innerHTML=`<div class="sf100-section-top"><div><h4>Match musical</h4>
     <p>Conheça pessoas com artistas e estilos em comum. Sua participação é voluntária; só outras pessoas que ativarem também aparecerão.</p></div>
     <button type="button" data-sf100-action="refresh">↻ Atualizar</button></div>
     <label class="sf100-toggle"><input id="sf100MatchOptin" type="checkbox" ${enabled?'checked':''}>Participar do Match musical</label>
     ${!enabled?htmlMsg('Sua privacidade primeiro','Ative o Match para comparar suas preferências com ouvintes da mesma sala pública.'):
     !roomSlug()?htmlMsg('Entre em uma sala','O Match mostra apenas participantes presentes na mesma sala pública.'):
     state.loading?htmlMsg('Procurando conexões','Calculando afinidades...'):
     state.error?htmlMsg('Serviço indisponível',state.error):
     state.matches.length?`<div class="sf100-people">${state.matches.map(p=>`<article class="sf100-person">
       <div><strong>${esc(p.name)}</strong><small>${p.sharedCount} afinidades · ${p.score}% de sobreposição da amostra</small>
       <span>${[...(p.sharedArtists||[]),...(p.sharedGenres||[])].slice(0,5).map(esc).join(' · ')||'Explorando música'}</span></div>
       <button type="button" data-sf100-action="follow" data-id="${esc(p.userId)}">Seguir</button>
     </article>`).join('')}</div>`:
       htmlMsg('Nenhum Match disponível','Pode ser que outras pessoas ainda não tenham ativado essa opção.')}
     <p class="sf100-fineprint">Compatibilidade experimental: sobreposição de gêneros declarados e artistas das últimas contribuições registradas. Não é um diagnóstico de personalidade.</p>`;
 }
 function events(host){
   const names={indie:'Noite Indie',rock2000:'Rock 2000',discoveries:'Descobertas',pop:'Pop Club',electronic:'Eletrônica'};
   const canCreate=roomActive()&&!state.room?.isPrivate&&!!state.room&&state.admin;
   host.innerHTML=`<div class="sf100-section-top"><div><h4>Sessões temáticas</h4><p>Encontros com tema, duração e contagem regressiva. Aproveita o sistema de eventos do SonoraFan.</p></div>
     <button type="button" data-sf100-action="refresh">↻ Atualizar</button></div>
    ${canCreate?`<details class="sf100-collapse"><summary>＋ Agendar uma sessão nesta sala (responsável)</summary>
     <form id="sf100SessionForm" class="sf100-form">
      <label>Título<input name="title" placeholder="Sexta de descobertas" required maxlength="70" minlength="3"></label>
      <label>Data e hora<input name="startAt" type="datetime-local" required></label>
      <div class="sf100-two"><label>Clima<select name="theme">${Object.entries(names).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label>
      <label>Duração<select name="durationMinutes"><option value="45">45 min</option><option value="60">1 hora</option><option value="90" selected>1h30</option><option value="120">2 horas</option><option value="180">3 horas</option></select></label></div>
      <label>Descrição<input name="description" maxlength="240" placeholder="Quais artistas combinam?"></label>
      <button type="submit">Criar sessão</button>
     </form></details>`:''}
    ${state.loading?htmlMsg('Buscando eventos','Consultando agenda.'):
     state.error?htmlMsg('Eventos indisponíveis',state.error):
     Array.isArray(state.events)&&state.events.length?`<div class="sf100-events">${state.events.slice(0,20).map(e=>`<article class="sf100-event">
      <div class="sf100-event-icon">♫</div><div><strong>${esc(e.title)}</strong>
      <small>${esc(e.roomName)} · ${date(e.startAt)} · ${esc(names[e.theme]||'Indie')} · ${e.durationMinutes||90} min</small>
      <span>${Math.max(0,e.attendees||0)} confirmados</span></div>
      <button type="button" data-sf100-action="rsvp" data-id="${esc(e.id)}" data-going="${e.going?'false':'true'}">${e.going?'✓ Confirmado':'Participar'}</button>
      </article>`).join('')}</div>`:htmlMsg('Nenhuma sessão agendada','Seja o primeiro a reunir a comunidade em um evento musical.')}
    `;
 }
 function alerts(host){
   const enabled=state.prefs.alerts;
   host.innerHTML=`<div class="sf100-section-top"><div><h4>Avisos que fazem sentido</h4>
     <p>Receba alertas de amigos em salas públicas, eventos confirmados e quando sua música estiver prestes a tocar.</p></div></div>
     <label class="sf100-toggle"><input id="sf100AlertsOptin" type="checkbox" ${enabled?'checked':''}>Ativar avisos inteligentes</label>
     <div class="sf100-actions"><button type="button" data-sf100-action="browser-alerts">Ativar avisos do navegador</button>
       <button type="button" data-sf100-action="check-alerts">↻ Conferir agora</button></div>
     ${enabled?htmlMsg('Você está no controle','Avisos são consultados apenas enquanto o SonoraFan está aberto. Não há alertas de salas privadas.'):
       htmlMsg('Notificações desativadas','Você poderá habilitar quando quiser, sem perder mensagens ou eventos.')}
     <p class="sf100-fineprint">Os alertas do navegador exigem permissão. Sem permissão, as informações permanecem disponíveis na plataforma.</p>`;
 }
 function design(host){
   host.innerHTML=`<div class="sf100-section-top"><div><h4>Seu SonoraFan, seu ritmo</h4>
     <p>Alterne a distribuição das colunas sem esconder fila, chat ou player. Escolha uma paleta sem criar novos botões na sala.</p></div></div>
     <div class="sf100-design-grid">
       <div><h5>Layout</h5><div class="sf100-choices">
         <button type="button" data-sf100-action="layout" data-value="ouvir" class="${layout==='ouvir'?'selected':''}">▶ Ouvir <small>Player em destaque</small></button>
         <button type="button" data-sf100-action="layout" data-value="interagir" class="${layout==='interagir'?'selected':''}">✉ Interagir <small>Chat e fila maiores</small></button>
       </div></div>
       <div><h5>Paleta</h5><div class="sf100-choices">
         <button type="button" data-sf100-action="palette" data-value="aurora" class="${palette==='aurora'?'selected':''}">✦ Aurora <small>Índigo · turquesa · coral</small></button>
         <button type="button" data-sf100-action="palette" data-value="festival" class="${palette==='festival'?'selected':''}">♫ Festival <small>Vinho · magenta · âmbar</small></button>
       </div></div>
     </div>
     <div class="sf100-actions"><button type="button" data-sf100-action="sync">⟳ Sincronizar agora</button>
       <button type="button" data-sf100-action="share-card">▣ Cartão da música atual</button></div>
     <p class="sf100-fineprint">No mobile, a navegação e a fila já existentes continuam prioritárias. O visual não muda a reprodução das músicas.</p>`;
 }
 function quality(host){
   const d=state.quality;
   host.innerHTML=`<div class="sf100-section-top"><div><h4>Central de qualidade</h4><p>Diagnóstico agregado: sem endereços de e-mail, dados pessoais ou identificação de dispositivos.</p></div>
     <button type="button" data-sf100-action="refresh">↻ Atualizar</button></div>
     ${state.loading?htmlMsg('Buscando indicadores','Acesso administrativo protegido.') :
       state.qualityDenied?htmlMsg('Acesso restrito','Somente administradores globais podem visualizar diagnósticos.'):
       state.error?htmlMsg('Indisponível',state.error):
       d?`<div class="sf100-metrics">
         <div><strong>${d.events||0}</strong><span>Eventos</span></div>
         <div><strong>${d.online||0}</strong><span>Conectados</span></div>
         <div><strong>${d.currentQueue||0}</strong><span>Faixas na fila</span></div>
         <div><strong>${d.totals?.['player-error']||0}</strong><span>Falhas player</span></div>
         <div><strong>${d.totals?.['sync-drift']||0}</strong><span>Sincronização</span></div>
         <div><strong>${d.totals?.['video-unavailable']||0}</strong><span>Indisponíveis</span></div>
         </div><h5>Atividade recente (sem PII)</h5><div class="sf100-log">
           ${(d.recent||[]).slice(0,20).map(e=>`<div><strong>${esc(e.event)}</strong><span>${esc(e.device)} · ${date(e.at)}</span></div>`).join('')||'<p>Sem eventos registrados.</p>'}
         </div>`:htmlMsg('Indicadores protegidos','Abra a central para consultar o ambiente.')}`;
 }
 async function requestSync(manual=false){
   const client=socketClient(), snapshot=window.sf100PlayerSnapshot?.();
   if(!client?.connected||!roomActive()||!snapshot?.player)return manual&&notice('Entre em uma sala e inicie o player.',true);
   try{
     await new Promise((resolve,reject)=>{
       const timeout=setTimeout(()=>reject(Error('Sem resposta da sala.')),5500);
       client.emit('sf100:sync',{},data=>{clearTimeout(timeout);
         if(!data?.ok)return reject(Error(data?.error||'Sincronização indisponível.'));
         const yt=snapshot.player,track=window.sf100PlayerSnapshot?.()?.currentTrackId;
         if(!data.videoId||track!==data.videoId)return resolve();
         const current=Number(yt.getCurrentTime?.()),expected=Number(data.position);
         if(!Number.isFinite(current)||!Number.isFinite(expected))return resolve();
         const delta=Math.abs(expected-current);
         if(delta>2.5){
           if(!manual&&(Number(yt.getPlayerState?.())!==1||document.hidden))return resolve();
           yt.seekTo(Math.max(0,expected),true);
           state.lastAutoSync=Date.now();
           telemetry('sync-drift');
           if(manual)notice('Vídeo sincronizado com a sala.');
         } else if(manual) notice('Seu vídeo já está sincronizado.');
         resolve();
       });
     });
   }catch(e){if(manual)notice(e.message,true);}
 }
 const telemetry=(event)=>{post('/api/studio100/telemetry',{event,device:dev(),roomSlug:roomSlug()}).catch(()=>{});};
 function playerError(e,id){
   const code=Number(e?.data);
   telemetry('player-error');
   if(![100,101,150].includes(code)||!ytId(id))return;
   socketClient()?.emit('sf100:playbackFailure',{id,code,device:dev()},data=>{
     if(data?.ok)notice('Vídeo indisponível: '+data.reports+' confirmação(ões) de '+data.needed+'.');
   });
 }
 function alertNotify(item){
   if(typeof Notification!=='undefined'&&Notification.permission==='granted'&&state.prefs.alerts){
     try{new Notification(item.title,{body:item.message,tag:'sf100-'+item.key,silent:true});}catch(_){}
   }
 }
 async function checkAlerts(force=false){
   if(!state.prefs.alerts||document.hidden)return;
   try{
     const updates=await api('/api/studio100/updates');
     const items=Array.isArray(updates?.items)?updates.items:[];
     const eventData=await api('/api/social/events');
     const now=Date.now();
     for(const e of (Array.isArray(eventData)?eventData:[])){
       const remaining=e.startAt-now;
       if(e.going&&remaining>0&&remaining<=30*60000)items.push({key:'event:'+e.id,
         title:'Sua sessão está chegando',message:e.title+' · '+date(e.startAt)});
     }
     const t=state.room?.queue||[],index=Number(state.room?.currentIndex)||0;
     const ownId=state.profile?.userId;
     const upcoming=t[index+1];
     if(ownId&&upcoming?.addedByUserId===ownId)
       items.push({key:'next:'+roomSlug()+':'+upcoming.id,title:'Sua música será a próxima',
         message:trunc(upcoming.title,75)});
     if(!state.alertsPrimed){
       items.forEach(i=>state.seenAlerts.add(i.key));state.alertsPrimed=true;
       if(force)notice(items.length+' aviso(s) disponíveis. Nenhum alerta antigo foi repetido.');
     } else for(const item of items){
       if(state.seenAlerts.has(item.key))continue;
       state.seenAlerts.add(item.key);alertNotify(item);
       if(force)notice(item.title+' — '+item.message);
     }
   }catch(e){if(force)notice(e.message,true);}
 }
 async function savePreferences(changed,value){
   const next={...state.prefs,[changed]:value};
   try{state.prefs=await post('/api/studio100/preferences',next);
     if(changed==='alerts'&&value)state.alertsPrimed=false;
     notice('Preferências atualizadas.');refresh();
   }catch(e){notice(e.message,true);}
 }
 async function browserPermission(){
   if(!('Notification'in window))return notice('Avisos do navegador não são compatíveis com este dispositivo.',true);
   try{const permission=await Notification.requestPermission();
     notice(permission==='granted'?'Avisos permitidos.':'Permissão não concedida.');
   }catch(e){notice('Falha ao solicitar permissão.',true);}
 }
 async function shareCard(){
   const track=currentTrack();
   if(!track)return notice('Aguarde uma música começar para criar o cartão.',true);
   const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;
   const c=canvas.getContext('2d');if(!c)return notice('Canvas indisponível.',true);
   const grad=c.createLinearGradient(0,0,1080,1920);
   grad.addColorStop(0,palette==='aurora'?'#092c42':'#48223d');
   grad.addColorStop(.5,'#151329');grad.addColorStop(1,palette==='aurora'?'#07111b':'#160b17');
   c.fillStyle=grad;c.fillRect(0,0,1080,1920);
   c.fillStyle='#ffbd91';c.fillRect(90,140,145,8);
   const write=(v,y,size,color)=>{
     c.font=`bold ${size}px sans-serif`;c.fillStyle=color;let t=String(v||'');
     while(c.measureText(t).width>900&&t.length>2)t=t.slice(0,-2)+'…';
     c.fillText(t,90,y);
   };
   write('SONORAFAN / LIVE',245,48,'#b1ece3');
   write('O SOM DO MOMENTO',530,35,'#ffe5da');
   write(track.title,660,71,'#fff');
   write(track.artist,755,43,'#ffc0c5');
   write('EM '+trunc(state.room?.name||'SONORAFAN',45),1380,50,'#fff');
   write('ENTRE NA SALA E ESCOLHA O PRÓXIMO SOM',1530,30,'#b9e3dc');
   write('sonorafan',1790,38,'#eeaed6');
   canvas.toBlob(blob=>{
     if(!blob)return notice('Não foi possível criar imagem.',true);
     const url=URL.createObjectURL(blob),a=document.createElement('a');
     a.href=url;a.download='sonorafan-agora-tocando.png';document.body.append(a);a.click();a.remove();
     setTimeout(()=>URL.revokeObjectURL(url),1000);
     notice('Cartão preparado para compartilhar nos Stories ou WhatsApp.');
   },'image/png');
 }
 async function openClubPicker(){
   const e=$('sf100ClubChoice');if(!e)return;
   try{
     const d=await api('/api/fan-clubs?mine=true'),clubs=(d.clubs||[]).filter(c=>c.joined||c.owner);
     if(!clubs.length){e.innerHTML=htmlMsg('Sem Fan Clubs','Participe de um Fan Club para compartilhar sua mixtape.');return;}
     e.innerHTML=`<div class="sf100-mix-add"><label>Publicar mixtape no mural</label>
       <select id="sf100ClubSelect">${clubs.map(c=>`<option value="${esc(c.id)}">${esc(c.title)}</option>`).join('')}</select>
       <button type="button" data-sf100-action="club-post">Publicar</button></div>`;
   }catch(ex){notice(ex.message,true);}
 }
 async function action(button){
   const act=button.dataset.sf100Action,id=button.dataset.id;
   try {
     if(act==='refresh')return refresh();
     if(act==='mix-open')return openMix(id);
     if(act==='mix-close'){state.selected=null;return renderSection();}
     if(act==='mix-share'){const next=!state.selected?.shared;
       await post('/api/studio100/mixtapes/'+encodeURIComponent(id)+'/share',{shared:next});
       await openMix(id);return notice(next?'Link de compartilhamento ativado.':'Mixtape privada novamente.');
     }
     if(act==='mix-copy'){
       if(!state.selected?.shared)return notice('Compartilhe a mixtape antes de copiar.',true);
       const url=new URL(window.location.href);url.searchParams.set('mix',id);url.hash='';
       await navigator.clipboard.writeText(url.toString());return notice('Link copiado.');
     }
     if(act==='mix-delete'){
       if(!window.confirm('Excluir permanentemente esta mixtape?'))return;
       await remove('/api/studio100/mixtapes/'+encodeURIComponent(id));
       state.selected=null;return refresh();
     }
     if(act==='mix-track'){
       const songId=$('sf100MixSong')?.value;
       if(!ytId(songId)||!state.selected)return;
       await post('/api/studio100/mixtapes/'+state.selected.id+'/track',{id:songId});
       return openMix(state.selected.id);
     }
     if(act==='mix-club')return openClubPicker();
     if(act==='club-post'){
       if(!state.selected?.shared)return notice('Primeiro compartilhe a mixtape.',true);
       const club=$('sf100ClubSelect')?.value;
       if(!safeId(club))return;
       const url=new URL(window.location.href);url.searchParams.set('mix',state.selected.id);url.hash='';
       await post('/api/fan-clubs/'+club+'/posts',{text:'🎵 Nova mixtape colaborativa: '+state.selected.title+' · '+url.toString()});
       return notice('Mixtape publicada no mural do Fan Club.');
     }
     if(act==='follow'){await post('/api/social/follow',{id,follow:true});return notice('Você está seguindo esse ouvinte.');}
     if(act==='rsvp'){await post('/api/social/events/'+encodeURIComponent(id)+'/rsvp',{going:button.dataset.going==='true'});return refresh();}
     if(act==='browser-alerts')return browserPermission();
     if(act==='check-alerts')return checkAlerts(true);
     if(act==='sync')return requestSync(true);
     if(act==='share-card')return shareCard();
     if(act==='layout'||act==='palette'){
       if(act==='layout')layout=button.dataset.value==='interagir'?'interagir':'ouvir';
       if(act==='palette')palette=button.dataset.value==='festival'?'festival':'aurora';
       try{localStorage.setItem(prefsKey,JSON.stringify({layout,palette}));}catch(_){}
       applyLook();renderSection();return notice('Visual atualizado!');
     }
   }catch(e){notice(e.message,true);}
 }
 function eventsBinding(){
   document.addEventListener('click',e=>{
     const nav=e.target.closest('[data-sf100-nav]');
     if(nav?.closest('#sf95Overlay')){state.section=nav.dataset.sf100Nav;state.info='';renderSection();
       if(!['design'].includes(state.section))refresh();return;}
     const actionEl=e.target.closest('[data-sf100-action]');
     if(actionEl?.closest('#sf95Overlay')){action(actionEl);return;}
   });
   document.addEventListener('change',e=>{
     if(e.target?.id==='sf100MatchOptin')savePreferences('match',e.target.checked);
     if(e.target?.id==='sf100AlertsOptin')savePreferences('alerts',e.target.checked);
   });
   document.addEventListener('submit',async e=>{
     if(e.target?.id==='sf100CreateMix'){
       e.preventDefault();const form=e.target;
       try{await post('/api/studio100/mixtapes',{
         roomSlug:roomSlug(),title:form.elements.title.value,description:form.elements.description.value});
         notice('Mixtape criada!');refresh();
       }catch(ex){notice(ex.message,true);}
     }
     if(e.target?.id==='sf100SessionForm'){
       e.preventDefault();const form=e.target;
       const start=form.elements.startAt.value;
       try{await post('/api/social/events',{roomSlug:roomSlug(),
         title:form.elements.title.value,description:form.elements.description.value,
         startAt:new Date(start).toISOString(),theme:form.elements.theme.value,
         durationMinutes:Number(form.elements.durationMinutes.value)});
         notice('Sessão agendada!');refresh();
       }catch(ex){notice(ex.message,true);}
     }
   });
 }
 function init(){
   applyLook();eventsBinding();
   window.sf100RenderStudio=(host)=>{render(host);refresh();};
   window.sf100HandlePlayerError=playerError;
   window.sf100OnPlayback=(reason)=>{
     if(reason==='playing'&&Date.now()-state.lastAutoSync>12000)requestSync(false);
   };
   socketClient()?.on('roomState',data=>{state.room=data;});
   socketClient()?.on('isAdmin',isAdmin=>{state.admin=!!isAdmin;});
   api('/api/admin/studio100/quality').then(d=>{state.qualityAllowed=true;state.quality=d;}).catch(()=>{});
   api('/api/studio100/preferences').then(p=>{state.prefs=p;}).catch(()=>{});
   api('/api/experience95/profile').then(p=>{state.profile=p;}).catch(()=>{});
   const mix=new URLSearchParams(window.location.search).get('mix');
   if(safeId(mix)){
     setTimeout(()=>{window.sf95OpenHub?.('studio');state.section='mixtapes';refresh().then(()=>openMix(mix));},0);
   }
   window.addEventListener('visibilitychange',()=>{if(!document.hidden)requestSync(false);});
   setInterval(()=>{if(!document.hidden&&roomActive()&&Date.now()-state.lastAutoSync>30000)requestSync(false);},30000);
   setInterval(()=>{if(!document.hidden&&state.prefs.alerts)checkAlerts();},90000);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();