/* SonoraFan 29 — tour contextual de lobby + sala (sem bibliotecas) */
(() => {
  'use strict';
  const $ = (s, root=document) => root.querySelector(s);
  const steps = {
    lobby: [
      {target:'#screen-lobby .sf28-sidebar', title:'Bem-vindo ao SonoraFan!', icon:'🎧', text:'Sua nova navegação fica aqui, sempre à esquerda. Descubra salas, acesse o perfil e encontre a comunidade sem procurar botões no topo.'},
      {target:'#screen-lobby .sf28-sidebar-nav button:first-child', title:'Descubra sua próxima vibe', icon:'🌎', text:'Este é o ponto de partida: encontre salas abertas e escolha onde quer ouvir música com outras pessoas.'},
      {target:'#screen-lobby .lobby-actions button:first-child', title:'Crie uma sala colaborativa', icon:'✨', text:'Clique em Nova sala para escolher nome, identidade e privacidade. Por padrão, todos os participantes podem adicionar músicas.'},
      {target:'#screen-lobby .sf10-discovery-controls', title:'Encontre salas do seu estilo', icon:'🔎', text:'Busque salas por nome ou estilo e use filtros para descobrir onde a música está acontecendo.'},
      {target:'#screen-lobby .sf28-sidebar-nav button:nth-child(3)', title:'Sua comunidade', icon:'💜', text:'Acesse pessoas, amigos e eventos. O SonoraFan é mais que um player: é um lugar para se conectar.'},
      {target:'#screen-lobby .sf28-sidebar-nav button:nth-child(5)', title:'Seu perfil e sua identidade', icon:'👤', text:'Personalize seu perfil, acompanhe suas informações e volte a esta área quando quiser.'},
      {target:'#screen-lobby .room-grid', title:'Entre numa sala', icon:'🎵', text:'Escolha um card de sala para ouvir junto com a galera. Quando entrar, mostraremos os principais controles da experiência musical.'}
    ],
    room: [
      {target:'#screen-room .sf5-sidebar', title:'Sua sala, seus atalhos', icon:'🏠', text:'A coluna esquerda reúne navegação, perfil, favoritos, configurações e o caminho de volta ao lobby.'},
      {target:'#screen-room .queue-column', title:'Playlist de todos', icon:'🎶', text:'Aqui fica a fila compartilhada. Todos podem contribuir com músicas, sem necessidade de ser dono da sala.'},
      {target:'#screen-room #sf10RequestCard', title:'Escolha a próxima música', icon:'➕', text:'Busque no YouTube ou cole um link, confira o resultado e adicione à seleção coletiva.'},
      {target:'#screen-room .player-frame', title:'Assista e ouça junto', icon:'▶', text:'O vídeo toca aqui. Logo abaixo você controla seu próprio volume. A barra inferior mostra a faixa atual.'},
      {target:'#screen-room .chat-column', title:'Converse ao vivo', icon:'💬', text:'Fale com a galera enquanto a música toca. Use o chat e as reações para participar da sala.'},
      {target:'#screen-room .sf29-side-invite', title:'Traga os amigos', icon:'🔗', text:'Convidar agora fica no menu esquerdo. Copie o link e compartilhe esta sala.'},
      {target:'#screen-room #sf11ThemeButton', title:'Seu tema, sua vibe', icon:'🎨', text:'Temas também ficam na coluna esquerda. Escolha a aparência que combina com você.'},
      {target:'#screen-room .sf5-navigation button[onclick*="openTutorial"]', title:'Reveja este guia', icon:'❔', text:'Precisa de ajuda de novo? Abra Ajuda / Tour no menu esquerdo. Pronto: aproveite a música!'}
    ]
  };
  let state=null, layer, focusBefore=null, raf=0;
  const key=kind=>{
    const id=(typeof currentUser!=='undefined'&&currentUser?.uid)||(typeof currentUser!=='undefined'&&currentUser?.email)||'guest';
    return `sonorafan29-tour-${kind}-${id}`;
  };
  function mounted(){
    if(layer)return;
    layer=document.createElement('div');layer.className='sf29-tour';layer.hidden=true;
    layer.innerHTML=`<div class="sf29-focus-ring" aria-hidden="true"></div>
      <section class="sf29-guide" role="dialog" aria-modal="true" aria-label="Guia do SonoraFan" tabindex="-1">
        <div class="sf29-guide-top"><span class="sf29-guide-tag">TOUR SONORAFAN</span><button class="sf29-close" type="button" aria-label="Fechar tour">✕</button></div>
        <div class="sf29-guide-icon" aria-hidden="true">🎧</div>
        <h2 class="sf29-guide-title"></h2><p class="sf29-guide-copy"></p>
        <div class="sf29-guide-progress"><span></span></div>
        <div class="sf29-guide-footer"><button class="sf29-skip" type="button">Pular tour</button><div><button class="sf29-back" type="button">← Voltar</button><button class="sf29-next" type="button">Próximo →</button></div></div>
        <small class="sf29-guide-counter" aria-live="polite"></small>
      </section>`;
    document.body.appendChild(layer);
    $('.sf29-close',layer).addEventListener('click',stop);
    $('.sf29-skip',layer).addEventListener('click',stop);
    $('.sf29-back',layer).addEventListener('click',()=>advance(-1));
    $('.sf29-next',layer).addEventListener('click',()=>advance(1));
    window.addEventListener('resize',reposition,{passive:true});
    document.addEventListener('scroll',reposition,true);
    document.addEventListener('keydown',e=>{
      if(!state)return;
      if(e.key==='Escape'){e.preventDefault();stop();}
      if(e.key==='ArrowRight'){e.preventDefault();advance(1);}
      if(e.key==='ArrowLeft'){e.preventDefault();advance(-1);}
      if(e.key==='Tab'){
        const opts=Array.from($('.sf29-guide',layer).querySelectorAll('button:not([disabled])'));
        const i=opts.indexOf(document.activeElement);
        if(e.shiftKey&&i<=0){e.preventDefault();opts.at(-1)?.focus();}
        else if(!e.shiftKey&&i===opts.length-1){e.preventDefault();opts[0]?.focus();}
      }
    });
  }
  function isVisible(el){if(!el)return false;const st=getComputedStyle(el);return st.display!=='none'&&st.visibility!=='hidden'&&el.getBoundingClientRect().width>0;}
  function reposition(){
    if(!state||!layer||layer.hidden)return;
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>{
      const step=state.steps[state.index],target=$(step.target);
      if(!isVisible(target))return;
      const r=target.getBoundingClientRect(),ring=$('.sf29-focus-ring',layer),tip=$('.sf29-guide',layer);
      const pad=7;
      const left=Math.max(8,r.left-pad),top=Math.max(8,r.top-pad);
      const right=Math.min(innerWidth-8,r.right+pad),bottom=Math.min(innerHeight-8,r.bottom+pad);
      Object.assign(ring.style,{left:left+'px',top:top+'px',width:Math.max(8,right-left)+'px',height:Math.max(8,bottom-top)+'px'});
      const w=Math.min(362,innerWidth-24),h=tip.offsetHeight;
      const below=bottom+12+h<=innerHeight-12;
      const above=top-12-h>=12;
      let y=below?bottom+12:above?top-12-h:Math.max(12,innerHeight-h-12);
      let x=Math.min(Math.max(12,r.left),innerWidth-w-12);
      if(r.width>innerWidth*.66 && !below&&!above){x=12;y=Math.max(12,innerHeight-h-12);}
      Object.assign(tip.style,{left:x+'px',top:y+'px',width:w+'px'});
    });
  }
  function render(){
    if(!state)return;
    const step=state.steps[state.index];
    $('.sf29-guide-icon',layer).textContent=step.icon;
    $('.sf29-guide-title',layer).textContent=step.title;
    $('.sf29-guide-copy',layer).textContent=step.text;
    $('.sf29-guide-progress span',layer).style.width=`${(state.index+1)/state.steps.length*100}%`;
    $('.sf29-guide-counter',layer).textContent=`${state.index+1} de ${state.steps.length} etapas`;
    $('.sf29-back',layer).disabled=state.index===0;
    $('.sf29-next',layer).textContent=state.index===state.steps.length-1?'Concluir ✓':'Próximo →';
    const el=$(step.target);
    if(el&&!isVisible(el))return advance(1);
    if(el){const r=el.getBoundingClientRect();if(r.top<14||r.bottom>innerHeight-20)el.scrollIntoView({behavior:'instant',block:'center',inline:'nearest'});}
    reposition();
    $('.sf29-guide',layer).focus({preventScroll:true});
  }
  function advance(delta){
    if(!state)return;
    const n=state.index+delta;
    if(n>=state.steps.length){stop();return;}
    if(n<0)return;
    state.index=n;render();
  }
  function stop(){
    if(!state)return;
    const {kind,manual}=state;
    state=null;layer.hidden=true;
    document.body.classList.remove('sf29-tour-open');
    if(!manual){
      try{localStorage.setItem(key(kind),'1')}catch(_){ }
      if(kind==='lobby'&&typeof currentUser!=='undefined'&&currentUser){
        try{localStorage.setItem('vc_onb_'+currentUser.email,'1')}catch(_){ }
        fetch('/api/onboarded',{method:'POST',credentials:'include'}).catch(()=>{});
      }
    }
    if(focusBefore?.isConnected)focusBefore.focus({preventScroll:true});
    focusBefore=null;
  }
  function start(kind='lobby',manual=false){
    if(!['lobby','room'].includes(kind))return;
    if(!$('#screen-'+kind)?.classList.contains('active'))return;
    mounted();if(state)stop();
    const filtered=steps[kind].filter(st=>isVisible($(st.target)));
    if(!filtered.length)return;
    focusBefore=document.activeElement;
    state={kind,manual,steps:filtered,index:0};
    layer.hidden=false;document.body.classList.add('sf29-tour-open');
    render();
  }
  function maybe(kind){
    if(state||!$('#screen-'+kind)?.classList.contains('active'))return;
    try{if(localStorage.getItem(key(kind)))return;}catch(_){return;}
    start(kind,false);
  }
  window.sf29StartTour=start;
  window.sf29MaybeWelcome=()=>setTimeout(()=>maybe('lobby'),650);
  window.sf29MaybeRoom=()=>setTimeout(()=>maybe('room'),850);
  window.sf29StopTour=stop;
  document.addEventListener('click',e=>{
    if(state&&e.target.closest('#screen-room .sf5-navigation button[onclick*="leaveRoom"]'))stop();
  });
})();
