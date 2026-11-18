'use strict';
// Ranking 6.0: temporadas, transparência, reconhecimento e reputação do Fórum.
// Nenhum endpoint aceita XP ou reputação enviados pelo cliente.
const crypto=require('crypto');
const {localPeriod,levelInfo,ranking60Id,ranking60Month,LEVELS}=require('./gamification-45');
const safeScore=n=>Number.isFinite(Number(n))?Math.max(0,Math.floor(Number(n))):0;
const safeString=(value,max=80)=>String(value||'').replace(/[\u0000-\u001f<>]/g,' ').trim().slice(0,max);
const periods=now=>({week:localPeriod(now).week,month:ranking60Month(now)});
const playerId=email=>ranking60Id(email);
const makeTitle=(email,users)=>safeString(users.get(email)?.nome||'Ouvinte',60);
const moderationKey=(club,topic)=>crypto.createHash('sha256').update(String(club)+':'+String(topic)).digest('hex');
const dailyLimit=3;
const reputationReward=15;

function createRanking60({app,db,sessionEmail,users,gamification45,rateLimit}){
  const userCache=new Map();
  async function publicUser(email){
    const cached=userCache.get(email);
    if(cached&&Date.now()-cached.at<60000)return cached.data;
    let user=users.get(email);
    if(!user)try{const snap=await db.collection('users').doc(email).get();if(snap.exists)user=snap.data()}catch(e){}
    const data={id:playerId(email),name:safeString(user?.nome||'Ouvinte',60),
      avatar:safeString(user?.avatar||'🎧',8)};
    userCache.set(email,{data,at:Date.now()});
    return data;
  }
  async function source(category,period,now=new Date()){
    const keys=periods(now);
    if(category==='forum'){
      if(period==='week')return {collection:db.collection('ranking60ForumWeeks').doc(keys.week).collection('players'),metric:'score',key:keys.week};
      if(period==='month')return {collection:db.collection('ranking60ForumMonths').doc(keys.month).collection('players'),metric:'score',key:keys.month};
      return {collection:db.collection('ranking60Reputation'),metric:'score',key:'all'};
    }
    if(category==='dj'){
      if(period==='week')return {collection:db.collection('ranking60Weeks').doc(keys.week).collection('players'),metric:'djXP',key:keys.week};
      if(period==='month')return {collection:db.collection('ranking60Months').doc(keys.month).collection('players'),metric:'djXP',key:keys.month};
      return {collection:db.collection('points'),metric:'ranking60.djXP',key:'all'};
    }
    if(period==='week')return {collection:db.collection('ranking60Weeks').doc(keys.week).collection('players'),metric:'score',key:keys.week};
    if(period==='month')return {collection:db.collection('ranking60Months').doc(keys.month).collection('players'),metric:'score',key:keys.month};
    return {collection:db.collection('points'),metric:'points',key:'all'};
  }
  const scoreOf=(data,metric)=>safeScore(metric.includes('.')?
    metric.split('.').reduce((current,key)=>current?.[key],data):data?.[metric]);
  async function getLeaderboard(email,{period='week',category='overall',limit=50}={}){
    if(!['all','week','month'].includes(period)||!['overall','dj','forum'].includes(category))
      throw Object.assign(new Error('Filtro inválido.'),{status:400});
    const {collection,metric,key}=await source(category,period);
    // Sem estimativas ocultas: até 500 participantes avaliados. Caso limite seja atingido,
    // a posição fora do recorte permanece desconhecida e a UI informa a limitação.
    const snap=await collection.orderBy(metric,'desc').limit(500).get();
    const rows=snap.docs.filter(x=>x.exists&&scoreOf(x.data(),metric)>0).map(doc=>{
      const data=doc.data();
      return {email:data.email||doc.id,id:playerId(data.email||doc.id),score:scoreOf(data,metric),raw:data};
    }).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
    const entries=rows.slice(0,Math.max(1,Math.min(50,Number(limit)||50)));
    const items=await Promise.all(entries.map(async (row,index)=>{
      const u=await publicUser(row.email);
      const prefs=await db.collection('ranking60Preferences').doc(row.id).get().catch(()=>({exists:false}));
      if(prefs.exists&&prefs.data()?.hidden&&row.email!==email)return {hidden:true,score:row.score,position:index+1,id:row.id};
      return {id:row.id,name:u.name,nome:u.name,avatar:u.avatar,score:row.score,
        position:index+1,level:category==='overall'&&period==='all'?levelInfo(row.score):null,
        medals:Array.isArray(prefs.exists?prefs.data()?.showcase:null)?prefs.data().showcase.slice(0,3):[]};
    }));
    const visible=items.filter(x=>!x.hidden);
    const index=rows.findIndex(x=>x.email===email);
    const meIndex=index>=0?index+1:null;
    const mine=rows[index]||null;
    return {
      period,category,periodKey:key,items:visible,
      podium:visible.filter(x=>x.position<=3),
      me:{rank:meIndex,score:mine?.score||0,withinSample:meIndex!==null},
      partial:snap.docs.length>=500,examined:snap.docs.length,
      note:period==='all'&&category==='dj'?'DJ contabiliza atividade validada a partir da versão 6.0.':
        period!=='all'?'Temporadas contabilizam novos XP validados a partir da versão 6.0; XP antigo é preservado no ranking geral.':'XP histórico preservado.'
    };
  }
  async function getHall(){
    const now=new Date(),list=[];
    for(const [kind,steps] of [['week',4],['month',3]]){
      for(let n=1;n<=steps;n++){
        const at=new Date(now);
        if(kind==='week')at.setUTCDate(at.getUTCDate()-n*7);
        else at.setUTCMonth(at.getUTCMonth()-n);
        const key=kind==='week'?localPeriod(at).week:ranking60Month(at);
        const collection=kind==='week'?'ranking60Weeks':'ranking60Months';
        const snap=await db.collection(collection).doc(key).collection('players')
          .orderBy('score','desc').limit(1).get();
        if(!snap.docs.length||!scoreOf(snap.docs[0].data(),'score'))continue;
        const first=snap.docs[0].data();
        const user=await publicUser(first.email);
        list.push({period:kind,key,champion:user.name,avatar:user.avatar,score:safeScore(first.score)});
      }
    }
    return list;
  }
  async function getPreferences(email){
    const id=playerId(email),snap=await db.collection('ranking60Preferences').doc(id).get();
    const data=snap.exists?snap.data():{};
    return {showcase:Array.isArray(data.showcase)?data.showcase.slice(0,3):[],hidden:!!data.hidden};
  }
  async function awardForumReputation(email,clubId,topicId,commentId){
    if(!email||!clubId||!topicId||!commentId)return {awarded:false};
    const now=new Date(),period=periods(now),id=playerId(email),awardId=moderationKey(clubId,topicId);
    const record=db.collection('ranking60ForumAwards').doc(awardId);
    const score=db.collection('ranking60Reputation').doc(id);
    const week=db.collection('ranking60ForumWeeks').doc(period.week).collection('players').doc(id);
    const month=db.collection('ranking60ForumMonths').doc(period.month).collection('players').doc(id);
    const result=await db.runTransaction(async tx=>{
      const [old,s,w,m]=await Promise.all([tx.get(record),tx.get(score),tx.get(week),tx.get(month)]);
      if(old.exists)return {awarded:false,reason:'already_awarded'};
      const prev=s.exists?s.data():{},day=localPeriod(now).day;
      const today=prev.day===day?safeScore(prev.todayCount):0;
      if(today>=dailyLimit)return {awarded:false,reason:'daily_limit'};
      tx.set(record,{recipientId:id,clubId,topicId,commentId,createdAt:now.toISOString()});
      tx.set(score,{email,score:safeScore(prev.score)+reputationReward,
        acceptedAnswers:safeScore(prev.acceptedAnswers)+1,day,todayCount:today+1,
        updatedAt:now.toISOString()},{merge:true});
      tx.set(week,{email,score:safeScore(w.exists?w.data()?.score:0)+reputationReward,updatedAt:now.toISOString()},{merge:true});
      tx.set(month,{email,score:safeScore(m.exists?m.data()?.score:0)+reputationReward,updatedAt:now.toISOString()},{merge:true});
      return {awarded:true,points:reputationReward};
    });
    return result;
  }
  const guard=rateLimit?rateLimit(40,60000):(req,res,next)=>next();
  app.get('/api/ranking60',guard,async(req,res)=>{
    const email=sessionEmail(req);if(!email)return res.status(401).json({error:'Faça login.'});
    try{res.json(await getLeaderboard(email,{period:req.query.period||'week',category:req.query.category||'overall',limit:50}));}
    catch(e){res.status(e.status||503).json({error:e.status?e.message:'Ranking temporariamente indisponível.'});}
  });
  app.get('/api/ranking60/me',guard,async(req,res)=>{
    const email=sessionEmail(req);if(!email)return res.status(401).json({error:'Faça login.'});
    try{
      const [snapshot,preferences,forum]=await Promise.all([
        gamification45.getSnapshot(email),getPreferences(email),db.collection('ranking60Reputation').doc(playerId(email)).get()
      ]);
      res.json({...snapshot,preferences,
        nextLevel:LEVELS.find(x=>x.min>snapshot.points)||null,
        reputation:forum.exists?{score:safeScore(forum.data().score),acceptedAnswers:safeScore(forum.data().acceptedAnswers)}:
          {score:0,acceptedAnswers:0},
        challenges:{daily:snapshot.missions.filter(m=>m.period==='daily'),
          weekly:snapshot.missions.filter(m=>m.period==='weekly')},
        message:'XP total, reputação do fórum e pontuação de temporada são contabilizados separadamente.'
      });
    }catch(e){res.status(503).json({error:'Não foi possível consultar seu progresso.'});}
  });
  app.get('/api/ranking60/hall',guard,async(req,res)=>{
    if(!sessionEmail(req))return res.status(401).json({error:'Faça login.'});
    try{res.json({seasons:await getHall()});}
    catch(e){res.status(503).json({error:'Hall da Fama indisponível.'});}
  });
  app.post('/api/ranking60/preferences',rateLimit?rateLimit(12,60000):guard,async(req,res)=>{
    const email=sessionEmail(req);if(!email)return res.status(401).json({error:'Faça login.'});
    try{
      const fields={};
      if(req.body?.hidden!==undefined){
        if(typeof req.body.hidden!=='boolean')return res.status(400).json({error:'Preferência inválida.'});
        fields.hidden=req.body.hidden;
      }
      if(req.body?.showcase!==undefined){
        if(!Array.isArray(req.body.showcase)||req.body.showcase.length>3||
           req.body.showcase.some(x=>typeof x!=='string'))
          return res.status(400).json({error:'Escolha até três medalhas.'});
        const snapshot=await gamification45.getSnapshot(email);
        const earned=new Set(snapshot.badges);
        if(req.body.showcase.some(x=>!earned.has(x)))return res.status(403).json({error:'Medalha ainda não conquistada.'});
        fields.showcase=[...new Set(req.body.showcase)];
      }
      if(!Object.keys(fields).length)return res.status(400).json({error:'Nenhuma preferência válida.'});
      await db.collection('ranking60Preferences').doc(playerId(email)).set(fields,{merge:true});
      res.json({success:true,preferences:await getPreferences(email)});
    }catch(e){res.status(503).json({error:'Não foi possível salvar as preferências.'});}
  });
  return {getLeaderboard,getHall,awardForumReputation,getPreferences};
}
module.exports={createRanking60,periods,playerId,reputationReward};