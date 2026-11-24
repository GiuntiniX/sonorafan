/* SonoraFan 12 — Admin Control Center. Nenhuma permissão é decidida pelo cliente: o backend valida todas as rotas. */
(() => {
  'use strict';
  const panel = document.getElementById('adminPanel');
  if (!panel) return;
  const $ = id => document.getElementById(id);
  const state = { users: [], rooms: [], logs: [], sanctions: [], stats: null, view: 'overview', loading: false, requestSeq: 0, pendingLoads: 0 };
  const titles = {
    overview: ['Visão geral','Acompanhe a operação da comunidade em tempo real.'],
    users: ['Usuários','Gerencie contas, permissões e acessos.'],
    rooms: ['Salas','Supervisione as comunidades e a reprodução.'],
    queues: ['Filas musicais','Acompanhe as músicas da comunidade.'],
    moderation: ['Moderação','Consulte sanções e mantenha a comunidade segura.'],
    language: ['Filtro de linguagem','Gerencie o dicionário de palavrões e acompanhe ocorrências censuradas.'],
    reports: ['Denúncias','Analise e resolva denúncias do chat com registro de auditoria.'],
    music: ['Música & Insights','Indicadores musicais realmente registrados no servidor.'],
    system: ['Saúde da plataforma','Diagnóstico instantâneo de serviços e conexões.'],
    insights: ['Alertas operacionais','Regras transparentes sobre os contadores disponíveis.'],
    interactions: ['Interações e campanhas','Crie enquetes globais ou segmentadas, batalhas musicais e comunicados.'],
    musicintel: ['Music Intelligence','Reproduções por gênero, artistas e preferências de usuários.'],
    engagement: ['Engajamento','Acompanhe atividade, retorno às salas e participação nas seções.'],
    audit: ['Auditoria','Acompanhe as ações administrativas registradas.'],
    settings: ['Operação','Comunicação e manutenção da plataforma.']
  };
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dt = x => x ? new Date(x).toLocaleString('pt-BR') : '—';
  const el = (text,empty='Sem registros.') => text || `<div class="sf12-empty">${empty}</div>`;
  const notice = msg => { $('sf12AdminNotice').textContent = msg || ''; };
  const json = async (path, opts) => {
    const response = await fetch(path,{ credentials:'include', cache:'no-store', ...opts });
    let data = null;
    try { data = await response.json(); } catch {}
    if (!response.ok) throw new Error(data?.error || `Falha na operação (${response.status})`);
    return data;
  };
  const post = (url, data={}) => json(url,{ method:'POST', headers:{'Content-Type':'application/json'},body:JSON.stringify(data) });
  // Server authorization is authoritative. Dashboard requests only succeed with a valid administrator session.
  function view(name) {
    if (!titles[name]) return;
    state.view = name;
    panel.querySelectorAll('[data-sf12-nav]').forEach(btn => btn.classList.toggle('active', btn.dataset.sf12Nav === name));
    panel.querySelectorAll('[data-sf12-view]').forEach(section => section.classList.toggle('active', section.dataset.sf12View === name));
    $('sf12AdminTitle').textContent = titles[name][0];
    $('sf12AdminSubtitle').textContent = titles[name][1];
    notice('');
    load(name);
  }
  const metric = (icon,value,label) => `<article class="sf12-metric"><div class="sf12-metric-icon">${icon}</div><div><strong>${Number(value || 0).toLocaleString('pt-BR')}</strong><small>${label}</small></div></article>`;
  function renderOverview() {
    const s = state.stats || {};
    $('sf12Metrics').innerHTML = metric('♙',s.totalUsers,'Usuários cadastrados') + metric('◉',s.totalRooms,'Salas existentes') + metric('●',s.onlineListeners,'Ouvintes nas salas') + metric('♫',s.queuedSongs,'Músicas nas filas') + metric('◎',s.occupiedRooms,'Salas com ouvintes') + metric('◈',s.privateRooms,'Salas privadas') + metric('⊘',s.lockedChats,'Chats travados') + metric('⬡',s.activeSanctions,'Sanções ativas') + metric('⌕',s.musicOps?.searchRequests,'Buscas de músicas') + metric('✓',s.musicOps?.queueAccepted,'Adições confirmadas') + metric('!',s.musicOps?.queueRejected,'Adições recusadas') + metric('⚠',s.musicOps?.searchFailures,'Falhas de busca');
    const rooms = [...state.rooms].sort((a,b)=>(b.listeners||0)-(a.listeners||0)).slice(0,6);
    $('sf12LiveRooms').innerHTML = el(rooms.map(r => `<div class="sf12-row"><div><strong>${esc(r.emoji||'♫')} ${esc(r.name)}</strong><small>${r.isPrivate?'🔒 Privada · ':''}${esc(r.now||'Nenhuma música tocando')}</small></div><span class="sf12-pill ${r.listeners?'live':''}">${Number(r.listeners||0)} ouvintes</span></div>`).join(''),'Nenhuma sala disponível.');
    $('sf12RecentAudit').innerHTML = el(state.logs.slice(0,6).map(l=>`<div class="sf12-row"><div><strong>${esc(l.action)}</strong><small>${esc(l.detail||'Sem detalhes')} · ${dt(l.t)}</small></div></div>`).join(''),'Nenhuma ação recente nesta instância.');
    $('sf12CheckedAt').textContent = s.checkedAt ? 'Atualizado em '+dt(s.checkedAt) : 'Aguardando atualização';
    window.sf13Overview?.(s,state.rooms,state.logs);
  }
  function renderUsers() {
    const term = ($('sf12UserSearch').value||'').toLowerCase().trim();
    const status = $('sf12UserStatus').value;
    const users = state.users.filter(u => (`${u.nome||''} ${u.email||''}`).toLowerCase().includes(term) && (status==='all'||(status==='active'&&!u.banned)||(status==='banned'&&u.banned)||(status==='mod'&&u.isMod)));
    $('sf12UsersTable').innerHTML = el(users.map(u => `<article class="sf12-record"><div class="sf12-record-main"><strong>${esc(u.avatar||'👤')} ${esc(u.nome||'Sem nome')} ${u.isAdmin?'👑':''}</strong><small>${esc(u.email)} · ${u.banned?'⛔ Banido':u.isMod?'◆ Moderador':'Usuário ativo'}</small></div><div class="sf12-record-actions">${u.isAdmin?'<span class="sf12-pill">Conta protegida</span>':`<button data-sf12-user="mod" data-email="${esc(u.email)}">${u.isMod?'Retirar mod':'Tornar mod'}</button><button data-sf12-user="${u.banned?'unban':'ban'}" data-email="${esc(u.email)}" class="${u.banned?'':'warn'}">${u.banned?'Desbanir':'Banir'}</button><button data-sf12-user="delete" data-email="${esc(u.email)}" class="warn">Excluir</button>`}</div></article>`).join(''),'Nenhum usuário corresponde aos filtros.');
  }
  function renderRooms() {
    const term = ($('sf12RoomSearch').value||'').toLowerCase().trim(), filter=$('sf12RoomStatus').value;
    const rooms=state.rooms.filter(r=>(`${r.name||''} ${r.slug||''} ${r.owner||''} ${r.ownerEmail||''}`).toLowerCase().includes(term) && (filter==='all'||(filter==='occupied'&&r.listeners>0)||(filter==='private'&&r.isPrivate)||(filter==='locked'&&r.chatLocked)));
    $('sf12RoomsTable').innerHTML = el(rooms.map(r=>`<article class="sf12-record"><div class="sf12-record-main"><strong>${esc(r.emoji||'♫')} ${esc(r.name)} ${r.system?'· Sistema':''}</strong><small>${esc(r.slug)} · ${Number(r.listeners||0)} ouvintes · ${Number(r.queueLength||0)} faixas · ${r.isPrivate?'Privada':'Pública'} · ${esc(r.owner||'Sem responsável')}</small><small>${esc(r.now||'Nenhuma música tocando')}</small></div><div class="sf12-record-actions"><button data-sf12-room="${r.chatLocked?'unlock':'lock'}" data-slug="${esc(r.slug)}">${r.chatLocked?'Liberar chat':'Travar chat'}</button><button data-sf12-room="skip" data-slug="${esc(r.slug)}">Pular</button><button data-sf12-room="message" data-slug="${esc(r.slug)}">Aviso</button><button data-sf12-room="clear-queue" data-slug="${esc(r.slug)}" class="warn">Limpar fila</button>${r.system?'':`<button data-sf12-room="delete" data-slug="${esc(r.slug)}" class="warn">Encerrar</button>`}</div></article>`).join(''),'Nenhuma sala corresponde aos filtros.');
  }
  function renderQueues() {
    $('sf12QueuesList').innerHTML=el([...state.rooms].sort((a,b)=>b.queueLength-a.queueLength).map(r=>`<div class="sf12-row"><div><strong>${esc(r.name)}</strong><small>${esc(r.now||'Nenhuma música em reprodução')} · ${Number(r.queueLength||0)} música(s) na fila</small></div><div class="sf12-record-actions"><button data-sf12-queue="${esc(r.slug)}" type="button">Ver faixas</button><button data-sf12-room="clear-queue" data-slug="${esc(r.slug)}" type="button" class="warn">Limpar fila</button></div></div>`).join(''),'Nenhuma sala disponível.');
  }
  function renderModeration() {
    $('sf12ModerationList').innerHTML=el(state.sanctions.map(s=>`<div class="sf12-record"><div class="sf12-record-main"><strong>${s.type==='mute'?'🔇':'⛔'} ${esc(s.name||s.email||'Usuário')}</strong><small>${esc(s.scope||'')} · ${s.until?'Expira: '+dt(s.until):'Sem prazo'} · ${esc(s.reason||'Sem motivo informado')}</small></div><div class="sf12-record-actions"><button type="button" data-sf12-sanction="${esc(s.id)}" class="warn">Revogar</button></div></div>`).join(''),'Nenhuma sanção ativa.');
  }
  function renderAudit() {
    $('sf12AuditList').innerHTML=el(state.logs.map(l=>`<div class="sf12-row"><div><strong>${esc(l.action)}</strong><small>${dt(l.t)} · ${esc(l.who||'Admin')}</small><small>${esc(l.detail||'Sem detalhes')}</small></div></div>`).join(''),'Nenhuma ação registrada nesta instância.');
  }
  const loaders={
    overview:async()=>{ const [stats,rooms,logs]=await Promise.all([json('/api/admin/stats'),json('/api/admin/rooms'),json('/api/admin/log')]);state.stats=stats;state.rooms=rooms;state.logs=logs;renderOverview(); },
    users:async()=>{state.users=await json('/api/admin/users');renderUsers();},
    rooms:async()=>{state.rooms=await json('/api/admin/rooms');renderRooms();},
    queues:async()=>{state.rooms=await json('/api/admin/rooms');renderQueues();},
    moderation:async()=>{state.sanctions=await json('/api/admin/sanctions');renderModeration();},
    language:async()=>window.sf304Language?.load(),
    reports:async()=>window.sf13Load?.('reports'),
    music:async()=>window.sf13Load?.('music'),
    system:async()=>window.sf13Load?.('system'),
    insights:async()=>window.sf13Load?.('insights'),
    interactions:async()=>window.sf303Admin?.loadCampaigns(),
    musicintel:async()=>window.sf303Admin?.loadInsights(),
    engagement:async()=>window.sf303Admin?.loadInsights(),
    audit:async()=>{state.logs=await json('/api/admin/log');renderAudit();},
    settings:async()=>window.sf303Admin?.loadOperations()
  };
  async function load(name=state.view) {
    if (!panel.classList.contains('active') || !loaders[name]) return;
    // Uma requisição lenta de outra aba não deve bloquear a aba selecionada.
    const request=++state.requestSeq;
    state.pendingLoads++;
    state.loading=true;
    try {
      await loaders[name]();
      if (request===state.requestSeq && state.view===name) notice('');
    } catch (err) {
      if (request===state.requestSeq && state.view===name)
        notice('Não foi possível carregar os dados: '+err.message);
    } finally {
      state.pendingLoads=Math.max(0,state.pendingLoads-1);
      state.loading=state.pendingLoads>0;
    }
  }
  async function mutate(task,confirmText) {
    if (confirmText && !confirm(confirmText)) return;
    try { await task(); await load(state.view); if(typeof toast==='function')toast('Operação concluída','success'); }
    catch(err){notice(err.message);}
  }
  panel.addEventListener('click',async e=>{
    const nav=e.target.closest('[data-sf12-nav], [data-sf12-goto]'); if(nav){view(nav.dataset.sf12Nav||nav.dataset.sf12Goto);return;}
    const user=e.target.closest('[data-sf12-user]');
    if(user){const email=user.dataset.email,act=user.dataset.sf12User, item=state.users.find(u=>u.email===email);if(!item||item.isAdmin)return;
      const paths={ban:'ban-user',unban:'unban-user',delete:'delete-user',mod:'set-mod'};
      const body=act==='mod'?{email,mod:!item.isMod}:{email};
      mutate(()=>post('/api/admin/'+paths[act],body), `${act==='delete'?'Excluir definitivamente':act==='ban'?'Banir':act==='unban'?'Desbanir':'Alterar permissão de'} ${email}?`);return;
    }
    const room=e.target.closest('[data-sf12-room]');
    if(room){const slug=room.dataset.slug,act=room.dataset.sf12Room;const safe=state.rooms.find(r=>r.slug===slug);if(!safe)return;
      if(act==='delete'){if(safe.system)return;mutate(()=>post('/api/admin/delete-room',{slug}),`Encerrar a sala ${safe.name}? A ação desconectará os ouvintes.`);return;}
      let text; if(act==='message'){text=prompt(`Aviso para a sala ${safe.name}:`);if(!text?.trim())return;}
      const destructive=act==='clear-queue'||act==='skip';
      mutate(()=>post('/api/admin/room-action',{slug,action:act,text}),destructive?`${act==='skip'?'Pular a música':'Limpar toda a fila'} da sala ${safe.name}?`:null);return;
    }
    const queue=e.target.closest('[data-sf12-queue]');
    if(queue){const slug=queue.dataset.sf12Queue;const previous=queue.closest('.sf12-row').nextElementSibling;
      if(previous?.classList.contains('sf12-queue-detail')){previous.remove();queue.textContent='Ver faixas';return;}
      json('/api/admin/room/'+encodeURIComponent(slug)+'/queue').then(data=>{
        const div=document.createElement('div');div.className='sf12-queue-detail';
        div.innerHTML=el((data.queue||[]).map(song=>`<div class="sf12-row"><div><strong>${song.index===data.currentIndex?'▶ ':''}${esc(song.title)}</strong><small>${esc(song.artist)}</small></div><button class="sf12-pill" data-sf12-remove-song="${song.index}" data-slug="${esc(slug)}" type="button">Remover</button></div>`).join(''),'Fila vazia.');
        queue.closest('.sf12-row').after(div);queue.textContent='Ocultar faixas';
      }).catch(err=>notice(err.message));return;
    }
    const song=e.target.closest('[data-sf12-remove-song]');
    if(song){const roomSlug=song.dataset.slug,index=Number(song.dataset.sf12RemoveSong);
      mutate(()=>post('/api/admin/remove-song',{roomSlug,index}),'Remover esta faixa da fila?');return;
    }
    const sanction=e.target.closest('[data-sf12-sanction]');
    if(sanction){const id=sanction.dataset.sf12Sanction;mutate(()=>post('/api/admin/sanction-remove',{id}),'Revogar esta sanção?');return;}
    const action=e.target.closest('[data-sf12-action]');
    if(action){const type=action.dataset.sf12Action;
      if(type==='export'){ if(typeof adminExport==='function')adminExport();return; }
      if(type==='reset-gamification'){
        const phrase='ZERAR GAMIFICACAO';
        const typed=prompt('Esta ação irá zerar XP, níveis, medalhas, missões e rankings atuais de TODOS os usuários. Não há desfazer. Digite exatamente '+phrase+' para confirmar:');
        if(typed!==phrase){if(typed!==null)notice('Confirmação incorreta. Nenhum progresso foi alterado.');return;}
        if(!confirm('Confirmar o reset global de gamificação para ZERO? Esta operação não pode ser desfeita.'))return;
        action.disabled=true;
        notice('Zerando gamificação. Não feche este painel até receber a resposta.');
        try{
          const result=await post('/api/admin/gamification/reset',{confirmation:phrase});
          notice('Gamificação zerada para '+Number(result.players||0).toLocaleString('pt-BR')+' usuários. Ranking atual atualizado.');
          if(typeof toast==='function')toast('Gamificação reiniciada','success');
        }catch(err){notice('Erro no reset: '+err.message);}
        finally{action.disabled=false;}
        return;
      }
      if(type==='broadcast'){const msg=prompt('Comunicado para todos:');if(!msg?.trim())return;if(!confirm('Enviar comunicado a todas as salas?'))return;if(typeof socket!=='undefined')socket.emit('adminBroadcast',{message:msg.trim().slice(0,300)});return;}
      const phrase=type==='clear-chats'?'LIMPAR CHATS':'ENCERRAR SALAS';
      const typed=prompt(`Operação irreversível. Digite exatamente ${phrase} para confirmar:`);
      if(typed!==phrase){notice('Operação cancelada: confirmação incorreta.');return;}
      const route=type==='clear-chats'?'clear-all-chats':'clear-all-rooms';
      mutate(()=>post('/api/admin/'+route,{confirmation:phrase}),`Confirma a execução de ${phrase}?`);return;
    }
  });
  ['sf12UserSearch','sf12UserStatus'].forEach(id=>$(id)?.addEventListener('input',renderUsers));
  ['sf12RoomSearch','sf12RoomStatus'].forEach(id=>$(id)?.addEventListener('input',renderRooms));
  $('sf12Refresh')?.addEventListener('click',()=>load());
  $('sf12RefreshUsers')?.addEventListener('click',()=>load('users'));
  $('sf12RefreshRooms')?.addEventListener('click',()=>load('rooms'));
  $('sf12RefreshAudit')?.addEventListener('click',()=>load('audit'));
  const observer=new MutationObserver(()=>{if(panel.classList.contains('active'))view('overview');});
  observer.observe(panel,{attributes:true,attributeFilter:['class']});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.classList.contains('active')){if(typeof closeAdmin==='function')closeAdmin();}});
  // Refresh while open only; browser tab hidden does not poll.
  setInterval(()=>{if(panel.classList.contains('active')&&!document.hidden&&['overview','system','music','insights'].includes(state.view))load(state.view);},30000);
})();
