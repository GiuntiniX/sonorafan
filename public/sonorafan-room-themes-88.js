/* SonoraFan 88 — temas ilustrados e personalização visual da sala.
   Não altera o áudio, fila ou mensagens. O servidor decide o tema compartilhado. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const FALLBACK={id:'geral',name:'Padrão · Festival',description:'Festival Terra SonoraFan com bandeiras Terra e Vivo, palco e pôr do sol',primary:'#7c3aed',secondary:'#ff6b35',bg:'#180f25',text:'#f0f0f8',emoji:'🎪',art:'/themes/final-172/indie.webp',thumbnail:'/themes/final-172/indie-thumb.webp'};
 let themes=[FALLBACK], byId=new Map([[FALLBACK.id,FALLBACK]]);
 let roomSlug='',sharedTheme='geral',personalOverride=null,mayEdit=false;
 // O catálogo inicial já está disponível antes do primeiro frame da sala.
 // A atualização remota continua validada abaixo, sem bloquear o primeiro tema.
 const initial=Array.isArray(window.sf88BootstrapCatalog)?window.sf88BootstrapCatalog:[];
 if(initial.length){
   themes=initial.map(t=>({...t,art:t.art+(t.art.includes('?')?'&':'?')+'v=221',thumbnail:t.thumbnail+(t.thumbnail.includes('?')?'&':'?')+'v=221'}));
   byId=new Map(themes.map(t=>[t.id,t]));
 }
 const roomHints=new Map();
 const warmed=new Set();
 function warm(id){
   const theme=find(id);
   if(!theme.art||warmed.has(theme.art))return;
   warmed.add(theme.art);
   const img=new Image();img.decoding='async';img.src=theme.art;
 }
 function rememberRooms(rooms){
   if(!Array.isArray(rooms))return;
   rooms.forEach(r=>{if(r&&typeof r.slug==='string'&&KNOWN_THEMES.has(r.roomTheme))roomHints.set(r.slug,r.roomTheme);});
 }

 let createChoice='geral',editChoice='geral',modalChoice='geral',modalMode='room',previousFocus=null;
 const KNOWN_THEMES=new Set(['geral','indie','metal','emo','mpb','eletronica','rock','pop','rap','funk','pagode','sertanejo','reggae','jazz','forro','bts','kpop','jpop','trap','lofi','cor-preto','cor-vermelho','cor-azul','cor-verde','cor-roxo','cor-rosa','cor-dourado','kpop-sakura-arena','bts-purple-monument','jpop-tokyo-night','trap-crown-stage','lofi-golden-listening','lofi-moonlight-live','kpop-cherry-city','bts-lights-festival','jpop-fuji-stage','trap-street-crown','lofi-riverside','lofi-acoustic-garden']);
 const safe=id=>KNOWN_THEMES.has(id)?id:'geral';
 const find=id=>byId.get(safe(id))||FALLBACK;
 const storageKey=slug=>'sf88:theme:'+slug;
 function getLocal(slug){
   if(!slug)return null;
   try {const value=localStorage.getItem(storageKey(slug));return KNOWN_THEMES.has(value)?value:null;}catch(_){return null;}
 }
 function storeLocal(slug,id){
   try{if(id)localStorage.setItem(storageKey(slug),id);else localStorage.removeItem(storageKey(slug));}catch(_){}
 }
 function skin(){
   const screen=$('screen-room');
   if(!screen)return;
   const chosen=find(personalOverride||sharedTheme);
   const variables=['--sf88-primary','--sf88-secondary','--sf88-panel','--sf88-label','--sf88-art'];
   if(chosen.id==='geral'){
     // Evita mudanças de estilo quando o usuário apenas alterna abas.
     if(screen.hasAttribute('data-room-theme'))screen.removeAttribute('data-room-theme');
     variables.forEach(key=>{if(screen.style.getPropertyValue(key))screen.style.removeProperty(key);});
   }else{
     if(screen.dataset.roomTheme!==chosen.id)screen.dataset.roomTheme=chosen.id;
     const values={
       '--sf88-primary':chosen.primary,'--sf88-secondary':chosen.secondary,
       '--sf88-panel':chosen.bg,'--sf88-label':chosen.text,
       '--sf88-art':'url("'+chosen.art+'")'
     };
     Object.entries(values).forEach(([key,value])=>{
       if(screen.style.getPropertyValue(key)!==value)screen.style.setProperty(key,value);
     });
   }
   // O palco mostra a arte da atmosfera, não a miniatura da música atual.
   // O catálogo continua sendo a única fonte de imagem para cada tema.
   const stageBackdrop=$('sf113VisualBackdrop');
   if(stageBackdrop){
     const art=chosen.art || FALLBACK.art;
     if(stageBackdrop.getAttribute('src')!==art){
       stageBackdrop.dataset.fallback='';
       stageBackdrop.src=art;
     }
   }
   const label=$('sf88ThemeName');
   if(label)label.textContent=chosen.name;
   const switcher=$('sf88RoomThemeButton');
   if(switcher)switcher.setAttribute('aria-label','Personalizar aparência: '+chosen.name+(personalOverride?' (tema pessoal)':' (tema da sala)'));
   if(switcher)switcher.setAttribute('aria-expanded',String($('sf88ThemeOverlay')?.hidden===false));
   const status=$('sf88ThemeStatus');
   if(status)status.textContent=personalOverride?'Tema pessoal · '+chosen.name:'Tema da sala · '+chosen.name;
   const hero=$('sf33EmptyPlayerArt');
   if(hero){
      hero.dataset.roomTheme=chosen.id;
      const heroImg=hero.querySelector('img');
      if(heroImg && heroImg.getAttribute('src')!==chosen.art){heroImg.src=chosen.art;heroImg.alt='Arte do tema '+chosen.name;}
    }
   const idle=$('sf44QueueIdle');
   if(idle)idle.dataset.roomTheme=chosen.id;
 }
 function roomState(state){
   if(!state||typeof state.slug!=='string')return;
   if(roomSlug!==state.slug){
     roomSlug=state.slug;
     personalOverride=getLocal(roomSlug);
   }
   sharedTheme=safe(state.roomTheme);
   roomHints.set(roomSlug,sharedTheme);
   warm(personalOverride||sharedTheme);
   skin();
 }
 function begin(slug){roomSlug=String(slug||'');sharedTheme=roomHints.get(roomSlug)||'geral';personalOverride=getLocal(roomSlug);warm(personalOverride||sharedTheme);skin();}
 function exit(){
   roomSlug='';sharedTheme='geral';personalOverride=null;mayEdit=false;
   const screen=$('screen-room');
   if(screen){screen.removeAttribute('data-room-theme');for(const key of ['--sf88-primary','--sf88-secondary','--sf88-panel','--sf88-label','--sf88-art'])screen.style.removeProperty(key);}
   close();
 }
 function permissions(value){mayEdit=!!value;const b=$('sf88RoomThemeButton');if(b)b.title=mayEdit?'Escolher tema e personalizar a sala':'Escolher aparência para mim';}
 function card(theme,mode){
   const selected=modalChoice===theme.id;
   const b=document.createElement('button');
   b.type='button';
   b.className='sf88-theme-card'+(theme.type==='color'?' sf88-color-card':'')+(selected?' is-selected':'');
   b.dataset.theme=theme.id;
   b.setAttribute('role','option');
   b.setAttribute('aria-selected',String(selected));
   b.setAttribute('aria-label',theme.name+' — '+theme.description);
   const img=document.createElement('img');
   img.src=theme.thumbnail||theme.art;img.alt='';img.loading='lazy';img.decoding='async';
   const name=document.createElement('strong');name.textContent=theme.emoji+' '+theme.name;
   const check=document.createElement('span');check.className='sf88-card-check';check.textContent=selected?'✓':'';
   const detail=document.createElement('span');detail.className='sf88-card-detail';detail.textContent=theme.description;
   const palette=document.createElement('span');palette.className='sf88-palette';
   for(const color of [theme.primary,theme.secondary,theme.bg]){
     const swatch=document.createElement('i');swatch.style.background=color;palette.append(swatch);
   }
   b.append(img,name,check,detail,palette);
   b.addEventListener('click',()=>{modalChoice=theme.id;updateSelection();});
   return b;
 }
 function updateSelection(){
   const grid=$('sf88ThemeCards');
   grid?.querySelectorAll('.sf88-theme-card').forEach(button=>{
     const chosen=button.dataset.theme===modalChoice;
     button.classList.toggle('is-selected',chosen);
     button.setAttribute('aria-selected',String(chosen));
     const check=button.querySelector('.sf88-card-check');
     if(check)check.textContent=chosen?'✓':'';
   });
   const selected=find(modalChoice);
   const overlay=$('sf88ThemeOverlay');
   if(overlay)overlay.dataset.sf143Preview=selected.id;
   const art=$('sf88ThemePreviewArt');
   if(art&&art.getAttribute('src')!==selected.art)art.src=selected.art;
   const text=$('sf88ThemePreviewCopy');
   if(text)text.textContent=selected.name+' · '+selected.description;
 }
 function drawModal(){
   const grid=$('sf88ThemeCards');
   if(!grid)return;
   const illustrated=themes.filter(t=>t.type!=='color'),colors=themes.filter(t=>t.type==='color');
   const heading=(name,caption)=>{
     const h=document.createElement('div');h.className='sf88-group-heading';h.setAttribute('role','presentation');
     const title=document.createElement('strong');title.textContent=name;
     const small=document.createElement('small');small.textContent=caption;
     h.append(title,small);return h;
   };
   grid.replaceChildren(
     heading('🎪 Atmosferas ilustradas','Cenários musicais e festivais com arte própria'),
     ...illustrated.map(t=>card(t,modalMode)),
     heading('🎨 Temas por cor','Escolha uma paleta para chat, fila e player'),
     ...colors.map(t=>card(t,modalMode))
   );
   updateSelection();
   const title=$('sf88ThemeModalTitle');
   if(title)title.textContent=modalMode==='create'?'Tema da nova sala':modalMode==='edit'?'Personalizar o tema da sala':'Escolha sua atmosfera';
   const personal=$('sf88ThemePersonal');
   const shared=$('sf88ThemeShared');
   const reset=$('sf88ThemeReset');
   if(personal)personal.hidden=modalMode!=='room';
   if(reset)reset.hidden=modalMode!=='room'||!personalOverride;
   if(shared){
     shared.hidden=modalMode==='room'&&!mayEdit;
     shared.textContent=modalMode==='create'?'✓ Escolher para a nova sala':modalMode==='edit'?'✓ Usar na sala':'✓ Aplicar para todos';
   }
   const caption=$('sf88ThemeCaption');
   if(caption)caption.textContent=modalMode==='room'?
     (mayEdit?'Aplicar para todos altera a sala em tempo real. Aplicar só para mim não muda a experiência dos outros.':'A escolha pessoal não muda o tema dos demais ouvintes.') :
     'Este visual modifica imagens, fundos e cores. As músicas, o chat e a fila continuam iguais.';
 }
 function open(mode='room'){
   if(!['room','create','edit'].includes(mode))mode='room';
   const el=$('sf88ThemeOverlay');
   if(!el)return;
   if(!el.hidden){close();return;}
   // No menu agrupado, devolva o foco ao gatilho visível após fechar o seletor.
   previousFocus=document.activeElement?.closest?.('#sf167MenuPanel') ? $('sf167MenuTrigger') : document.activeElement;
   modalMode=mode;
   modalChoice=safe(mode==='create'?createChoice:mode==='edit'?editChoice:personalOverride||sharedTheme);
   drawModal();
   el.hidden=false;
   el.classList.add('is-open');
   $('sf88RoomThemeButton')?.setAttribute('aria-expanded','true');
   $('sf88ThemeClose')?.focus({preventScroll:true});
 }
 function close(){
   const el=$('sf88ThemeOverlay');
   if(!el||el.hidden)return;
   el.hidden=true;el.classList.remove('is-open');
   $('sf88RoomThemeButton')?.setAttribute('aria-expanded','false');
   if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
 }
 function mini(id,type){
   const target=$(id);
   if(!target)return;
   const theme=find(type==='create'?createChoice:editChoice);
   target.dataset.sf143Theme=theme.id;
   target.replaceChildren();
   const title=document.createElement('div');title.className='sf88-mini-head';
   title.textContent='🎨 Tema visual da sala';
   const row=document.createElement('div');row.className='sf88-mini';
   const picture=document.createElement('img');picture.src=theme.thumbnail||theme.art;picture.alt='';picture.loading='lazy';
   const data=document.createElement('div');const name=document.createElement('strong');name.textContent=theme.name;
   const detail=document.createElement('small');detail.textContent=theme.description;
   data.append(name,detail);
   const choose=document.createElement('button');choose.type='button';
   choose.textContent='Escolher tema';choose.addEventListener('click',()=>open(type));
   row.append(picture,data,choose);target.append(title,row);
   if(type==='create'){
     const hero=$('createRoomModal')?.querySelector('.sf35-create-hero img');
     if(hero){hero.src=theme.art;hero.alt='Arte do tema '+theme.name;}
   }
 }
 function updateChoice(){
   if(modalMode==='create'){
     createChoice=safe(modalChoice);
     mini('sf88CreateTheme','create');
   }else if(modalMode==='edit'){
     editChoice=safe(modalChoice);
     mini('sf88EditTheme','edit');
   }
   close();
 }
 function applyPersonal(){
   if(!roomSlug)return;
   personalOverride=safe(modalChoice);
   storeLocal(roomSlug,personalOverride);
   skin();close();
   if(typeof toast==='function')toast('🎨 Tema pessoal aplicado!', 'success');
 }
 function applyShared(){
   if(!mayEdit||!roomSlug||typeof socket==='undefined'||!socket?.connected)return;
   if(!byId.has(modalChoice))return;
   personalOverride=null;
   storeLocal(roomSlug,null);
   socket.emit('updateRoomSettings',{roomTheme:modalChoice});
   close();
   if(typeof toast==='function')toast('🎨 Atualizando o tema da sala…', 'success');
 }
 function resetPersonal(){
   if(!roomSlug)return;
   personalOverride=null;storeLocal(roomSlug,null);skin();close();
   if(typeof toast==='function')toast('🎨 Seguindo o tema original da sala.', 'success');
 }
 function init(){
   const overlay=$('sf88ThemeOverlay');
   $('sf88ThemeClose')?.addEventListener('click',close);
   overlay?.addEventListener('click',event=>{if(event.target===overlay)close();});
   document.addEventListener('keydown',event=>{
     if(!overlay||overlay.hidden)return;
     if(event.key==='Escape'){event.preventDefault();close();return;}
     if(event.key!=='Tab')return;
     const controls=[...overlay.querySelectorAll('button:not(:disabled):not([hidden]),[tabindex="0"]')]
       .filter(node=>!node.closest('[hidden]')&&node.getClientRects().length);
     if(!controls.length)return;
     const first=controls[0],last=controls[controls.length-1];
     if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
     else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
   });
   $('sf88ThemePersonal')?.addEventListener('click',applyPersonal);
   $('sf88ThemeShared')?.addEventListener('click',()=>{
     if(modalMode==='room')applyShared();else updateChoice();
   });
   $('sf88ThemeReset')?.addEventListener('click',resetPersonal);
   $('sf88RoomThemeButton')?.addEventListener('click',()=>open('room'));
   mini('sf88CreateTheme','create');
   mini('sf88EditTheme','edit');
 }
 window.sf88GetCreateTheme=()=>createChoice;
 window.sf88GetEditTheme=()=>editChoice;
 window.sf88RememberRooms=rememberRooms;
 window.sf88WarmTheme=warm;
 window.sf88BeginRoom=begin;
 window.sf88LeaveRoom=exit;
 window.sf88RoomState=roomState;
 window.sf88Permission=permissions;
 window.sf88OpenRoomPicker=()=>open('room');
 window.sf88OpenEditor=id=>{editChoice=safe(id);mini('sf88EditTheme','edit');};
 window.sf88ResetCreateTheme=()=>{createChoice='geral';mini('sf88CreateTheme','create');};
 window.sf88ThemeLabel=id=>find(id).name;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 // O catálogo é a fonte única: cada tema possui arte HD e miniatura próprias.
 // Não aplica um manifesto secundário que possa sobrescrever ou repetir imagens.
 const ASSETS=Object.freeze({
   geral:['/themes/final-172/indie.webp','/themes/final-172/indie-thumb.webp'],
   indie:['/themes/final-164/indie.webp','/themes/final-164/indie-thumb.webp'],
   metal:['/themes/final-164/metal.webp','/themes/final-164/metal-thumb.webp'],
   emo:['/themes/final-164/emo.webp','/themes/final-164/emo-thumb.webp'],
   mpb:['/themes/final-164/mpb.webp','/themes/final-164/mpb-thumb.webp'],
   eletronica:['/themes/final-164/eletronica.webp','/themes/final-164/eletronica-thumb.webp'],
   rock:['/themes/final-164/rock.webp','/themes/final-164/rock-thumb.webp'],
   pop:['/themes/final-164/pop.webp','/themes/final-164/pop-thumb.webp'],
   rap:['/themes/final-171/rap.webp','/themes/final-171/rap-thumb.webp'],
   funk:['/themes/final-169/funk.webp','/themes/final-169/funk-thumb.webp'],
   pagode:['/themes/final-170/pagode.webp','/themes/final-170/pagode-thumb.webp'],
   sertanejo:['/themes/hd-175/sonorafan-sertanejo-aprovado.webp','/themes/hd-175/sonorafan-sertanejo-thumb.webp'],
   reggae:['/themes/final-170/reggae.webp','/themes/final-170/reggae-thumb.webp'],
   jazz:['/themes/final-170/jazz.webp','/themes/final-170/jazz-thumb.webp'],
   forro:['/themes/final-170/forro.webp','/themes/final-170/forro-thumb.webp'],
   bts:['/themes/festival-214/bts.svg','/themes/festival-214/bts.svg'],
   kpop:['/themes/festival-214/kpop.svg','/themes/festival-214/kpop.svg'],
   jpop:['/themes/festival-214/jpop.svg','/themes/festival-214/jpop.svg'],
   trap:['/themes/festival-214/trap.svg','/themes/festival-214/trap.svg'],
   lofi:['/themes/festival-214/lofi.svg','/themes/festival-214/lofi.svg'],
   'cor-preto':['/themes/colors-214/cor-preto.svg','/themes/colors-214/cor-preto.svg'],
   'cor-vermelho':['/themes/colors-214/cor-vermelho.svg','/themes/colors-214/cor-vermelho.svg'],
   'cor-azul':['/themes/colors-214/cor-azul.svg','/themes/colors-214/cor-azul.svg'],
   'cor-verde':['/themes/colors-214/cor-verde.svg','/themes/colors-214/cor-verde.svg'],
   'cor-roxo':['/themes/colors-214/cor-roxo.svg','/themes/colors-214/cor-roxo.svg'],
   'cor-rosa':['/themes/colors-214/cor-rosa.svg','/themes/colors-214/cor-rosa.svg'],
   'cor-dourado':['/themes/colors-214/cor-dourado.svg','/themes/colors-214/cor-dourado.svg'],
   'kpop-sakura-arena':['/themes/hd-220/kpop-sakura-arena.webp','/themes/hd-220/kpop-sakura-arena.webp'],
   'bts-purple-monument':['/themes/hd-220/bts-purple-monument.webp','/themes/hd-220/bts-purple-monument.webp'],
   'jpop-tokyo-night':['/themes/hd-220/jpop-tokyo-night.webp','/themes/hd-220/jpop-tokyo-night.webp'],
   'trap-crown-stage':['/themes/hd-220/trap-crown-stage.webp','/themes/hd-220/trap-crown-stage.webp'],
   'lofi-golden-listening':['/themes/hd-220/lofi-golden-listening.webp','/themes/hd-220/lofi-golden-listening.webp'],
   'lofi-moonlight-live':['/themes/hd-220/lofi-moonlight-live.webp','/themes/hd-220/lofi-moonlight-live.webp'],
   'kpop-cherry-city':['/themes/hd-220/kpop-cherry-city.webp','/themes/hd-220/kpop-cherry-city.webp'],
   'bts-lights-festival':['/themes/hd-220/bts-lights-festival.webp','/themes/hd-220/bts-lights-festival.webp'],
   'jpop-fuji-stage':['/themes/hd-220/jpop-fuji-stage.webp','/themes/hd-220/jpop-fuji-stage.webp'],
   'trap-street-crown':['/themes/hd-220/trap-street-crown.webp','/themes/hd-220/trap-street-crown.webp'],
   'lofi-riverside':['/themes/hd-220/lofi-riverside.webp','/themes/hd-220/lofi-riverside.webp'],
   'lofi-acoustic-garden':['/themes/renovados-219/lofi-acoustic-garden.webp','/themes/renovados-219/lofi-acoustic-garden.webp']
 });
 const themeRevision='221';
 const assetUrl=url=>url+(url.includes('?')?'&':'?')+'v='+themeRevision;
 fetch('/themes/catalog-88.json?v='+themeRevision,{credentials:'same-origin',cache:'force-cache'})
   .then(resp=>{if(!resp.ok)throw new Error('Catálogo indisponível');return resp.json();})
   .then(items=>{
     if(!Array.isArray(items))throw new Error('Catálogo inválido');
     const valid=items.filter(t=>{
       const expected=ASSETS[t?.id];
       return expected && t.art===expected[0] && t.thumbnail===expected[1] &&
         ['primary','secondary','bg','text'].every(key=>/^#[0-9a-fA-F]{6}$/.test(t[key]));
     });
     if(valid.length!==KNOWN_THEMES.size || new Set(valid.map(t=>t.id)).size!==KNOWN_THEMES.size){
       throw new Error('Catálogo incompleto ou inconsistente');
     }
     themes=valid.map(t=>({...t,art:assetUrl(t.art),thumbnail:assetUrl(t.thumbnail)}));
     byId=new Map(themes.map(t=>[t.id,t]));
     createChoice=safe(createChoice);editChoice=safe(editChoice);
     if(roomSlug)personalOverride=getLocal(roomSlug);
     mini('sf88CreateTheme','create');mini('sf88EditTheme','edit');
     if($('sf88ThemeOverlay')?.hidden===false)drawModal();
     skin();
   }).catch(err=>{console.error('[SonoraFan] Falha ao carregar artes dos temas:',err);});
})();
