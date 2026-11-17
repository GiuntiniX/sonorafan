/* SonoraFan 126 — refinamento real dos mockups aprovados.
 * Complementa v107/v110/v125 sem criar salas, usuários, convites ou músicas fictícias.
 * A pesquisa, a fila e os Fan Clubs continuam usando os controladores existentes.
 */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const q=(sel,root=document)=>root.querySelector(sel);
 const qa=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
 const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
 const validClub=id=>/^[a-f0-9-]{36}$/i.test(String(id||''));
 const make=(tag,className,content)=>{const x=document.createElement(tag);x.className=className;if(content!==undefined)x.textContent=content;return x;};
 const lobbyRoot=()=>q('#screen-lobby.sf125-platform');
 let previousLobbyActive=false;
 let clubObserver=null;

 function ensureRoomFiller(){
   const rooms=$('sf107Rooms');if(!rooms)return;
   const count=qa('[data-sf107-room]',rooms).length;
   const old=q('.sf126-create-room-card',rooms);
   if(count>=3||$('sf107RoomsMeta')?.textContent?.includes('Atualizando')){
     old?.remove();return;
   }
   if(old)return;
   // Helpful action, NOT an invented room or simulated audience.
   const card=make('button','sf126-create-room-card');
   card.type='button';card.innerHTML=
    '<span class="sf126-card-symbol" aria-hidden="true">＋</span>'+
    '<strong>Crie sua própria sala</strong>'+
    '<span>Escolha um estilo, convide amigos e comece uma fila colaborativa.</span>'+
    '<b>Criar sala →</b>';
   card.addEventListener('click',()=>window.showCreateRoom?.());
   rooms.append(card);
 }
 function ensureLobby(){
   const root=lobbyRoot(),dashboard=$('sf107Dashboard'),hero=$('sf125LobbyHero');
   if(!root||!dashboard||!hero)return false;
   root.classList.add('sf126-lobby');
   const main=q('.sf107-main-col',dashboard);
   const popular=$('sf107Popular');
   if(main&&popular&&main.firstElementChild!==popular)main.prepend(popular);
   popular?.classList.add('sf126-popular');
   const existing=q('.sf126-hero-extra',hero);
   if(!existing){
     const row=make('div','sf126-hero-extra');
     row.innerHTML=
       '<button type="button" class="sf126-hero-link" data-sf126-action="clubs">♧ Encontrar Fan Clubs</button>'+
       '<button type="button" class="sf126-hero-link" data-sf126-action="invite">⌗ Entrar com código</button>';
     hero.querySelector('.sf125-hero-actions')?.after(row);
     row.addEventListener('click',e=>{
       const btn=e.target.closest('[data-sf126-action]');if(!btn)return;
       if(btn.dataset.sf126Action==='clubs')window.sf126OpenClubs?.();
       if(btn.dataset.sf126Action==='invite'){
         const area=$('sf107Invite'),field=$('sf107InviteCode');
         if(area){area.hidden=false;field?.focus();}
       }
     });
   }
   const recent=$('sf107Recent');
   const recentModule=recent?.closest('.sf107-module');
   if(recentModule){recentModule.classList.add('sf126-recent');}
   const clubs=$('sf107Clubs');
   if(clubs)clubs.closest('.sf107-module')?.classList.add('sf126-lobby-clubs');
   if(popular){
     const h=popular.querySelector('.sf107-module-head h2');
     if(h)h.textContent='Salas em destaque';
   }
   const roomList=$('sf107Rooms');
   if(roomList&&!roomList.dataset.sf126Watch){
     roomList.dataset.sf126Watch='true';
     const observer=new MutationObserver(ensureRoomFiller);
     observer.observe(roomList,{childList:true});
   }
   const search=$('sf107Search');
   if(search)search.placeholder='Buscar salas e estilos musicais';
   ensureRoomFiller();
   const content=q('#screen-lobby .sf28-lobby-content');
   if(content&&!root.dataset.sf126Entered){
     root.dataset.sf126Entered='true';
     content.scrollTop=0;
   }
   if(!root.dataset.sf126Visibility){
     root.dataset.sf126Visibility='true';
     const watch=new MutationObserver(()=>{
       const isActive=root.classList.contains('active');
       if(isActive&&!previousLobbyActive){
         // The previous app can preserve an old scroll offset when returning from a room.
         const content=q('.sf28-lobby-content',root);
         if(content)content.scrollTop=0;
       }
       previousLobbyActive=isActive;
     });
     previousLobbyActive=root.classList.contains('active');
     watch.observe(root,{attributes:true,attributeFilter:['class']});
   }
   // Remove duplicated social item from any stale navbar built by older versions.
   qa('[data-sf125-go="community"],[data-sf125-modal-go="community"]',root).forEach(btn=>btn.remove());
   return true;
 }
 function clubRail(shell){
   const scroller=q('.sf5-community-scroll',shell);
   const hub=$('sfSocialHub');
   if(!scroller||!hub)return;
   if(!q('#sf126ClubHero',scroller)){
     const hero=make('section','sf126-club-hero');
     hero.id='sf126ClubHero';
     hero.innerHTML=
      '<div class="sf126-club-hero-copy"><span class="sf126-kicker">O PONTO DE ENCONTRO DOS FÃS</span>'+
      '<h1>Fan Clubs</h1>'+
      '<p>Encontre pessoas que curtem o mesmo som. Participe das conversas, compartilhe descobertas e monte experiências musicais juntos.</p>'+
      '<div class="sf126-club-hero-actions">'+
      '<button type="button" class="sf126-primary" data-sf126-club="discover">▷ Descobrir Fan Clubs →</button>'+
      '<button type="button" class="sf126-outline" data-sf126-club="create">♧ Criar um Fan Club</button>'+
      '</div></div>';
     scroller.insertBefore(hero,hub);
     hero.addEventListener('click',e=>{
       const btn=e.target.closest('[data-sf126-club]');if(!btn)return;
       if(btn.dataset.sf126Club==='discover')$('sf71ClubSearch')?.focus({preventScroll:false});
       if(btn.dataset.sf126Club==='create')$('sf71CreateClub')?.click();
     });
   }
   if(!q('.sf126-club-layout',scroller)){
     const content=make('div','sf126-club-layout');
     const right=make('aside','sf126-club-side');
     right.innerHTML=
       '<section class="sf126-club-side-card sf126-club-recommendations">'+
       '<h3>✦ Fan Clubs para conhecer</h3>'+
       '<p>Descubra comunidades disponíveis agora.</p>'+
       '<div id="sf126ClubRecommendations" aria-live="polite"></div>'+
       '</section>'+
       '<section class="sf126-club-side-card"><h3>✉ Convites e notificações</h3>'+
       '<p>Encontre convites recebidos e novidades dos fãs na central de notificações.</p>'+
       '<button type="button" data-sf126-club="notifications">Abrir notificações →</button></section>'+
       '<section class="sf126-club-side-card"><h3>♫ Sua comunidade musical</h3>'+
       '<p>Publicações, salas vinculadas e membros ficam dentro de cada Fan Club.</p>'+
       '<button type="button" data-sf126-club="mine">Meus Fan Clubs →</button></section>';
     content.append(hub,right);scroller.append(content);
     right.addEventListener('click',e=>{
       const b=e.target.closest('button');if(!b)return;
       const id=b.dataset.sf126ClubId;if(validClub(id)){window.sf71OpenFanClub?.(id);return;}
       if(b.dataset.sf126Club==='notifications'){q('.sf5-community-layer .sf5-close')?.click();window.sf15OpenNotifications?.();}
       if(b.dataset.sf126Club==='mine'){
         const mine=$('sf71ClubMine');
         if(mine&&mine.getAttribute('aria-pressed')!=='true')mine.click();
         $('sf71ClubSearch')?.scrollIntoView({block:'center',behavior:'smooth'});
       }
     });
   }
   const list=$('sf71ClubList');
   if(list&&(!clubObserver||clubObserver.target!==list)){
     clubObserver?.disconnect();
     const observer=new MutationObserver(updateRecommendations);
     observer.observe(list,{childList:true});
     clubObserver=observer;
     clubObserver.target=list;
   }
   updateRecommendations();
 }
 function updateRecommendations(){
   const target=$('sf126ClubRecommendations'),list=$('sf71ClubList');
   if(!target||!list)return;
   const cards=qa('.sf71-club-card',list).slice(0,4);
   // Use the same actual cards returned by /api/fan-clubs. No fake recommendations.
   if(!cards.length){target.innerHTML='<p class="sf126-rail-empty">Os clubes aparecerão aqui quando estiverem disponíveis.</p>';return;}
   const safe=cards.map(card=>{
     const button=q('[data-sf71-open]',card),title=q('.sf71-club-copy strong',card)?.textContent?.trim()||'Fan Club';
     const id=button?.dataset.sf71Open;
     if(!validClub(id))return '';
     const img=q('.sf71-club-art img',card);
     const div=make('button','sf126-recommended');
     div.type='button';div.dataset.sf126ClubId=id;
     if(img?.getAttribute('src')){
       const thumbnail=document.createElement('img');thumbnail.src=img.getAttribute('src');thumbnail.alt='';thumbnail.loading='lazy';
       div.append(thumbnail);
     }else div.append(make('span','sf126-reco-icon','♫'));
     const label=make('strong','',title);
     div.append(label,make('span','sf126-reco-arrow','→'));
     return div;
   }).filter(Boolean);
   target.replaceChildren(...safe);
 }
 function decorateClubs(){
   const layer=q('.sf5-community-layer');
   const shell=q('.sf110-community-shell',layer||document);
   if(!layer||!shell)return;
   layer.classList.add('sf126-fan-layer');
   shell.classList.add('sf126-fan-shell','sf110-show-details');
   const top=q('.sf5-community-top h2',shell);if(top)top.textContent='Fan Clubs';
   const sub=q('.sf5-community-top p',shell);if(sub)sub.textContent='Comunidades musicais criadas por fãs.';
   // The old Community summary stays in the DOM as a compatibility hook, but is not shown.
   $('sf71ClubSearch')?.removeAttribute('disabled');
   const panel=$('sfFanClubsPanel');
   if(panel){
     qa('#sfSocialHub .sf-hub-panel').forEach(x=>x.hidden=x!==panel);
     panel.hidden=false;
   }
   clubRail(shell);
   window.sf71LoadFanClubs?.();
 }
 function installFanClubs(){
   if(typeof window.sf110OpenCommunity==='function'){
     const original=window.sf110OpenCommunity;
     if(original.sf126Focused)return;
     const focused=function(){
       const result=original.call(this,'fanclubs');
       decorateClubs();
       return result;
     };
     focused.sf126Focused=true;
     window.sf110OpenCommunity=focused;
     window.sf126OpenClubs=focused;
   }
   // No duplicate "Community" destination. Existing social features remain
   // reachable inside Fan Clubs and the Lobby's notifications/favorites.
   qa('[data-sf125-go="community"]',document).forEach(btn=>btn.remove());
 }
 function modalTheme(){
   // The full search UI is lazy mounted by v77. Keep its native handlers and IDs.
   // v126 CSS styles it and all older modals; no player/search logic is overwritten.
   document.documentElement.classList.add('sf126-theme-ready');
 }
 function init(){
   ensureLobby();installFanClubs();modalTheme();
   document.addEventListener('sf125:ready',ensureLobby);
   if(!$('sf125LobbyHero')){
     const observer=new MutationObserver(()=>{
       if(ensureLobby())observer.disconnect();
     });
     observer.observe(document.body,{childList:true,subtree:true});
   }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
