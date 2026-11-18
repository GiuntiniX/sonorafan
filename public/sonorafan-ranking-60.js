/* SonoraFan Ranking 6.0 — client de leitura; qualquer pontuação nasce no servidor. */
(function(){
  'use strict';
  const byId=id=>document.getElementById(id);
  const fmt=n=>new Intl.NumberFormat('pt-BR').format(Number(n)||0);
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state={tab:'ranking',period:'week',category:'overall',ranking:null,me:null,hall:null,compare:null,busy:false};
  const root=()=>byId('lbModal'),content=()=>byId('sf60Content');
  async function api(url,options){
    const response=await fetch(url,{credentials:'include',...options});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(data.error||'Serviço indisponível.');
    return data;
  }
  function notice(message){
    const elem=byId('sf60Message');
    if(elem){elem.textContent=message||'';elem.hidden=!message;}
  }
  const metricName=()=>state.category==='forum'?'reputação':state.category==='dj'?'XP de DJ':'XP';
  function rankCard(p){
    return '<button class="sf60-leader" type="button" data-sf60-compare="'+esc(p.id)+'" aria-label="Comparar progresso com '+esc(p.name)+'">'+
      '<span class="sf60-place">#'+fmt(p.position)+'</span>'+
      '<span class="sf60-user">'+esc(p.avatar)+' <strong>'+esc(p.name)+'</strong><small>'+
      esc(p.level?.name||((p.medals||[]).slice(0,2).join(' · '))||'Participante da comunidade')+'</small></span>'+
      '<span class="sf60-score">'+fmt(p.score)+' <small>'+esc(metricName())+'</small></span></button>';
  }
  function podiumCard(p,i){
    return '<div class="sf60-podium-card"><span aria-hidden="true">'+['🥇','🥈','🥉'][i]+'</span>'+
      '<strong>'+esc(p.avatar)+' '+esc(p.name)+'</strong><small>'+fmt(p.score)+' '+esc(metricName())+'</small></div>';
  }
  function chooseTabs(){
    root().querySelectorAll('[data-sf60-tab]').forEach(btn=>{
      const on=btn.dataset.sf60Tab===state.tab;
      btn.setAttribute('aria-selected',String(on));
      btn.tabIndex=on?0:-1;
    });
  }
  function ranking(){
    const d=state.ranking;
    if(!d)return '<p class="sf60-notice">Carregando classificação…</p>';
    const podium=d.podium||[],rank=d.me||{},items=d.items||[];
    const mine=rank.rank?'#'+fmt(rank.rank):'—';
    const compare=state.compare&&items.find(x=>x.id===state.compare);
    const myScore=rank.score||0;
    return '<div class="sf60-controls">'+
      '<label>Período<select data-sf60-period><option value="week"'+(state.period==='week'?' selected':'')+'>Esta semana</option>'+
      '<option value="month"'+(state.period==='month'?' selected':'')+'>Este mês</option>'+
      '<option value="all"'+(state.period==='all'?' selected':'')+'>Histórico geral</option></select></label>'+
      '<label>Categoria<select data-sf60-category><option value="overall"'+(state.category==='overall'?' selected':'')+'>XP geral</option>'+
      '<option value="dj"'+(state.category==='dj'?' selected':'')+'>DJs</option>'+
      '<option value="forum"'+(state.category==='forum'?' selected':'')+'>Fórum</option></select></label></div>'+
      '<div class="sf60-stat-grid">'+
      '<div class="sf60-stat"><strong>'+mine+'</strong><small>Minha posição</small></div>'+
      '<div class="sf60-stat"><strong>'+fmt(myScore)+'</strong><small>Minha pontuação</small></div>'+
      '<div class="sf60-stat"><strong>'+fmt(items.length)+'</strong><small>Participantes visíveis</small></div></div>'+
      '<p class="sf60-notice">'+esc(d.note||'')+(d.partial?' · Ranking mostra uma amostra dos participantes; posições fora dela não são estimadas.':'')+
      (rank.rank===null?' · Sua posição não está na faixa consultada.':'')+'</p>'+
      (podium.length?'<h4>🏆 Pódio</h4><div class="sf60-podium">'+podium.map(podiumCard).join('')+'</div>':'<p class="sf60-notice">Ainda não há pontuações nesta classificação.</p>')+
      (compare?'<div class="sf60-compare" role="status"><strong>Comparar progresso</strong><div>Você: '+fmt(myScore)+' · '+esc(compare.name)+': '+fmt(compare.score)+'</div>'+
        '<div>Diferença: '+fmt(Math.abs(myScore-compare.score))+' '+esc(metricName())+' · '+
        (myScore>=compare.score?'você está à frente ou empatado':'participante está à frente')+'</div></div>':'')+
      (items.length?'<h4>Classificação · até 50 participantes</h4><div class="sf60-leader-list">'+items.map(rankCard).join('')+'</div>':'');
  }
  function progress(){
    const d=state.me;if(!d)return '<p class="sf60-notice">Carregando progresso…</p>';
    const level=d.level||{},next=d.nextLevel;
    const recent=d.recent||[],prefs=d.preferences||{};
    return '<div class="sf60-stat-grid">'+
      '<div class="sf60-stat"><strong>'+esc(level.icon||'🎧')+' '+esc(level.name||'Ouvinte')+'</strong><small>Nível atual</small></div>'+
      '<div class="sf60-stat"><strong>'+fmt(d.points)+'</strong><small>XP histórico preservado</small></div>'+
      '<div class="sf60-stat"><strong>'+fmt(d.reputation?.score)+'</strong><small>Reputação do Fórum</small></div></div>'+
      '<section class="sf60-section"><h4>Evolução pessoal</h4>'+
      '<div class="sf60-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+
      Math.max(0,Math.min(100,Number(level.progress)||0))+'"><div style="width:'+Math.max(0,Math.min(100,Number(level.progress)||0))+'%"></div></div>'+
      '<p>'+fmt(level.progress)+'% · '+(next?'Faltam '+fmt(Math.max(0,next.min-d.points))+' XP para '+esc(next.name):'Você chegou ao nível máximo atual!')+'</p></section>'+
      '<section class="sf60-section"><h4>✦ Histórico recente de XP</h4>'+
      (recent.length?recent.map(x=>'<div class="sf60-mission"><strong>'+esc(x.name)+'</strong><small> · +'+fmt(x.xp)+' XP · '+esc(x.time)+'</small></div>').join(''):
       '<p>Novas atividades validadas aparecerão aqui.</p>')+'</section>'+
      '<section class="sf60-section"><h4>Privacidade e identidade</h4>'+
      '<p>Você decide se seu nome aparece nas classificações públicas. Seu XP continua registrado mesmo quando o perfil está oculto.</p>'+
      '<button class="sf60-action" data-sf60-visibility>'+(!prefs.hidden?'Ocultar meu nome no ranking':'Exibir meu nome no ranking')+'</button>'+
      '<p>Medalhas em destaque: '+esc((prefs.showcase||[]).join(' · ')||'Nenhuma escolhida')+'</p></section>'+
      '<section class="sf60-section"><h4>📅 Marcos de participação</h4>'+
      (d.accountAgeDays===null?'<p>Data de entrada indisponível para esta conta.</p>':
        '<p>'+fmt(d.accountAgeDays)+' dias desde a criação da conta.</p>')+
      '<div class="sf60-medal-grid">'+(d.milestones||[]).map(m=>
        '<div class="sf60-medal"><strong>'+(m.unlocked?'✓':'🔒')+' '+fmt(m.days)+' dias</strong>'+
        '<small>'+(m.unlocked?'Marco alcançado':'Continue participando')+'</small></div>').join('')+'</div></section>';
  }
  function medals(){
    const d=state.me;if(!d)return '<p class="sf60-notice">Carregando conquistas…</p>';
    const selected=d.preferences?.showcase||[];
    const catalog=[...(d.achievements||[]).map(b=>({
      name:b.name,desc:b.description,icon:b.icon,unlocked:!!b.unlocked
    })),...(d.badges||[]).filter(name=>!(d.achievements||[]).some(b=>b.name===name))
      .map(name=>({name,desc:'Conquista preservada do SonoraFan',icon:'🏅',unlocked:true}))];
    return '<section class="sf60-section"><h4>🏅 Minhas conquistas</h4><p>Selecione até três medalhas conquistadas para destacar no seu perfil de ranking.</p>'+
      '<div class="sf60-medal-grid">'+catalog.map(x=>
        '<button type="button" class="sf60-medal" data-sf60-medal="'+esc(x.name)+'"'+
        (selected.includes(x.name)?' aria-pressed="true"':' aria-pressed="false"')+
        (!x.unlocked?' disabled':'')+'><strong>'+esc(x.icon)+' '+esc(x.name)+'</strong>'+
        '<small>'+esc(x.desc||'')+(x.unlocked?'':' · Bloqueada')+'</small></button>'
      ).join('')+'</div><p>'+fmt(selected.length)+'/3 medalhas em destaque</p></section>';
  }
  function missionItem(m){
    const progress=Number(m.progress)||0,target=Math.max(1,Number(m.target)||1);
    const pct=Math.min(100,progress/target*100);
    return '<article class="sf60-mission"><div class="sf60-mission-head"><strong>'+esc(m.icon||'🎯')+' '+esc(m.name)+'</strong>'+
      '<small>'+fmt(progress)+'/'+fmt(target)+' · '+fmt(m.reward)+' XP</small></div>'+
      '<p>'+esc(m.description)+'</p><div class="sf60-mini-progress"><div style="width:'+pct+'%"></div></div>'+
      '<small>'+(m.claimed?'✓ Recompensa concedida':'Aguardando atividades validadas')+'</small></article>';
  }
  function challenges(){
    const d=state.me;if(!d)return '<p class="sf60-notice">Carregando desafios…</p>';
    const week=d.challenges?.weekly||[],daily=d.challenges?.daily||[];
    const count=(d.reputation?.acceptedAnswers)||0,collective=d.collective||{score:0,answers:0,target:150};
    return '<section class="sf60-section"><h4>🎯 Missões diárias</h4><div class="sf60-missions">'+daily.map(missionItem).join('')+'</div></section>'+
      '<section class="sf60-section"><h4>🧭 Missões semanais</h4><div class="sf60-missions">'+week.map(missionItem).join('')+'</div></section>'+
      '<section class="sf60-section"><h4>🤝 Desafio do Fórum</h4>'+
      '<p>Ajude outros fãs a resolver dúvidas. Respostas escolhidas rendem reputação separada do XP musical, com proteção contra repetições.</p>'+
      '<div class="sf60-mini-progress"><div style="width:'+Math.min(100,count/5*100)+'%"></div></div>'+
      '<p>'+fmt(count)+'/5 respostas reconhecidas como úteis · marco pessoal, sem XP adicional.</p></section>'+
      '<section class="sf60-section"><h4>🌍 Desafio coletivo da semana</h4>'+
      '<p>Meta colaborativa: 150 pontos de reputação por respostas aceitas no Fórum. A contagem é feita apenas no servidor.</p>'+
      '<div class="sf60-mini-progress"><div style="width:'+Math.min(100,(collective.score||0)/Math.max(1,collective.target||150)*100)+'%"></div></div>'+
      '<p>'+fmt(collective.score)+'/'+fmt(collective.target||150)+' pontos de reputação · '+fmt(collective.answers)+' respostas aceitas na semana '+esc(collective.week||'')+'.</p>'+
      '<p>Meta comunitária simbólica: não concede XP automático nem premiações manipuláveis.</p></section>';
  }
  function hall(){
    const d=state.hall;if(!d)return '<p class="sf60-notice">Carregando temporadas…</p>';
    const seasons=d.seasons||[];
    return '<section class="sf60-section"><h4>🏆 Hall da Fama</h4>'+
      '<p>Campeões de períodos encerrados com pontuação validada desde o início do Ranking 6.0. Sem campeões inventados.</p>'+
      (seasons.length?seasons.map(s=>'<div class="sf60-mission"><strong>🥇 '+esc(s.avatar)+' '+esc(s.champion)+'</strong>'+
        '<small> · '+(s.period==='week'?'Semana ':'Mês ')+esc(s.key)+' · '+fmt(s.score)+' XP</small></div>').join(''):
        '<p>O Hall da Fama receberá os primeiros campeões após o encerramento de uma temporada.</p>')+'</section>';
  }
  function render(){
    if(!root()?.classList.contains('active'))return;
    chooseTabs();
    const area=content();if(!area)return;
    area.innerHTML={ranking,progress,medals,challenges,hall}[state.tab]();
  }
  async function load(){
    if(state.busy)return;state.busy=true;notice('');
    try{
      if(state.tab==='ranking')state.ranking=await api('/api/ranking60?'+new URLSearchParams({period:state.period,category:state.category}));
      else if(state.tab==='hall')state.hall=await api('/api/ranking60/hall');
      else state.me=await api('/api/ranking60/me');
      render();
    }catch(e){notice(e.message);const area=content();if(area)area.innerHTML='<p class="sf60-notice">Não foi possível carregar esta seção. Verifique sua conexão e tente novamente.</p>';}
    finally{state.busy=false;}
  }
  function open(){
    const modal=root();if(!modal)return;
    modal.classList.add('active');modal.setAttribute('aria-hidden','false');
    state.compare=null;state.tab='ranking';state.period='week';state.category='overall';
    render();load();
    modal.querySelector('.sf60-close')?.focus({preventScroll:true});
  }
  function close(){
    root()?.classList.remove('active');
    root()?.setAttribute('aria-hidden','true');
  }
  async function savePreference(data){
    try{
      const result=await api('/api/ranking60/preferences',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      if(!state.me)state.me=await api('/api/ranking60/me');
      state.me.preferences=result.preferences;notice('Preferência salva.');
      render();
      if(state.tab==='ranking')load();
    }catch(e){notice(e.message);}
  }
  document.addEventListener('click',async e=>{
    if(!root()?.classList.contains('active'))return;
    const btn=e.target.closest('[data-sf60-tab],[data-sf60-compare],[data-sf60-medal],[data-sf60-visibility],[data-sf60-close]');
    if(!btn||!root().contains(btn))return;
    if(btn.hasAttribute('data-sf60-close')){close();return;}
    if(btn.hasAttribute('data-sf60-tab')){state.tab=btn.dataset.sf60Tab;render();load();return;}
    if(btn.hasAttribute('data-sf60-compare')){state.compare=btn.dataset.sf60Compare;render();return;}
    if(btn.hasAttribute('data-sf60-visibility')){
      if(!state.me)return;await savePreference({hidden:!state.me.preferences?.hidden});return;
    }
    if(btn.hasAttribute('data-sf60-medal')){
      if(!state.me)return;
      const name=btn.dataset.sf60Medal,selected=[...(state.me.preferences?.showcase||[])];
      const index=selected.indexOf(name);
      if(index>=0)selected.splice(index,1);
      else if(selected.length<3)selected.push(name);
      else {notice('Escolha até três medalhas.');return;}
      await savePreference({showcase:selected});
    }
  });
  document.addEventListener('change',e=>{
    if(!root()?.classList.contains('active'))return;
    if(e.target.matches('[data-sf60-period]')){state.period=e.target.value;state.compare=null;load();}
    if(e.target.matches('[data-sf60-category]')){state.category=e.target.value;state.compare=null;load();}
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&root()?.classList.contains('active'))close();
  });
  window.sf60Ranking={open,close};
})();