'use strict';
// SonoraFan 303 — campanhas globais, segmentação, métricas musicais e operação.
// Tudo persistido no Firestore; nenhuma campanha é publicada automaticamente.
const crypto=require('crypto');
const {firestore}=require('firebase-admin');
const inc=n=>firestore.FieldValue.increment(n);
const TYPES=new Set(['poll','battle','announcement','mission']);
const CHANNELS=new Set(['card','banner','chat']);
const AUDIENCES=new Set(['all','room','club']);
const GENRES=new Set(['rock','pop','kpop','indie','funk','rap','trap','mpb','pagode','samba','sertanejo','forro','reggae','jazz','metal','eletronica','hiphop','lofi','rnb','classica','gospel','outros','punk','blues','latina','house','techno']);
const clean=(x,n=120)=>String(x??'').replace(/[\u0000-\u001f\u007f<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const hash=x=>crypto.createHash('sha256').update(String(x).toLowerCase()).digest('hex');
const day=(at=Date.now())=>new Date(at).toISOString().slice(0,10);
const bound=(n,min,max)=>Math.min(max,Math.max(min,Number(n)||0));
const httpError=(status,message)=>Object.assign(new Error(message),{status});
const publicCampaign=c=>({
 id:c.id,type:c.type,title:c.title,description:c.description,
 choices:c.type==='announcement'?[]:c.choices,
 scope:c.scope,scopeId:c.scopeId,channel:c.channel,
 startsAt:c.startsAt,endsAt:c.endsAt,status:c.status,
 counts:c.counts||[],totalVotes:c.totalVotes||0,
 bonusXP:c.type==='mission'?c.bonusXP:0,badgeName:c.type==='mission'?c.badgeName||'':''
});
function createCommunityCenter303({app,db,io,sessionEmail,rateLimit,rooms,users,audit,gamification45}){
 const campaigns=db.collection('sonorafanCampaigns303');
 const config=db.collection('sonorafanOperations303').doc('current');
 let current=new Map(),ready=false,disabled=false;
 let operations={chatHold:false,createHold:false};
 const seenTracks=new Map(),seenVisits=new Set();
 const reportError=(res,e)=>res.status(e.status||503).json({error:e.status?e.message:'Serviço temporariamente indisponível.'});
 const eligiblePeriod=c=>c.status==='published'&&c.startsAt<=Date.now()&&c.endsAt>Date.now();
 function emitChanged(){io.emit('sf303:changed',{at:Date.now()});}
 async function load(){
  try{
   const [list,settings]=await Promise.all([campaigns.orderBy('createdAt','desc').limit(150).get(),config.get()]);
   current=new Map(list.docs.map(d=>[d.id,{...d.data(),id:d.id}]));
   operations=settings.exists?{chatHold:!!settings.data().chatHold,createHold:!!settings.data().createHold}:{chatHold:false,createHold:false};
   ready=true;
  }catch(e){console.error('Community303: falha na restauração:',e.message);disabled=true;ready=false;}
 }
 const initialized=load();
 function ensureReady(){if(!ready||disabled)throw httpError(503,'Campanhas ainda não disponíveis.');}
 let lastActive='';
 const checkSchedule=()=>{
  if(!ready)return;
  const active=[...current.values()].filter(eligiblePeriod).map(x=>x.id).sort().join(',');
  if(active!==lastActive){lastActive=active;emitChanged();}
 };
 const ticker=setInterval(checkSchedule,12000);ticker.unref?.();
 initialized.then(checkSchedule);
 async function audienceMatches(c,email){
  if(c.scope==='all')return true;
  if(c.scope==='room'){
   return [...io.sockets.sockets.values()].some(s=>s.userEmail===email&&s.rooms?.has(c.scopeId));
  }
  if(c.scope==='club'){
   const club=await db.collection('sonorafanFanClubs71').doc(c.scopeId).get();
   if(!club.exists)return false;
   const publicId=hash('sf-public-v1:'+email).slice(0,24);
   const data=club.data();
   return data.ownerId===publicId||Array.isArray(data.memberIds)&&data.memberIds.includes(publicId);
  }
  return false;
 }
 async function visible(email){
  ensureReady();
  const all=[...current.values()].filter(eligiblePeriod).sort((a,b)=>b.createdAt-a.createdAt).slice(0,18);
  const result=[];
  for(const c of all){
   if(result.length>=4)break;
   if(!await audienceMatches(c,email))continue;
   const snap=await campaigns.doc(c.id).collection('votes').doc(hash(email)).get();
   result.push({...publicCampaign(c),voted:snap.exists});
  }
  return result;
 }
 const adminList=()=>[...current.values()].sort((a,b)=>b.createdAt-a.createdAt).slice(0,100).map(publicCampaign);
 function validate(body){
  const type=clean(body?.type,15),title=clean(body?.title,110),description=clean(body?.description,500),
    scope=clean(body?.scope||'all',12),scopeId=clean(body?.scopeId,100),
    channel=clean(body?.channel||'card',15);
  if(!TYPES.has(type)||!CHANNELS.has(channel)||!AUDIENCES.has(scope)||title.length<5)throw httpError(400,'Tipo, título ou exibição inválidos.');
  if(channel==='chat'&&scope!=='room')throw httpError(400,'Exibição no chat requer uma sala específica.');
  if(scope!=='all'&&(!/^[a-zA-Z0-9_-]{2,100}$/.test(scopeId)))throw httpError(400,'Identificador de público inválido.');
  const choices=Array.isArray(body?.choices)?body.choices.map(v=>clean(v,70)).filter(Boolean):[];
  if(type!=='announcement'&&(choices.length<2||choices.length>6||new Set(choices.map(x=>x.toLowerCase())).size!==choices.length))throw httpError(400,'Use de 2 a 6 alternativas diferentes.');
  const now=Date.now();
  let startsAt=body?.startsAt?Date.parse(body.startsAt):now;
  let endsAt=body?.endsAt?Date.parse(body.endsAt):startsAt+24*3600e3;
  if(!Number.isFinite(startsAt)||!Number.isFinite(endsAt)||startsAt<now-86400000||startsAt>now+90*86400000||endsAt<=startsAt||endsAt>startsAt+30*86400000)throw httpError(400,'Período inválido: início em até 90 dias e duração máxima de 30 dias.');
  const bonusXP=type==='mission'?bound(body?.bonusXP,0,50):0;
  const badgeName=type==='mission'?clean(body?.badgeName,36):'';
  return {type,title,description,scope,scopeId:scope==='all'?'':scopeId,channel,choices:type==='announcement'?[]:choices,startsAt,endsAt,bonusXP,badgeName};
 }
 app.get('/api/community303/active',rateLimit(45,60000),async(req,res)=>{
  try{const email=sessionEmail(req);if(!email)return res.status(401).json({error:'Faça login.'});
    res.set('Cache-Control','no-store');res.json({campaigns:await visible(email)});
  }catch(e){reportError(res,e);}
 });
 app.post('/api/community303/:id/vote',rateLimit(20,60000),async(req,res)=>{
  try{
   ensureReady();
   const email=sessionEmail(req);if(!email)throw httpError(401,'Faça login.');
   const id=String(req.params.id||'');
   const existing=current.get(id);
   if(!existing||!eligiblePeriod(existing)||existing.type==='announcement')throw httpError(409,'Enquete indisponível.');
   if(!await audienceMatches(existing,email))throw httpError(403,'Você não faz parte deste público.');
   const option=Number(req.body?.option);
   if(!Number.isInteger(option)||option<0||option>=existing.choices.length)throw httpError(400,'Opção inválida.');
   const ref=campaigns.doc(id),voteRef=ref.collection('votes').doc(hash(email));
   const result=await db.runTransaction(async tx=>{
    const [snap,vote]=await Promise.all([tx.get(ref),tx.get(voteRef)]);
    if(vote.exists)throw httpError(409,'Você já participou.');
    if(!snap.exists)throw httpError(404,'Enquete não encontrada.');
    const c=snap.data();
    if(!eligiblePeriod(c)||c.type==='announcement'||option>=c.choices.length)throw httpError(409,'Enquete encerrada.');
    const counts=Array.isArray(c.counts)?c.counts.slice():c.choices.map(()=>0);
    counts[option]=(Number(counts[option])||0)+1;
    tx.set(voteRef,{option,at:Date.now()});
    tx.update(ref,{counts,totalVotes:(Number(c.totalVotes)||0)+1,updatedAt:Date.now()});
    return {...c,counts,totalVotes:(Number(c.totalVotes)||0)+1,id};
   });
   current.set(id,result);
   emitChanged();
   // A recompensa é entregue exclusivamente após o voto persistido, uma vez por campanha.
   let bonusApplied=false;
   if(result.type==='mission'&&(result.bonusXP>0||result.badgeName)){
     try{bonusApplied=!!await gamification45?.awardCampaignBonus?.(email,id,result.bonusXP,result.badgeName);}
     catch(e){console.error('Bônus de missão:',e.message);}
   }
   res.json({success:true,counts:result.counts,totalVotes:result.totalVotes,bonusApplied});
  }catch(e){reportError(res,e);}
 });
 // Recuperação idempotente de bônus após voto persistido (inclusive falhas temporárias).
 app.post('/api/community303/:id/claim',rateLimit(12,60000),async(req,res)=>{
  try{
   ensureReady();
   const email=sessionEmail(req);if(!email)throw httpError(401,'Faça login.');
   const id=String(req.params.id||''),c=current.get(id);
   if(!c||c.type!=='mission'||(!c.bonusXP&&!c.badgeName))throw httpError(404,'Recompensa não encontrada.');
   const vote=await campaigns.doc(id).collection('votes').doc(hash(email)).get();
   if(!vote.exists)throw httpError(403,'Participe da missão antes de receber XP.');
   const result=await gamification45.awardCampaignBonus(email,id,c.bonusXP,c.badgeName);
   res.json({success:true,bonusApplied:!!result});
  }catch(e){reportError(res,e);}
 });
 app.get('/api/admin/community303/campaigns',async(req,res)=>{
  try{ensureReady();res.set('Cache-Control','no-store');res.json({campaigns:adminList()});}catch(e){reportError(res,e);}
 });
 app.post('/api/admin/community303/campaigns',rateLimit(18,60000),async(req,res)=>{
  try{ensureReady();const data=validate(req.body),id=crypto.randomUUID(),now=Date.now();
    const doc={id,...data,counts:data.choices.map(()=>0),totalVotes:0,status:'draft',createdAt:now,updatedAt:now,createdBy:req.adminEmail};
    await campaigns.doc(id).set(doc);current.set(id,doc);audit(req.adminEmail,'campaign-created',id+' '+doc.type);
    res.status(201).json({campaign:publicCampaign(doc)});
  }catch(e){reportError(res,e);}
 });
 app.post('/api/admin/community303/campaigns/:id/action',rateLimit(25,60000),async(req,res)=>{
  try{
    ensureReady();const id=String(req.params.id||''),c=current.get(id);
    if(!c)throw httpError(404,'Campanha não encontrada.');
    const action=req.body?.action;
    const next=action==='publish'?'published':action==='pause'?'paused':action==='close'?'closed':null;
    if(!next)throw httpError(400,'Ação inválida.');
    if(c.status==='closed')throw httpError(409,'Campanha encerrada não pode ser reaberta.');
    if(next==='published'&&c.endsAt<=Date.now())throw httpError(409,'A campanha já expirou.');
    if(next==='published'&&c.scope==='room'&&!rooms.has(c.scopeId))throw httpError(409,'Sala de destino não existe.');
    if(next==='published'&&c.scope==='club'&&!(await db.collection('sonorafanFanClubs71').doc(c.scopeId).get()).exists)throw httpError(409,'Fan Club não existe.');
    const updated={...c,status:next,updatedAt:Date.now()};
    await campaigns.doc(id).update({status:next,updatedAt:updated.updatedAt});
    current.set(id,updated);audit(req.adminEmail,'campaign-'+action,id);
    emitChanged();res.json({campaign:publicCampaign(updated)});
  }catch(e){reportError(res,e);}
 });
 app.get('/api/admin/community303/operations',async(req,res)=>{
  try{ensureReady();res.set('Cache-Control','no-store');res.json({operations});}catch(e){reportError(res,e);}
 });
 app.post('/api/admin/community303/operations',rateLimit(12,60000),async(req,res)=>{
  try{ensureReady();if(typeof req.body?.chatHold!=='boolean'||typeof req.body?.createHold!=='boolean')throw httpError(400,'Configuração inválida.');
    const next={chatHold:req.body.chatHold,createHold:req.body.createHold};
    await config.set({...next,updatedAt:Date.now()});
    operations=next;audit(req.adminEmail,'community-incident-mode',JSON.stringify(next));
    io.emit('sf303:operation',{chatHold:next.chatHold,createHold:next.createHold});
    res.json({operations:next});
  }catch(e){reportError(res,e);}
 });
 // Events are aggregated. No chat text, query terms, or personal listening log stored.
 const metrics=db.collection('sonorafanMusicDaily303');
 const tracks=db.collection('sonorafanTrackStats303');
 const artists=db.collection('sonorafanArtistStats303');
 const engagement=db.collection('sonorafanEngagementDaily303');
 const people=db.collection('sonorafanEngagementUsers303');
 const userSeen=new Set();
 let seenDay=day();
 const newDay=()=>{
   if(seenDay!==day()){seenDay=day();userSeen.clear();seenVisits.clear();seenTracks.clear();}
 };
 async function recordVisit(email,section){
  if(!email||!['lobby','rooms','clubs','ranking','profile','agenda'].includes(section))return;
  newDay();
  const key=hash(email+':'+day()+':'+section);
  if(seenVisits.has(key))return;
  seenVisits.add(key);
  const ref=db.collection('sonorafanSectionVisits303').doc(key);
  try{
   await db.runTransaction(async tx=>{
    const previous=await tx.get(ref);
    if(previous.exists)return;
    tx.set(ref,{section,day:day(),at:Date.now()});
    tx.set(engagement.doc(day()),{sections:{[section]:inc(1)},updatedAt:Date.now()},{merge:true});
   });
  }catch(e){seenVisits.delete(key);console.error('Visita303:',e.message);}
 }
 async function recordJoin(room,email){
  if(!email||!room)return;
  newDay();
  const key=hash(email),first=!userSeen.has(key);
  userSeen.add(key);
  try{
   if(first){
    const ref=people.doc(key),dayRef=engagement.doc(day());
    await db.runTransaction(async tx=>{
     const snap=await tx.get(ref);
     const prev=snap.exists?snap.data():{};
     const isNewDay=prev.lastDay!==day();
     tx.set(ref,{lastDay:day(),visits:inc(1),lastSeen:Date.now()},{merge:true});
     tx.set(dayRef,{
      uniqueUsers:inc(isNewDay?1:0),
      returningUsers:inc(isNewDay&&!!prev.lastDay?1:0),
      roomJoins:inc(1),updatedAt:Date.now()
     },{merge:true});
    });
   }else await engagement.doc(day()).set({roomJoins:inc(1),updatedAt:Date.now()},{merge:true});
  }catch(e){if(first)userSeen.delete(key);console.error('Engajamento303:',e.message);}
 }
 async function recordRoomPlayback(room){
  if(!room?.isPlaying||!room.queue?.length)return;
  newDay();
  const track=room.queue[room.currentIndex];if(!track||!/^[a-zA-Z0-9_-]{11}$/.test(String(track.id||'')))return;
  const marker=track.id+':'+room.startedAt;
  if(seenTracks.get(room.slug)===marker)return;
  seenTracks.set(room.slug,marker);
  const rawGenre=String(room.genre||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const genre=GENRES.has(rawGenre)?rawGenre:'outros';
  try{
    const batch=db.batch(),at=Date.now(),artist=clean(track.artist,95)||'Artista sem nome';
    batch.set(metrics.doc(day()),{starts:inc(1),genres:{[genre]:inc(1)},updatedAt:at},{merge:true});
    batch.set(tracks.doc(track.id),{title:clean(track.title,135),artist,genre,starts:inc(1),updatedAt:at},{merge:true});
    batch.set(artists.doc(hash(artist)),{artist,starts:inc(1),updatedAt:at},{merge:true});
    await batch.commit();
  }
  catch(e){seenTracks.delete(room.slug);console.error('Reprodução303:',e.message);}
 }
 async function recordSkip(room){
  const track=room?.queue?.[room.currentIndex];
  if(!track||!/^[a-zA-Z0-9_-]{11}$/.test(String(track.id||'')))return;
  try{await tracks.doc(track.id).set({skips:inc(1),updatedAt:Date.now()},{merge:true});}catch(e){console.error('Pulos303:',e.message);}
 }
 async function recordAdded(room,track){
  if(!/^[a-zA-Z0-9_-]{11}$/.test(String(track?.id||'')))return;
  try{
    const batch=db.batch(),artist=clean(track.artist,95)||'Artista sem nome',at=Date.now();
    batch.set(tracks.doc(track.id),{title:clean(track.title,135),artist,added:inc(1),updatedAt:at},{merge:true});
    batch.set(artists.doc(hash(artist)),{artist,added:inc(1),updatedAt:at},{merge:true});
    await batch.commit();
  }catch(e){console.error('Adições303:',e.message);}
 }
 app.post('/api/community303/visit',rateLimit(30,60000),async(req,res)=>{
  const email=sessionEmail(req);if(!email)return res.status(401).json({error:'Faça login.'});
  const section=req.body?.section;if(!['lobby','rooms','clubs','ranking','profile','agenda'].includes(section))return res.status(400).json({error:'Seção inválida.'});
  recordVisit(email,section).catch(()=>{});res.json({ok:true});
 });
 app.get('/api/admin/community303/insights',async(req,res)=>{
  try{
   ensureReady();
   const days=Array.from({length:7},(_,i)=>day(Date.now()-(6-i)*86400000));
   const [daily,trackSnap,userSnap,artistSnap]=await Promise.all([
     Promise.all(days.map(d=>Promise.all([metrics.doc(d).get(),engagement.doc(d).get()]))),
     tracks.orderBy('starts','desc').limit(35).get(),
     db.collection('users').limit(1000).get(),
     artists.orderBy('starts','desc').limit(25).get()
   ]);
   const genreCounts={},dailyStats=[];
   for(let i=0;i<days.length;i++){
     const a=daily[i][0].exists?daily[i][0].data():{},b=daily[i][1].exists?daily[i][1].data():{};
     dailyStats.push({day:days[i],starts:a.starts||0,uniqueUsers:b.uniqueUsers||0,returningUsers:b.returningUsers||0,roomJoins:b.roomJoins||0,sections:b.sections||{}});
     for(const [genre,count] of Object.entries(a.genres||{}))genreCounts[genre]=(genreCounts[genre]||0)+Number(count||0);
   }
   const favorites={};userSnap.forEach(d=>{for(const x of Array.isArray(d.data().musicGenres)?d.data().musicGenres:[]){const g=clean(x,30).toLowerCase();if(GENRES.has(g))favorites[g]=(favorites[g]||0)+1;}});
   const trackRows=trackSnap.docs.map(d=>({id:d.id,...d.data(),starts:Number(d.data().starts||0),added:Number(d.data().added||0),skips:Number(d.data().skips||0)}));
   res.set('Cache-Control','no-store');res.json({
     period:'Últimos 7 dias (UTC)',daily:dailyStats,genres:genreCounts,declaredGenres:favorites,
     profilesSampled:userSnap.size,profilesCapped:userSnap.size===1000,
     tracks:trackRows,artists:artistSnap.docs.map(d=>({artist:d.data().artist||'Artista',starts:Number(d.data().starts||0),added:Number(d.data().added||0)})),source:'starts = início de reprodução, não minutos ou ouvintes individuais',
     campaigns:adminList().slice(0,30)
   });
  }catch(e){reportError(res,e);}
 });
 return {isChatHeld:()=>ready&&operations.chatHold,isCreationHeld:()=>ready&&operations.createHold,
    recordRoomPlayback,recordJoin,recordAdded,recordSkip,recordVisit};
}
module.exports={createCommunityCenter303,clean,day,publicCampaign};
