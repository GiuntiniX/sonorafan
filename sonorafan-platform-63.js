'use strict';
// SonoraFan 57–63: discover, community challenges, battles, passport and setlists.
// Never accepts XP or track metadata from the browser as proof of an achievement.
const crypto = require('crypto');
const { localPeriod } = require('./gamification-45');
const STYLES = Object.freeze(['rock','pop','indie','eletrônica','funk','rap','mpb','pagode']);
const TITLES = Object.freeze({rock:'Rock',pop:'Pop',indie:'Indie','eletrônica':'Eletrônica',funk:'Funk',rap:'Rap',mpb:'MPB',pagode:'Pagode'});
function normalize(s) { return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
function roomGenre(room) {
  const text = normalize([room?.name,room?.description].filter(Boolean).join(' '));
  if (/eletr[oô]nic|electro|house|techno|synth|edm/.test(text)) return 'eletrônica';
  for(const g of STYLES) if(new RegExp('(^|[^a-z])'+normalize(g)+'([^a-z]|$)').test(text)) return g;
  return null;
}
function rankRooms(list, selected=[]) {
  const genres = new Set((Array.isArray(selected)?selected:[]).map(v=>roomGenre({name:v})).filter(Boolean));
  return [...list].sort((a,b)=>{
    const score = r => (genres.has(roomGenre(r))?200:0) + (r.isPlaying?80:0) + Math.min(30,Number(r.listenerCount)||0)*2 + (r.currentTrack?.id?25:0);
    return score(b)-score(a) || String(a.name||'').localeCompare(String(b.name||''));
  });
}
function safeTitle(v,n=90) {return String(v||'').replace(/[\x00-\x1f]/g,' ').trim().slice(0,n);}
function validTrack(t){return t && /^[\w-]{11}$/.test(String(t.id||''));}
function csvCell(s){let text=String(s??''); if (/^[=+@\-\t\r]/.test(text)) text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}
function historyCSV(items){const rows=[['Horário','Música','Artista','Adicionada por','YouTube','Apoios','Remoções']];for(const x of items){rows.push([new Date(x.playedAt).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}),x.title,x.artist,x.dj,'https://www.youtube.com/watch?v='+x.id,x.likes||0,x.dislikes||0]);}return '\ufeff'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n');}
function battlePublic(b){if(!b)return {active:false};return {active:!!b.active,id:b.id,startedAt:b.startedAt,endsAt:b.endsAt,choices:b.choices.map(c=>({id:c.id,title:c.title,artist:c.artist})),votes:b.choices.map(c=>({id:c.id,count:[...b.votes.values()].filter(v=>v===c.id).length})),total:b.votes.size,winner:b.winner||null};}
function installPlatform63({app,io,db,rooms,users,sessionEmail,userPoints,gamification45}){
  const battleMap=new Map(), roomTimers=new Map(), rates=new Map();
  const getEmail=req=>sessionEmail(req);
  const presence=(email,slug)=>[...io.sockets.sockets.values()].some(s=>s.userEmail===email && s.rooms.has(slug));
  const permitted=(room,email)=>!!(room && email && (!room.isPrivate || room.ownerEmail===email || email==='admin@sonora.com' || presence(email,room.slug)));
  const check=(req,res)=>{const email=getEmail(req); if(!email){res.status(401).json({error:'Entre em sua conta'});return null;}return email;};
  const err=(res,e)=>{console.error('SonoraFan 63:',e?.message||e);res.status(503).json({error:'Não foi possível carregar agora. Tente novamente.'});};
  function limited(req, res, action, limit=24){const email=getEmail(req)||req.ip;const key=action+':'+email;const now=Date.now();const old=(rates.get(key)||[]).filter(t=>now-t<60000);if(old.length>=limit){res.status(429).json({error:'Muitas tentativas. Aguarde um instante.'});return true;}old.push(now);rates.set(key,old);return false;}
  const prefRef=email=>db.collection('sf63Preferences').doc(email);
  async function getPrefs(email){const p=await prefRef(email).get();return p.exists?p.data():{styles:[]};}
  async function emitPoints(email){try{const snap=await gamification45.getSnapshot(email);userPoints.set(email,{points:snap.points,badges:snap.badges});for(const s of io.sockets.sockets.values())if(s.userEmail===email)s.emit('userPoints',{points:snap.points,badges:snap.badges});io.to('sf63-account-'+crypto.createHash('sha256').update(email).digest('hex').slice(0,14)).emit('sf63:xp',snap);}catch(e){console.error('sf63 sync',e.message);}}
  async function awardXP(email,key,amount,badge){
    const ref=db.collection('points').doc(email);
    const updated=await db.runTransaction(async tx=>{
      const snap=await tx.get(ref),data=snap.exists?snap.data():{};
      const claimed=(Array.isArray(data.sf63Rewards)?data.sf63Rewards:[]);
      if(claimed.includes(key))return false;
      const pts=Math.max(0,Number(data.points)||0)+amount;
      const badges=[...(Array.isArray(data.badges)?data.badges:[])];
      if(badge&&!badges.includes(badge))badges.push(badge);
      tx.set(ref,{points:pts,badges,sf63Rewards:[...claimed.slice(-249),key]},{merge:true});return true;
    });
    if(updated)await emitPoints(email);
    return updated;
  }
  async function passportStamp(email,room){
    if(!email||room.isPrivate)return;
    const genre=roomGenre(room);if(!genre)return;
    const ref=db.collection('sf63Passport').doc(email);
    let did=false;
    try {
      did=await db.runTransaction(async tx=>{
        const doc=await tx.get(ref),stamps=Array.isArray(doc.data()?.stamps)?doc.data().stamps:[];
        if(stamps.some(s=>s.style===genre))return false;
        tx.set(ref,{stamps:[...stamps,{style:genre,at:Date.now(),room:room.name}].slice(-8),updatedAt:Date.now()},{merge:true});return true;
      });
      if(did){await awardXP(email,'passport:'+genre,12,'Explorador de '+TITLES[genre]);const d=await ref.get();if(d.data()?.stamps?.length>=8)await awardXP(email,'passport:all',35,'Passaporte Completo');}
    }catch(e){console.error('passport',e.message);}
  }
  async function onSong(room,song,socket){
    if(!room||!socket?.userEmail)return;
    const email=socket.userEmail,week=localPeriod().week,ref=db.collection('sf63Challenges').doc(room.slug);
    let completed=[], data=null;
    try{
      data=await db.runTransaction(async tx=>{
        const doc=await tx.get(ref),previous=doc.data();const old=previous?.week===week?previous:{};
        const contributors=Array.isArray(old.contributors)?old.contributors:[];
        const trackIds=Array.isArray(old.trackIds)?old.trackIds:[];
        const next={week,contributors:[...new Set([...contributors,email])].slice(0,30),trackIds:[...new Set([...trackIds,song.id])].slice(0,50),completed:!!old.completed,updatedAt:Date.now()};
        if(next.contributors.length>=3 && next.trackIds.length>=5 && !next.completed){next.completed=true;completed=next.contributors.slice();}
        tx.set(ref,next,{merge:false});return next;
      });
      io.to(room.slug).emit('sf63:challenge',{songs:data.trackIds.length,contributors:data.contributors.length,goalSongs:5,goalContributors:3,completed:data.completed});
      for(const participant of completed){await awardXP(participant,`collective:${room.slug}:${week}`,25,'Equipe SonoraFan');}
    }catch(e){console.error('collective',e.message);}
  }
  async function onAdvance(room,track){
    if(!room||!validTrack(track))return;
    const ref=db.collection('sf63History').doc(room.slug);
    const record={id:track.id,title:safeTitle(track.title,130),artist:safeTitle(track.artist,100),dj:safeTitle(track.dj,45),playedAt:Date.now(),startedAt:Number(room.startedAt)||0,likes:Array.isArray(track.votes?.up)?track.votes.up.length:0,dislikes:Array.isArray(track.votes?.down)?track.votes.down.length:0};
    try{await db.runTransaction(async tx=>{const doc=await tx.get(ref);const items=Array.isArray(doc.data()?.items)?doc.data().items:[];if(items.some(i=>i.startedAt===record.startedAt && i.id===record.id))return;tx.set(ref,{items:[...items,record].slice(-120),updatedAt:Date.now()},{merge:true});});}catch(e){console.error('history',e.message);}
  }
  function battleRoom(req,res){const email=check(req,res);if(!email)return null;const r=rooms.get(String(req.params.slug||''));if(!permitted(r,email)){res.status(404).json({error:'Sala não encontrada'});return null;}return {room:r,email};}
  async function finishBattle(slug){
    const b=battleMap.get(slug);if(!b||!b.active)return;
    b.active=false;const v=[...b.votes.values()];const c=b.choices.map(x=>({id:x.id,count:v.filter(i=>i===x.id).length}));c.sort((a,b)=>b.count-a.count);b.winner=c[0]?.count===c[1]?.count?null:c[0]?.id;
    io.to(slug).emit('sf63:battle',battlePublic(b));
    for(const [email,choice] of b.votes){await awardXP(email,'battle:'+b.id,b.winner&&choice===b.winner?12:4,b.winner&&choice===b.winner?'Batalha Musical':null).catch(e=>console.error('battle XP',e.message));}
    const t=roomTimers.get(slug);if(t){clearTimeout(t);roomTimers.delete(slug);}
  }
  app.get('/api/platform63/me',async(req,res)=>{const email=check(req,res);if(!email)return;try{const [prefs,pas,game]=await Promise.all([getPrefs(email),db.collection('sf63Passport').doc(email).get(),gamification45.getSnapshot(email)]);res.json({preferences:{styles:prefs.styles||[]},passport:{stamps:pas.data()?.stamps||[],catalog:STYLES.map(s=>({id:s,title:TITLES[s]}))},club:{xp:game.xp,level:game.level,badges:game.badges}});}catch(e){err(res,e);}});
  app.post('/api/platform63/preferences',async(req,res)=>{const email=check(req,res);if(!email||limited(req,res,'preferences',10))return;const styles=Array.isArray(req.body?.styles)?req.body.styles:[];if(styles.length>8||styles.some(v=>!STYLES.includes(v)))return res.status(400).json({error:'Estilos inválidos'});try{await prefRef(email).set({styles:[...new Set(styles)],updatedAt:Date.now()},{merge:true});res.json({styles:[...new Set(styles)]});}catch(e){err(res,e);}});
  app.get('/api/platform63/discovery',async(req,res)=>{const email=check(req,res);if(!email)return;try{const pref=await getPrefs(email);const list=[...rooms.values()].filter(r=>!r.isPrivate).map(r=>({slug:r.slug,name:r.name,description:r.description||'',genre:roomGenre(r),isPlaying:!!r.isPlaying,listenerCount:r.listenerCount||0,queueLength:r.queue.length,currentTrack:r.queue[r.currentIndex]||null}));res.json({rooms:rankRooms(list,pref.styles||[]),styles:pref.styles||[]});}catch(e){err(res,e);}});
  app.get('/api/platform63/history/:slug',async(req,res)=>{const data=battleRoom(req,res);if(!data)return;try{const d=await db.collection('sf63History').doc(data.room.slug).get();const items=(d.data()?.items||[]).slice(-80).reverse();res.json({name:data.room.name,items,count:items.length,nowPlaying:data.room.queue[data.room.currentIndex]||null});}catch(e){err(res,e);}});
  app.get('/api/platform63/setlist/:slug.csv',async(req,res)=>{const data=battleRoom(req,res);if(!data)return;try{const d=await db.collection('sf63History').doc(data.room.slug).get();const csv=historyCSV((d.data()?.items||[]).slice(-100));res.set('Content-Type','text/csv; charset=utf-8').set('Content-Disposition','attachment; filename="sonorafan-setlist.csv"').send(csv);}catch(e){err(res,e);}});
  app.get('/api/platform63/challenge/:slug',async(req,res)=>{const data=battleRoom(req,res);if(!data)return;try{const d=await db.collection('sf63Challenges').doc(data.room.slug).get();const c=d.data()?.week===localPeriod().week?d.data():{};res.json({week:localPeriod().week,songs:(c.trackIds||[]).length,contributors:(c.contributors||[]).length,goalSongs:5,goalContributors:3,completed:!!c.completed});}catch(e){err(res,e);}});
  app.get('/api/platform63/battle/:slug',async(req,res)=>{const data=battleRoom(req,res);if(!data)return;const b=battleMap.get(data.room.slug);if(b?.active&&Date.now()>b.endsAt)await finishBattle(data.room.slug);const latest=battleMap.get(data.room.slug);res.json({...battlePublic(latest),myVote:latest?.votes.get(data.email)||null});});
  app.post('/api/platform63/battle/:slug/start',async(req,res)=>{
    const data=battleRoom(req,res);if(!data||limited(req,res,'battle-start',5))return;
    if(!presence(data.email,data.room.slug))return res.status(403).json({error:'Entre na sala para iniciar a batalha'});
    const old=battleMap.get(data.room.slug);if(old?.active && Date.now()<=old.endsAt)return res.status(409).json({error:'Já existe uma batalha em andamento'});
    if(old && Date.now()-(old.endsAt||0)<120000)return res.status(429).json({error:'Aguarde 2 minutos entre batalhas'});
    const tracks=data.room.queue.filter((t,i)=>i!==data.room.currentIndex&&validTrack(t));const dedup=[...new Map(tracks.map(t=>[t.id,t])).values()];if(dedup.length<2)return res.status(400).json({error:'A sala precisa ter pelo menos duas próximas músicas para uma batalha.'});
    const choices=dedup.slice(0,2).map(t=>({id:t.id,title:safeTitle(t.title,90),artist:safeTitle(t.artist,70)}));
    const b={id:crypto.randomUUID(),active:true,startedAt:Date.now(),endsAt:Date.now()+90000,choices,votes:new Map(),winner:null};battleMap.set(data.room.slug,b);
    const timer=setTimeout(()=>finishBattle(data.room.slug).catch(console.error),90050);timer.unref?.();roomTimers.set(data.room.slug,timer);
    io.to(data.room.slug).emit('sf63:battle',battlePublic(b));res.status(201).json(battlePublic(b));
  });
  app.post('/api/platform63/battle/:slug/vote',async(req,res)=>{
    const data=battleRoom(req,res);if(!data||limited(req,res,'battle-vote',40))return;
    if(!presence(data.email,data.room.slug))return res.status(403).json({error:'Entre na sala para votar'});
    const b=battleMap.get(data.room.slug);if(!b?.active||Date.now()>b.endsAt){if(b?.active)await finishBattle(data.room.slug);return res.status(409).json({error:'A votação terminou'});}
    const id=String(req.body?.id||'');if(!b.choices.some(c=>c.id===id))return res.status(400).json({error:'Música inválida'});
    b.votes.set(data.email,id);const pub=battlePublic(b);io.to(data.room.slug).emit('sf63:battle',pub);res.json({...pub,myVote:id});
  });
  io.on('connection',socket=>{
    const ck=(socket.handshake.headers.cookie||'').match(/(?:^|;)\s*sessionToken=([^;]+)/);const email=ck?sessionEmail({cookies:{sessionToken:ck[1]}}):null;
    if(email){socket.join('sf63-account-'+crypto.createHash('sha256').update(email).digest('hex').slice(0,14));}
  });
  setInterval(()=>{rates.clear();},600000).unref?.();
  return {onJoin:(room,email)=>passportStamp(email,room),onSong,onAdvance,finishBattle,roomGenre,rankRooms,battlePublic};
}
module.exports={installPlatform63,STYLES,roomGenre,rankRooms,historyCSV,battlePublic};
