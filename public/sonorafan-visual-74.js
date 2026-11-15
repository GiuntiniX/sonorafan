/* SonoraFan 74.0 — functional doorway to Fan Clubs, cleanup of deprecated injected widgets. */
(()=>{
 'use strict';
 function qs(q){return document.querySelector(q)}
 // Reconcile the legacy two-tab Social component with the newer Fan Clubs tab.
 let currentTab='friends';
 function selectCommunityTab(tab){
   if(!['friends','events','fanclubs'].includes(tab))tab='friends';
   const hub=document.getElementById('sfSocialHub');if(!hub)return;
   const wasFanClubVisible=!document.getElementById('sfFanClubsPanel')?.hidden;
   [['friends','sfFriendsPanel'],['events','sfEventsPanel'],['fanclubs','sfFanClubsPanel']].forEach(([key,id])=>{
     const panel=document.getElementById(id);if(panel)panel.hidden=key!==tab;
   });
   hub.querySelectorAll('[data-sf-tab]').forEach(button=>{
     const selected=button.dataset.sfTab===tab;
     button.classList.toggle('active',selected);
     button.setAttribute('aria-selected',String(selected));
   });
   currentTab=tab;
   if(tab==='fanclubs'&&!wasFanClubVisible) window.sf71LoadFanClubs?.();
   if(tab!=='fanclubs')window.sf71StopLive?.();
 }
 window.sfSocialSwitchTab=tab=>{
   const button=qs('#sfSocialHub [data-sf-tab="'+String(tab||'').replace(/[^a-z]/g,'')+'"]');
   if(!button)return;
   button.click();
   selectCommunityTab(tab);
 };
 function openFanClubs(){
   if(typeof window.sf5OpenCommunity !== 'function')return;
   window.sf5OpenCommunity();
   window.sfSocialSwitchTab('fanclubs');
 }
 window.sf74OpenFanClubs=openFanClubs;
 function init(){
   document.getElementById('sf74OpenFanClubs')?.addEventListener('click',openFanClubs);
   document.addEventListener('click',e=>{
     const tab=e.target.closest('#sfSocialHub [data-sf-tab]');
     if(tab)selectCommunityTab(tab.dataset.sfTab);
   });
   // Remove old DOM widgets if an older script was still cached by the browser.
   ['sf67QueueStats','sf67ChatCompanion','sf67LobbySummary'].forEach(id=>document.getElementById(id)?.remove());
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
