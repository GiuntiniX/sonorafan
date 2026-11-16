'use strict';
// SonoraFan 53 — chat social. Os IDs públicos não revelam o email da conta.
const crypto = require('crypto');
const EMOJIS = ['❤️', '😂', '🔥', '👏', '🎶'];
const safeText = (value, max) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const validId = id => typeof id === 'string' && /^[a-f0-9]{24}$/.test(id);
const threadId = (a, b) => crypto.createHash('sha256').update([a,b].sort().join(':')).digest('hex').slice(0, 40);
const validPolicy = v => ['everyone', 'following', 'nobody'].includes(v);

function installChat53({ app, io, db, sessionEmail, users, rooms, publicUserId, findSocialUser, getFollowing, sf15Notify, socketTokens, sessions, rateLimit }) {
  const auth = (req,res,next) => {
    const email = sessionEmail(req);
    if (!email || !users.get(email) || users.get(email).banned) return res.status(401).json({ error:'Faça login para acessar o chat.' });
    req.chat53Email = email; req.chat53Id = publicUserId(email); next();
  };
  const cfgRef = id => db.collection('chatSettings53').doc(id);
  const convRef = id => db.collection('chatConversations53').doc(id);
  async function readCfg(id) {
    const snap = await cfgRef(id).get();
    const v = snap.exists ? snap.data() : {};
    return { allowDM: validPolicy(v.allowDM) ? v.allowDM : 'everyone', blocked: Array.isArray(v.blocked) ? v.blocked.filter(validId).slice(0,150) : [], notify: v.notify !== false };
  }
  async function access(senderId, targetId) {
    const [mine, theirs] = await Promise.all([readCfg(senderId), readCfg(targetId)]);
    if (mine.blocked.includes(targetId) || theirs.blocked.includes(senderId)) return { allowed:false, reason:'A conversa não está disponível.' };
    if (theirs.allowDM === 'nobody') return { allowed:false, reason:'A pessoa não está recebendo mensagens privadas.' };
    if (theirs.allowDM === 'following') {
      const target = findSocialUser(targetId);
      const follows = target ? await getFollowing(target[0]) : [];
      if (!follows.includes(senderId)) return { allowed:false, reason:'Essa pessoa só recebe mensagens de quem segue.' };
    }
    return { allowed:true, notify:theirs.notify };
  }
  function resolve(targetId, me) {
    const target = validId(targetId) ? findSocialUser(targetId) : null;
    return target && target[0] !== me && !target[1].banned ? target : null;
  }
  const api = '/api/chat53';
  app.get(api + '/me', auth, async (req,res) => {
    try { res.json({ id:req.chat53Id, ...await readCfg(req.chat53Id) }); }
    catch(e) { console.error('chat53 settings',e.message); res.status(503).json({error:'Configurações indisponíveis'}); }
  });
  app.patch(api + '/settings', auth, rateLimit(15,60000), async(req,res)=>{
    try {
      const v = req.body || {};
      if (!validPolicy(v.allowDM) || typeof v.notify !== 'boolean') return res.status(400).json({error:'Configuração inválida'});
      await cfgRef(req.chat53Id).set({allowDM:v.allowDM, notify:v.notify, updatedAt:Date.now()}, {merge:true});
      res.json({success:true});
    } catch(e) {console.error('chat53 settings write',e.message);res.status(503).json({error:'Não foi possível salvar'});}
  });
  app.post(api + '/block', auth, rateLimit(15,60000), async(req,res)=>{
    const otherId = req.body?.userId, block = req.body?.block;
    if (!resolve(otherId,req.chat53Email) || typeof block !== 'boolean') return res.status(400).json({error:'Participante inválido'});
    try {
      await db.runTransaction(async t=>{
        const ref=cfgRef(req.chat53Id), snap=await t.get(ref);
        const before = Array.isArray(snap.data()?.blocked)?snap.data().blocked.filter(validId):[];
        const blocked=block?[...new Set([...before,otherId])].slice(-150):before.filter(id=>id!==otherId);
        t.set(ref,{blocked,updatedAt:Date.now()},{merge:true});
      });
      res.json({success:true,blocked:block});
    } catch(e) {console.error('chat53 block',e.message);res.status(503).json({error:'Não foi possível alterar o bloqueio'});}
  });
  app.get(api + '/contacts', auth, rateLimit(35,60000), async(req,res)=>{
    try {
      const ids=(await getFollowing(req.chat53Email)).slice(0,100);
      res.json(ids.map(id=>{
        const u=findSocialUser(id);
        if(!u || u[1].banned) return null;
        const online = u[1].showListeningActivity!==false && [...io.sockets.sockets.values()]
          .some(s=>s.connected && (s.sf53Email===u[0] || s.sfSocialEmail===u[0]));
        return {id,name:String(u[1].nome||'Ouvinte').slice(0,40),avatar:String(u[1].avatar||'🎧').slice(0,8),online};
      }).filter(Boolean));
    } catch(e){console.error('chat53 contacts',e.message);res.status(503).json({error:'Contatos indisponíveis'});}
  });
  app.get(api + '/inbox', auth, rateLimit(50,60000), async(req,res)=>{
    try {
      const snap=await db.collection('chatConversations53').where('participants','array-contains',req.chat53Id).limit(100).get();
      const arr=[];
      snap.forEach(doc=>{
        const d=doc.data(); const otherId=(d.participants||[]).find(v=>v!==req.chat53Id);
        const u=otherId&&findSocialUser(otherId);
        if (!u || u[1].banned) return;
        arr.push({id:otherId,name:String(u[1].nome||'Ouvinte').slice(0,40),avatar:String(u[1].avatar||'🎧').slice(0,8),updatedAt:Number(d.updatedAt)||0,preview:safeText(d.lastMessage,90),unread:d.lastSender!==req.chat53Id && (Number(d.readAt?.[req.chat53Id])||0)<(Number(d.updatedAt)||0)});
      });
      arr.sort((a,b)=>b.updatedAt-a.updatedAt);
      res.json(arr.slice(0,60));
    }catch(e){console.error('chat53 inbox',e.message);res.status(503).json({error:'Caixa de entrada indisponível'});}
  });
  app.get(api + '/messages/:id', auth, rateLimit(50,60000), async(req,res)=>{
    const target=resolve(req.params.id,req.chat53Email);
    if(!target)return res.status(404).json({error:'Participante não encontrado'});
    try {
      const can=await access(req.chat53Id,req.params.id);
      if(!can.allowed)return res.status(403).json({error:can.reason});
      const snap=await convRef(threadId(req.chat53Id,req.params.id)).collection('messages').orderBy('createdAt','desc').limit(80).get();
      const rows=[];snap.forEach(doc=>rows.push(doc.data()));rows.reverse();
      res.json({messages:rows,other:{id:req.params.id,name:String(target[1].nome||'Ouvinte').slice(0,40)},myId:req.chat53Id});
    }catch(e){console.error('chat53 messages',e.message);res.status(503).json({error:'Mensagens indisponíveis'});}
  });
  const throttled=new Map();
  app.post(api + '/messages', auth, rateLimit(30,60000), async(req,res)=>{
    const id=req.body?.to, text=safeText(req.body?.text,700);
    const target=resolve(id,req.chat53Email);
    if(!target || !text || String(req.body?.text||'').length>700)return res.status(400).json({error:'Mensagem ou destinatário inválido'});
    if (Date.now()-(throttled.get(req.chat53Id)||0)<900) return res.status(429).json({error:'Aguarde um instante antes de enviar outra mensagem.'});
    try {
      const can=await access(req.chat53Id,id);
      if(!can.allowed)return res.status(403).json({error:can.reason});
      const now=Date.now(), mid=crypto.randomUUID(), ref=convRef(threadId(req.chat53Id,id));
      const msg={id:mid,from:req.chat53Id,to:id,text,createdAt:now};
      const batch=db.batch();
      batch.set(ref,{participants:[req.chat53Id,id].sort(),updatedAt:now,lastMessage:text,lastSender:req.chat53Id},{merge:true});
      batch.set(ref.collection('messages').doc(mid),msg);
      await batch.commit();throttled.set(req.chat53Id,now);
      const otherName=String(users.get(req.chat53Email)?.nome||'Uma pessoa').slice(0,40);
      io.to('sf53-user-'+req.chat53Id).emit('sf53PrivateNew',{from:req.chat53Id,to:id,message:msg});
      io.to('sf53-user-'+id).emit('sf53PrivateNew',{from:req.chat53Id,to:id,message:msg,name:otherName});
      if(can.notify) sf15Notify(target[0],{
        type:'message',title:'Mensagem privada de '+otherName,
        message:text.slice(0,120),peerId:req.chat53Id
      }).catch(e=>console.error('chat53 notify',e.message));
      res.status(201).json({message:msg});
    }catch(e){console.error('chat53 private send',e.message);res.status(503).json({error:'Não foi possível enviar a mensagem'});}
  });
  app.post(api + '/messages/:id/read',auth,rateLimit(60,60000),async(req,res)=>{
    const target=resolve(req.params.id,req.chat53Email);
    if(!target)return res.status(404).json({error:'Participante não encontrado'});
    try{
      const ref=convRef(threadId(req.chat53Id,req.params.id));
      const doc=await ref.get();
      if(!doc.exists || !(doc.data().participants||[]).includes(req.chat53Id))return res.status(404).json({error:'Conversa inexistente'});
      await ref.set({readAt:{[req.chat53Id]:Date.now()}},{merge:true});
      res.json({success:true});
    }catch(e){console.error('chat53 read',e.message);res.status(503).json({error:'Não foi possível atualizar'});}
  });
  app.post(api + '/report',auth,rateLimit(5,60000),async(req,res)=>{
    const {type,otherId,messageId,reason,roomSlug} = req.body||{};
    const why=safeText(reason,300);
    if(!why || !['dm','room'].includes(type) || typeof messageId!=='string'||messageId.length>100 || messageId.includes('/'))return res.status(400).json({error:'Denúncia inválida'});
    try{
      let evidence=null;
      if(type==='dm'){
        if(!resolve(otherId,req.chat53Email))return res.status(404).json({error:'Mensagem não encontrada'});
        const ref=convRef(threadId(req.chat53Id,otherId));
        const message=await ref.collection('messages').doc(messageId).get();
        if(!message.exists)return res.status(404).json({error:'Mensagem não encontrada'});
        evidence=message.data();
      }else{
        const room=rooms.get(roomSlug);
        if(!room || !room.chatHistory) return res.status(404).json({error:'Mensagem não encontrada'});
        evidence=room.chatHistory.find(x=>x._id===messageId && !x.isSystem && !x.isMusic);
        if(!evidence)return res.status(404).json({error:'Mensagem não encontrada'});
        // Denúncia de chat público somente se o usuário estiver na sala.
        const joined=[...io.sockets.sockets.values()].some(s=>s.userEmail===req.chat53Email && s.sfSocialRoom===roomSlug);
        if(!joined)return res.status(403).json({error:'Entre na sala para denunciar esta mensagem'});
      }
      await db.collection('chatReports53').doc(crypto.randomUUID()).set({type,reporterId:req.chat53Id,otherId:validId(otherId)?otherId:null,roomSlug:type==='room'?roomSlug:null,messageId,reason:why,evidenceText:safeText(evidence.text,700),createdAt:Date.now(),status:'open'});
      res.json({success:true});
    }catch(e){console.error('chat53 report',e.message);res.status(503).json({error:'Não foi possível registrar a denúncia'});}
  });
  // Associação do socket à conta é validada por token curto, não por nickname.
  io.on('connection',socket=>{
    socket.on('sf53Auth',({token}={})=>{
      if(typeof token!=='string' || token.length!==32)return socket.emit('sf53AuthFail');
      const info=socketTokens.get(token);
      if(!info || info.exp<Date.now())return socket.emit('sf53AuthFail');
      socketTokens.delete(token);
      const cookie=(socket.handshake.headers.cookie||'').match(/sessionToken=([^;]+)/);
      const fromCookie=cookie ? sessions.get(cookie[1]) : null;
      // Token de curta duração vinculado à sessão HTTP ativa em /api/socket-token.
      if(fromCookie && fromCookie!==info.email)return socket.emit('sf53AuthFail');
      if(!users.has(info.email) || users.get(info.email).banned)return socket.emit('sf53AuthFail');
      socket.sf53Email=info.email;
      socket.join('sf53-user-'+publicUserId(info.email));
      socket.emit('sf53AuthOK',{id:publicUserId(info.email)});
    });
    socket.on('sf53Reaction',({messageId,emoji}={})=>{
      const slug=socket.sfSocialRoom, email=socket.userEmail;
      if(!slug || !email || !EMOJIS.includes(emoji)||typeof messageId!=='string'||messageId.length>100)return;
      if(Date.now()-(socket.sf53LastReaction||0)<400)return;
      const room=rooms.get(slug);const message=room?.chatHistory?.find(m=>m._id===messageId&&!m.isSystem&&!m.isMusic);
      if(!message)return;
      socket.sf53LastReaction=Date.now();
      const id=publicUserId(email);
      const r=message.reactions||{};
      const already=Array.isArray(r[emoji]) && r[emoji].includes(id);
      for(const k of Object.keys(r)){r[k]=Array.isArray(r[k])?r[k].filter(v=>v!==id):[];}
      if(!already)r[emoji]=[...(r[emoji]||[]),id];
      message.reactions=r;
      io.to(slug).emit('sf53ReactionUpdate',{messageId,reactions:r});
    });
  });
  return {safeText, threadId, validId, validPolicy, access, readCfg};
}
module.exports={installChat53, safeText, threadId, validId, validPolicy, EMOJIS};
