/* SonoraFan 303 — Central de interações e Music Intelligence no Admin Control Center.
   Acesso concedido exclusivamente pelo servidor; nenhuma métrica inventada. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const fmt=n=>Number(n||0).toLocaleString('pt-BR');
const stamp=t=>t?new Date(t).toLocaleString('pt-BR'):'—';
const api=async(path,body)=>{
 const opts={credentials:'include',cache:'no-store'};
 if(body!==undefined){opts.method='POST';opts.headers={'Content-Type':'application/json'};opts.body=JSON.stringify(body);}
 const response=await fetch(path,opts);let data={};
 try{data=await response.json();}catch{}
 if(!response.ok)throw Error(data.error||'Falha na operação: '+response.status);
 return data;
};
const note=(id,msg)=>{const el=$(id);if(el)el.textContent=msg||'';};
let busy=false;
function row(label,count,max){
 const pct=max>0?Math.min(100,Number(count||0)/max*100):0;
 return '<div class="sf303-bar-row"><span>'+esc(label)+'</span><div class="sf303-meter"><i style="width:'+pct+'%"></i></div><strong>'+fmt(count)+'</strong></div>';
}
function summary(label,value){return '<div class="sf303-stat"><small>'+esc(label)+'</small><strong>'+fmt(value)+'</strong></div>';}
function list(values,empty){return values.length?values.join(''):'<p class="sf303-muted">'+esc(empty)+'</p>';}
async function loadCampaigns(){
 const data=await api('/api/admin/community303/campaigns'),host=$('sf303CampaignList');if(!host)return;
 host.innerHTML=list(data.campaigns.map(c=>{
  const counts=c.counts||[],choices=c.choices||[],total=c.totalVotes||0;
  const results=choices.map((x,i)=>row(x,counts[i]||0,Math.max(1,total))).join('');
  const actions=c.status==='closed'?'':[
   c.status==='published'?'<button data-sf303-action="pause" data-id="'+esc(c.id)+'">Pausar</button>':'<button data-sf303-action="publish" data-id="'+esc(c.id)+'">Publicar</button>',
   '<button data-sf303-action="close" data-id="'+esc(c.id)+'" class="sf303-warn">Encerrar</button>'
  ].join('');
  return '<article class="sf303-campaign"><div class="sf303-campaign-head"><strong>'+esc(c.title)+'</strong><span class="sf303-pill">'+esc(c.status)+'</span></div>'+
   '<p>'+esc(c.description||'')+'</p><small>'+esc(c.type)+' · '+esc(c.scope)+(c.scopeId?' ('+esc(c.scopeId)+')':'')+' · '+esc(c.channel)+'</small>'+
   '<small>'+stamp(c.startsAt)+' — '+stamp(c.endsAt)+'</small>'+
   (choices.length?'<div class="sf303-results">'+results+'</div>':'')+
   '<div class="sf303-actions">'+actions+'<span>'+fmt(total)+' votos</span></div></article>';
 }), 'Nenhuma campanha cadastrada. Crie um rascunho para começar.');
}
async function createCampaign(ev){
 ev.preventDefault();if(busy)return;const form=ev.currentTarget;
 const read=name=>form.elements[name]?.value||'';
 const type=read('type'),choices=read('choices').split('\n').map(x=>x.trim()).filter(Boolean);
 const body={
  type,title:read('title'),description:read('description'),scope:read('scope'),
  scopeId:read('scopeId'),channel:read('channel'),choices,bonusXP:Number(read('bonusXP'))||0,badgeName:read('badgeName')
 };
 const start=read('startsAt'),end=read('endsAt');
 try{if(start)body.startsAt=new Date(start).toISOString();if(end)body.endsAt=new Date(end).toISOString();}
 catch(_){note('sf303CampaignNote','Preencha datas e horários válidos.');return;}
 if(type!=='announcement'&&(choices.length<2||choices.length>6)){note('sf303CampaignNote','Informe de 2 a 6 opções, uma por linha.');return;}
 busy=true;const button=form.querySelector('[type=submit]');if(button)button.disabled=true;
 try{
   await api('/api/admin/community303/campaigns',body);
   note('sf303CampaignNote','Rascunho criado. Revise antes de publicar.');
   form.reset();form.elements.type?.dispatchEvent(new Event('change'));form.elements.scope?.dispatchEvent(new Event('change'));await loadCampaigns();
 }catch(e){note('sf303CampaignNote',e.message);}
 finally{busy=false;if(button)button.disabled=false;}
}
async function actCampaign(button){
 if(busy)return;
 const action=button.dataset.sf303Action,id=button.dataset.id;
 if(!['publish','pause','close'].includes(action)||!id)return;
 if(!confirm((action==='publish'?'Publicar':action==='pause'?'Pausar':'Encerrar')+' esta campanha?'))return;
 busy=true;button.disabled=true;
 try{await api('/api/admin/community303/campaigns/'+encodeURIComponent(id)+'/action',{action});await loadCampaigns();note('sf303CampaignNote','Campanha atualizada.');}
 catch(e){note('sf303CampaignNote',e.message);}
 finally{busy=false;button.disabled=false;}
}
async function loadInsights(){
 const [data,campaigns]=await Promise.all([api('/api/admin/community303/insights'),api('/api/admin/community303/campaigns')]);
 const days=data.daily||[],tracks=data.tracks||[],starts=days.reduce((n,d)=>n+Number(d.starts||0),0);
 const joined=days.reduce((n,d)=>n+Number(d.roomJoins||0),0),returning=days.reduce((n,d)=>n+Number(d.returningUsers||0),0);
 const uniq=days.reduce((n,d)=>n+Number(d.uniqueUsers||0),0);
 const completed=days.reduce((n,d)=>n+Number(d.completedStays||0),0);
 const staySeconds=days.reduce((n,d)=>n+Number(d.staySeconds||0),0);
 if($('sf303MusicSummary'))$('sf303MusicSummary').innerHTML=[
  summary('Inícios de reprodução · 7 dias',starts),summary('Salas acessadas · 7 dias',joined),
  summary('Perfis consultados (amostra)',data.profilesSampled||0),summary('Campanhas cadastradas',campaigns.campaigns.length)
 ].join('');
 const sorted=obj=>Object.entries(obj||{}).sort((a,b)=>b[1]-a[1]).slice(0,12);
 const genres=sorted(data.genres),favorites=sorted(data.declaredGenres);
 if($('sf303GenreStarts'))$('sf303GenreStarts').innerHTML=list(genres.map(x=>row(x[0],x[1],genres[0][1])),'Ainda não há reproduções instrumentadas.');
 if($('sf303GenreFavorites'))$('sf303GenreFavorites').innerHTML=list(favorites.map(x=>row(x[0],x[1],favorites[0][1])),'Nenhum gênero declarado no recorte.');
 const artists=(data.artists||[]).slice(0,18);
 if($('sf303Artists'))$('sf303Artists').innerHTML=list(artists.map((a,i)=>
  '<div class="sf303-track"><b>'+(i+1)+'</b><div><strong>'+esc(a.artist||'Artista')+'</strong><small>'+fmt(a.added)+' músicas adicionadas</small></div><span>'+fmt(a.starts)+' ▶</span></div>'
 ),'Ainda não há dados de reproduções por artista.');
 const addedTracks=(data.mostAddedTracks||[]),addedArtists=(data.mostAddedArtists||[]);
 if($('sf303MostAddedTracks'))$('sf303MostAddedTracks').innerHTML=list(addedTracks.map((t,i)=>
  '<div class="sf303-track"><b>'+(i+1)+'</b><div><strong>'+esc(t.title||'Música')+'</strong><small>'+esc(t.artist||'Artista')+'</small></div><span>'+fmt(t.added)+' +</span></div>'
 ),'Sem histórico de adições.');
 if($('sf303MostAddedArtists'))$('sf303MostAddedArtists').innerHTML=list(addedArtists.map((a,i)=>
  '<div class="sf303-track"><b>'+(i+1)+'</b><div><strong>'+esc(a.artist||'Artista')+'</strong></div><span>'+fmt(a.added)+' +</span></div>'
 ),'Sem histórico de adições por artista.');
 if($('sf303TrackTable'))$('sf303TrackTable').innerHTML=list(tracks.slice(0,20).map((t,i)=>
  '<div class="sf303-track"><b>'+(i+1)+'</b><div><strong>'+esc(t.title||'Música')+'</strong><small>'+esc(t.artist||'Artista desconhecido')+'</small></div>'+
  '<span>'+fmt(t.starts)+' ▶ · '+fmt(t.added)+' + · '+fmt(t.skips)+' ⏭</span></div>'
 ),'Sem histórico instrumentado de músicas.');
 const dayRows=days.map(d=>row(d.day,d.starts,Math.max(1,...days.map(y=>y.starts||0))));
 if($('sf303DailyMusic'))$('sf303DailyMusic').innerHTML=dayRows.join('');
 if($('sf303SampleNote'))$('sf303SampleNote').textContent='Gêneros preferidos: '+fmt(data.profilesSampled)+' perfis consultados'+(data.profilesCapped?' (amostra limitada a 1.000)':'')+'. Inícios de reprodução ≠ tempo ouvido. Dados coletados após ativação desta versão.';
 if($('sf303EngagementSummary'))$('sf303EngagementSummary').innerHTML=[
   summary('Únicos em salas · soma diária',uniq),summary('Retornos registrados',returning),
   summary('Entradas em salas',joined),summary('Permanência média · min',completed?Math.round(staySeconds/completed/60):0)
 ].join('');
 if($('sf303EngagementDaily'))$('sf303EngagementDaily').innerHTML=days.map(d=>
  '<div class="sf303-day"><strong>'+esc(d.day)+'</strong><span>'+fmt(d.uniqueUsers)+' únicos · '+fmt(d.returningUsers)+' retornos · '+fmt(d.roomJoins)+' entradas · '+fmt(d.completedStays||0)+' saídas</span></div>'
 ).join('');
 const sections={};for(const d of days)for(const [k,v] of Object.entries(d.sections||{}))sections[k]=(sections[k]||0)+Number(v||0);
 const entries=sorted(sections);
 if($('sf303Sections'))$('sf303Sections').innerHTML=list(entries.map(x=>row(x[0],x[1],entries[0][1])),'Nenhuma navegação registrada.');
}
async function loadOperations(){
 const data=await api('/api/admin/community303/operations');
 if($('sf303HoldChat'))$('sf303HoldChat').checked=!!data.operations.chatHold;
 if($('sf303HoldCreate'))$('sf303HoldCreate').checked=!!data.operations.createHold;
}
async function saveOperations(){
 if(!confirm('Aplicar estas restrições operacionais a toda a comunidade?'))return;
 try{const data=await api('/api/admin/community303/operations',{
    chatHold:!!$('sf303HoldChat')?.checked,createHold:!!$('sf303HoldCreate')?.checked
 });note('sf303OperationNote','Configuração salva e enviada ao servidor.');
 }catch(e){note('sf303OperationNote',e.message);await loadOperations().catch(()=>{});}
}
function init(){
 $('sf303CampaignForm')?.addEventListener('submit',createCampaign);
 $('sf303CampaignList')?.addEventListener('click',e=>{const b=e.target.closest('[data-sf303-action]');if(b)actCampaign(b);});
 $('sf303SaveOperations')?.addEventListener('click',saveOperations);
 $('sf303CampaignRefresh')?.addEventListener('click',()=>loadCampaigns().catch(e=>note('sf303CampaignNote',e.message)));
 $('sf303InsightsRefresh')?.addEventListener('click',()=>loadInsights().catch(e=>note('sf303InsightsNote',e.message)));
 $('sf303EngagementRefresh')?.addEventListener('click',()=>loadInsights().catch(e=>note('sf303EngagementNote',e.message)));
 const type=$('sf303CampaignForm')?.elements?.type;
 if(type)type.addEventListener('change',()=>{const mission=$('sf303MissionXP'),choices=$('sf303Choices');if(mission)mission.hidden=type.value!=='mission';const medal=$('sf303MissionBadge');if(medal)medal.hidden=type.value!=='mission';if(choices)choices.hidden=type.value==='announcement';});
 const scope=$('sf303CampaignForm')?.elements?.scope;
 if(scope)scope.addEventListener('change',()=>{const container=$('sf303ScopeTarget'),channel=$('sf303CampaignForm')?.elements?.channel;if(container)container.hidden=scope.value==='all';if(channel&&scope.value!=='room'&&channel.value==='chat')channel.value='card';});
}
window.sf303Admin={loadCampaigns,loadInsights,loadOperations};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
