'use strict';
/* SonoraFan 100–105: server-backed community collections, opt-in music match,
   quality diagnostics and safe clock sync. */
const crypto=require('crypto');
const VIDEO=/^[A-Za-z0-9_-]{11}$/;
const UUID=/^[a-f0-9-]{36}$/i;
const txt=(x,max=100)=>String(x??'').replace(/[<>\x00-\x1f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
const prune=(x,n=30)=>Array.isArray(x)?x.slice(0,n):[];
function createStudio100({app,db,io,rooms,users,sessionEmail,publicUserId,rateLimit,adminEmails,getPosition,getFollowing,publicActivity,youtubeApiKey=''}) {
 const now=()=>Date.now();
 const col=db.collection('sf100Mixtapes'), preferences=db.collection('sf100Preferences');
 const prefRef=email=>preferences.doc(publicUserId(email));
 const own=(req,res)=>{const email=sessionEmail(req);if(!email)res.status(401).json({error:'Faça login.'});return email;};
 const fail=(res,err)=>{console.error('sf100:',err?.message||err);return res.status(503).json({error:'Recurso temporariamente indisponível.'});};
 const publicRoom=slug=>{const r=rooms.get(slug);return r&&!r.isPrivate?r:null;};
 const inRoom=(email,slug)=>[...io.sockets.sockets.values()].some(s=>s.userEmail===email&&s.rooms.has(slug));
 const song=t=>({id:t.id,title:txt(t.title,110),artist:txt(t.artist,90),dj:txt(t.dj,40)});
 const safeSongs=arr=>prune(arr,60).filter(t=>VIDEO.test(t?.id||'')).map(song);
 const asPublic=m=>({id:m.id,title:m.title,description:m.description,cover:m.cover,
   updatedAt:m.updatedAt,createdAt:m.createdAt,trackCount:m.tracks.length,
   collaborative:!!m.collaborative,shared:!!m.shared,tracks:m.tracks.map(song),ownerName:m.ownerName});
 const quality={startedAt:now(),events:0,totals:{},byDevice:{},recent:[]};
 const failures=new Map(),pendingRecovery=new Set();
 const record=(event,device='unknown',slug='')=>{
   const allowed=['player-error','audio-blocked','sync-drift','search-failed','recovery','video-unavailable','connection-lost','connection-restored','player-buffering'];
   if(!allowed.includes(event))return;
   quality.events++;quality.totals[event]=(quality.totals[event]||0)+1;
   const d=['mobile','desktop','tablet'].includes(device)?device:'unknown';
   quality.byDevice[d]=(quality.byDevice[d]||0)+1;
   quality.recent.unshift({event,device:d,at:now(),room:slug&&rooms.has(slug)&&!rooms.get(slug)?.isPrivate?slug:null});
   quality.recent.length=Math.min(quality.recent.length,90);
 };
 const getPref=async email=>{const d=await prefRef(email).get();return {match:!!d.data()?.match,alerts:!!d.data()?.alerts};};
 app.get('/api/studio100/preferences',rateLimit(30,60000),async(req,res)=>{
   const email=own(req,res);if(!email)return;
   try{res.json(await getPref(email));}catch(e){fail(res,e);}
 });
 app.post('/api/studio100/preferences',rateLimit(10,60000),async(req,res)=>{
   const email=own(req,res);if(!email)return;
   const {match,alerts}=req.body||{};
   if(typeof match!=='boolean'||typeof alerts!=='boolean')return res.status(400).json({error:'Preferências inválidas.'});
   try{await prefRef(email).set({match,alerts,updatedAt:now()},{merge:true});res.json({match,alerts});}
   catch(e){fail(res,e);}
 });
 app.get('/api/studio100/mixtapes',rateLimit(30,60000),async(req,res)=>{
   const email=own(req,res);if(!email)return;
   try{
     const d=await col.where('ownerId','==',publicUserId(email)).limit(40).get();
     res.json({items:d.docs.map(x=>asPublic(x.data())).sort((a,b)=>b.updatedAt-a.updatedAt)});
   }catch(e){fail(res,e);}
 });
 app.post('/api/studio100/mixtapes',rateLimit(8,60000),async(req,res)=>{
   const email=own(req,res);if(!email)return;
   const room=publicRoom(txt(req.body?.roomSlug,75));
   if(!room||!inRoom(email,room.slug))return res.status(403).json({error:'Entre em uma sala pública para salvar a fila.'});
   const title=txt(req.body?.title,65),description=txt(req.body?.description,160);
   if(title.length<3)return res.status(400).json({error:'Dê um nome à mixtape.'});
   const tracks=safeSongs(room.queue);
   if(!tracks.length)return res.status(400).json({error:'Adicione músicas à fila primeiro.'});
   const createdAt=now(),id=crypto.randomUUID();
   const item={id,ownerId:publicUserId(email),ownerName:txt(users.get(email)?.nome,40)||'Comunidade',
     roomSlug:room.slug,title,description,cover:tracks[0].id,tracks,
     collaborative:true,shared:false,createdAt,updatedAt:createdAt};
   try{await col.doc(id).set(item);res.json(asPublic(item));}catch(e){fail(res,e);}
 });
 app.get('/api/studio100/mixtapes/:id',rateLimit(30,60000),async(req,res)=>{
   const email=own(req,res);if(!email)return;
   if(!UUID.test(req.params.id))return res.status(404).json({error:'Mixtape não encontrada.'});
   try{
     const snap=await col.doc(req.params.id).get(),m=snap.data();
     if(!m||(m.ownerId!==publicUserId(email)&&!m.shared&&
       !(m.collaborative&&publicRoom(m.roomSlug)&&inRoom(email,m.roomSlug))))
       return res.status(404).json({error:'Mixtape não encontrada.'});
     res.json({...asPublic(m),canEdit:m.ownerId===publicUserId(email)||
       !!(m.collaborative&&publicRoom(m.roomSlug)&&inRoom(email,m.roomSlug)),owner:m.ownerId===publicUserId(email)});
   }catch(e){fail(res,e);}
 });
 app.post('/api/studio100/mixtapes/:id/track',rateLimit(15,60000),async(req,res)=>{
   const email=own(req,res);if(!email)return;
   if(!UUID.test(req.params.id))return res.status(404).json({error:'Mixtape não encontrada.'});
   const id=String(req.body?.id||'');
   if(!VIDEO.test(id))return res.status(400).json({error:'Música inválida.'});
   try{
     const ref=col.doc(req.params.id),doc=await ref.get(),m=doc.data();
     if(!m)return res.status(404).json({error:'Mixtape não encontrada.'});
     const room=publicRoom(m.roomSlug);
     const canEdit=m.ownerId===publicUserId(email)||!!(m.collaborative&&room&&inRoom(email,m.roomSlug));
     if(!canEdit)return res.status(403).json({error:'Edição restrita aos participantes.'});
     // Tracks must originate from the authorized room queue, not unverified client metadata.
     const found=room?.queue.find(t=>t.id===id);
     if(!found)return res.status(400).json({error:'A música precisa estar na fila da sala.'});
     const updated=await db.runTransaction(async tx=>{
       const snap=await tx.get(ref),old=snap.data();
       if(!old)return null;
       if(old.tracks.some(t=>t.id===id))return old;
       if(old.tracks.length>=60)throw Error('Limite de 60 músicas.');
       const result={...old,tracks:[...old.tracks,song(found)],updatedAt:now()};
       tx.set(ref,result);return result;
     });
     res.json({success:true,mixtape:asPublic(updated)});
   }catch(e){if(e.message==='Limite de 60 músicas.')return res.status(400).json({error:e.message});fail(res,e);}
 });
 app.post('/api/studio100/mixtapes/:id/share',rateLimit(10,60000),async(req,res)=>{
   const email=own(req,res);if(!email)return;
   if(!UUID.test(req.params.id))return res.status(404).json({error:'Mixtape não encontrada.'});
   if(typeof req.body?.shared!=='boolean')return res.status(400).json({error:'Valor inválido.'});
   try{
     const doc=await col.doc(req.params.id).get(),m=doc.data();
     if(!m||m.ownerId!==publicUserId(email))return res.status(403).json({error:'Apenas o criador pode compartilhar.'});
     await doc.ref.update({shared:req.body.shared,updatedAt:now()});res.json({shared:req.body.shared});
   }catch(e){fail(res,e);}
 });
 app.delete('/api/studio100/mixtapes/:id',rateLimit(10,60000),async(req,res)=>{
   const email=own(req,res);if(!email)return;
   if(!UUID.test(req.params.id))return res.status(404).json({error:'Mixtape não encontrada.'});
   try{
     const doc=await col.doc(req.params.id).get(),m=doc.data();
     if(!m||m.ownerId!==publicUserId(email))return res.status(403).json({error:'Apenas o criador pode excluir.'});
     await doc.ref.delete();res.json({success:true});
   }catch(e){fail(res,e);}
 });
 app.get('/api/studio100/match/:slug',rateLimit(12,60000),async(req,res)=>{
   const email=own(req,res);if(!email)return;
   const room=publicRoom(req.params.slug);
   if(!room||!inRoom(email,room.slug))return res.status(403).json({error:'Disponível apenas para participantes da sala pública.'});
   try{
     const me=await getPref(email);
     if(!me.match)return res.json({enabled:false,people:[]});
     const sockets=await io.in(room.slug).fetchSockets();
     const candidateEmails=[...new Set(sockets.map(s=>s.userEmail))].filter(x=>x&&x!==email).slice(0,25);
     const ownGenres=prune(users.get(email)?.musicGenres,8).map(x=>String(x).toLowerCase());
     const ownSnap=await db.collection('sf95_music_profiles').doc(publicUserId(email))
       .collection('adds').orderBy('at','desc').limit(60).get();
     const ownArtists=new Set(ownSnap.docs.map(x=>txt(x.data().artist,80).toLowerCase()).filter(Boolean));
     const people=await Promise.all(candidateEmails.map(async target=>{
       if(!(await getPref(target)).match)return null;
       const genres=prune(users.get(target)?.musicGenres,8).map(x=>String(x).toLowerCase());
       const snap=await db.collection('sf95_music_profiles').doc(publicUserId(target))
         .collection('adds').orderBy('at','desc').limit(60).get();
       const artists=new Set(snap.docs.map(x=>txt(x.data().artist,80).toLowerCase()).filter(Boolean));
       const overlapGenres=ownGenres.filter(x=>genres.includes(x));
       const overlapArtists=[...ownArtists].filter(x=>artists.has(x));
       const denominator=new Set([...ownGenres,...genres,...ownArtists,...artists]).size;
       const shared=overlapGenres.length+overlapArtists.length;
       const score=denominator?Math.round(100*shared/denominator):0;
       return {userId:publicUserId(target),name:txt(users.get(target)?.nome,40)||'Ouvinte',
         sharedGenres:overlapGenres.slice(0,3),sharedArtists:overlapArtists.slice(0,3),sharedCount:shared,
         score,algorithm:'Jaccard de gêneros declarados e artistas adicionados (até 60 contribuições)'};
     }));
     res.json({enabled:true,people:people.filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,12)});
   }catch(e){fail(res,e);}
 });
 // In-app smart updates: only followed users' activity in public rooms and
 // public events RSVP'd to by the requester. No unattended browser push.
 app.get('/api/studio100/updates',rateLimit(18,60000),async(req,res)=>{
   const email=own(req,res);if(!email)return;
   try{
     const opts=await getPref(email);
     if(!opts.alerts)return res.json({enabled:false,items:[]});
     const following=prune(await getFollowing(email),100);
     const items=[];
     for(const id of following.slice(0,40)){
       const found=[...users.keys()].find(e=>publicUserId(e)===id);
       if(!found)continue;
       const activity=publicActivity(found);
       if(activity&&publicRoom(activity.roomSlug))items.push({
         key:'friend:'+id+':'+activity.roomSlug,type:'friend',title:'Amigo ouvindo música',
         message:txt(users.get(found)?.nome,40)+' está em '+txt(activity.roomName,65),
         roomSlug:activity.roomSlug
       });
     }
     res.json({enabled:true,items:items.slice(0,20)});
   }catch(e){fail(res,e);}
 });
 app.post('/api/studio100/telemetry',rateLimit(25,60000),(req,res)=>{
   const email=own(req,res);if(!email)return;
   const event=txt(req.body?.event,30),device=txt(req.body?.device,10),room=txt(req.body?.roomSlug,75);
   if(!['player-error','audio-blocked','sync-drift','search-failed','recovery','video-unavailable','connection-lost','connection-restored','player-buffering'].includes(event))
     return res.status(400).json({error:'Evento inválido.'});
   // No personal identity is retained in metrics.
   record(event,device,room);res.json({ok:true});
 });
 app.get('/api/admin/studio100/quality',(req,res)=>{
   const email=own(req,res);if(!email)return;
   if(!adminEmails.has(email))return res.status(403).json({error:'Apenas administrador.'});
   res.set('Cache-Control','no-store');
   res.json({startedAt:quality.startedAt,events:quality.events,totals:quality.totals,
     byDevice:quality.byDevice,recent:quality.recent.slice(0,40),
     rooms:rooms.size,online:[...io.sockets.sockets.values()].filter(s=>!!s.userEmail).length,
     currentQueue:[...rooms.values()].reduce((sum,r)=>sum+r.queue.length,0)});
 });
 function attachSocket(socket, currentRoom, advanceQueue) {
   socket.on('sf100:sync',(data={},ack)=>{
     const slug=currentRoom(),room=rooms.get(slug);
     if(!room||!socket.userEmail||!socket.rooms.has(slug))
       return typeof ack==='function'&&ack({ok:false,error:'Entre em uma sala.'});
     const current=room.queue[room.currentIndex];
     if(typeof ack==='function')ack({ok:true,roomSlug:slug,serverAt:now(),
       videoId:current?.id||null,position:Math.max(0,Math.round(getPosition(room)*10)/10),
       playing:!!room.isPlaying});
   });
   socket.on('sf100:playbackFailure',async(data={},ack)=>{
     const slug=currentRoom(),room=rooms.get(slug);
     if(!room||!socket.userEmail||!socket.rooms.has(slug))return;
     const videoId=String(data.id||''),code=Number(data.code);
     if(room.queue[room.currentIndex]?.id!==videoId||![100,101,150].includes(code))return;
     const key=slug+':'+videoId,entries=failures.get(key)||new Map();
     if(now()-(entries.get(socket.userEmail)||0)<50000)return;
     entries.set(socket.userEmail,now());failures.set(key,entries);
     record('video-unavailable',data.device,slug);
     const total=Math.max(1,room.listenerCount);
     // A single listener is never trusted to remove another user's track.
     // The server confirms its restricted/removed status with YouTube first.
     let soloVerified=false;
     if(total===1&&!socket.isAdmin&&youtubeApiKey){
       try{
         const url='https://www.googleapis.com/youtube/v3/videos?part=status&id='+
           encodeURIComponent(videoId)+'&key='+encodeURIComponent(youtubeApiKey);
         const response=await fetch(url,{signal:AbortSignal.timeout(6500)});
         if(response.ok){
           const payload=await response.json();
           const entry=Array.isArray(payload.items)?payload.items[0]:null;
           soloVerified=!entry||entry.status?.embeddable===false||
             entry.status?.privacyStatus==='private';
         }
       }catch(e){/* A falha de verificação não autoriza remover música. */}
     }
     const corroborated=entries.size>=2&&entries.size>=Math.ceil(total*.6);
     const authorized=!!socket.isAdmin||corroborated||soloVerified;
     const advanceCurrent=()=>{
       const live=rooms.get(slug);
       if(live?.queue[live.currentIndex]?.id!==videoId)return false;
       if(!advanceQueue(slug))return false;
       failures.delete(key);record('recovery',data.device,slug);return true;
     };
     if(authorized&&!advanceCurrent()&&!pendingRecovery.has(key)){
       pendingRecovery.add(key);
       const timer=setTimeout(()=>{pendingRecovery.delete(key);advanceCurrent();},12000);
       timer.unref?.();
     }
     if(typeof ack==='function')ack({ok:true,reports:entries.size,
       needed:Math.max(2,Math.ceil(total*.6)),authorized});
   });
 }
 async function deleteUserData(email){
   if(!email)return;
   await db.recursiveDelete(prefRef(email));
   const owned=await col.where('ownerId','==',publicUserId(email)).limit(100).get();
   for(const snap of owned.docs)await snap.ref.delete();
 }
 return {attachSocket,deleteUserData,record,quality};
}
module.exports={createStudio100};
