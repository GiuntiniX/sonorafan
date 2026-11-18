'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { applyAction, publicSnapshot, levelInfo, localPeriod, createGamification45 } = require('../gamification-45');
function date(iso) { return new Date(iso + 'T15:00:00Z'); }

test('preserva XP e medalhas legadas ao conceder novos pontos', () => {
  const old = { points: 137, badges: ['DJ Iniciante','DJ Expert','DJ Lendário','Medalha Antiga'], extra: 'preservado' };
  const res = applyAction(old, 'room', 'lounge', date('2026-11-14'));
  assert.equal(res.changed, true);
  assert.equal(res.data.points, 137+10+15);
  assert.deepEqual(res.data.badges.slice(0,4), old.badges);
  assert.equal(old.points, 137);
  const snap = publicSnapshot(res.data,date('2026-11-14'));
  assert.equal(snap.level.name, 'DJ Lendário');
  assert.equal(snap.missions.find(x=>x.id==='daily_room').claimed, true);
  assert.equal(snap.missions.find(x=>x.id==='weekly_rooms').progress, 1);
});

test('impede XP em entrada repetida e cumpre missões sem resgate manual', () => {
  const now = date('2026-11-14');
  const a=applyAction({points:0,badges:[]},'room','lounge',now);
  const b=applyAction(a.data,'room','lounge',now);
  assert.equal(a.gained,25);
  assert.equal(b.gained,0);
  assert.equal(b.changed,false);
  const c=applyAction(a.data,'song','lounge:YT1',now);
  const d=applyAction(c.data,'song','lounge:YT2',now);
  assert.equal(c.gained,5);
  assert.equal(d.gained,30);
  assert.equal(d.data.gamification.lifetime.songs,2);
  assert(d.data.badges.includes('Primeiro Play'));
  assert.equal(applyAction(d.data,'song','lounge:YT1',now).changed,false);
});

test('contadores semanais, missões e recompensas não resetam os pontos antigos', () => {
  const now = date('2026-11-14');
  let data={ points:49, badges:['Meu selo legado'] };
  for(const room of ['rock','indie','mpb']) data=applyAction(data,'room',room,now).data;
  assert(data.badges.includes('Explorador Musical'));
  assert(data.badges.includes('Meu selo legado'));
  assert.equal(publicSnapshot(data,now).missions.find(x=>x.id==='weekly_rooms').claimed,true);
  const prev=data.points;
  const tomorrow=applyAction(data,'room','rock',date('2026-11-15'));
  assert(tomorrow.data.points >= prev);
  assert.equal(publicSnapshot(tomorrow.data,date('2026-11-15')).missions.find(x=>x.id==='daily_room').claimed,true);
});

test('votos e curtidas repetidos não rendem novos pontos', () => {
  const now=date('2026-11-14');
  const r=applyAction({points:100,badges:[]},'vote','lounge:YT01',now);
  assert.equal(r.gained,1);
  assert.equal(applyAction(r.data,'vote','lounge:YT01',now).changed,false);
  let d=r.data;
  for(const id of ['YT02','YT03']) d=applyAction(d,'vote','lounge:'+id,now).data;
  assert.equal(publicSnapshot(d,now).missions.find(m=>m.id==='daily_votes').claimed,true);
  const l=applyAction(d,'like','lounge:msg01',now);
  assert.equal(applyAction(l.data,'like','lounge:msg01',now).changed,false);
});

test('missões reiniciam por dia/semana; XP total permanece', () => {
  let old=applyAction({points:800,badges:[]},'room','rock',date('2026-11-14')).data;
  const future=date('2026-11-23');
  const snap=publicSnapshot(old,future);
  assert.equal(snap.xp,825);
  assert.equal(snap.missions.find(m=>m.id==='daily_room').progress,0);
  assert.equal(snap.missions.find(m=>m.id==='weekly_rooms').progress,0);
  assert.equal(levelInfo(800).name,'Ícone SonoraFan');
  assert.equal(localPeriod(date('2026-11-14')).day,'2026-11-14');
});

function firestoreFake() {
  const store=new Map([['points/one@example.com',{points:91,badges:['Selo antigo'],comment:'preservar'}],['points/two@example.com',{points:33,badges:[]}]]);
  let lock=Promise.resolve();
  const makeRef=(name,key)=>({name,key,path:`${name}/${key}`,collection(child){return {doc(id){return makeRef(name+'/'+key+'/'+child,id)}}}});
  const snap=ref=>({exists:store.has(ref.path),data:()=>store.get(ref.path),id:ref.key});
  const db={
    collection(name){return{
      doc(key){const ref=makeRef(name,key);return {...ref,async get(){return snap(ref)}}},
      orderBy(field,dir){return{limit(number){return{async get(){const docs=[...store].filter(([k])=>k.startsWith(name+'/')).map(([k,v])=>({id:k.split('/')[1],exists:true,data:()=>v})).sort((a,b)=>b.data()[field]-a.data()[field]).slice(0,number);return{docs}}}}}}
    }},
    async runTransaction(cb){const work=lock.then(async()=>{const changes=[];const tx={get:async ref=>snap(ref),set:(ref,data,opts)=>changes.push({ref,data,opts})};const out=await cb(tx);for(const x of changes){store.set(x.ref.path,x.opts?.merge?{...store.get(x.ref.path),...x.data}:x.data)}return out});lock=work.catch(()=>{});return work}
  };
  return {db,store};
}

test('transação mantém pontos e ranking no Firestore mesmo após reconstruir mapas', async()=>{
  const {db,store}=firestoreFake();
  const handlers={},sent=[];
  const app={get(route,handler){handlers[route]=handler}};
  const users=new Map([['one@example.com',{nome:'Primeira',avatar:'🎸'}],['two@example.com',{nome:'Segunda'}]]);
  const userPoints=new Map();
  const io={sockets:{sockets:new Map([['abc',{userEmail:'one@example.com',emit:(name,data)=>sent.push({name,data})}]])}};
  const service=createGamification45({db,app,sessionEmail:()=> 'one@example.com',users,userPoints,io});
  await Promise.all([service.award('one@example.com','song','lounge:x1'),service.award('one@example.com','room','lounge')]);
  assert.equal(store.get('points/one@example.com').comment,'preservar');
  assert.equal(store.get('points/one@example.com').points,91+5+25);
  assert(sent.some(x=>x.name==='gamificationUpdate'));
  assert.equal((await service.getLeaderboard())[0].nome,'Primeira');
  const req={},res={json(data){this.result=data;return this}};
  await handlers['/api/gamification/me'](req,res);
  assert.equal(res.result.points,121);
});

test('v151: Fan Club tem recompensa limitada e missão semanal sem duplicar XP',()=>{
 const now=date('2026-11-18');
 const a=applyAction({points:0,badges:[]},'club','fan-club-a',now);
 assert.equal(a.gained,5);
 assert.equal(a.data.gamification.lifetime.clubs,1);
 assert.equal(applyAction(a.data,'club','fan-club-a',now).changed,false);
 const b=applyAction(a.data,'club','fan-club-b',now);
 assert.equal(b.gained,30,'a segunda comunidade completa missão semanal uma única vez');
 assert.equal(publicSnapshot(b.data,now).missions.find(m=>m.id==='weekly_clubs').claimed,true);
 const c=applyAction(b.data,'club','fan-club-c',now);
 assert(c.data.badges.includes('Fã de Carteirinha'));
 const points=c.data.points;
 assert.equal(applyAction(c.data,'club','fan-club-c',now).data.points,points);
 assert.equal(applyAction(c.data,'club','fan-club-a',date('2026-11-19')).gained,5,'primeira participação do novo dia');
});
