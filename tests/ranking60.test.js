'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createRanking60,periods,playerId,reputationReward}=require('../ranking-60');
const {createGamification45}=require('../gamification-45');

function fake(){
 const store=new Map();
 let lock=Promise.resolve();
 const ref=(path)=>({
   path,id:path.split('/').at(-1),
   collection(child){return collection(path+'/'+child)},
   async get(){return snap(this)},
   async set(data,opts){store.set(path,opts?.merge?{...(store.get(path)||{}),...structuredClone(data)}:structuredClone(data))}
 });
 const snap=r=>({
   id:r.id,exists:store.has(r.path),
   data:()=>store.has(r.path)?structuredClone(store.get(r.path)):undefined,
   ref:r
 });
 const collection=(name)=>({
   doc(id){return ref(name+'/'+id)},
   orderBy(key,dir){return{
     limit(n){return{async get(){
       const entries=[...store].filter(([path])=>path.startsWith(name+'/')&&path.slice(name.length+1).split('/').length===1)
         .map(([path,data])=>({id:path.slice(name.length+1),data:()=>structuredClone(data),exists:true}));
       const value=d=>key.split('.').reduce((o,x)=>o?.[x],d.data());
       entries.sort((a,b)=>(Number(value(b))||0)-(Number(value(a))||0)||a.id.localeCompare(b.id));
       return{docs:entries.slice(0,n)};
     }}}
   }}
 });
 const db={collection,async runTransaction(fn){
   const running=lock.then(async()=>{
     const changes=[];
     const tx={
       get:async r=>snap(r),
       set:(r,d,opts)=>changes.push({op:'set',r,d,opts}),
       update:(r,d)=>changes.push({op:'set',r,d,opts:{merge:true}})
     };
     const out=await fn(tx);
     for(const x of changes)store.set(x.r.path,x.opts?.merge?{...(store.get(x.r.path)||{}),...structuredClone(x.d)}:structuredClone(x.d));
     return out;
   });
   lock=running.catch(()=>{});return running;
 }};
 return {db,store};
}
function setup(){
 const {db,store}=fake(),routes={};
 const app={
   get(path,...fn){routes['GET '+path]=fn.at(-1)},
   post(path,...fn){routes['POST '+path]=fn.at(-1)}
 };
 const users=new Map([
   ['ana@example.com',{nome:'Ana Indie',avatar:'🎸',criadoEm:new Date(Date.now()-100*86400000)}],
   ['bia@example.com',{nome:'Bia Rock',avatar:'🎧',criadoEm:new Date(Date.now()-40*86400000)}]
 ]);
 const io={sockets:{sockets:new Map()}};
 const gamification45=createGamification45({db,app,sessionEmail:()=> 'ana@example.com',users,userPoints:new Map(),io});
 const ranking=createRanking60({app,db,sessionEmail:req=>req?.email||null,users,gamification45,
   rateLimit:()=> (req,res,next)=>next()});
 const call=async(method,path,email='ana@example.com',body={},query={})=>{
   const fn=routes[method+' '+path];assert(fn,'Missing route '+method+' '+path);
   const res={statusCode:200,status(n){this.statusCode=n;return this},
     json(data){this.data=data;return this}};
   await fn({email,body,query},res);
   return res;
 };
 return{db,store,routes,users,gamification45,ranking,call};
}

test('ranking6: XP legado, níveis e medalhas permanecem após recompensas válidas',async()=>{
 const x=setup(),email='ana@example.com';
 x.store.set('points/'+email,{points:120,badges:['DJ Lendário','Medalha antiga'],note:'preservado'});
 const before=x.store.get('points/'+email);
 await x.gamification45.award(email,'room','indie');
 await x.gamification45.award(email,'song','indie:videoA');
 const after=x.store.get('points/'+email);
 assert.equal(after.points,before.points+30);
 assert(after.badges.includes('Medalha antiga'));
 assert.equal(after.note,'preservado');
 const now=periods(new Date()),pid=playerId(email);
 const weekly=x.store.get('ranking60Weeks/'+now.week+'/players/'+pid);
 const monthly=x.store.get('ranking60Months/'+now.month+'/players/'+pid);
 assert.equal(weekly.score,30);assert.equal(monthly.score,30);
 assert.equal(weekly.djXP,5);assert.equal(after.ranking60.djXP,5);
 const repeated=await x.gamification45.award(email,'song','indie:videoA');
 assert.equal(repeated,null);
 assert.equal(x.store.get('ranking60Weeks/'+now.week+'/players/'+pid).score,30);
});

test('ranking6: períodos e categorias isolam reputação do XP',async()=>{
 const x=setup();
 await x.gamification45.award('ana@example.com','room','rock');
 await x.gamification45.award('bia@example.com','song','rock:one');
 const overall=await x.ranking.getLeaderboard('ana@example.com',{period:'week',category:'overall'});
 assert.equal(overall.items[0].name,'Ana Indie');
 assert.equal(overall.me.rank,1);
 const dj=await x.ranking.getLeaderboard('ana@example.com',{period:'week',category:'dj'});
 assert.equal(dj.items[0].name,'Bia Rock');
 assert.equal(dj.items[0].score,5);
 const forum=await x.ranking.getLeaderboard('ana@example.com',{period:'week',category:'forum'});
 assert.deepEqual(forum.items,[]);
 const all=await x.ranking.getLeaderboard('ana@example.com',{period:'all',category:'overall'});
 assert.equal(all.items[0].score,25);
 assert.equal(all.items[0].level.name,'DJ Explorador');
 assert.equal(x.store.get('points/ana@example.com').points,25);
});

test('ranking6: reputação apenas para resposta aceita, idempotente, com limite diário e XP separado',async()=>{
 const x=setup(),email='bia@example.com';
 const one=await x.ranking.awardForumReputation(email,'club-a','topic-1','answer-1');
 assert.deepEqual(one,{awarded:true,points:reputationReward});
 assert.equal((await x.ranking.awardForumReputation(email,'club-a','topic-1','answer-2')).awarded,false);
 assert.equal((await x.ranking.awardForumReputation(email,'club-a','topic-2','answer-2')).awarded,true);
 assert.equal((await x.ranking.awardForumReputation(email,'club-a','topic-3','answer-3')).awarded,true);
 const blocked=await x.ranking.awardForumReputation(email,'club-a','topic-4','answer-4');
 assert.equal(blocked.reason,'daily_limit');
 assert.equal(x.store.get('ranking60Reputation/'+playerId(email)).score,45);
 assert.equal(x.store.has('points/'+email),false,'reputação não altera XP');
 const key=periods(new Date()).week;
 assert.equal(x.store.get('ranking60CommunityWeeks/'+key).score,45);
 assert.equal(x.store.get('ranking60CommunityWeeks/'+key).answers,3);
 const board=await x.ranking.getLeaderboard('ana@example.com',{period:'week',category:'forum'});
 assert.equal(board.items[0].score,45);
});

test('ranking6: mostra até 50, permite comparar e oculta nomes a pedido do titular',async()=>{
 const x=setup();
 x.store.set('points/ana@example.com',{points:120,badges:['DJ Lendário']});
 x.store.set('points/bia@example.com',{points:95,badges:['DJ Expert']});
 let board=await x.ranking.getLeaderboard('ana@example.com',{period:'all'});
 assert.deepEqual(board.items.map(p=>p.name),['Ana Indie','Bia Rock']);
 assert.equal(board.me.score,120);assert.equal(board.podium.length,2);
 let r=await x.call('POST','/api/ranking60/preferences','bia@example.com',{hidden:true});
 assert.equal(r.statusCode,200);
 board=await x.ranking.getLeaderboard('ana@example.com',{period:'all'});
 assert.deepEqual(board.items.map(p=>p.name),['Ana Indie']);
 r=await x.call('GET','/api/ranking60','ana@example.com',{}, {period:'garbage'});
 assert.equal(r.statusCode,400);
 r=await x.call('GET','/api/ranking60',null,{}, {});
 assert.equal(r.statusCode,401);
});

test('ranking6: vitrine de medalhas valida conquista real, sem forjar recompensas',async()=>{
 const x=setup();
 x.store.set('points/ana@example.com',{points:100,badges:['DJ Lendário','Selo antigo']});
 let r=await x.call('POST','/api/ranking60/preferences','ana@example.com',{showcase:['Selo falso']});
 assert.equal(r.statusCode,403);
 r=await x.call('POST','/api/ranking60/preferences','ana@example.com',{showcase:['DJ Lendário','Selo antigo']});
 assert.equal(r.statusCode,200);
 assert.deepEqual(r.data.preferences.showcase,['DJ Lendário','Selo antigo']);
 r=await x.call('GET','/api/ranking60/me','ana@example.com');
 assert.equal(r.statusCode,200);
 assert.equal(r.data.points,100);assert.equal(r.data.reputation.score,0);
 assert(r.data.milestones.find(m=>m.days===90).unlocked);
 assert(!r.data.milestones.find(m=>m.days===365).unlocked);
 assert.equal(r.data.collective.target,150);
});

test('ranking6: Hall da Fama usa somente temporadas encerradas com pontuação real',async()=>{
 const x=setup(),at=new Date();at.setUTCDate(at.getUTCDate()-7);
 const previous=periods(at).week;
 x.store.set('ranking60Weeks/'+previous+'/players/'+playerId('bia@example.com'),{
   email:'bia@example.com',score:152
 });
 const hall=await x.ranking.getHall();
 assert(hall.some(s=>s.period==='week'&&s.key===previous&&s.champion==='Bia Rock'&&s.score===152));
 assert(!hall.some(s=>s.score===0));
});

test('ranking6: período semanal é diferente do mensal, com dias calculados em São Paulo',()=>{
 const a=periods(new Date('2026-11-18T15:00:00Z'));
 assert.equal(a.week,'2026-W47');
 assert.equal(a.month,'2026-11');
});
