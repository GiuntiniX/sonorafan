/* SonoraFan 88 — temas ilustrados e personalização visual da sala.
   Não altera o áudio, fila ou mensagens. O servidor decide o tema compartilhado. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const FALLBACK={id:'indie',name:'Indie / Festival',description:'Festival e flores',primary:'#c256e7',secondary:'#fb8074',bg:'#170e27',text:'#f2d9ff',emoji:'🎪',art:'/themes/indie.svg'};
 let themes=[FALLBACK], byId=new Map([[FALLBACK.id,FALLBACK]]);
 let roomSlug='',sharedTheme='indie',personalOverride=null,mayEdit=false;
 let createChoice='indie',editChoice='indie',modalChoice='indie',modalMode='room',previousFocus=null;
 const safe=id=>byId.has(id)?id:'indie';
 const find=id=>byId.get(safe(id))||FALLBACK;
 const storageKey=slug=>'sf88:theme:'+slug;
 function getLocal(slug){
   if(!slug)return null;
   try {const value=localStorage.getItem(storageKey(slug));return byId.has(value)?value:null;}catch(_){return null;}
 }
 function storeLocal(slug,id){
   try{if(id)localStorage.setItem(storageKey(slug),id);else localStorage.removeItem(storageKey(slug));}catch(_){}
 }
 function skin(){
   const screen=$('screen-room');
   if(!screen)return;
   const chosen=find(personalOverride||sharedTheme);
   screen.dataset.roomTheme=chosen.id;
   screen.style.setProperty('--sf88-primary',chosen.primary);
   screen.style.setProperty('--sf88-secondary',chosen.secondary);
   screen.style.setProperty('--sf88-panel',chosen.bg);
   screen.style.setProperty('--sf88-label',chosen.text);
   screen.style.setProperty('--sf88-art','url("'+chosen.art+'")');
   const label=$('sf88ThemeName');
   if(label)label.textContent=chosen.name;
   const status=$('sf88ThemeStatus');
   if(status)status.textContent=personalOverride?'Tema pessoal · '+chosen.name:'Tema da sala · '+chosen.name;
   const hero=$('sf33EmptyPlayerArt');
   if(hero)hero.dataset.roomTheme=chosen.id;
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
   skin();
 }
 function begin(slug){roomSlug=String(slug||'');sharedTheme='indie';personalOverride=getLocal(roomSlug);skin();}
 function exit(){
   roomSlug='';sharedTheme='indie';personalOverride=null;mayEdit=false;
   const screen=$('screen-room');
   if(screen){screen.removeAttribute('data-room-theme');for(const key of ['--sf88-primary','--sf88-secondary','--sf88-panel','--sf88-label','--sf88-art'])screen.style.removeProperty(key);}
   close();
 }
 function permissions(value){mayEdit=!!value;const b=$('sf88RoomThemeButton');if(b)b.title=mayEdit?'Escolher tema e personalizar a sala':'Escolher aparência para mim';}
 function card(theme,mode){
   const selected=modalChoice===theme.id;
   const b=document.createElement('button');
   b.type='button';
   b.className='sf88-theme-card'+(selected?' is-selected':'');
   b.dataset.theme=theme.id;
   b.setAttribute('role','option');
   b.setAttribute('aria-selected',String(selected));
   b.setAttribute('aria-label',theme.name+' — '+theme.description);
   const img=document.createElement('img');
   img.src=theme.art;img.alt='';img.loading='lazy';img.decoding='async';
   const name=document.createElement('strong');name.textContent=theme.emoji+' '+theme.name;
   const check=document.createElement('span');check.className='sf88-card-check';check.textContent=selected?'✓':'';
   const detail=document.createElement('span');detail.className='sf88-card-detail';detail.textContent=theme.description;
   const palette=document.createElement('span');palette.className='sf88-palette';
   for(const color of [theme.primary,theme.secondary,theme.bg]){
     const swatch=document.createElement('i');swatch.style.background=color;palette.append(swatch);
   }
   b.append(img,name,check,detail,palette);
   b.addEventListener('click',()=>{modalChoice=theme.id;drawModal();});
   return b;
 }
 function drawModal(){
   const grid=$('sf88ThemeCards');
   if(!grid)return;
   grid.replaceChildren(...themes.map(t=>card(t,modalMode)));
   const selected=find(modalChoice);
   const art=$('sf88ThemePreviewArt');
   if(art)art.src=selected.art;
   const text=$('sf88ThemePreviewCopy');
   if(text)text.textContent=selected.name+' · '+selected.description;
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
   previousFocus=document.activeElement;
   modalMode=mode;
   modalChoice=safe(mode==='create'?createChoice:mode==='edit'?editChoice:personalOverride||sharedTheme);
   drawModal();
   el.hidden=false;
   el.classList.add('is-open');
   $('sf88ThemeClose')?.focus({preventScroll:true});
 }
 function close(){
   const el=$('sf88ThemeOverlay');
   if(!el||el.hidden)return;
   el.hidden=true;el.classList.remove('is-open');
   if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
 }
 function mini(id,type){
   const target=$(id);
   if(!target)return;
   const theme=find(type==='create'?createChoice:editChoice);
   target.replaceChildren();
   const title=document.createElement('div');title.className='sf88-mini-head';
   title.textContent='🎨 Tema visual da sala';
   const row=document.createElement('div');row.className='sf88-mini';
   const picture=document.createElement('img');picture.src=theme.art;picture.alt='';picture.loading='lazy';
   const data=document.createElement('div');const name=document.createElement('strong');name.textContent=theme.name;
   const detail=document.createElement('small');detail.textContent='Imagens e cores do chat, player e fila';
   data.append(name,detail);
   const choose=document.createElement('button');choose.type='button';
   choose.textContent='Escolher tema';choose.addEventListener('click',()=>open(type));
   row.append(picture,data,choose);target.append(title,row);
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
     if(overlay?.hidden===false && event.key==='Escape'){event.preventDefault();close();}
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
 window.sf88BeginRoom=begin;
 window.sf88LeaveRoom=exit;
 window.sf88RoomState=roomState;
 window.sf88Permission=permissions;
 window.sf88OpenRoomPicker=()=>open('room');
 window.sf88OpenEditor=id=>{editChoice=safe(id);mini('sf88EditTheme','edit');};
 window.sf88ResetCreateTheme=()=>{createChoice='indie';mini('sf88CreateTheme','create');};
 window.sf88ThemeLabel=id=>find(id).name;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 fetch('/themes/catalog-88.json',{credentials:'same-origin'})
   .then(resp=>{if(!resp.ok)throw new Error('Catálogo indisponível');return resp.json();})
   .then(items=>{
     if(!Array.isArray(items)||items.length===0)return;
     const valid=items.filter(t=>/^[a-z0-9_-]{2,24}$/.test(t.id)&&/^#[0-9a-fA-F]{6}$/.test(t.primary)&&/^#[0-9a-fA-F]{6}$/.test(t.secondary)&&/^#[0-9a-fA-F]{6}$/.test(t.bg)&&/^#[0-9a-fA-F]{6}$/.test(t.text)&&t.art==='/themes/'+t.id+'.svg');
     if(!valid.length)return;
     themes=valid;byId=new Map(themes.map(x=>[x.id,x]));
     createChoice=safe(createChoice);editChoice=safe(editChoice);
     if(roomSlug)personalOverride=getLocal(roomSlug);
     mini('sf88CreateTheme','create');mini('sf88EditTheme','edit');
     if($('sf88ThemeOverlay')?.hidden===false)drawModal();
     if(roomSlug)skin();
   }).catch(()=>{});
})();