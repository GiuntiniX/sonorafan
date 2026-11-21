'use strict';
// SonoraFan 71 — comunidades permanentes criadas por fãs.
// O servidor decide acesso e moderação usando a sessão; o navegador nunca define papéis.
const crypto = require('crypto');
const ROOM_THEMES = require('./public/themes/catalog-88.json');
const THEMES = new Set(ROOM_THEMES.map(theme=>theme.id));
const GENRES = new Set(['kpop','pop','rock','indie','sertanejo','funk','mpb','hiphop','eletronica','pagode','samba','forro','gospel','reggae','metal','punk','jazz','blues','rnb','lofi','latina','classica','outros']);
const GALLERY_COVERS = Object.freeze({
  stage:'/art-129/sonorafan-stage.svg',
  kpop:'/art-132/sonorafan-room-kpop.avif',
  pop:'/art-33/poster-electro.webp',
  rock:'/art-33/poster-rock.webp',
  indie:'/art-33/poster-indie.webp',
  brasil:'/art-33/poster-brasil.webp',
  electronic:'/art-33/poster-electro.webp',
  festival:'/art-40/poster-festival.svg'
});
const validExternalCover = value => {
  if (typeof value !== 'string' || value.length > 500) return '';
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password || !url.hostname || !url.hostname.includes('.')) return '';
    if (/(^|\.)(localhost|local|internal|test|invalid)$/.test(url.hostname)) return '';
    return url.href;
  } catch (_) { return ''; }
};
const validPostImageUrl = value => {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string' || value.length > 1500) return null;
  try {
    const u = new URL(value.trim()), host = u.hostname.toLowerCase();
    if (u.protocol !== 'https:' || u.username || u.password || !host.includes('.') ||
        host === 'localhost' || host.endsWith('.localhost') ||
        /(^|\.)(local|internal|test|invalid)$/.test(host) ||
        /^\d+(?:\.\d+){3}$/.test(host) || host.includes(':') ||
        /^(?:10|127|169\.254|172\.(?:1[6-9]|2\d|3[01])|192\.168)\./.test(host)) return null;
    return u.href;
  } catch (_) { return null; }
};
// Publicações aceitam apenas vídeos individuais de domínios oficiais do YouTube.
const youtubeVideoId = value => {
  if(value===undefined||value===null||value==='')return '';
  if(typeof value!=='string'||value.length>1000)return null;
  try {
    const url=new URL(value.trim());
    if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
    const host=url.hostname.toLowerCase();
    const youtube=['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(host);
    const short=host==='youtu.be'||host==='www.youtu.be';
    if(!youtube&&!short)return null;
    const parts=url.pathname.split('/').filter(Boolean);
    let id='';
    if(short&&parts.length===1)id=parts[0];
    else if(youtube&&parts.length===1&&parts[0]==='watch')id=url.searchParams.get('v')||'';
    else if(youtube&&parts.length===2&&['shorts','live','embed','v'].includes(parts[0]))id=parts[1];
    return /^[A-Za-z0-9_-]{11}$/.test(id)?id:null;
  }catch(_){return null;}
};
const coverChoice = body => {
  const kind = body?.coverType;
  if (kind === undefined || kind === null || kind === 'default') return {coverType:'default',coverImageUrl:'',coverGalleryId:''};
  if (kind === 'gallery' && Object.hasOwn(GALLERY_COVERS,body?.coverGalleryId))
    return {coverType:'gallery',coverImageUrl:'',coverGalleryId:body.coverGalleryId};
  if (kind === 'external') {
    const url = validExternalCover(body?.coverImageUrl);
    if (url) return {coverType:'external',coverImageUrl:url,coverGalleryId:''};
  }
  return null;
};
const CLUBS = 'sonorafanFanClubs71';
const COVERS = 'sonorafanFanClubCovers73';
const MAX_COVER_BYTES = 180 * 1024;
const clean = (value, max) => typeof value === 'string'
  ? value.normalize('NFC').replace(/[\u0000-\u001f\u007f<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,max)
  : '';
const unique = values => Array.from(new Set(Array.isArray(values) ? values.filter(x=>typeof x==='string') : []));

function installFanClubs71({ app, db, sessionEmail, users, rooms, socialEvents, publicUserId, adminEmails, rateLimit, sf15Notify, rawCoverParser, gamification45, ranking60, io }) {
  const coverRef = id => db.collection(COVERS).doc(id);
  const refFor = id => db.collection(CLUBS).doc(id);
  // Índice reverso persistente: a sala conhece seus Fanclubs vinculados.
  const roomClubRef = slug => db.collection('sonorafanFanclubRoomLinks').doc(slug);
  const updateRoomIndex=(tx,ref,snap,id,add)=>{
    const clubs=unique(snap.exists?snap.data()?.clubIds:[]);
    const next=add?unique([...clubs,id]):clubs.filter(value=>value!==id);
    tx.set(ref,{clubIds:next,updatedAt:Date.now()});
  };
  // Streams are attached only after cookie-session and membership verification.
  // Never emit post content over a public Socket.IO room.
  const subscribers=new Map();
  const streamKey=id=>'fanclub:'+id;
  function publish(id, kind){
    const watchers=subscribers.get(streamKey(id));
    if(!watchers)return;
    const payload='event: '+kind+'\ndata: '+JSON.stringify({clubId:id,kind,at:Date.now()})+'\n\n';
    for(const entry of [...watchers]){
      try{entry.res.write(payload);entry.res.flush?.();}catch(e){entry.close();}
    }
  }
  function closeClubStreams(id){
    const watchers=subscribers.get(streamKey(id));
    if(!watchers)return;
    for(const entry of [...watchers]){
      try{entry.res.write('event: deleted\ndata: '+JSON.stringify({clubId:id,kind:'deleted'})+'\n\n');}catch(e){}
      entry.close();
      try{entry.res.end();}catch(e){}
    }
    subscribers.delete(streamKey(id));
  }
  function disconnectMember(id,userId){
    const watchers=subscribers.get(streamKey(id));
    if(!watchers)return;
    for(const entry of [...watchers])if(entry.userId===userId){entry.close();try{entry.res.end();}catch(e){}}
  }
  function notifyPostMembers(clubId,club,authorId,authorName,details={}){
    if(typeof sf15Notify!=='function')return;
    const memberIds=new Set(unique(club.memberIds).filter(id=>id!==authorId&&!unique(club.notificationMutedIds).includes(id)));
    if(!memberIds.size)return;
    const recipients=[...users.keys()].filter(email=>memberIds.has(publicUserId(email)));
    // Bounded concurrency. Notifications are best-effort; a notification outage
    // must never roll back or delay the stored publication.
    Promise.resolve().then(async()=>{
      for(let offset=0;offset<recipients.length;offset+=8){
        await Promise.allSettled(recipients.slice(offset,offset+8).map(email=>sf15Notify(email,{
          type:'fanclub',title:clean(details.title||'Nova publicação no Fan Club',90),
          message:clean(details.message||clean(authorName,40)+' publicou em '+clean(club.title,75),200),fanClubId:clubId,
           roomSlug:details.roomSlug&&rooms.has(details.roomSlug)&&!rooms.get(details.roomSlug).isPrivate?details.roomSlug:null
        })));
      }
    }).catch(e=>console.warn('[Fan Clubs] notification delivery:',e?.message));
  }

  const identity = (req,res) => {
    const email = sessionEmail(req);
    if (!email) { res.status(401).json({error:'Entre na sua conta para participar da comunidade.'}); return null; }
    const user=users.get(email);
    if (user?.banned) {res.status(403).json({error:'Conta sem permissão para participar.'});return null;}
    return {email,id:publicUserId(email),name:clean(user?.nome||'Fã SonoraFan',40)};
  };
  const error = (res,err) => {
    if (err?.status) return res.status(err.status).json({error:err.message});
    console.error('[Fan Clubs 71]',err?.message||err);
    return res.status(503).json({error:'Não foi possível acessar os Fan Clubs agora.'});
  };
  const throwHttp = (status,message) => {const e=new Error(message);e.status=status;throw e;};
  const validateId = id => typeof id==='string' && /^[a-f0-9-]{36}$/.test(id);
  // Fórum 6.0: documentos legados permanecem nos mesmos IDs e recebem títulos derivados na leitura.
  const forumTags = value => Array.isArray(value) ? [...new Set(value.slice(0,8)
    .map(t=>clean(t,24).toLocaleLowerCase('pt-BR').replace(/[^\p{L}\p{N} -]/gu,'').trim().replace(/\s+/g,'-'))
    .filter(t=>t.length>=2))].slice(0,5) : [];
  const forumTitle = post => clean(post?.title,110)||clean(String(post?.text||'').split(/[.!?\n]/)[0],95)||'Discussão da comunidade';
  const forumPost = (doc,data,me,profile={}) => {
    const p=doc.data(),id=doc.id;
    return {id,...p,imageUrl:validPostImageUrl(p.imageUrl)||'',youtubeId:/^[A-Za-z0-9_-]{11}$/.test(String(p.youtubeId||''))?p.youtubeId:'',title:forumTitle(p),tags:forumTags(p.tags),likedBy:undefined,
      pinned:id===data.pinnedPostId,likeCount:unique(p.likedBy).length,
      liked:unique(p.likedBy).includes(me.id),favorite:unique(profile.favorites).includes(id),
      unread:!Number(profile.readAt?.[id])||
        Number(profile.readAt[id])<Number(p.lastActivityAt||p.createdAt||0)||
        Number(profile.readReplyCounts?.[id]||0)<Number(p.replyCount||0),
      replyCount:Math.max(0,Number(p.replyCount)||0),
      canResolve:p.authorId===me.id||canModerate(data,me),
      resolved:!!p.resolved,bestCommentId:p.bestCommentId||null,
      editable:p.authorId===me.id||canModerate(data,me),
      authorCanEdit:p.authorId===me.id,canPin:canModerate(data,me)};
  };
  const forumProfileRef=(ref,me)=>ref.collection('forumProfiles').doc(me.id);
  const requireForumMember=(data,me)=>{
    if(!member(data,me)||unique(data.blockedIds).includes(me.id))throwHttp(403,'Participe do Fan Club para acessar o fórum.');
  };
  const record = (data, id) => ({
    id: String(id || data.id), title: data.title, artist: data.artist, description:data.description,
    rules:data.rules, theme:THEMES.has(data.theme)?data.theme:'geral', genre:GENRES.has(data.genre)?data.genre:'outros', coverType:data.coverType||'legacy', coverImageUrl:data.coverType==='external'?data.coverImageUrl||'':'', coverGalleryId:data.coverType==='gallery'?data.coverGalleryId||'':'', badgeImageUrl:validExternalCover(data.badgeImageUrl)||'', ownerId:data.ownerId, ownerName:data.ownerName,
    memberCount:unique(data.memberIds).length, roomCount:unique(data.roomSlugs).length,
    createdAt:data.createdAt, coverVersion:Number(data.coverVersion)||0, isUnofficial:true
  });
  const overview=(data,id,me)=>({
    ...record(data,id),
    joined:unique(data.memberIds).includes(me.id),
    owner:data.ownerId===me.id,
    blocked:unique(data.blockedIds).includes(me.id),
    canDelete:ownerOrAdmin(data,me),canModerate:canModerate(data,me),canEditProfile:canEditProfile(data,me),moderator:activeCoAdmin(data,me),
    defaultRoomSlug:unique(data.roomSlugs).includes(data.defaultRoomSlug)&&rooms.get(data.defaultRoomSlug)&&!rooms.get(data.defaultRoomSlug).isPrivate?data.defaultRoomSlug:'',
     notificationsEnabled:!unique(data.notificationMutedIds).includes(me.id),profileUpdatedAt:Number(data.profileUpdatedAt)||null
  });
  async function readClub(id){
    if (!validateId(id))throwHttp(400,'Fan Club inválido.');
    const snap=await refFor(id).get();
    if (!snap.exists || snap.data()?.deleting)throwHttp(404,'Fan Club não encontrado.');
    return {ref:snap.ref,data:snap.data()};
  }
  const ownerOrAdmin=(data,me)=>data.ownerId===me.id || adminEmails.has(me.email);
  const activeCoAdmin=(data,me)=>unique(data.moderatorIds).includes(me.id)&&unique(data.memberIds).includes(me.id)&&!unique(data.blockedIds).includes(me.id);
  const canModerate=(data,me)=>ownerOrAdmin(data,me)||activeCoAdmin(data,me);
  // A identidade do Fan Club pertence ao criador, com edição delegável a dois coadministradores.
  const canEditProfile=(data,me)=>data.ownerId===me.id||activeCoAdmin(data,me);
  const member=(data,me)=>unique(data.memberIds).includes(me.id) || ownerOrAdmin(data,me);
  function cleanRooms(data){
    return unique(data.roomSlugs).map(slug=>rooms.get(slug)).filter(r=>r&&!r.isPrivate&&r.slug.toLowerCase()!=='lobby')
      .map(r=>({slug:r.slug,name:r.name,listenerCount:Number(r.listenerCount)||0,
        isPlaying:!!r.isPlaying,track:r.queue?.[r.currentIndex] ? {title:clean(r.queue[r.currentIndex].title,150),artist:clean(r.queue[r.currentIndex].artist,90),
         videoId:/^[A-Za-z0-9_-]{11}$/.test(String(r.queue[r.currentIndex].id||''))?r.queue[r.currentIndex].id:null} : null}));
  }
  function clubEvents(data,me){
    if(!socialEvents)return [];
    const now=Date.now(),slugs=new Set(cleanRooms(data).map(r=>r.slug));
    return [...socialEvents.values()].filter(e=>slugs.has(e.roomSlug)&&e.startAt>=now-3600000)
      .sort((a,b)=>a.startAt-b.startAt).slice(0,5)
      .map(e=>({id:e.id,title:clean(e.title,70),roomName:clean(e.roomName,80),roomSlug:e.roomSlug,
        theme:clean(e.theme||'indie',35),durationMinutes:Number(e.durationMinutes)||90,
        startAt:e.startAt,attendees:Array.isArray(e.attendees)?e.attendees.length:0,
        going:!!me?.id&&Array.isArray(e.attendees)&&e.attendees.includes(me.id)}));
  }
  function memberView(id){
    const person=[...users.entries()].find(([email])=>publicUserId(email)===id);
    const user=person?.[1], saved=user?.avatar108;
    // Expor somente a foto ou personagem público escolhido pelo usuário.
    const photo=saved?.kind==='photo'&&/^[a-f0-9]{24}$/.test(id)
      ?'/api/profile108/photo/'+id+'?v='+Number(saved.updatedAt||0):'';
    const character=saved?.kind==='character'&&typeof saved.id==='string'&&/^[a-z0-9-]{1,60}$/.test(saved.id)
      ?'/avatars-108/'+saved.id+'.svg':'';
    return {id,name:user?clean(user.nome||'Fã SonoraFan',40):'Membro',
      avatar:user?clean(user.avatar||'🎧',8):'🎧',avatarUrl:photo||character};
  }

  // Fonte de verdade: vínculos persistidos nos documentos dos Fanclubs.
  // O índice por sala é uma otimização, nunca a única origem do selo.
  async function findRoomFanclubs(slug){
    const room=rooms.get(String(slug||''));
    if(!room||room.isPrivate||room.slug.toLowerCase()==='lobby')return [];
    const byId=new Map();
    let queryFailed=false;
    try{
      const idx=await roomClubRef(room.slug).get();
      const ids=unique(idx.exists?idx.data()?.clubIds:[]).filter(validateId);
      const snaps=await Promise.all(ids.map(id=>refFor(id).get()));
      for(const snap of snaps){
        if(snap.exists&&!snap.data()?.deleting&&unique(snap.data()?.roomSlugs).includes(room.slug))
          byId.set(snap.id,snap);
      }
    }catch(e){queryFailed=true;console.warn('[Fanclubs] Índice de sala indisponível:',e.message);}
    try{
      const direct=await db.collection(CLUBS).where('roomSlugs','array-contains',room.slug).get();
      for(const snap of direct.docs){
        if(!snap.data()?.deleting&&unique(snap.data()?.roomSlugs).includes(room.slug))
          byId.set(snap.id,snap);
      }
    }catch(e){queryFailed=true;console.warn('[Fanclubs] Consulta por sala indisponível:',e.message);}
    // Quando um índice falha, examinar os vínculos persistidos sem limite arbitrário.
    // Se a consulta Firestore por roomSlugs funcionou e retornou vazio, a sala
    // realmente não tem vínculos; não fazer leitura integral a cada polling.
    if(queryFailed){
      const all=await db.collection(CLUBS).get();
      for(const snap of all.docs){
        if(!snap.data()?.deleting&&unique(snap.data()?.roomSlugs).includes(room.slug))
          byId.set(snap.id,snap);
      }
    }
    return [...byId.values()].map(doc=>({
      ...record(doc.data(),doc.id),primary:doc.data().defaultRoomSlug===room.slug
    })).sort((a,b)=>Number(b.primary)-Number(a.primary)||
      String(a.title||'').localeCompare(String(b.title||''),'pt-BR'));
  }
  async function notifyRoomFanclubs(slugs){
    if(!io)return;
    await Promise.allSettled(unique(slugs).filter(slug=>slug&&slug.toLowerCase()!=='lobby')
      .map(async slug=>{
        const clubs=await findRoomFanclubs(slug);
        io.to(slug).emit('sf208RoomFanclubs',{slug,clubs,updatedAt:Date.now()});
      }));
  }
  // O selo fica disponível para qualquer participante da sala, independentemente
  // de fazer parte do Fanclub. Acesso a publicações segue protegido pela sessão.
  app.get('/api/fan-clubs/room/:slug',rateLimit(60,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    res.set('Cache-Control','private, no-store');
    try{res.json({clubs:await findRoomFanclubs(clean(req.params.slug,100))});}
    catch(e){error(res,e);}
  });
  app.post('/api/fan-clubs/:id/invite',rateLimit(10,3600000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const userId=String(req.body?.userId||'');
    if(!/^[a-f0-9-]{16,128}$/i.test(userId))return res.status(400).json({error:'Usuário inválido.'});
    try{
      const {data}=await readClub(req.params.id);
      if(!canModerate(data,me))throwHttp(403,'Somente administradores podem convidar.');
      if(unique(data.blockedIds).includes(userId))throwHttp(403,'Usuário bloqueado.');
      if(unique(data.memberIds).includes(userId))throwHttp(409,'Usuário já é membro.');
      const found=[...users.entries()].find(([email,user])=>email!==me.email&&!user?.banned&&publicUserId(email)===userId);
      if(!found)throwHttp(404,'Usuário não encontrado.');
      if(typeof sf15Notify!=='function')throwHttp(503,'Notificações indisponíveis.');
      await sf15Notify(found[0],{type:'fanclub',title:'Convite: '+clean(data.title,65),
        message:clean(me.name+' convidou você para o Fan Club '+data.title+'. Abra o Fan Club para participar.',200),fanClubId:req.params.id});
      res.json({success:true});
    }catch(e){error(res,e);}
  });
  app.get('/api/fan-clubs/:id/stream',rateLimit(15,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{
      const {data}=await readClub(req.params.id);
      if(!member(data,me))throwHttp(403,'Participe do Fan Club para receber atualizações.');
      const key=streamKey(req.params.id);
      let watchers=subscribers.get(key);
      if(!watchers){watchers=new Set();subscribers.set(key,watchers);}
      if(watchers.size>=150)throwHttp(429,'Muitas conexões simultâneas nesta comunidade.');
      res.setHeader('Content-Type','text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control','no-store, no-transform');
      res.setHeader('Content-Encoding','identity');
      res.setHeader('Connection','keep-alive');
      res.setHeader('X-Accel-Buffering','no');
      res.flushHeaders?.();
      res.write('retry: 10000\n: conectado\n\n');res.flush?.();
      let closed=false;
      const entry={res,userId:me.id,close:()=>{
        if(closed)return;closed=true;clearInterval(heartbeat);
        watchers.delete(entry);if(!watchers.size)subscribers.delete(key);
      }};
      watchers.add(entry);
      const heartbeat=setInterval(()=>{try{res.write(':ping\n\n');res.flush?.();}catch(e){entry.close();}},25000);
      heartbeat.unref?.();
      res.on('close',entry.close);
    }catch(e){error(res,e);}
  });
  app.get('/api/fan-clubs', rateLimit(45,60000), async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const q=clean(req.query.q,60).toLocaleLowerCase('pt-BR');
    const genre=GENRES.has(req.query.genre)?req.query.genre:'';
    try {
      // A legacy club without createdAt must still be listed. Firestore
      // orderBy excludes documents missing that field.
      const collection=db.collection(CLUBS);
      // Firestore supports a direct collection read that includes records
      // without createdAt. Test adapters use the equivalent ordered query.
      const snap=typeof collection.get==='function'
        ? await collection.limit(200).get()
        : await collection.orderBy('createdAt','desc').limit(200).get();
      const list=snap.docs.filter(d=>!d.data()?.deleting).map(d=>overview(d.data(),d.id,me))
        .filter(c=>!q||`${c.artist} ${c.title} ${c.description} ${c.genre}`.toLocaleLowerCase('pt-BR').includes(q))
        .filter(c=>!genre||c.genre===genre)
        .filter(c=>req.query.mine!=='true'||c.joined||c.owner)
        .sort((a,b)=>(Number(b.createdAt)||0)-(Number(a.createdAt)||0)||
          String(a.title||'').localeCompare(String(b.title||''),'pt-BR'))
        .slice(0,80);
      res.json({clubs:list});
    } catch(e){error(res,e);}
  });
  // Falhas anteriores consumiam 5 tentativas por IP/hora. O limite estrutural de
  // cinco clubes por criador continua sendo verificado no banco.
  app.post('/api/fan-clubs',rateLimit(20,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const artist=clean(req.body?.artist,65),title=clean(req.body?.title,75),description=clean(req.body?.description,280),rules=clean(req.body?.rules,300);
    const theme=THEMES.has(req.body?.theme)?req.body.theme:'geral';
    const genre=GENRES.has(req.body?.genre)?req.body.genre:'outros';
    const cover=coverChoice(req.body);
    if(!cover)return res.status(400).json({error:'Escolha uma capa válida da galeria ou informe um link HTTPS direto.'});
    if(artist.length<2||title.length<3) return res.status(400).json({error:'Informe artista e nome da comunidade.'});
    try{
      const owned=await db.collection(CLUBS).where('ownerId','==',me.id).limit(5).get();
      if(owned.size>=5)throwHttp(409,'Você já administra 5 Fan Clubs.');
      const id=crypto.randomUUID();
      const data={id,artist,title,description,rules,theme,genre,...cover,badgeImageUrl:'',coverVersion:cover.coverType==='default'?0:Date.now(),ownerId:me.id,ownerName:me.name,
        memberIds:[me.id],blockedIds:[],moderatorIds:[],notificationMutedIds:[],roomSlugs:[],createdAt:Date.now(),updatedAt:Date.now()};
      await refFor(id).create(data);
      res.status(201).json({club:overview(data,id,me)});
    }catch(e){error(res,e);}
  });
  // Capas pequenas em uma coleção SEPARADA: consultas do lobby não carregam bytes da imagem.
  // WebP/JPEG/PNG somente, dados brutos limitados a 180 KiB por grupo.
  const sniffCover = buffer => {
    if (!Buffer.isBuffer(buffer) || buffer.length<16 || buffer.length>MAX_COVER_BYTES) return null;
    if (buffer.subarray(0,4).toString()==='RIFF' && buffer.subarray(8,12).toString()==='WEBP') return 'image/webp';
    if (buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
    if (buffer[0]===255 && buffer[1]===216 && buffer[2]===255) return 'image/jpeg';
    return null;
  };
  app.get('/api/fan-clubs/:id/cover',rateLimit(120,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{const {data}=await readClub(req.params.id);
      if(data.coverType==='external'||data.coverType==='gallery')throwHttp(404,'Esta capa é fornecida por URL.');
      if(!(Number(data.coverVersion)>0))throwHttp(404,'Esta comunidade ainda não tem capa.');
      const snap=await coverRef(req.params.id).get();
      if(!snap.exists)throwHttp(404,'Capa não encontrada.');
      const blob=Buffer.from(String(snap.data()?.imageBase64||''),'base64');
      const mime=sniffCover(blob);if(!mime)throwHttp(404,'Capa indisponível.');
      res.set('Content-Type',mime);res.set('Cache-Control','private, max-age=120');
      res.set('X-Content-Type-Options','nosniff');return res.send(blob);
    }catch(e){error(res,e);}
  });
  app.post('/api/fan-clubs/:id/cover',rateLimit(15,60000),
    rawCoverParser||((req,res,next)=>next()),async(req,res)=>{
      const me=identity(req,res);if(!me)return;
      try{const {ref,data}=await readClub(req.params.id);
        if(!ownerOrAdmin(data,me))throwHttp(403,'Somente o criador pode alterar a capa.');
        const bytes=req.body;const mime=sniffCover(bytes);
        if(!mime)throwHttp(400,'A imagem deve ser WebP, PNG ou JPG e ter no máximo 180 KB.');
        const v=Math.max(Date.now(),Number(data.coverVersion||0)+1);
        await coverRef(req.params.id).set({imageBase64:bytes.toString('base64'),mime,updatedAt:v});
        await ref.update({coverVersion:v,coverType:'legacy',coverImageUrl:'',coverGalleryId:'',updatedAt:v});publish(req.params.id,'cover');
        res.json({success:true,coverVersion:v});
      }catch(e){error(res,e);}
    });
  app.delete('/api/fan-clubs/:id/cover',rateLimit(15,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{const {ref,data}=await readClub(req.params.id);
      if(!ownerOrAdmin(data,me))throwHttp(403,'Somente o criador pode remover a capa.');
      await ref.update({coverVersion:0,coverType:'default',coverImageUrl:'',coverGalleryId:'',updatedAt:Date.now()});
      await coverRef(req.params.id).delete();publish(req.params.id,'cover');res.json({success:true});
    }catch(e){error(res,e);}
  });
  // URLs e capas compartilhadas não armazenam bytes da imagem no Firestore.
  app.post('/api/fan-clubs/:id/cover-choice',rateLimit(15,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const cover=coverChoice(req.body);
    if(!cover)return res.status(400).json({error:'Capa inválida. Use HTTPS ou escolha uma imagem da galeria.'});
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!ownerOrAdmin(data,me))throwHttp(403,'Somente o criador pode alterar a capa.');
      const version=cover.coverType==='default'?0:Math.max(Date.now(),Number(data.coverVersion||0)+1);
      await ref.update({...cover,coverVersion:version,updatedAt:Date.now()});
      if(data.coverType==='legacy'||(!data.coverType&&data.coverVersion))await coverRef(req.params.id).delete();
      publish(req.params.id,'cover');
      res.json({success:true,coverVersion:version});
    }catch(e){error(res,e);}
  });
  app.get('/api/fan-clubs/:id',rateLimit(75,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{const {data}=await readClub(req.params.id);
      res.json({club:{...overview(data,req.params.id,me),rooms:cleanRooms(data),events:clubEvents(data,me),
        members:member(data,me)?unique(data.memberIds).slice(0,50).map(mid=>({...memberView(mid),isSelf:mid===me.id})):[],
        blockedMembers:canModerate(data,me)?unique(data.blockedIds).slice(0,50).map(memberView):[],
         moderators:unique(data.moderatorIds).slice(0,10).map(memberView)}});
    }catch(e){error(res,e);}
  });
  // Bio e regras: edição somente pelo fundador ou seus dois coadministradores.
  app.post('/api/fan-clubs/:id/profile',rateLimit(12,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const description=clean(req.body?.description,280),rules=clean(req.body?.rules,300);
    if(typeof req.body?.description!=='string'||typeof req.body?.rules!=='string')
      return res.status(400).json({error:'Bio e regras precisam ser textos.'});
    try{
      const ref=refFor(req.params.id);
      await db.runTransaction(async tx=>{
        const snap=await tx.get(ref);
        if(!snap.exists||snap.data()?.deleting)throwHttp(404,'Fan Club não encontrado.');
        if(!canEditProfile(snap.data(),me))throwHttp(403,'Somente o criador ou um dos dois administradores pode editar a bio e as regras.');
        tx.update(ref,{description,rules,profileUpdatedAt:Date.now(),profileUpdatedBy:me.id,updatedAt:Date.now()});
      });
      publish(req.params.id,'members');
      res.json({success:true,description,rules});
    }catch(e){error(res,e);}
  });
  // Dados de identidade: fundador ou administrador global. Bio/regras seguem delegáveis.
  app.patch('/api/fan-clubs/:id/identity',rateLimit(12,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    if(typeof req.body?.title!=='string'||typeof req.body?.artist!=='string')
      return res.status(400).json({error:'Informe o nome da comunidade e o artista.'});
    const title=clean(req.body.title,75),artist=clean(req.body.artist,65);
    const genre=String(req.body?.genre||''),theme=String(req.body?.theme||'');
    if(title.length<3||artist.length<2||!GENRES.has(genre)||!THEMES.has(theme))
      return res.status(400).json({error:'Nome, artista, gênero musical ou identidade visual inválidos.'});
    const includesBadge=Object.prototype.hasOwnProperty.call(req.body||{},'badgeImageUrl');
    if(includesBadge&&typeof req.body.badgeImageUrl!=='string')return res.status(400).json({error:'URL HTTPS da imagem inválida.'});
    const raw=includesBadge?req.body.badgeImageUrl.trim():'';
    const badgeImageUrl=includesBadge?(raw?validExternalCover(raw):''):undefined;
    if(includesBadge&&raw&&!badgeImageUrl)return res.status(400).json({error:'Informe uma URL HTTPS pública de até 500 caracteres para a segunda imagem.'});
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!ownerOrAdmin(data,me))throwHttp(403,'Somente o fundador pode editar a identidade da comunidade.');
      const now=Date.now();
      await ref.update({title,artist,genre,theme,...(includesBadge?{badgeImageUrl}:{}),profileUpdatedAt:now,profileUpdatedBy:me.id,updatedAt:now});
      publish(req.params.id,'members');
      if(includesBadge)publish(req.params.id,'cover');
      res.json({success:true,title,artist,genre,theme,...(includesBadge?{badgeImageUrl}:{})});
    }catch(e){error(res,e);}
  });
  // Segundo ícone quadrado HTTPS, separado da imagem de capa.
  app.patch('/api/fan-clubs/:id/badge-image',rateLimit(12,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    if(typeof req.body?.badgeImageUrl!=='string')return res.status(400).json({error:'Informe uma URL HTTPS ou deixe vazio para restaurar o ícone.'});
    const raw=req.body.badgeImageUrl.trim(),badgeImageUrl=raw?validExternalCover(raw):'';
    if(raw&&!badgeImageUrl)return res.status(400).json({error:'Informe uma URL HTTPS pública válida (até 500 caracteres).'});
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!ownerOrAdmin(data,me))throwHttp(403,'Somente o criador pode alterar a imagem de identidade.');
      await ref.update({badgeImageUrl,profileUpdatedAt:Date.now(),profileUpdatedBy:me.id,updatedAt:Date.now()});
      publish(req.params.id,'cover');res.json({success:true,badgeImageUrl});
    }catch(e){error(res,e);}
  });
  app.post('/api/fan-clubs/:id/join',rateLimit(20,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{const ref=refFor(req.params.id);if(!validateId(req.params.id))throwHttp(400,'Fan Club inválido.');
      const newlyJoined=await db.runTransaction(async tx=>{
        const doc=await tx.get(ref);if(!doc.exists||doc.data()?.deleting)throwHttp(404,'Fan Club não encontrado.');
        const data=doc.data();if(unique(data.blockedIds).includes(me.id))throwHttp(403,'A participação nesta comunidade está restrita.');
        const members=unique(data.memberIds);if(members.includes(me.id))return false;
        if(members.length>=300)throwHttp(409,'Esta comunidade atingiu o limite atual de membros.');
        tx.update(ref,{memberIds:[...members,me.id],updatedAt:Date.now()});
        return true;
      });
      if(newlyJoined && gamification45?.award) {
        try{await gamification45.award(me.email,'club',req.params.id);}
        catch(e){console.warn('[Fan Clubs] progress:',e?.message);}
      }
      publish(req.params.id,'members');res.json({joined:true});
    }catch(e){error(res,e);}
  });
  app.delete('/api/fan-clubs/:id/join',rateLimit(20,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{const ref=refFor(req.params.id);if(!validateId(req.params.id))throwHttp(400,'Fan Club inválido.');
      await db.runTransaction(async tx=>{
        const doc=await tx.get(ref);if(!doc.exists||doc.data()?.deleting)throwHttp(404,'Fan Club não encontrado.');
        const data=doc.data();if(data.ownerId===me.id)throwHttp(403,'O criador não pode sair sem transferir a comunidade.');
        tx.update(ref,{memberIds:unique(data.memberIds).filter(id=>id!==me.id),moderatorIds:unique(data.moderatorIds).filter(id=>id!==me.id),updatedAt:Date.now()});
      });disconnectMember(req.params.id,me.id);publish(req.params.id,'members');res.json({joined:false});
    }catch(e){error(res,e);}
  });
  app.post('/api/fan-clubs/:id/moderation',rateLimit(12,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const userId=String(req.body?.userId||''),action=req.body?.action;
    if(!/^[a-f0-9]{24}$/.test(userId)||!['block','unblock'].includes(action))return res.status(400).json({error:'Ação inválida.'});
    try{const ref=refFor(req.params.id);if(!validateId(req.params.id))throwHttp(400,'Fan Club inválido.');
      await db.runTransaction(async tx=>{
        const doc=await tx.get(ref);if(!doc.exists||doc.data()?.deleting)throwHttp(404,'Fan Club não encontrado.');
        const data=doc.data();if(!canModerate(data,me))throwHttp(403,'Apenas a moderação pode alterar membros.');
         if(unique(data.moderatorIds).includes(userId)&&!canModerate(data,me))throwHttp(403,'Somente o criador pode remover moderadores.');
        if(userId===data.ownerId)throwHttp(403,'Não é possível bloquear o criador.');
        const blocked=unique(data.blockedIds).filter(id=>id!==userId);
        tx.update(ref,{blockedIds:action==='block'?[...blocked,userId]:blocked,
           moderatorIds:action==='block'?unique(data.moderatorIds).filter(x=>x!==userId):unique(data.moderatorIds),
          memberIds:action==='block'?unique(data.memberIds).filter(id=>id!==userId):unique(data.memberIds),updatedAt:Date.now()});
      });if(action==='block')disconnectMember(req.params.id,userId);publish(req.params.id,'members');res.json({success:true});
    }catch(e){error(res,e);}
  });
  app.post('/api/fan-clubs/:id/notifications',rateLimit(15,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const enabled=req.body?.enabled===true;
    try{
      const ref=refFor(req.params.id);
      await db.runTransaction(async tx=>{
        const snap=await tx.get(ref);if(!snap.exists||snap.data()?.deleting)throwHttp(404,'Fan Club não encontrado.');
        const data=snap.data();
        if(!member(data,me)||unique(data.blockedIds).includes(me.id))throwHttp(403,'Participe do Fan Club.');
        const next=unique(data.notificationMutedIds).filter(id=>id!==me.id);
        if(!enabled)next.push(me.id);
        tx.update(ref,{notificationMutedIds:next,updatedAt:Date.now()});
      });
      res.json({notificationsEnabled:enabled});
    }catch(e){error(res,e);}
  });
  app.post('/api/fan-clubs/:id/moderators',rateLimit(12,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const userId=String(req.body?.userId||''),enabled=req.body?.enabled===true;
    if(!/^[a-f0-9]{24}$/.test(userId))return res.status(400).json({error:'Participante inválido.'});
    try{
      const ref=refFor(req.params.id);
      await db.runTransaction(async tx=>{
        const doc=await tx.get(ref);if(!doc.exists||doc.data()?.deleting)throwHttp(404,'Fan Club não encontrado.');
        const data=doc.data();
        if(data.ownerId!==me.id)throwHttp(403,'Somente quem criou o Fan Club pode compartilhar a administração.');
        if(userId===data.ownerId)throwHttp(400,'O criador já administra a comunidade.');
        if(enabled&&!unique(data.memberIds).includes(userId))throwHttp(400,'Escolha um membro ativo.');
        const next=unique(data.moderatorIds).filter(x=>x!==userId);
        if(enabled)next.push(userId);
        if(next.length>2)throwHttp(409,'O criador pode compartilhar a administração com até dois membros.');
        tx.update(ref,{moderatorIds:next,updatedAt:Date.now()});
      });
      publish(req.params.id,'members');res.json({success:true});
    }catch(e){error(res,e);}
  });
  // Imagens leves associadas a posts: bytes em subcoleção separada do feed.
  // A leitura é exclusiva dos membros e nunca envia HTML ou conteúdo ativo.
  app.get('/api/fan-clubs/:id/posts/:postId/image',rateLimit(90,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!member(data,me)||unique(data.blockedIds).includes(me.id))throwHttp(403,'Participe para ver a imagem.');
      const image=await ref.collection('postImages').doc(req.params.postId).get();
      if(!image.exists)throwHttp(404,'Imagem indisponível.');
      const blob=Buffer.from(String(image.data().imageBase64||''),'base64');
      const mime=sniffCover(blob);if(!mime)throwHttp(404,'Imagem indisponível.');
      res.set('Content-Type',mime);res.set('Cache-Control','private, max-age=120');
      res.set('X-Content-Type-Options','nosniff');return res.send(blob);
    }catch(e){error(res,e);}
  });
  // Upload de arquivo desativado. Imagens anteriores permanecem acessíveis.
  app.post('/api/fan-clubs/:id/posts/:postId/image',rateLimit(6,60000),(req,res)=>
    res.status(410).json({error:'Envio de arquivos desativado. Use uma URL HTTPS na publicação.'}));
  // Busca no histórico por páginas do Firestore, sem depender de quantos posts o navegador carregou.
  // Cada resposta percorre até 800 registros; o cursor possibilita alcançar todo o arquivo.
  app.get('/api/fan-clubs/:id/forum/search',rateLimit(25,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{
      const {ref,data}=await readClub(req.params.id);requireForumMember(data,me);
      const queryText=clean(req.query?.q,120).toLocaleLowerCase('pt-BR');
      const topic=['conversa','duvida','novidade','evento','ideia'].includes(req.query?.topic)?req.query.topic:null;
      const tag=forumTags([req.query?.tag])[0]||null;
      const sort=['recent','active','popular','unanswered'].includes(req.query?.sort)?req.query.sort:'recent';
      const before=req.query?.before;
      if(before!==undefined&&!/^[A-Za-z0-9_-]{1,100}$/.test(String(before)))throwHttp(400,'Cursor inválido.');
      const profile=(await forumProfileRef(ref,me).get()).data()||{};
      const saved=req.query?.saved==='1',unread=req.query?.unread==='1';
      let query=ref.collection('posts').orderBy('createdAt','desc');
      if(before!==undefined){
        const previous=await ref.collection('posts').doc(String(before)).get();
        if(!previous.exists)throwHttp(400,'Cursor inválido.');
        query=query.startAfter(previous);
      }
      const matches=[];let last=null,scanned=0,exhausted=false;
      for(let batch=0;batch<8&&matches.length<25;batch++){
        const snap=await query.limit(100).get();
        if(!snap.docs.length){exhausted=true;break;}
        for(const doc of snap.docs){
          last=doc.id;scanned++;
          const p=doc.data();
          if(saved&&!unique(profile.favorites).includes(doc.id))continue;
          if(unread&&Number(profile.readAt?.[doc.id])>=Number(p.lastActivityAt||p.createdAt||0))continue;
          if(topic&&(p.topic||'conversa')!==topic)continue;
          if(tag&&!forumTags(p.tags).includes(tag))continue;
          if(sort==='unanswered'&&((p.topic||'conversa')!=='duvida'||p.resolved))continue;
          if(queryText&&![forumTitle(p),p.text,p.authorName,forumTags(p.tags).join(' ')]
            .some(t=>String(t||'').toLocaleLowerCase('pt-BR').includes(queryText)))continue;
          matches.push(forumPost(doc,data,me,profile));
          if(matches.length>=25)break;
        }
        if(snap.docs.length<100){exhausted=true;break;}
        if(matches.length<25)query=ref.collection('posts').orderBy('createdAt','desc').startAfter(snap.docs.at(-1));
      }
      if(sort==='popular')matches.sort((a,b)=>b.likeCount-a.likeCount||b.createdAt-a.createdAt);
      if(sort==='active')matches.sort((a,b)=>(b.lastActivityAt||b.createdAt)-(a.lastActivityAt||a.createdAt));
      res.json({posts:matches,nextBefore:exhausted?null:last,hasMore:!exhausted,scanned,scope:'histórico do Fan Club'});
    }catch(e){error(res,e);}
  });
  app.get('/api/fan-clubs/:id/posts/:postId',rateLimit(65,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{
      const {ref,data}=await readClub(req.params.id);requireForumMember(data,me);
      const post=await ref.collection('posts').doc(req.params.postId).get();
      if(!post.exists)throwHttp(404,'Discussão não encontrada.');
      const profileRef=forumProfileRef(ref,me);
      const profile=await db.runTransaction(async tx=>{
        const snapshot=await tx.get(profileRef);
        const previous=snapshot.data()||{},readAt={...(previous.readAt||{})};
        const keys=Object.keys(readAt);
        if(keys.length>=150&&!Object.hasOwn(readAt,req.params.postId)){
          keys.sort((a,b)=>Number(readAt[a])-Number(readAt[b]));
          delete readAt[keys[0]];
        }
        readAt[req.params.postId]=Math.max(Date.now(),Number(post.data().lastActivityAt||post.data().createdAt)||0);
        const readReplyCounts={...(previous.readReplyCounts||{}),
          [req.params.postId]:Math.max(0,Number(post.data().replyCount)||0)};
        tx.set(profileRef,{readAt,readReplyCounts},{merge:true});
        return {...previous,readAt,readReplyCounts};
      });
      const result=forumPost(post,data,me,profile);
      res.json({post:result,permalink:'#fanclub/'+req.params.id+'/topic/'+req.params.postId});
    }catch(e){error(res,e);}
  });
  app.post('/api/fan-clubs/:id/posts/:postId/favorite',rateLimit(30,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{
      const {ref,data}=await readClub(req.params.id);requireForumMember(data,me);
      const post=await ref.collection('posts').doc(req.params.postId).get();
      if(!post.exists)throwHttp(404,'Discussão não encontrada.');
      const profileRef=forumProfileRef(ref,me),result=await db.runTransaction(async tx=>{
        const snap=await tx.get(profileRef),items=unique(snap.data()?.favorites);
        const favorite=req.body?.favorite===true;
        const next=items.filter(id=>id!==req.params.postId);
        if(favorite){if(next.length>=150)throwHttp(409,'Limite de 150 favoritos.');next.push(req.params.postId);}
        tx.set(profileRef,{favorites:next},{merge:true});
        return {favorite};
      });
      res.json(result);
    }catch(e){error(res,e);}
  });
  app.get('/api/fan-clubs/:id/posts/:postId/related',rateLimit(45,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{
      const {ref,data}=await readClub(req.params.id);requireForumMember(data,me);
      const post=await ref.collection('posts').doc(req.params.postId).get();
      if(!post.exists)throwHttp(404,'Discussão não encontrada.');
      const source=post.data(),tags=forumTags(source.tags);
      const snap=await ref.collection('posts').orderBy('createdAt','desc').limit(120).get();
      const related=snap.docs.filter(d=>d.id!==post.id).map(d=>{
        const p=d.data(),common=forumTags(p.tags).filter(t=>tags.includes(t)).length;
        return {doc:d,score:common*4+((p.topic||'conversa')===(source.topic||'conversa')?2:0)};
      }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||b.doc.data().createdAt-a.doc.data().createdAt)
        .slice(0,5).map(({doc})=>({id:doc.id,title:forumTitle(doc.data()),topic:doc.data().topic||'conversa'}));
      res.json({related});
    }catch(e){error(res,e);}
  });
  app.get('/api/fan-clubs/:id/posts',rateLimit(60,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{const {ref,data}=await readClub(req.params.id);if(!member(data,me))throwHttp(403,'Participe do Fan Club para ler o mural.');
      const before=req.query?.before;
      if(before!==undefined&&!/^[A-Za-z0-9_-]{1,80}$/.test(String(before)))throwHttp(400,'Cursor inválido.');
      let query=ref.collection('posts').orderBy('createdAt','desc');
      if(before!==undefined){
        const previous=await ref.collection('posts').doc(String(before)).get();
        if(!previous.exists)throwHttp(400,'Publicação anterior não encontrada.');
        query=query.startAfter(previous);
      }
      const snap=await query.limit(36).get();
      const page=snap.docs.slice(0,35),hasMore=snap.docs.length>35;
      const profile=(await forumProfileRef(ref,me).get()).data()||{};
      const posts=page.map(d=>forumPost(d,data,me,profile));
      posts.sort((a,b)=>Number(b.pinned)-Number(a.pinned)||(Number(b.createdAt)||0)-(Number(a.createdAt)||0));
      res.json({posts,hasMore,nextBefore:hasMore?page.at(-1)?.id||null:null});
    }catch(e){error(res,e);}
  });
  app.post('/api/fan-clubs/:id/posts',rateLimit(12,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const text=clean(req.body?.text,600),title=clean(req.body?.title,110),tags=forumTags(req.body?.tags);
     const imageUrl=validPostImageUrl(req.body?.imageUrl);
     if(imageUrl===null)return res.status(400).json({error:'Informe uma URL HTTPS pública válida para a imagem.'});
     const youtubeId=youtubeVideoId(req.body?.youtubeUrl);
     if(youtubeId===null)return res.status(400).json({error:'Use um link HTTPS válido para um vídeo do YouTube (watch, Shorts, Live ou youtu.be).'});
    const topic=['conversa','duvida','novidade','evento','ideia'].includes(req.body?.topic)?req.body.topic:'conversa';
    if(text.length<3)return res.status(400).json({error:'Escreva uma mensagem com pelo menos 3 caracteres.'});
    try{const {ref,data}=await readClub(req.params.id);if(!member(data,me))throwHttp(403,'Participe do Fan Club para publicar.');
      const doc=ref.collection('posts').doc();
      const post={authorId:me.id,authorName:me.name,text,title:title||forumTitle({text}),tags,topic,imageUrl,youtubeId,createdAt:Date.now(),lastActivityAt:Date.now(),replyCount:0};
      await doc.create(post);
      publish(req.params.id,'post');
      notifyPostMembers(req.params.id,data,me.id,me.name);
      res.status(201).json({post:{...post,id:doc.id,editable:true}});
    }catch(e){error(res,e);}
  });
  app.post('/api/fan-clubs/:id/posts/:postId/edit',rateLimit(18,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const text=clean(req.body?.text,600),title=clean(req.body?.title,110),tags=req.body?.tags===undefined?null:forumTags(req.body?.tags);
    if(text.length<3)return res.status(400).json({error:'A publicação deve ter pelo menos 3 caracteres.'});
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!member(data,me)||unique(data.blockedIds).includes(me.id))throwHttp(403,'Acesso restrito.');
      const postRef=ref.collection('posts').doc(req.params.postId);
      await db.runTransaction(async tx=>{
        const snap=await tx.get(postRef);if(!snap.exists)throwHttp(404,'Publicação não encontrada.');
        if(snap.data().authorId!==me.id)throwHttp(403,'Somente o autor pode editar seu texto.');
        tx.update(postRef,{text,...(title?{title}:{}),...(tags!==null?{tags}:{}),editedAt:Date.now()});
      });
      publish(req.params.id,'post');res.json({success:true});
    }catch(e){error(res,e);}
  });
  app.post('/api/fan-clubs/:id/posts/:postId/resolve',rateLimit(18,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const resolved=req.body?.resolved===true;
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!member(data,me)||unique(data.blockedIds).includes(me.id))throwHttp(403,'Acesso restrito.');
      const target=ref.collection('posts').doc(req.params.postId);
      await db.runTransaction(async tx=>{
        const snap=await tx.get(target);if(!snap.exists)throwHttp(404,'Publicação não encontrada.');
        if((snap.data().topic||'conversa')!=='duvida')throwHttp(400,'Somente dúvidas podem ser resolvidas.');
        if(snap.data().authorId!==me.id&&!canModerate(data,me))throwHttp(403,'Somente autor ou moderação pode resolver esta dúvida.');
        tx.update(target,{resolved,resolvedAt:resolved?Date.now():null,bestCommentId:resolved?(snap.data().bestCommentId||null):null});
      });
      publish(req.params.id,'post');res.json({resolved});
    }catch(e){error(res,e);}
  });
  app.post('/api/fan-clubs/:id/posts/:postId/best-answer',rateLimit(18,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const commentId=String(req.body?.commentId||'');
    if(!/^[a-zA-Z0-9_-]{1,100}$/.test(commentId))return res.status(400).json({error:'Resposta inválida.'});
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!member(data,me)||unique(data.blockedIds).includes(me.id))throwHttp(403,'Acesso restrito.');
      const target=ref.collection('posts').doc(req.params.postId),answerRef=ref.collection('comments').doc(commentId);
      const accepted=await db.runTransaction(async tx=>{
        const [post,comment]=await Promise.all([tx.get(target),tx.get(answerRef)]);
        if(!post.exists||!comment.exists||comment.data().postId!==req.params.postId)throwHttp(404,'Resposta não encontrada.');
        if((post.data().topic||'conversa')!=='duvida')throwHttp(400,'Somente dúvidas possuem resposta escolhida.');
        if(post.data().authorId!==me.id&&!canModerate(data,me))throwHttp(403,'Sem permissão para escolher a resposta.');
        tx.update(target,{bestCommentId:commentId,resolved:true,resolvedAt:Date.now()});
        return {authorId:comment.data().authorId,questionAuthorId:post.data().authorId};
      });
      // Reputação separada do XP musical. Uma recompensa por pergunta, com limite diário
      // e marca de idempotência transacional no módulo de ranking.
      if(ranking60&&accepted.authorId!==accepted.questionAuthorId){
        const winner=[...users.keys()].find(email=>publicUserId(email)===accepted.authorId);
        if(winner)try{
          await ranking60.awardForumReputation(winner,req.params.id,req.params.postId,commentId);
        }catch(err){console.warn('Reputação do fórum não atribuída:',err?.message);}
      }
      publish(req.params.id,'post');res.json({success:true});
    }catch(e){error(res,e);}
  });
  app.delete('/api/fan-clubs/:id/posts/:postId',rateLimit(20,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{const {ref,data}=await readClub(req.params.id);const postRef=ref.collection('posts').doc(req.params.postId);
      await db.runTransaction(async tx=>{
        const snap=await tx.get(postRef);if(!snap.exists)throwHttp(404,'Publicação não encontrada.');
        if(snap.data().authorId!==me.id&&!canModerate(data,me))throwHttp(403,'Sem permissão para moderar esta publicação.');
        tx.delete(postRef);
        if(data.pinnedPostId===req.params.postId)tx.update(ref,{pinnedPostId:null,updatedAt:Date.now()});
      });
      // Apaga também respostas da publicação; Firestore não faz cascata.
      const comments=ref.collection('comments').where('postId','==',req.params.postId);
      for(let batch=0;batch<10;batch++){
        const snap=await comments.limit(100).get();
        if(!snap.docs.length)break;
        for(const doc of snap.docs)await doc.ref.delete();
        if(batch===9)throwHttp(503,'Limpeza dos comentários incompleta.');
      }
      await ref.collection('postImages').doc(req.params.postId).delete();
      publish(req.params.id,'post');res.json({success:true});
    }catch(e){error(res,e);}
  });
  // 3.0 — somente a moderação pode fixar uma publicação por Fan Club.
  app.post('/api/fan-clubs/:id/posts/:postId/pin',rateLimit(15,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!canModerate(data,me))throwHttp(403,'Somente a moderação pode destacar publicações.');
      const pinned=req.body?.pinned===true;
      const postRef=ref.collection('posts').doc(req.params.postId);
      await db.runTransaction(async tx=>{
        const post=await tx.get(postRef);
        if(!post.exists)throwHttp(404,'Publicação não encontrada.');
        tx.update(ref,{pinnedPostId:pinned?req.params.postId:(data.pinnedPostId===req.params.postId?null:data.pinnedPostId||null),updatedAt:Date.now()});
      });
      publish(req.params.id,'post');res.json({success:true,pinned});
    }catch(e){error(res,e);}
  });
  // Reações não concedem XP, prevenindo farm de curtidas.
  app.post('/api/fan-clubs/:id/posts/:postId/like',rateLimit(40,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!member(data,me)||unique(data.blockedIds).includes(me.id))throwHttp(403,'Participe do Fan Club para reagir.');
      const postRef=ref.collection('posts').doc(req.params.postId);
      const result=await db.runTransaction(async tx=>{
        const snap=await tx.get(postRef);
        if(!snap.exists)throwHttp(404,'Publicação não encontrada.');
        const likedBy=unique(snap.data().likedBy);
        const liked=!likedBy.includes(me.id);
        const next=liked?[...likedBy,me.id]:likedBy.filter(id=>id!==me.id);
        if(next.length>300)throwHttp(409,'Limite de reações atingido.');
        tx.update(postRef,{likedBy:next});
        return {liked,likeCount:next.length};
      });
      publish(req.params.id,'post');res.json(result);
    }catch(e){error(res,e);}
  });
  // Fan Clubs 4.0: discussões com comentários armazenados na subcoleção do clube.
  app.get('/api/fan-clubs/:id/posts/:postId/comments',rateLimit(50,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!member(data,me)||unique(data.blockedIds).includes(me.id))throwHttp(403,'Participe para ler os comentários.');
      const post=await ref.collection('posts').doc(req.params.postId).get();
      if(!post.exists)throwHttp(404,'Publicação não encontrada.');
      // Buscar pelo próprio tópico evita perder respostas quando outras discussões crescem.
      // Apenas o índice simples postId é necessário; ordenação é feita em memória.
      const snap=await ref.collection('comments').where('postId','==',req.params.postId).limit(300).get();
      const comments=snap.docs.sort((a,b)=>(a.data().createdAt||0)-(b.data().createdAt||0))
        .map(d=>({...d.data(),id:d.id,parentId:d.data().parentId||null,depth:Math.min(3,Math.max(0,Number(d.data().depth)||0)),
          quoteText:clean(d.data().quoteText,160)||null,
          editable:d.data().authorId===me.id||canModerate(data,me),
          best:d.id===post.data().bestCommentId}));
      res.json({comments});
    }catch(e){error(res,e);}
  });
  app.post('/api/fan-clubs/:id/posts/:postId/comments',rateLimit(12,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const text=clean(req.body?.text,350),parentId=String(req.body?.parentId||''),quoteId=String(req.body?.quoteId||'');
    if(text.length<2)return res.status(400).json({error:'Escreva pelo menos 2 caracteres.'});
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!member(data,me)||unique(data.blockedIds).includes(me.id))throwHttp(403,'Participe para comentar.');
      const target=await ref.collection('posts').doc(req.params.postId).get();
      if(!target.exists)throwHttp(404,'Publicação não encontrada.');
      if((parentId&&!/^[A-Za-z0-9_-]{1,100}$/.test(parentId))||(quoteId&&!/^[A-Za-z0-9_-]{1,100}$/.test(quoteId)))
        throwHttp(400,'Referência de resposta inválida.');
      const references=[...new Set([parentId,quoteId].filter(Boolean))];
      const found=await Promise.all(references.map(id=>ref.collection('comments').doc(id).get()));
      if(found.some(s=>!s.exists||s.data().postId!==req.params.postId))
        throwHttp(404,'Resposta citada não pertence a esta discussão.');
      const parent=parentId?found[references.indexOf(parentId)].data():null;
      const quote=quoteId?found[references.indexOf(quoteId)].data():null;
      const depth=parent?Math.min(3,Math.max(0,Number(parent.depth)||0)+1):0;
      // Profundidade limitada e referências apenas na mesma discussão.
      const comment={postId:req.params.postId,authorId:me.id,authorName:me.name,text,
        parentId:parentId||null,quoteId:quoteId||null,quoteText:quote?clean(quote.text,160):null,
        depth,createdAt:Date.now()};
      const doc=ref.collection('comments').doc(),postRef=ref.collection('posts').doc(req.params.postId);
      await db.runTransaction(async tx=>{
        const current=await tx.get(postRef);
        if(!current.exists)throwHttp(404,'Discussão não encontrada.');
        tx.set(doc,comment);
        tx.update(postRef,{
          lastActivityAt:Math.max(Date.now(),Number(current.data().lastActivityAt||current.data().createdAt||0)+1),
          replyCount:Math.max(0,Number(current.data().replyCount)||0)+1
        });
      });
      publish(req.params.id,'post');
      const authorId=target.data().authorId;
      if(authorId!==me.id&&!unique(data.notificationMutedIds).includes(authorId)&&typeof sf15Notify==='function'){
        const email=[...users.keys()].find(e=>publicUserId(e)===authorId);
        if(email)Promise.resolve().then(()=>sf15Notify(email,{type:'fanclub',title:'Responderam à sua publicação',message:me.name+' comentou no Fan Club',fanClubId:req.params.id})).catch(()=>{});
      }
      if(typeof sf15Notify==='function'){
        const others=[...users.entries()].filter(([email,user])=>{
          const id=publicUserId(email);
          return id!==me.id&&id!==authorId&&unique(data.memberIds).includes(id)&&!unique(data.notificationMutedIds).includes(id)&&
            text.toLocaleLowerCase('pt-BR').includes('@'+clean(user?.nome||'',40).toLocaleLowerCase('pt-BR'));
        }).slice(0,3);
        Promise.allSettled(others.map(([email])=>sf15Notify(email,{
          type:'fanclub',title:'Você foi mencionado no Fan Club',message:me.name+' mencionou você em uma resposta',fanClubId:req.params.id
        }))).catch(()=>{});
      }
      res.status(201).json({comment:{...comment,id:doc.id,editable:true}});
    }catch(e){error(res,e);}
  });
  app.delete('/api/fan-clubs/:id/comments/:commentId',rateLimit(15,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{
      const {ref,data}=await readClub(req.params.id);
      const target=ref.collection('comments').doc(req.params.commentId);
      await db.runTransaction(async tx=>{
        const snap=await tx.get(target);
        if(!snap.exists)throwHttp(404,'Comentário não encontrado.');
        if(snap.data().authorId!==me.id&&!canModerate(data,me))throwHttp(403,'Sem permissão para remover.');
        const parent=ref.collection('posts').doc(snap.data().postId);
        const postSnap=await tx.get(parent);
        if(postSnap.exists&&postSnap.data().bestCommentId===req.params.commentId)
          tx.update(parent,{bestCommentId:null,resolved:false,resolvedAt:null});
        if(postSnap.exists)tx.update(parent,{
          replyCount:Math.max(0,Number(postSnap.data().replyCount)||0)-1,lastActivityAt:Date.now()
        });
        tx.delete(target);
      });
      publish(req.params.id,'post');res.json({success:true});
    }catch(e){error(res,e);}
  });
  // Enquetes: somente membros votam; autoria é reservada aos moderadores.
  app.get('/api/fan-clubs/:id/polls',rateLimit(40,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!member(data,me)||unique(data.blockedIds).includes(me.id))throwHttp(403,'Participe para ver enquetes.');
      const snap=await ref.collection('polls').orderBy('createdAt','desc').limit(40).get();
      res.json({polls:snap.docs.map(d=>({id:d.id,question:d.data().question,options:d.data().options,
        counts:(d.data().options||[]).map((_,i)=>Object.values(d.data().votes||{}).filter(v=>v===i).length),
        voted:Object.hasOwn(d.data().votes||{},me.id),myVote:d.data().votes?.[me.id]??null,
        createdAt:d.data().createdAt,closed:!!(d.data().closesAt&&d.data().closesAt<=Date.now()),closesAt:d.data().closesAt||null,
        totalVotes:Object.keys(d.data().votes||{}).length,canEdit:canModerate(data,me),canDelete:canModerate(data,me)}))});
    }catch(e){error(res,e);}
  });
  app.post('/api/fan-clubs/:id/polls',rateLimit(8,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const question=clean(req.body?.question,140);
    const options=Array.isArray(req.body?.options)?req.body.options.slice(0,9).map(v=>clean(v,80)).filter(Boolean):[];
    if(question.length<8||options.length<2||options.length>8||new Set(options.map(v=>v.toLocaleLowerCase('pt-BR'))).size!==options.length)
      return res.status(400).json({error:'Informe uma pergunta e de 2 a 8 opções diferentes.'});
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!canModerate(data,me))throwHttp(403,'Somente moderadores podem criar enquetes.');
      const doc=ref.collection('polls').doc();
      const days=Number(req.body?.durationDays);
      const closesAt=[1,3,7,14].includes(days)?Date.now()+days*86400000:null;
      await doc.create({question,options,votes:{},authorId:me.id,createdAt:Date.now(),closesAt});
      publish(req.params.id,'polls');res.status(201).json({id:doc.id});
    }catch(e){error(res,e);}
  });
  app.post('/api/fan-clubs/:id/polls/:pollId/vote',rateLimit(20,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const choice=req.body?.choice;
    if(!Number.isInteger(choice)||choice<0||choice>=8)return res.status(400).json({error:'Opção inválida.'});
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!member(data,me)||unique(data.blockedIds).includes(me.id))throwHttp(403,'Participe para votar.');
      const target=ref.collection('polls').doc(req.params.pollId);
      await db.runTransaction(async tx=>{
        const snap=await tx.get(target);if(!snap.exists)throwHttp(404,'Enquete não encontrada.');
        const poll=snap.data();
        if(choice>=poll.options.length)throwHttp(400,'Opção inválida.');
        if(poll.closesAt&&Date.now()>=poll.closesAt)throwHttp(409,'Esta enquete foi encerrada.');
        if(Object.hasOwn(poll.votes||{},me.id))throwHttp(409,'Você já votou nesta enquete.');
        const votes={...(poll.votes||{}),[me.id]:choice};
        if(Object.keys(votes).length>300)throwHttp(409,'Limite de votos atingido.');
        tx.update(target,{votes});
      });
      publish(req.params.id,'polls');res.json({success:true});
    }catch(e){error(res,e);}
  });
  // Edição segura: nunca deslocar alternativas depois de votos registrados.
  app.patch('/api/fan-clubs/:id/polls/:pollId',rateLimit(12,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const question=clean(req.body?.question,140);
    const editOptions=req.body?.options;
    const duration=String(req.body?.duration||'keep');
    if(question.length<8)return res.status(400).json({error:'A pergunta precisa ter pelo menos 8 caracteres.'});
    if(!['keep','none','1','3','7','14','close'].includes(duration))
      return res.status(400).json({error:'Prazo inválido.'});
    if(editOptions!==undefined && (!Array.isArray(editOptions)||editOptions.length<2||editOptions.length>8))
      return res.status(400).json({error:'Use de 2 a 8 alternativas.'});
    const options=Array.isArray(editOptions)?editOptions.map(v=>clean(v,80)):[];
    if(editOptions!==undefined&&(options.some(v=>!v)||new Set(options.map(v=>v.toLocaleLowerCase('pt-BR'))).size!==options.length))
      return res.status(400).json({error:'Preencha alternativas diferentes, sem campos vazios.'});
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!canModerate(data,me))throwHttp(403,'Somente a moderação pode editar enquetes.');
      const target=ref.collection('polls').doc(req.params.pollId);
      await db.runTransaction(async tx=>{
        const snap=await tx.get(target);if(!snap.exists)throwHttp(404,'Enquete não encontrada.');
        const current=snap.data(),hasVotes=Object.keys(current.votes||{}).length>0;
        const sameOptions=options.length===current.options.length&&options.every((v,i)=>v===current.options[i]);
        if(hasVotes&&editOptions!==undefined&&!sameOptions)
          throwHttp(409,'Esta enquete já recebeu votos. Para preservar os resultados, não é possível alterar as alternativas; edite apenas a pergunta ou o prazo.');
        const update={question,updatedAt:Date.now(),updatedBy:me.id};
        if(editOptions!==undefined&&!hasVotes)update.options=options;
        if(duration==='none')update.closesAt=null;
        else if(duration==='close')update.closesAt=Date.now();
        else if(duration!=='keep')update.closesAt=Date.now()+Number(duration)*86400000;
        tx.update(target,update);
      });
      publish(req.params.id,'polls');res.json({success:true});
    }catch(e){error(res,e);}
  });
  app.delete('/api/fan-clubs/:id/polls/:pollId',rateLimit(8,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!canModerate(data,me))throwHttp(403,'Somente a moderação pode remover enquetes.');
      await ref.collection('polls').doc(req.params.pollId).delete();
      publish(req.params.id,'polls');res.json({success:true});
    }catch(e){error(res,e);}
  });
  // Descobertas reais de URLs do YouTube compartilhadas no mural; sem dados inventados.
  // Banco de ideias: propostas votadas, separadas do mural de conversas.
  app.get('/api/fan-clubs/:id/ideas',rateLimit(40,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!member(data,me)||unique(data.blockedIds).includes(me.id))throwHttp(403,'Participe para ver ideias.');
      const snap=await ref.collection('ideas').orderBy('createdAt','desc').limit(60).get();
      const ideas=snap.docs.map(d=>({id:d.id,title:d.data().title,description:d.data().description,
        authorName:d.data().authorName,createdAt:d.data().createdAt,
        votes:unique(d.data().voterIds).length,voted:unique(d.data().voterIds).includes(me.id),
        status:d.data().status||'open',canManage:canModerate(data,me)}))
        .sort((x,y)=>y.votes-x.votes||y.createdAt-x.createdAt);
      res.json({ideas});
    }catch(e){error(res,e);}
  });
  app.post('/api/fan-clubs/:id/ideas',rateLimit(8,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const title=clean(req.body?.title,100),description=clean(req.body?.description,300);
    if(title.length<6)return res.status(400).json({error:'Descreva a ideia em pelo menos 6 caracteres.'});
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!member(data,me)||unique(data.blockedIds).includes(me.id))throwHttp(403,'Participe para sugerir ideias.');
      const doc=ref.collection('ideas').doc();
      await doc.create({title,description,authorId:me.id,authorName:me.name,
        voterIds:[],status:'open',createdAt:Date.now()});
      publish(req.params.id,'ideas');res.status(201).json({id:doc.id});
    }catch(e){error(res,e);}
  });
  app.post('/api/fan-clubs/:id/ideas/:ideaId/vote',rateLimit(20,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!member(data,me)||unique(data.blockedIds).includes(me.id))throwHttp(403,'Participe para votar.');
      const target=ref.collection('ideas').doc(req.params.ideaId);
      const result=await db.runTransaction(async tx=>{
        const snap=await tx.get(target);if(!snap.exists)throwHttp(404,'Ideia não encontrada.');
        if(snap.data().status!=='open')throwHttp(409,'Votação encerrada.');
        const prev=unique(snap.data().voterIds),voted=!prev.includes(me.id);
        const next=voted?[...prev,me.id]:prev.filter(id=>id!==me.id);
        if(next.length>300)throwHttp(409,'Limite de participantes atingido.');
        tx.update(target,{voterIds:next});
        return {voted,votes:next.length};
      });
      publish(req.params.id,'ideas');res.json(result);
    }catch(e){error(res,e);}
  });
  app.post('/api/fan-clubs/:id/ideas/:ideaId/status',rateLimit(12,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const status=req.body?.status;
    if(!['open','planned','done','closed'].includes(status))return res.status(400).json({error:'Status inválido.'});
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!canModerate(data,me))throwHttp(403,'Somente a moderação altera o status.');
      const target=ref.collection('ideas').doc(req.params.ideaId);
      const snap=await target.get();if(!snap.exists)throwHttp(404,'Ideia não encontrada.');
      await target.update({status,updatedAt:Date.now()});publish(req.params.id,'ideas');res.json({success:true});
    }catch(e){error(res,e);}
  });
  // Agenda musical pública: metadados dos encontros dos clubes e das salas.
  // Armazena somente referências às capas; nunca duplica o conteúdo binário.
  const agendaCache={expires:0,items:[]};
  app.get('/api/music-agenda',rateLimit(35,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{
      const now=Date.now();
      let items=agendaCache.items;
      if(now>=agendaCache.expires || req.query.refresh==='1'){
        const snap=await db.collection(CLUBS).limit(100).get();
        const clubs=snap.docs.filter(d=>!d.data()?.deleting);
        const clubItems=await Promise.all(clubs.map(async d=>{
          try{
            const c=d.data(),ev=await d.ref.collection('events').orderBy('startAt','asc').limit(30).get();
            return ev.docs.filter(e=>Number(e.data()?.startAt)>=now-3600000&&Number(e.data()?.startAt)<=now+90*86400000)
              .map(e=>({id:e.id,type:'fanclub',clubId:d.id,clubName:clean(c.title,75),
                artist:clean(c.artist,65),genre:clean(c.genre||'outros',32),theme:clean(THEMES.has(c.theme)?c.theme:'geral',40),
                coverType:clean(c.coverType||'legacy',15),coverImageUrl:c.coverType==='external'?validExternalCover(c.coverImageUrl):'',
                coverGalleryId:c.coverType==='gallery'&&Object.hasOwn(GALLERY_COVERS,c.coverGalleryId)?c.coverGalleryId:'',
                coverVersion:Number(c.coverVersion)||0,title:clean(e.data().title,90),roomSlug:clean(e.data().roomSlug||'',100),roomName:clean(rooms.get(e.data().roomSlug)?.name||'',90),
                description:clean(e.data().description,300),startAt:Number(e.data().startAt),
                durationMinutes:Number(e.data().durationMinutes)||60,notifyMembers:e.data().notifyMembers!==false,sendRoomLink:e.data().sendRoomLink!==false,remindStart:e.data().remindStart!==false,
                 attendees:unique(e.data().attendeeIds).length,
                attendeeIds:unique(e.data().attendeeIds),blockedIds:unique(c.blockedIds),
                memberIds:unique(c.memberIds),moderatorIds:unique(c.moderatorIds),ownerId:c.ownerId,creatorId:e.data().creatorId}));
          }catch(err){console.error('agenda fanclub read:',err.message);return [];}
        }));
        const roomItems=[...(socialEvents?.values()||[])].filter(e=>
          Number(e.startAt)>=now-3600000&&Number(e.startAt)<=now+90*86400000&&rooms.has(e.roomSlug)&&!rooms.get(e.roomSlug).isPrivate)
          .map(e=>({id:String(e.id),type:'room',roomSlug:String(e.roomSlug),roomName:clean(e.roomName,90),
            genre:clean(rooms.get(e.roomSlug)?.genre||e.theme||'outros',32),theme:clean(e.theme||'indie',32),hostName:clean(e.hostName,80),
            title:clean(e.title,90),description:clean(e.description,300),startAt:Number(e.startAt),
            durationMinutes:Number(e.durationMinutes)||90,attendees:unique(e.attendees).length,attendeeIds:unique(e.attendees),hostId:e.hostId}));
        items=[...clubItems.flat(),...roomItems].sort((a,b)=>a.startAt-b.startAt).slice(0,180);
        agendaCache.items=items;agendaCache.expires=Date.now()+30000;
      }
      res.set('Cache-Control','private, no-store');
      res.json({events:items.map(e=>{
        const {attendeeIds,memberIds,blockedIds,moderatorIds,ownerId,hostId,creatorId,...publicData}=e;
        const canManage=e.type==='fanclub'?
          creatorId===me.id||ownerId===me.id||(moderatorIds||[]).includes(me.id)&&(memberIds||[]).includes(me.id)&&!(blockedIds||[]).includes(me.id)||adminEmails.has(me.email):
          hostId===me.id||rooms.get(e.roomSlug)?.ownerEmail===me.email||adminEmails.has(me.email);
        return {...publicData,going:attendeeIds.includes(me.id),canManage:!!canManage,
          ...(e.type==='fanclub'?{joined:memberIds.includes(me.id)||ownerId===me.id,
            blocked:blockedIds.includes(me.id)}:{})};
      })});
    }catch(e){error(res,e);}
  });
  // Lembretes sob demanda, sem disparos repetidos e sem processo em segundo plano.
  if(app.locals){
    const reminderCache=new Map();
    app.locals.sf202ClubEventReminders=async(email)=>{
      const id=publicUserId(email),now=Date.now(),saved=reminderCache.get(id);
      if(saved&&now-saved.at<60000)return saved.items;
      const snap=await db.collection(CLUBS).limit(100).get();
      const clubs=snap.docs.filter(d=>!d.data()?.deleting&&(
        unique(d.data()?.memberIds).includes(id)||d.data()?.ownerId===id));
      const matches=await Promise.all(clubs.slice(0,35).map(async d=>{
        try{
          const snap=await d.ref.collection('events').orderBy('startAt','asc').limit(40).get();
          return snap.docs.filter(e=>Number(e.data()?.startAt)>=now&&Number(e.data()?.startAt)<now+24*3600000
            &&unique(e.data()?.attendeeIds).includes(id)&&e.data()?.remindStart!==false).map(e=>{
              const slug=e.data()?.roomSlug,room=e.data()?.sendRoomLink===false?null:rooms.get(slug);
              return {id:'fanclub-event-'+d.id+'-'+e.id,type:'event',title:'Evento do Fan Club chegando',
                message:clean(e.data().title,70)+' · '+new Date(e.data().startAt).toLocaleString('pt-BR')+
                  (room&&!room.isPrivate?' · Sala: '+clean(room.name,60):''),
                roomSlug:room&&!room.isPrivate?slug:null,fanClubId:d.id,createdAt:Number(e.data().startAt),read:false};
            });
        }catch(err){console.warn('fan club reminders:',err.message);return [];}
      }));
      const items=matches.flat().sort((a,b)=>a.createdAt-b.createdAt).slice(0,25);
      reminderCache.set(id,{at:now,items});return items;
    };
  }
  // Encontros independentes de salas: Fan Club é comunidade, não player.
  app.get('/api/fan-clubs/:id/events',rateLimit(40,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!member(data,me)||unique(data.blockedIds).includes(me.id))throwHttp(403,'Participe para ver os eventos.');
      const snap=await ref.collection('events').orderBy('startAt','asc').limit(40).get();
      const events=snap.docs.filter(d=>Number(d.data().startAt)>Date.now()-3600000)
       .slice(0,20).map(d=>({id:d.id,title:d.data().title,description:d.data().description,
        startAt:d.data().startAt,durationMinutes:d.data().durationMinutes,roomSlug:clean(d.data().roomSlug||'',100),roomName:clean(rooms.get(d.data().roomSlug)?.name||'',90),
        attendees:unique(d.data().attendeeIds).length,going:unique(d.data().attendeeIds).includes(me.id),
        canDelete:canModerate(data,me)||d.data().creatorId===me.id,canEdit:canModerate(data,me)||d.data().creatorId===me.id,
         notifyMembers:d.data().notifyMembers!==false,sendRoomLink:d.data().sendRoomLink!==false,remindStart:d.data().remindStart!==false}));
      res.json({events});
    }catch(e){error(res,e);}
  });
  app.post('/api/fan-clubs/:id/events',rateLimit(8,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const title=clean(req.body?.title,90),description=clean(req.body?.description,300),startAt=Number(req.body?.startAt);
    const durationMinutes=[30,60,90,120].includes(Number(req.body?.durationMinutes))?Number(req.body.durationMinutes):60;
    const roomSlug=clean(req.body?.roomSlug,100);
    const notifyMembers=req.body?.notifyMembers!==false,sendRoomLink=req.body?.sendRoomLink!==false,remindStart=req.body?.remindStart!==false;
    if(title.length<5||!Number.isSafeInteger(startAt)||startAt<Date.now()+300000||startAt>Date.now()+90*86400000)
      return res.status(400).json({error:'Informe título e data entre 5 minutos e 90 dias no futuro.'});
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!canModerate(data,me))throwHttp(403,'Somente a moderação organiza encontros.');
      if(roomSlug&&(!unique(data.roomSlugs).includes(roomSlug)||!rooms.has(roomSlug)||rooms.get(roomSlug).isPrivate))
        throwHttp(400,'Escolha uma sala pública vinculada a este Fan Club.');
      const doc=ref.collection('events').doc();
      await doc.create({title,description,startAt,durationMinutes,roomSlug,notifyMembers,sendRoomLink,remindStart,attendeeIds:[],createdAt:Date.now(),creatorId:me.id});
      agendaCache.expires=0;publish(req.params.id,'events');res.status(201).json({id:doc.id});
      if(notifyMembers)notifyPostMembers(req.params.id,data,me.id,me.name,{title:'Novo encontro no Fan Club',message:me.name+' agendou '+title+(sendRoomLink&&roomSlug?' · Sala: '+clean(rooms.get(roomSlug)?.name,80):'')+'. Confirme presença na Agenda Musical.',roomSlug:sendRoomLink?roomSlug:''});
    }catch(e){error(res,e);}
  });
  // Atualização protegida: criador ou moderação ativa, com os mesmos limites da criação.
  app.patch('/api/fan-clubs/:id/events/:eventId',rateLimit(12,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const title=clean(req.body?.title,90),description=clean(req.body?.description,300),
      startAt=Number(req.body?.startAt),durationMinutes=Number(req.body?.durationMinutes),
      roomSlug=clean(req.body?.roomSlug,100);
    if(title.length<5||!Number.isSafeInteger(startAt)||startAt<Date.now()+300000||startAt>Date.now()+90*86400000||
       ![30,60,90,120].includes(durationMinutes))
      return res.status(400).json({error:'Informe título, data futura (5 minutos a 90 dias) e duração válida.'});
    try{
      const {ref,data}=await readClub(req.params.id);
      if(roomSlug&&(!unique(data.roomSlugs).includes(roomSlug)||!rooms.has(roomSlug)||rooms.get(roomSlug).isPrivate))
        throwHttp(400,'Selecione uma sala pública vinculada ao Fan Club.');
      const eventRef=ref.collection('events').doc(req.params.eventId);
      await db.runTransaction(async tx=>{
        const event=await tx.get(eventRef);
        if(!event.exists)throwHttp(404,'Evento não encontrado.');
        if(event.data().creatorId!==me.id&&!canModerate(data,me))throwHttp(403,'Somente quem criou ou administra este evento pode editar.');
        if(Number(event.data().startAt)<Date.now()-3600000)throwHttp(409,'Eventos encerrados não podem ser editados.');
        tx.update(eventRef,{title,description,startAt,durationMinutes,roomSlug,
          notifyMembers:req.body?.notifyMembers!==false,sendRoomLink:req.body?.sendRoomLink!==false,
          remindStart:req.body?.remindStart!==false,updatedAt:Date.now(),updatedBy:me.id});
      });
      agendaCache.expires=0;
      publish(req.params.id,'events');
      res.json({success:true,id:eventRef.id});
    }catch(e){error(res,e);}
  });
  app.post('/api/fan-clubs/:id/events/:eventId/rsvp',rateLimit(20,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!member(data,me)||unique(data.blockedIds).includes(me.id))throwHttp(403,'Participe para confirmar presença.');
      const target=ref.collection('events').doc(req.params.eventId);
      const result=await db.runTransaction(async tx=>{
        const snap=await tx.get(target);if(!snap.exists)throwHttp(404,'Encontro não encontrado.');
        if(Number(snap.data().startAt)<Date.now()-3600000)throwHttp(409,'Este encontro já terminou.');
        const attendees=unique(snap.data().attendeeIds).filter(x=>x!==me.id);
        const going=req.body?.going===true;
        if(going){if(attendees.length>=300)throwHttp(409,'Limite de participantes.');attendees.push(me.id);}
        tx.update(target,{attendeeIds:attendees});
        return {going,attendees:attendees.length};
      });
      publish(req.params.id,'events');res.json(result);
      if(result.going&&typeof sf15Notify==='function'){
        const eventSnap=await target.get(),ev=eventSnap.data()||{};
        Promise.resolve(sf15Notify(me.email,{type:'fanclub',title:'Presença confirmada',message:'Você confirmou presença em '+clean(ev.title,90)+(ev.roomSlug?' · Sala: '+clean(rooms.get(ev.roomSlug)?.name,80):'')+'. Consulte a Agenda Musical para acessar.',fanClubId:req.params.id,roomSlug:ev.roomSlug&&rooms.has(ev.roomSlug)?ev.roomSlug:null})).catch(()=>{});
      }
    }catch(e){error(res,e);}
  });
  app.delete('/api/fan-clubs/:id/events/:eventId',rateLimit(10,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{
      const {ref,data}=await readClub(req.params.id);
      const target=ref.collection('events').doc(req.params.eventId);
      const snap=await target.get();if(!snap.exists)throwHttp(404,'Evento não encontrado.');
      if(!canModerate(data,me)&&snap.data().creatorId!==me.id)throwHttp(403,'Somente quem criou ou administra pode cancelar.');
      await target.delete();agendaCache.expires=0;
      publish(req.params.id,'events');res.json({success:true});
    }catch(e){error(res,e);}
  });
  // Métricas agregadas, sem expor conteúdo privado nem emails.
  app.get('/api/fan-clubs/:id/insights',rateLimit(18,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!canModerate(data,me))throwHttp(403,'Somente a moderação pode ver indicadores.');
      const names=['posts','comments','ideas','polls','reports','events'];
      const result=await Promise.all(names.map(n=>ref.collection(n).orderBy('createdAt','desc').limit(100).get()));
      const totals=Object.fromEntries(result.map((snap,i)=>[names[i],snap.docs.length]));
      const unresolved=result[names.indexOf('reports')].docs.filter(d=>d.data().status==='open').length;
      res.json({members:unique(data.memberIds).length,moderators:unique(data.moderatorIds).length,
        recent:totals,openReports:unresolved,sampleLimit:100});
    }catch(e){error(res,e);}
  });
  // Ranking editorial: contribuições reais, sem inventar XP nem exibir emails.
  app.get('/api/fan-clubs/:id/contributors',rateLimit(30,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!member(data,me)||unique(data.blockedIds).includes(me.id))throwHttp(403,'Participe para ver as contribuições.');
      const [posts,comments]=await Promise.all([
        ref.collection('posts').orderBy('createdAt','desc').limit(100).get(),
        ref.collection('comments').orderBy('createdAt','desc').limit(100).get()
      ]);
      const scores=new Map(),members=new Set(unique(data.memberIds));
      for(const p of posts.docs){
        const d=p.data();if(!members.has(d.authorId))continue;
        const entry=scores.get(d.authorId)||{id:d.authorId,name:clean(d.authorName,40),posts:0,comments:0,likesReceived:0};
        entry.posts++;entry.likesReceived+=unique(d.likedBy).length;scores.set(d.authorId,entry);
      }
      for(const c of comments.docs){
        const d=c.data();if(!members.has(d.authorId))continue;
        const entry=scores.get(d.authorId)||{id:d.authorId,name:clean(d.authorName,40),posts:0,comments:0,likesReceived:0};
        entry.comments++;scores.set(d.authorId,entry);
      }
      const ranking=[...scores.values()].map(v=>({...v,score:v.posts*2+v.comments+v.likesReceived}))
        .sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'pt-BR')).slice(0,10);
      res.json({ranking,metric:'Contribuições recentes (posts, respostas e curtidas recebidas)'});
    }catch(e){error(res,e);}
  });
  // Denúncias têm status interno e somente a moderação pode consultar/resolver.
  app.post('/api/fan-clubs/:id/posts/:postId/report',rateLimit(6,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const reason=clean(req.body?.reason,200);
    if(reason.length<6)return res.status(400).json({error:'Descreva o motivo da denúncia.'});
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!member(data,me)||unique(data.blockedIds).includes(me.id))throwHttp(403,'Participe para denunciar.');
      const post=await ref.collection('posts').doc(req.params.postId).get();
      if(!post.exists)throwHttp(404,'Publicação não encontrada.');
      const reportId=crypto.createHash('sha256').update(req.params.postId+':'+me.id).digest('hex');
      const target=ref.collection('reports').doc(reportId);
      const old=await target.get();
      if(old.exists)throwHttp(409,'Você já denunciou esta publicação.');
      await target.create({postId:req.params.postId,reporterId:me.id,reason,status:'open',createdAt:Date.now()});
      publish(req.params.id,'post');res.status(201).json({success:true});
    }catch(e){error(res,e);}
  });
  app.get('/api/fan-clubs/:id/reports',rateLimit(18,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!canModerate(data,me))throwHttp(403,'Somente a moderação pode consultar denúncias.');
      const snap=await ref.collection('reports').orderBy('createdAt','desc').limit(60).get();
      res.json({reports:snap.docs.map(d=>({id:d.id,postId:d.data().postId,reason:d.data().reason,
        status:d.data().status,createdAt:d.data().createdAt}))});
    }catch(e){error(res,e);}
  });
  app.post('/api/fan-clubs/:id/reports/:reportId/resolve',rateLimit(15,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!canModerate(data,me))throwHttp(403,'Somente a moderação pode resolver denúncias.');
      const target=ref.collection('reports').doc(req.params.reportId);
      await db.runTransaction(async tx=>{
        const snap=await tx.get(target);if(!snap.exists)throwHttp(404,'Denúncia não encontrada.');
        tx.update(target,{status:'resolved',resolvedAt:Date.now()});
      });
      res.json({success:true});
    }catch(e){error(res,e);}
  });
  app.post('/api/fan-clubs/:id/default-room',rateLimit(12,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const slug=clean(req.body?.roomSlug,100);
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!canModerate(data,me))throwHttp(403,'Somente administradores definem a sala padrão.');
      if(slug&&(slug.toLowerCase()==='lobby'||!unique(data.roomSlugs).includes(slug)||!rooms.get(slug)||rooms.get(slug).isPrivate))
        throwHttp(400,'Selecione uma sala pública vinculada ao Fan Club.');
      await ref.update({defaultRoomSlug:slug,updatedAt:Date.now()});
      publish(req.params.id,'rooms');
      await notifyRoomFanclubs(unique(data.roomSlugs));
      res.json({success:true,roomSlug:slug});
    }catch(e){error(res,e);}
  });
  app.post('/api/fan-clubs/:id/rooms',rateLimit(15,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const slug=String(req.body?.slug||'');const room=rooms.get(slug);
    if(!room||room.isPrivate||slug.toLowerCase()==='lobby')return res.status(404).json({error:'Escolha uma sala pública criada por você. O Lobby não pode ser vinculado.'});
    if(room.ownerEmail!==me.email)return res.status(403).json({error:'Somente salas criadas por você podem ser vinculadas.'});
    try{const ref=refFor(req.params.id);if(!validateId(req.params.id))throwHttp(400,'Fan Club inválido.');
      await db.runTransaction(async tx=>{
        const linkRef=roomClubRef(slug);
        const [snap,linkSnap]=await Promise.all([tx.get(ref),tx.get(linkRef)]);
        if(!snap.exists||snap.data()?.deleting)throwHttp(404,'Fan Club não encontrado.');
        const data=snap.data();if(!canModerate(data,me))throwHttp(403,'Somente administradores podem vincular salas.');
        const slugs=unique(data.roomSlugs);
        if(!slugs.includes(slug)&&slugs.length>=3)throwHttp(409,'Limite de três salas por Fan Club.');
        if(!slugs.includes(slug))tx.update(ref,{roomSlugs:[...slugs,slug],updatedAt:Date.now()});
        updateRoomIndex(tx,linkRef,linkSnap,req.params.id,true);
      });publish(req.params.id,'rooms');
      await notifyRoomFanclubs([slug]);
      res.json({success:true});
    }catch(e){error(res,e);}
  });
  // Troca atômica: sem janela em que a comunidade fique com quatro salas.
  app.patch('/api/fan-clubs/:id/rooms/:slug',rateLimit(12,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const oldSlug=String(req.params.slug||''),slug=clean(req.body?.slug,100),room=rooms.get(slug);
    if(!room||room.isPrivate||slug.toLowerCase()==='lobby')return res.status(400).json({error:'Selecione uma sala pública criada por você. O Lobby não pode ser vinculado.'});
    if(room.ownerEmail!==me.email)
      return res.status(403).json({error:'Você precisa administrar a nova sala.'});
    try{
      await db.runTransaction(async tx=>{
        const ref=refFor(req.params.id),oldRef=roomClubRef(oldSlug),newRef=roomClubRef(slug);
        const [clubSnap,oldSnap,newSnap]=await Promise.all([tx.get(ref),tx.get(oldRef),slug===oldSlug?Promise.resolve(null):tx.get(newRef)]);
        if(!clubSnap.exists||clubSnap.data()?.deleting)throwHttp(404,'Fan Club não encontrado.');
        const data=clubSnap.data();
        if(!canModerate(data,me))throwHttp(403,'Sem permissão para trocar a sala do Fan Club.');
        if(!unique(data.roomSlugs).includes(oldSlug))throwHttp(404,'Sala vinculada não encontrada.');
        if(slug!==oldSlug&&unique(data.roomSlugs).includes(slug))throwHttp(409,'Essa sala já está vinculada.');
        const slugs=unique(data.roomSlugs).map(x=>x===oldSlug?slug:x);
        const defaultRoomSlug=data.defaultRoomSlug===oldSlug?slug:data.defaultRoomSlug||'';
        tx.update(ref,{roomSlugs:slugs,defaultRoomSlug,updatedAt:Date.now()});
        if(slug!==oldSlug){
          updateRoomIndex(tx,oldRef,oldSnap,req.params.id,false);
          updateRoomIndex(tx,newRef,newSnap,req.params.id,true);
        }else updateRoomIndex(tx,oldRef,oldSnap,req.params.id,true);
      });
      const slugs=unique((await refFor(req.params.id).get()).data()?.roomSlugs);
      const defaultRoomSlug=(await refFor(req.params.id).get()).data()?.defaultRoomSlug||'';
      publish(req.params.id,'rooms');
      await notifyRoomFanclubs([oldSlug,slug]);
      res.json({success:true,roomSlugs:slugs,defaultRoomSlug});
    }catch(e){error(res,e);}
  });
  app.delete('/api/fan-clubs/:id/rooms/:slug',rateLimit(15,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{const ref=refFor(req.params.id);if(!validateId(req.params.id))throwHttp(400,'Fan Club inválido.');
      await db.runTransaction(async tx=>{
        const linkRef=roomClubRef(req.params.slug);
        const [snap,linkSnap]=await Promise.all([tx.get(ref),tx.get(linkRef)]);
        if(!snap.exists||snap.data()?.deleting)throwHttp(404,'Fan Club não encontrado.');
        if(!canModerate(snap.data(),me))throwHttp(403,'Sem permissão.');
        const slugs=unique(snap.data().roomSlugs).filter(x=>x!==req.params.slug);
        tx.update(ref,{roomSlugs:slugs,defaultRoomSlug:snap.data().defaultRoomSlug===req.params.slug?'':snap.data().defaultRoomSlug||'',updatedAt:Date.now()});
        updateRoomIndex(tx,linkRef,linkSnap,req.params.id,false);
      });publish(req.params.id,'rooms');
      await notifyRoomFanclubs([req.params.slug]);
      res.json({success:true});
    }catch(e){error(res,e);}
  });
  // Exclusão irreversível: só o criador ou um admin global pode iniciar.
  // Primeiro marca como "deleting" para retirar o clube das buscas e bloquear
  // novas publicações. Se ocorrer falha na limpeza, o mesmo responsável pode
  // repetir DELETE; o Firestore não remove subcoleções automaticamente.
  app.delete('/api/fan-clubs/:id',rateLimit(8,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const id=req.params.id;
    if(!validateId(id))return res.status(400).json({error:'Fan Club inválido.'});
    const ref=refFor(id);
    try{
      await db.runTransaction(async tx=>{
        const snap=await tx.get(ref);
        if(!snap.exists)throwHttp(404,'Fan Club não encontrado.');
        const data=snap.data();
        if(!ownerOrAdmin(data,me))throwHttp(403,'Somente o criador ou um administrador pode excluir este Fan Club.');
        const confirmation=String(req.body?.confirmation??'');
        if(confirmation!==String(data.title||''))throwHttp(400,'Digite o nome exato do Fan Club para confirmar a exclusão.');
        if(!data.deleting)tx.update(ref,{deleting:true,updatedAt:Date.now()});
      });
      // O mural deve ser apagado por lotes, inclusive na retomada de exclusão.
      // Cada lote é limitado para evitar sobrecarga de gravações.
      const posts=ref.collection('posts');
      for(let batch=0;batch<100;batch++){
        const snap=await posts.orderBy('createdAt','desc').limit(100).get();
        if(!snap.docs.length)break;
        // Firestore permite excluir os documentos individualmente. Falhas
        // interrompem a limpeza e deixam o tombstone para uma nova tentativa.
        for(const doc of snap.docs)await doc.ref.delete();
        if(batch===99)throwHttp(503,'A limpeza ainda não terminou. Repita a exclusão.');
      }
      for(const sub of ['comments','polls','reports','ideas','postImages','events','forumProfiles']){
        const col=ref.collection(sub);
        for(let batch=0;batch<50;batch++){
          const snap=await col.orderBy('createdAt','desc').limit(100).get();
          if(!snap.docs.length)break;
          for(const doc of snap.docs)await doc.ref.delete();
          if(batch===49)throwHttp(503,'Limpeza incompleta. Repita a exclusão.');
        }
      }
      await coverRef(id).delete();
      const oldSlugs=unique((await ref.get()).data()?.roomSlugs);
      await ref.delete();
      await notifyRoomFanclubs(oldSlugs);
      publish(id,'deleted');closeClubStreams(id);
      res.json({success:true,deletedId:id,roomsPreserved:true});
    }catch(e){error(res,e);}
  });
  return {CLUBS,clean,record,findRoomFanclubs};
}
module.exports={installFanClubs71,clean};
