'use strict';
// SonoraFan 71 — comunidades permanentes criadas por fãs.
// O servidor decide acesso e moderação usando a sessão; o navegador nunca define papéis.
const crypto = require('crypto');
const THEMES = new Set(['vinyl','stage','cassette','waves']);
const CLUBS = 'sonorafanFanClubs71';
const COVERS = 'sonorafanFanClubCovers73';
const MAX_COVER_BYTES = 180 * 1024;
const clean = (value, max) => typeof value === 'string'
  ? value.normalize('NFC').replace(/[\u0000-\u001f\u007f<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,max)
  : '';
const unique = values => Array.from(new Set(Array.isArray(values) ? values.filter(x=>typeof x==='string') : []));

function installFanClubs71({ app, db, sessionEmail, users, rooms, socialEvents, publicUserId, adminEmails, rateLimit, sf15Notify, rawCoverParser, gamification45 }) {
  const coverRef = id => db.collection(COVERS).doc(id);
  const refFor = id => db.collection(CLUBS).doc(id);
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
          message:clean(details.message||clean(authorName,40)+' publicou em '+clean(club.title,75),200),fanClubId:clubId
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
    return {id,...p,title:forumTitle(p),tags:forumTags(p.tags),likedBy:undefined,
      pinned:id===data.pinnedPostId,likeCount:unique(p.likedBy).length,
      liked:unique(p.likedBy).includes(me.id),favorite:unique(profile.favorites).includes(id),
      unread:!Number(profile.readAt?.[id])||Number(profile.readAt[id])<Number(p.lastActivityAt||p.createdAt||0),
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
    rules:data.rules, theme:data.theme, ownerId:data.ownerId, ownerName:data.ownerName,
    memberCount:unique(data.memberIds).length, roomCount:unique(data.roomSlugs).length,
    createdAt:data.createdAt, coverVersion:Number(data.coverVersion)||0, isUnofficial:true
  });
  const overview=(data,id,me)=>({
    ...record(data,id),
    joined:unique(data.memberIds).includes(me.id),
    owner:data.ownerId===me.id,
    blocked:unique(data.blockedIds).includes(me.id),
    canDelete:ownerOrAdmin(data,me),canModerate:canModerate(data,me),canEditProfile:canEditProfile(data,me),moderator:activeCoAdmin(data,me),
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
    return unique(data.roomSlugs).map(slug=>rooms.get(slug)).filter(r=>r&&!r.isPrivate)
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
    return {id,name:person?clean(person[1]?.nome||'Fã SonoraFan',40):'Membro',avatar:person?clean(person[1]?.avatar||'🎧',8):'🎧'};
  }

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
        .filter(c=>!q||`${c.artist} ${c.title} ${c.description}`.toLocaleLowerCase('pt-BR').includes(q))
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
    const theme=THEMES.has(req.body?.theme)?req.body.theme:'vinyl';
    if(artist.length<2||title.length<3) return res.status(400).json({error:'Informe artista e nome da comunidade.'});
    try{
      const owned=await db.collection(CLUBS).where('ownerId','==',me.id).limit(5).get();
      if(owned.size>=5)throwHttp(409,'Você já administra 5 Fan Clubs.');
      const id=crypto.randomUUID();
      const data={id,artist,title,description,rules,theme,ownerId:me.id,ownerName:me.name,
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
        await ref.update({coverVersion:v,updatedAt:v});publish(req.params.id,'cover');
        res.json({success:true,coverVersion:v});
      }catch(e){error(res,e);}
    });
  app.delete('/api/fan-clubs/:id/cover',rateLimit(15,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{const {ref,data}=await readClub(req.params.id);
      if(!ownerOrAdmin(data,me))throwHttp(403,'Somente o criador pode remover a capa.');
      await ref.update({coverVersion:0,updatedAt:Date.now()});
      await coverRef(req.params.id).delete();publish(req.params.id,'cover');res.json({success:true});
    }catch(e){error(res,e);}
  });
  app.get('/api/fan-clubs/:id',rateLimit(75,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{const {data}=await readClub(req.params.id);
      res.json({club:{...overview(data,req.params.id,me),rooms:cleanRooms(data),events:clubEvents(data,me),
        members:member(data,me)?unique(data.memberIds).slice(0,50).map(memberView):[],
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
  app.post('/api/fan-clubs/:id/posts/:postId/image',rateLimit(6,60000),
    rawCoverParser||((req,res,next)=>next()),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!member(data,me)||unique(data.blockedIds).includes(me.id))throwHttp(403,'Participe para enviar imagens.');
      const image=req.body,mime=sniffCover(image);
      if(!mime)throwHttp(400,'Use JPG, PNG ou WebP com no máximo 180 KB.');
      const postRef=ref.collection('posts').doc(req.params.postId);
      const post=await postRef.get();if(!post.exists)throwHttp(404,'Publicação não encontrada.');
      if(post.data().authorId!==me.id&&!canModerate(data,me))throwHttp(403,'Somente o autor pode anexar uma imagem.');
      await ref.collection('postImages').doc(req.params.postId).set({imageBase64:image.toString('base64'),mime,createdAt:Date.now()});
      await postRef.update({hasImage:true});
      publish(req.params.id,'post');res.json({success:true});
    }catch(e){error(res,e);}
  });
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
      const profileRef=forumProfileRef(ref,me),profileSnap=await profileRef.get();
      const profile=profileSnap.data()||{},readAt={...(profile.readAt||{})};
      const keys=Object.keys(readAt);
      if(keys.length>=150&&!Object.hasOwn(readAt,req.params.postId)){
        keys.sort((a,b)=>Number(readAt[a])-Number(readAt[b]));
        delete readAt[keys[0]];
      }
      readAt[req.params.postId]=Date.now();
      await profileRef.set({readAt},{merge:true});
      const result=forumPost(post,data,me,{...profile,readAt});
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
    const topic=['conversa','duvida','novidade','evento','ideia'].includes(req.body?.topic)?req.body.topic:'conversa';
    if(text.length<3)return res.status(400).json({error:'Escreva uma mensagem com pelo menos 3 caracteres.'});
    try{const {ref,data}=await readClub(req.params.id);if(!member(data,me))throwHttp(403,'Participe do Fan Club para publicar.');
      const doc=ref.collection('posts').doc();
      const post={authorId:me.id,authorName:me.name,text,title:title||forumTitle({text}),tags,topic,createdAt:Date.now(),lastActivityAt:Date.now(),replyCount:0};
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
      await db.runTransaction(async tx=>{
        const [post,comment]=await Promise.all([tx.get(target),tx.get(answerRef)]);
        if(!post.exists||!comment.exists||comment.data().postId!==req.params.postId)throwHttp(404,'Resposta não encontrada.');
        if((post.data().topic||'conversa')!=='duvida')throwHttp(400,'Somente dúvidas possuem resposta escolhida.');
        if(post.data().authorId!==me.id&&!canModerate(data,me))throwHttp(403,'Sem permissão para escolher a resposta.');
        tx.update(target,{bestCommentId:commentId,resolved:true,resolvedAt:Date.now()});
      });
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
      const snap=await ref.collection('comments').orderBy('createdAt','desc').limit(300).get();
      const comments=snap.docs.filter(d=>d.data().postId===req.params.postId).slice(0,50)
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
      const snap=await ref.collection('polls').orderBy('createdAt','desc').limit(12).get();
      res.json({polls:snap.docs.map(d=>({id:d.id,question:d.data().question,options:d.data().options,
        counts:(d.data().options||[]).map((_,i)=>Object.values(d.data().votes||{}).filter(v=>v===i).length),
        voted:Object.hasOwn(d.data().votes||{},me.id),myVote:d.data().votes?.[me.id]??null,
        createdAt:d.data().createdAt,closed:!!(d.data().closesAt&&d.data().closesAt<=Date.now()),closesAt:d.data().closesAt||null,canDelete:canModerate(data,me)}))});
    }catch(e){error(res,e);}
  });
  app.post('/api/fan-clubs/:id/polls',rateLimit(8,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const question=clean(req.body?.question,140);
    const options=Array.isArray(req.body?.options)?req.body.options.slice(0,4).map(v=>clean(v,80)).filter(Boolean):[];
    if(question.length<8||options.length<2||new Set(options.map(v=>v.toLowerCase())).size!==options.length)
      return res.status(400).json({error:'Informe uma pergunta e 2 a 4 opções diferentes.'});
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!canModerate(data,me))throwHttp(403,'Somente moderadores podem criar enquetes.');
      const doc=ref.collection('polls').doc();
      const days=Number(req.body?.durationDays);
      const closesAt=[1,3,7,14].includes(days)?Date.now()+days*86400000:null;
      await doc.create({question,options,votes:{},createdAt:Date.now(),closesAt});
      publish(req.params.id,'polls');res.status(201).json({id:doc.id});
    }catch(e){error(res,e);}
  });
  app.post('/api/fan-clubs/:id/polls/:pollId/vote',rateLimit(20,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const choice=req.body?.choice;
    if(!Number.isInteger(choice)||choice<0||choice>3)return res.status(400).json({error:'Opção inválida.'});
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
  // Encontros independentes de salas: Fan Club é comunidade, não player.
  app.get('/api/fan-clubs/:id/events',rateLimit(40,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!member(data,me)||unique(data.blockedIds).includes(me.id))throwHttp(403,'Participe para ver os eventos.');
      const snap=await ref.collection('events').orderBy('startAt','asc').limit(40).get();
      const events=snap.docs.filter(d=>Number(d.data().startAt)>Date.now()-3600000)
       .slice(0,20).map(d=>({id:d.id,title:d.data().title,description:d.data().description,
        startAt:d.data().startAt,durationMinutes:d.data().durationMinutes,
        attendees:unique(d.data().attendeeIds).length,going:unique(d.data().attendeeIds).includes(me.id),
        canDelete:canModerate(data,me)}));
      res.json({events});
    }catch(e){error(res,e);}
  });
  app.post('/api/fan-clubs/:id/events',rateLimit(8,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const title=clean(req.body?.title,90),description=clean(req.body?.description,300),startAt=Number(req.body?.startAt);
    const durationMinutes=[30,60,90,120].includes(Number(req.body?.durationMinutes))?Number(req.body.durationMinutes):60;
    if(title.length<5||!Number.isSafeInteger(startAt)||startAt<Date.now()+300000||startAt>Date.now()+90*86400000)
      return res.status(400).json({error:'Informe título e data entre 5 minutos e 90 dias no futuro.'});
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!canModerate(data,me))throwHttp(403,'Somente a moderação organiza encontros.');
      const doc=ref.collection('events').doc();
      await doc.create({title,description,startAt,durationMinutes,attendeeIds:[],createdAt:Date.now(),creatorId:me.id});
      publish(req.params.id,'events');res.status(201).json({id:doc.id});
      notifyPostMembers(req.params.id,data,me.id,me.name,{title:'Novo encontro no Fan Club',message:me.name+' agendou '+title});
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
    }catch(e){error(res,e);}
  });
  app.delete('/api/fan-clubs/:id/events/:eventId',rateLimit(10,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{
      const {ref,data}=await readClub(req.params.id);
      if(!canModerate(data,me))throwHttp(403,'Somente a moderação pode cancelar encontros.');
      await ref.collection('events').doc(req.params.eventId).delete();
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
  app.post('/api/fan-clubs/:id/rooms',rateLimit(15,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    const slug=String(req.body?.slug||'');const room=rooms.get(slug);
    if(!room||room.isPrivate)return res.status(404).json({error:'Escolha uma sala pública existente.'});
    if(room.ownerEmail!==me.email&&!adminEmails.has(me.email))return res.status(403).json({error:'Você precisa administrar a sala para vinculá-la.'});
    try{const ref=refFor(req.params.id);if(!validateId(req.params.id))throwHttp(400,'Fan Club inválido.');
      await db.runTransaction(async tx=>{
        const snap=await tx.get(ref);if(!snap.exists||snap.data()?.deleting)throwHttp(404,'Fan Club não encontrado.');
        const data=snap.data();if(!ownerOrAdmin(data,me))throwHttp(403,'Apenas o criador pode vincular salas.');
        const slugs=unique(data.roomSlugs);if(slugs.includes(slug))return;
        if(slugs.length>=3)throwHttp(409,'Limite de três salas por Fan Club.');
        tx.update(ref,{roomSlugs:[...slugs,slug],updatedAt:Date.now()});
      });publish(req.params.id,'rooms');res.json({success:true});
    }catch(e){error(res,e);}
  });
  app.delete('/api/fan-clubs/:id/rooms/:slug',rateLimit(15,60000),async(req,res)=>{
    const me=identity(req,res);if(!me)return;
    try{const ref=refFor(req.params.id);if(!validateId(req.params.id))throwHttp(400,'Fan Club inválido.');
      await db.runTransaction(async tx=>{
        const snap=await tx.get(ref);if(!snap.exists||snap.data()?.deleting)throwHttp(404,'Fan Club não encontrado.');
        if(!ownerOrAdmin(snap.data(),me))throwHttp(403,'Sem permissão.');
        tx.update(ref,{roomSlugs:unique(snap.data().roomSlugs).filter(x=>x!==req.params.slug),updatedAt:Date.now()});
      });publish(req.params.id,'rooms');res.json({success:true});
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
      await ref.delete();
      publish(id,'deleted');closeClubStreams(id);
      res.json({success:true,deletedId:id,roomsPreserved:true});
    }catch(e){error(res,e);}
  });
  return {CLUBS,clean,record};
}
module.exports={installFanClubs71,clean};
