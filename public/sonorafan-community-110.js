/* SonoraFan 110 — community overview adapted from the chosen festival mockup.
 * Reuses the original community modal, friends tab, Fan Club management,
 * event RSVP and private inbox. No synthetic members, events or messages.
 */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const safeId=s=>/^[a-f0-9-]{24,36}$/i.test(String(s||''));
 const coverFallback=['/art-44/festival-crowd.webp','/art-33/poster-rock.webp','/art-33/poster-electro.webp'];
 const state={open:0,conversations:[],clubs:[],friends:[],events:[],loading:true,errors:[]};
 const shell=()=>document.querySelector('.sf5-community-layer .sf5-community-shell.sf110-community-shell');
 const panel=()=>document.querySelector('.sf5-community-layer .sf110-dashboard');
 async function request(path){
   const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),8500);
   try{
     const r=await fetch(path,{credentials:'include',cache:'no-store',signal:ctrl.signal});
     if(!r.ok)throw Error('Serviço temporariamente indisponível.');
     return r.json();
   }finally{clearTimeout(timer);}
 }
 function closeLayer(){shell()?.querySelector('.sf5-close')?.click();}
 function photo(person){
   // API avatar field is a short emoji, never a user-supplied URL.
   return esc(String(person?.avatar||'🎧').slice(0,8));
 }
 function relative(ms){
   if(!Number.isFinite(Number(ms))||!Number(ms))return '';
   const diff=Math.max(0,Date.now()-Number(ms));
   if(diff<60000)return 'Agora';
   if(diff<3600000)return 'há '+Math.floor(diff/60000)+' min';
   if(diff<86400000)return 'há '+Math.floor(diff/3600000)+' h';
   return new Date(Number(ms)).toLocaleDateString('pt-BR');
 }
 function clubArt(c,i){
   const id=String(c.id||'');
   return c.coverVersion&&/^[a-f0-9-]{36}$/i.test(id)
     ? '/api/fan-clubs/'+id+'/cover?v='+encodeURIComponent(c.coverVersion)
     : coverFallback[i%coverFallback.length];
 }
 function head(){
   return `<div class="sf110-hero">
     <div><span>SONORAFAN · COMUNIDADE</span><h2>Comunidades</h2>
       <p>Suas conexões, grupos e conversas em um só lugar.</p></div>
   </div>`;
 }
 function messages(){
   const data=state.conversations;
   return `<section class="sf110-card sf110-messages">
     <div class="sf110-card-head"><h3>▣ Conversas recentes</h3>
       <button type="button" data-sf110-action="inbox">Ver todas ›</button></div>
     <div class="sf110-message-list">
       ${data.length?data.slice(0,4).map(m=>`
         <button class="sf110-message-row" type="button" data-sf110-dm="${esc(m.id)}">
          <span class="sf110-person-avatar">${photo(m)}</span><span class="sf110-message-copy">
           <strong>${esc(m.name||'Ouvinte')}</strong>
           <small>${esc(m.preview||'Abrir conversa')}</small></span>
           <span class="sf110-message-time">${esc(relative(m.updatedAt))}${m.unread?'<i title="Não lida"></i>':''}</span>
         </button>`).join(''):
         '<div class="sf110-empty">'+(state.loading?'Carregando conversas…':'Nenhuma conversa recente. Comece chamando uma pessoa para ouvir música.')+'</div>'}
     </div>
     <button type="button" class="sf110-wide-button" data-sf110-action="inbox">✉ Nova conversa</button>
   </section>`;
 }
 function clubs(){
  return `<section class="sf110-card sf110-clubs">
   <div class="sf110-card-head"><h3>♧ Grupos e Fan Clubs que participo</h3>
     <button type="button" data-sf110-action="fanclubs">Ver todos ›</button></div>
   <div class="sf110-club-grid">
   ${state.clubs.length?state.clubs.slice(0,3).map((c,i)=>`
     <button type="button" class="sf110-club" data-sf110-club="${esc(c.id)}">
       <img src="${clubArt(c,i)}" alt="" loading="lazy" decoding="async"
         data-sf110-fallback="${coverFallback[i%coverFallback.length]}">
       <span><strong>${esc(c.title||'Fan Club')}</strong><small>${c.owner?'Criado por você':'Participando'} · ${Math.max(0,Number(c.memberCount)||0)} membros</small></span>
     </button>`).join(''):'<div class="sf110-empty">'+(state.loading?'Carregando Fan Clubs…':'Você ainda não participa de Fan Clubs.')+'</div>'}
     <button type="button" class="sf110-join-more" data-sf110-action="fanclubs"><b>＋</b><span>Entrar em mais comunidades</span></button>
   </div>
  </section>`;
 }
 function friends(){
   const online=state.friends.filter(f=>f.online);
   return `<section class="sf110-card sf110-friends"><div class="sf110-card-head">
     <h3><span class="sf110-dot"></span> Amigos online</h3>
     <button type="button" data-sf110-action="friends">Ver todos ›</button></div>
     <div class="sf110-friends-row">
       ${online.length?online.slice(0,6).map(p=>`
         <button type="button" class="sf110-person" data-sf110-friend="${esc(p.id)}"
           title="Conversar com ${esc(p.name||'Ouvinte')}">
           <span class="sf110-person-avatar">${photo(p)}<i class="sf110-online"></i></span>
           <small>${esc(p.name||'Ouvinte')}</small>
         </button>`).join(''):'<p class="sf110-muted">'+(state.loading?'Consultando amigos online…':'Nenhum amigo online agora. Encontre pessoas na comunidade.')+'</p>'}
       <button class="sf110-person sf110-add-friend" type="button" data-sf110-action="friends" title="Encontrar amigos"><span>＋</span><small>Buscar</small></button>
     </div>
   </section>`;
 }
 function agenda(){
   return `<section class="sf110-card sf110-agenda">
     <div class="sf110-card-head"><h3>▦ Agenda da comunidade</h3>
       <button type="button" data-sf110-action="events">Ver agenda ›</button></div>
     <div class="sf110-event-list">
       ${state.events.length?state.events.filter(e=>Number(e.startAt)>Date.now()-3600000).slice(0,3).map(e=>{
         const d=new Date(e.startAt);
         return `<button type="button" class="sf110-event-row" data-sf110-action="events">
            <span class="sf110-calendar"><small>${esc(d.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','').toUpperCase())}</small>
              <b>${d.getDate()}</b></span>
            <span><strong>${esc(e.title||'Encontro SonoraFan')}</strong>
              <small>${esc(e.roomName||'Sala da comunidade')} · ${esc(d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}))}</small></span>
            <i aria-hidden="true">›</i>
           </button>`;
         }).join(''):'<div class="sf110-empty">'+(state.loading?'Carregando agenda…':'Ainda não existem encontros agendados.')+'</div>'}
     </div>
   </section>`;
 }
 function render(){
   const p=panel();if(!p)return;
   p.innerHTML=head()+`<div class="sf110-columns">
      <div class="sf110-left">${messages()}${clubs()}</div>
      <div class="sf110-right">${friends()}${agenda()}</div>
     </div>
     <section class="sf110-discover"><div><h3>✧ Descubra mais comunidades</h3>
       <p>Encontre Fan Clubs, estilos e pessoas com a mesma vibe musical.</p></div>
       <div><button type="button" data-sf110-action="fanclubs">Explorar Fan Clubs ›</button>
       <button type="button" data-sf110-action="create">＋ Criar Fan Club</button></div>
     </section>
     <p class="sf110-footnote" role="status">${state.errors.length?'Alguns recursos não carregaram. Use Ver todos para abrir a área completa.':'Dados reais de suas conversas, Fan Clubs, amigos e eventos.'}</p>`;
 }
 function showDetails(tab){
   const s=shell();if(!s)return;
   s.classList.add('sf110-show-details');
   const back=s.querySelector('#sf110Back');if(back)back.hidden=false;
   const subtitle=s.querySelector('.sf5-community-top p');
   if(subtitle)subtitle.textContent='Explore os recursos completos da comunidade.';
   window.sfSocialSwitchTab?.(['friends','events','fanclubs'].includes(tab)?tab:'friends');
   s.querySelector('.sf5-community-scroll')?.scrollTo({top:0,behavior:'smooth'});
 }
 function back(){
   const s=shell();if(!s)return;
   s.classList.remove('sf110-show-details');
   const button=s.querySelector('#sf110Back');if(button)button.hidden=true;
   const subtitle=s.querySelector('.sf5-community-top p');
   if(subtitle)subtitle.textContent='Conecte-se, compartilhe e faça parte da música.';
   render();s.querySelector('.sf5-community-scroll')?.scrollTo({top:0,behavior:'smooth'});
 }
 function click(ev){
   const target=ev.target.closest('button');if(!target)return;
   const dm=target.closest('[data-sf110-dm]');
   if(dm){const p=state.conversations.find(x=>x.id===dm.dataset.sf110Dm);
      closeLayer();window.sf53OpenInbox?.(p?.id,p?.name);return;}
   const person=target.closest('[data-sf110-friend]');
   if(person){const f=state.friends.find(x=>x.id===person.dataset.sf110Friend);
      closeLayer();window.sf53OpenInbox?.(f?.id,f?.name);return;}
   const club=target.closest('[data-sf110-club]');
   if(club){showDetails('fanclubs');if(safeId(club.dataset.sf110Club))window.sf71OpenFanClub?.(club.dataset.sf110Club);return;}
   const act=target.dataset.sf110Action;
   if(act==='inbox'){closeLayer();window.sf53OpenInbox?.();return;}
   if(act==='fanclubs'||act==='friends'||act==='events'){showDetails(act);return;}
   if(act==='create'){showDetails('fanclubs');$('sf71CreateClub')?.click();return;}
   if(act==='back'){back();}
 }
 async function load(){
   const current=++state.open;
   const endpoints=[
     ['/api/chat53/inbox','conversations'],['/api/fan-clubs?mine=true','clubs'],
     ['/api/social/following','friends'],['/api/social/events','events']
   ];
   state.loading=true;state.errors=[];render();
   await Promise.all(endpoints.map(async([url,key])=>{
     try{
       const body=await request(url);
       if(current!==state.open)return;
       state[key]=key==='clubs'?(Array.isArray(body?.clubs)?body.clubs:[]):Array.isArray(body)?body:[];
       render();
     }catch(e){if(current===state.open){state.errors.push(key);render();}}
   }));
   if(current===state.open){state.loading=false;render();}
 }
 function open(initial='overview'){
   if(typeof original!=='function')return;
   original();
   const layer=document.querySelector('.sf5-community-layer');
   const s=layer?.querySelector('.sf5-community-shell');
   const scroller=s?.querySelector('.sf5-community-scroll');
   if(!s||!scroller)return;
   s.classList.add('sf110-community-shell');
   const heading=s.querySelector('.sf5-community-top h2');
   if(heading)heading.textContent='Comunidades';
   const sub=s.querySelector('.sf5-community-top p');
   if(sub)sub.textContent='Conecte-se, compartilhe e faça parte da música.';
   const goBack=document.createElement('button');
   goBack.type='button';goBack.id='sf110Back';goBack.hidden=true;
   goBack.textContent='← Visão geral';goBack.addEventListener('click',back);
   s.querySelector('.sf5-community-top')?.insertBefore(goBack,s.querySelector('.sf5-community-top .sf5-close'));
   state.conversations=[];state.clubs=[];state.friends=[];state.events=[];
   state.loading=true;state.errors=[];
   const p=document.createElement('div');p.className='sf110-dashboard';
   scroller.insertBefore(p,scroller.firstChild);
   p.addEventListener('click',click);
   p.addEventListener('error',event=>{
     const img=event.target;
     if(img instanceof HTMLImageElement&&img.dataset.sf110Fallback){
       const fallback=img.dataset.sf110Fallback;delete img.dataset.sf110Fallback;img.src=fallback;
     }
   },true);
   render();load();
   if(initial!=='overview')showDetails(initial);
 }
 let original=null;
 function init(){
   if(typeof window.sf5OpenCommunity!=='function')return;
   original=window.sf5OpenCommunity;
   window.sf110OpenCommunity=open;
   window.sf110ShowDetails=showDetails;
   const nativeTabSwitch=window.sfSocialSwitchTab;
   if(typeof nativeTabSwitch==='function'){
     window.sfSocialSwitchTab=tab=>{
       nativeTabSwitch(tab);
       if(shell()&&!shell().classList.contains('sf110-show-details')){
         const s=shell();
         s.classList.add('sf110-show-details');
         const back=s.querySelector('#sf110Back');if(back)back.hidden=false;
       }
     };
   }
   window.sf5OpenCommunity=()=>open('overview');
   document.addEventListener('sf71:created',()=>{
     if(shell())load();
   });
   document.addEventListener('visibilitychange',()=>{
     if(!document.hidden&&shell()&&!shell().classList.contains('sf110-show-details'))load();
   });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();