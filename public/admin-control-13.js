/* SonoraFan Admin 13.0 — módulos ligados a endpoints existentes.
 * Sem KPIs fictícios, sem simular ações administrativas e sem alterar permissões. */
(() => {
 'use strict';
 const panel=document.getElementById('adminPanel');if(!panel)return;
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number=v=>Number(v||0).toLocaleString('pt-BR');
 const fmt=t=>t?new Date(t).toLocaleString('pt-BR'):'—';
 const errMsg=e=>String(e?.message||'Falha desconhecida');
 const state={samples:[],reports:[],filter:'open',period:60,loadedAt:0,loading:false,overview:null};
 const fetchJSON=async(url,opts)=>{
  const response=await fetch(url,{credentials:'include',cache:'no-store',...opts});
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw Error(data?.error||'Erro HTTP '+response.status);
  return data;
 };
 const note=(id,message)=>{const el=$(id);if(el)el.textContent=message};
 function setData(id,content){const el=$(id);if(el)el.innerHTML=content}
 function row(title,detail,status,kind=''){
  return '<div class="sf13-op-line"><div><strong>'+esc(title)+'</strong><small>'+esc(detail)+'</small></div><span class="sf13-status '+kind+'">'+esc(status)+'</span></div>';
 }
 function seriesSVG(samples,key){
  if(!samples.length)return '';
  const values=samples.map(s=>Math.max(0,Number(s[key]||0)));
  const max=Math.max(...values,1), w=800,h=164;
  const coords=values.map((v,i)=>[(i/(Math.max(1,values.length-1)))*(w-16)+8,h-16-(v/max)*(h-30)]);
  const points=coords.map(p=>p.join(',')).join(' ');
  const d='M'+coords.map(p=>p.join(' ')).join(' L');
  const area=d+' L '+(coords[coords.length-1][0])+' '+(h-16)+' L '+coords[0][0]+' '+(h-16)+' Z';
  const lines=[.25,.5,.75].map(x=>'<line class="sf13-gridline" x1="8" y1="'+(h*x)+'" x2="792" y2="'+(h*x)+'"/>').join('');
  return '<svg class="sf13-spark" viewBox="0 0 800 164" role="img" aria-label="Amostras de ouvintes online coletadas durante esta sessão">'+
    '<defs><linearGradient id="sf13Gradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#e57cff" stop-opacity=".48"/><stop offset="100%" stop-color="#e57cff" stop-opacity=".01"/></linearGradient></defs>'+lines+
    '<path d="'+area+'" fill="url(#sf13Gradient)"/><polyline points="'+points+'" fill="none" stroke="#d575fc" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'+
    coords.map(p=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3.5" fill="#ffbbdc"/>').join('')+'</svg>';
 }
 function drawChart(){
  const list=state.samples.filter(x=>x.t>=Date.now()-state.period*60000);
  const chart=$('sf13OverviewChart');
  if(chart){
   chart.innerHTML=list.length<2?
    '<div class="sf13-skeleton-empty">Coletando amostras reais. O gráfico aparece após a próxima atualização (30 s).</div>':
    seriesSVG(list,'listeners')+'<div class="sf13-chart-labels"><span>'+fmt(list[0].t)+'</span><span>Último registro: '+number(list[list.length-1].listeners)+' ouvintes</span><span>'+fmt(list[list.length-1].t)+'</span></div>';
  }
  const count=$('sf13SampleCount');if(count)count.textContent=list.length+' amostras nesta sessão';
 }
 function overview(stats,rooms,logs){
  if(!panel.classList.contains('active'))return;
  state.overview={stats,rooms,logs};
  const t=Date.now();
  if(!state.samples.length||t-state.samples[state.samples.length-1].t>20000){
   state.samples.push({t,listeners:Number(stats.onlineListeners||0),rooms:Number(stats.occupiedRooms||0)});
   state.samples=state.samples.filter(s=>s.t>=t-2*60*60*1000).slice(-240);
  }
  drawChart();
  setData('sf13Operations',[
   row('Conexões no servidor',number(stats.onlineUsers)+' sockets atualmente conectados','Contabilizado'),
   row('Salas ocupadas',number(stats.occupiedRooms)+' de '+number(stats.totalRooms)+' salas','Ao vivo'),
   row('Buscas de música',number(stats.musicOps?.searchRequests)+' na janela de contadores do servidor','Monitorado'),
   row('Falhas de busca',number(stats.musicOps?.searchFailures)+' nos contadores do servidor',Number(stats.musicOps?.searchFailures)?'Atenção':'Sem falhas',Number(stats.musicOps?.searchFailures)?'warn':'')
  ].join(''));
  // Um número de denúncias não faz parte de /stats; consulte a origem real.
  fetchJSON('/api/admin/chat-reports').then(reports=>{
   const pending=Array.isArray(reports)?reports.filter(r=>(r.status||'open')==='open').length:0;
   const target=$('sf13PendingReports');
   if(target)target.textContent=number(pending);
   const caption=$('sf13PendingLabel');
   if(caption)caption.textContent='Denúncias abertas entre os últimos 100 registros';
  }).catch(()=>{
   const target=$('sf13PendingReports');if(target)target.textContent='—';
   const caption=$('sf13PendingLabel');if(caption)caption.textContent='Consulta indisponível';
  });
  const top=(rooms||[]).slice().sort((a,b)=>Number(b.listeners||0)-Number(a.listeners||0)).slice(0,5);
  setData('sf13TopRooms',top.map((r,i)=>'<div class="sf12-row"><div><strong>'+(i+1)+'. '+esc(r.name)+'</strong><small>'+esc(r.now||'Sem música atual')+'</small></div><span class="sf12-pill live">'+number(r.listeners)+' ouvintes</span></div>').join('')||'<div class="sf12-empty">Nenhuma sala encontrada</div>');
  const delta=$('sf13CurrentUsers');if(delta)delta.textContent=number(stats.onlineUsers);
  const online=$('sf13CurrentRooms');if(online)online.textContent=number(stats.occupiedRooms);
 }
 async function loadReports(){
  note('sf13ReportsNotice','Carregando denúncias...');
  const reports=await fetchJSON('/api/admin/chat-reports');
  state.reports=Array.isArray(reports)?reports:[];
  drawReports();
  note('sf13ReportsNotice','');
 }
 function drawReports(){
  const list=state.reports.filter(x=>(state.filter==='all'||(x.status||'open')===state.filter));
  setData('sf13ReportStats',
   '<div class="sf13-summary-tile"><span>Total de denúncias</span><strong>'+number(state.reports.length)+'</strong><span>Últimas 100 disponíveis</span></div>'+
   '<div class="sf13-summary-tile"><span>Pendentes</span><strong>'+number(state.reports.filter(x=>(x.status||'open')==='open').length)+'</strong><span>Aguardando análise</span></div>'+
   '<div class="sf13-summary-tile"><span>Resolvidas</span><strong>'+number(state.reports.filter(x=>x.status==='resolved').length)+'</strong><span>Dentro do resultado consultado</span></div>'
  );
  setData('sf13ReportItems',list.map(x=>{
   const id=String(x.id||'');
   const status=x.status||'open';
   const type=x.type||x.scope||'Mensagem';
   const description=x.reason||x.description||x.message||x.content||'Detalhes disponíveis no registro original';
   const created=x.createdAt||x.t;
   const user=x.reporterName||x.reporter||x.userName||'Identificação restrita';
   const canResolve=/^[a-f0-9-]{36}$/i.test(id);
   return '<article class="sf13-item"><h4>'+esc(type)+' · '+esc(status==='resolved'?'Resolvida':'Pendente')+'</h4>'+
    '<p>'+esc(description)+'</p><div class="sf13-inline-meta"><span>Registro: '+esc(id)+'</span><span>'+esc(user)+'</span><span>'+esc(fmt(created))+'</span></div>'+
    (canResolve?'<button data-sf13-report="'+esc(id)+'" data-status="'+(status==='resolved'?'open':'resolved')+'">'+(status==='resolved'?'Reabrir denúncia':'Marcar como resolvida')+'</button>':'')+'</article>';
  }).join('')||'<div class="sf13-skeleton-empty">Nenhuma denúncia neste filtro.</div>');
 }
 async function loadMusic(){
  const stats=await fetchJSON('/api/admin/stats');
  const rooms=await fetchJSON('/api/admin/rooms');
  const m=stats.musicOps||{};
  const items=[
   ['Buscas de música',m.searchRequests],['Adições confirmadas',m.queueAccepted],['Adições recusadas',m.queueRejected],
   ['Falhas de busca',m.searchFailures],['Músicas atualmente em fila',stats.queuedSongs],
   ['Salas com ouvintes',stats.occupiedRooms]
  ];
  setData('sf13MusicStats',items.map(([label,val])=>'<div class="sf13-summary-tile"><span>'+esc(label)+'</span><strong>'+number(val)+'</strong><span>Dados atuais do servidor</span></div>').join(''));
  const ranked=rooms.slice().sort((a,b)=>Number(b.queueLength||0)-Number(a.queueLength||0));
  setData('sf13MusicRooms',ranked.map(r=>'<div class="sf12-row"><div><strong>'+esc(r.name)+'</strong><small>'+esc(r.now||'Nenhuma faixa reproduzindo')+'</small></div><span class="sf12-pill">'+number(r.queueLength)+' na fila</span></div>').join('')||'<div class="sf12-empty">Sem salas disponíveis.</div>');
 }
 async function loadSystem(){
  const start=performance.now();
  const [health,stats]=await Promise.all([fetchJSON('/healthz'),fetchJSON('/api/admin/stats')]);
  const latency=Math.round(performance.now()-start);
  const socketReady=typeof window.socket!=='undefined'&&window.socket?.connected===true;
  setData('sf13SystemChecks',[
   row('Servidor HTTP','Resposta do endpoint /healthz em '+latency+' ms',health.ok?'Respondendo':'Falha',health.ok?'':'error'),
   row('Socket deste navegador','Estado do cliente conectado à sala',socketReady?'Conectado':'Desconectado',socketReady?'':'warn'),
   row('Processo Node.js','Tempo desde a última inicialização: '+Math.round(Number(health.uptime||0)/60)+' minutos','Ativo'),
   row('Salas em memória',number(health.rooms)+' salas atualmente carregadas','Observado'),
   row('Contadores administrativos',number(stats.onlineUsers)+' conexões reportadas','Respondendo')
  ].join(''));
  note('sf13SystemUpdated','Verificação concluída em '+fmt(Date.now())+'. Não representa disponibilidade histórica, SLA ou diagnóstico do YouTube.');
 }
 async function loadInsights(){
  const [stats,rooms]=await Promise.all([fetchJSON('/api/admin/stats'),fetchJSON('/api/admin/rooms')]);
  const m=stats.musicOps||{};
  const all=Number(m.queueAccepted||0)+Number(m.queueRejected||0);
  const failure=Number(m.searchFailures||0), searches=Number(m.searchRequests||0);
  const alerts=[];
  if(searches>0&&failure/searches>=.1)alerts.push(['Atenção às buscas',number(failure)+' falhas em '+number(searches)+' buscas reportadas. Verifique a API de pesquisa.','warn']);
  if(all>0&&Number(m.queueRejected||0)/all>=.2)alerts.push(['Fila com recusas elevadas',number(m.queueRejected)+' recusas entre '+number(all)+' tentativas registradas.','warn']);
  if(Number(stats.onlineListeners||0)===0)alerts.push(['Nenhum ouvinte nas salas','Atualmente não há ouvintes contabilizados.','warn']);
  if(!alerts.length)alerts.push(['Sem anomalias nos critérios simples','Nenhum limite configurado nesta versão foi ultrapassado.','']);
  setData('sf13InsightsList',alerts.map(([name,detail,type])=>row(name,detail,type?'Revisar':'Informativo',type)).join(''));
  const popular=rooms.slice().sort((a,b)=>Number(b.listeners||0)-Number(a.listeners||0)).slice(0,5);
  setData('sf13InsightsRooms',popular.map(r=>'<div class="sf12-row"><div><strong>'+esc(r.name)+'</strong><small>'+esc(r.now||'Sem música')+'</small></div><span class="sf12-pill">'+number(r.listeners)+' ouvintes</span></div>').join('')||'<div class="sf12-empty">Nenhuma sala.</div>');
 }
 const loaders={reports:loadReports,music:loadMusic,system:loadSystem,insights:loadInsights};
 window.sf13Load=async name=>{
  if(!loaders[name])return;
  if(state.loading)return;
  state.loading=true;
  try{await loaders[name]();}
  finally{state.loading=false;}
 };
 window.sf13Overview=overview;
 panel.addEventListener('click',async e=>{
  const report=e.target.closest('[data-sf13-report]');
  if(report){
   const id=report.dataset.sf13Report, status=report.dataset.status;
   if(!confirm(status==='resolved'?'Confirmar resolução desta denúncia?':'Reabrir esta denúncia?'))return;
   report.disabled=true;
   try{
    await fetchJSON('/api/admin/chat-reports/'+encodeURIComponent(id)+'/resolve',{
     method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})
    });
    await loadReports();
   }catch(error){note('sf13ReportsNotice',errMsg(error));report.disabled=false;}
   return;
  }
  const filter=e.target.closest('[data-sf13-filter]');
  if(filter){
   state.filter=filter.dataset.sf13Filter;
   panel.querySelectorAll('[data-sf13-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===filter)));
   drawReports();return;
  }
  const period=e.target.closest('[data-sf13-period]');
  if(period){
   state.period=Number(period.dataset.sf13Period)||60;
   panel.querySelectorAll('[data-sf13-period]').forEach(b=>b.setAttribute('aria-pressed',String(b===period)));
   drawChart();
  }
 });
 // Não registrar dados pessoais; apenas contagens agregadas voláteis desta aba.
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)drawChart()});
})();
