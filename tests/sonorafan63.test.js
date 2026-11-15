'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {STYLES,roomGenre,rankRooms,historyCSV,battlePublic,installPlatform63}=require('../sonorafan-platform-63');
function mockDB(){
 const dbData=new Map();
 const ref=(col,id)=>({key:col+'/'+id,get:async()=>({exists:dbData.has(col+'/'+id),data:()=>dbData.get(col+'/'+id)}),set:async(obj,opts)=>{const k=col+'/'+id;dbData.set(k,opts?.merge?{...(dbData.get(k)||{}),...obj}:obj);}});
 return {dbData,collection:name=>({doc:id=>ref(name,id)}),runTransaction:async fn=>{
   const tx={get:r=>r.get(),set:(r,data,opts)=>r.set(data,opts)};return fn(tx);
 }};
}
function fakeServer(){
 const routes=new Map(),emissions=[],sockets=new Map();
 const app={get:(route,fn)=>routes.set('GET '+route,fn),post:(route,fn)=>routes.set('POST '+route,fn)};
 const io={sockets:{sockets},to:slug=>({emit:(event,data)=>{emissions.push({slug,event,data});}}),on(){}};
 const db=mockDB();
 const rooms=new Map(),users=new Map(),userPoints=new Map();
 const gamification45={getSnapshot:async email=>({points:(await db.collection('points').doc(email).get()).data()?.points||0,badges:[]})};
 const platform=installPlatform63({app,io,db,rooms,users,sessionEmail:req=>req.user,userPoints,gamification45});
 const request=async(method,route,user,body={},params={})=>{
   const fn=routes.get(method+' '+route);assert.ok(fn, 'route missing '+method+' '+route);
   let statusCode=200,headers={};const res={status(n){statusCode=n;return this},json(data){this.body=data;return this},set(k,v){headers[k]=v;return this},send(str){this.body=str;return this}};
   await fn({user,body,params,ip:'127.0.0.1'},res);
   return {status:statusCode,body:res.body,headers};
 };
 return {...db,app,io,rooms,users,userPoints,platform,request,sockets,emissions};
}
const track=i=>({id:'song'+String(i).padStart(7,'0'),title:'Faixa '+i,artist:'Artista',dj:'Participante'});
(async()=>{
 assert.equal(roomGenre({name:'Indie Vibes'}),'indie');
 assert.equal(roomGenre({name:'Pagode e MPB'}),'mpb');
 assert.equal(roomGenre({name:'Lounge SonoraFan'}),null);
 const ranked=rankRooms([{name:'Rock',listenerCount:9},{name:'Indie',listenerCount:0,isPlaying:true}],['indie']);
 assert.equal(ranked[0].name,'Indie');
 const csv=historyCSV([{id:'abcdefghijk',title:'=SOMAR(1;1)',artist:'A;B',dj:'Ana',playedAt:Date.now()}]);
 assert.ok(csv.includes("'=SOMAR"),'CSV formula injection');
 assert.ok(csv.includes('"A;B"'),'CSV cell escape');
 let a=battlePublic({id:'t',active:true,startedAt:0,endsAt:99,choices:[{id:'one',title:'1'},{id:'two',title:'2'}],votes:new Map([['a','one'],['b','one'],['c','two']])});
 assert.deepEqual(a.votes.map(x=>x.count),[2,1]);
 const s=fakeServer();
 const room={slug:'rock-room',name:'Rock Classics',queue:[track(1),track(2),track(3)],currentIndex:0,listenerCount:3,isPlaying:true,isPrivate:false,description:'rock'};
 s.rooms.set(room.slug,room);
 for(const user of ['ana@test','beto@test','carla@test']){
   s.sockets.set(user,{userEmail:user,rooms:new Set(['rock-room']),emit() {}});
   await s.dbData.set('points/'+user,{points:30,badges:['DJ Iniciante']});
 }
 await s.platform.onJoin(room,'ana@test');
 await s.platform.onJoin(room,'ana@test');
 assert.equal(s.dbData.get('points/ana@test').points,42,'passport XP no duplicate');
 assert.deepEqual(s.dbData.get('points/ana@test').badges,['DJ Iniciante','Explorador de Rock']);
 for(let i=4;i<9;i++){const user=['ana@test','beto@test','carla@test'][i%3];await s.platform.onSong(room,track(i),{userEmail:user});}
 const collective=s.dbData.get('sf63Challenges/rock-room');
 assert.equal(collective.trackIds.length,5);assert.equal(collective.contributors.length,3);assert.equal(collective.completed,true);
 assert.equal(s.dbData.get('points/ana@test').points,67);
 await s.platform.onSong(room,track(8),{userEmail:'ana@test'});
 assert.equal(s.dbData.get('points/ana@test').points,67,'collective should not pay twice');
 const start=await s.request('POST','/api/platform63/battle/:slug/start','ana@test',{}, {slug:'rock-room'});
 assert.equal(start.status,201);assert.equal(start.body.choices.length,2);
 const anon=await s.request('POST','/api/platform63/battle/:slug/vote','stranger@test',{id:track(2).id},{slug:'rock-room'});
 assert.equal(anon.status,403,'only active participants can vote');
 const vote=await s.request('POST','/api/platform63/battle/:slug/vote','beto@test',{id:track(2).id},{slug:'rock-room'});
 assert.equal(vote.status,200);assert.equal(vote.body.total,1);
 await s.platform.finishBattle(room.slug);
 assert.equal(s.dbData.get('points/beto@test').points,67,'winner awarded battle XP');
 const noRepeat=await s.platform.finishBattle(room.slug);assert.equal(s.dbData.get('points/beto@test').points,67);
 await s.platform.onAdvance({...room,startedAt:1234},track(1));
 await s.platform.onAdvance({...room,startedAt:1234},track(1));
 const history=await s.request('GET','/api/platform63/history/:slug','ana@test',{}, {slug:'rock-room'});
 assert.equal(history.status,200);assert.equal(history.body.items.length,1,'idempotent persisted history');
 const exportCsv=await s.request('GET','/api/platform63/setlist/:slug.csv','ana@test',{}, {slug:'rock-room'});
 assert.equal(exportCsv.status,200);assert.ok(exportCsv.body.includes('Faixa 1'));
 const p=await s.request('GET','/api/platform63/me','ana@test');assert.equal(p.body.passport.stamps.length,1);
 const body=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
 for(const id of ['sf63Hub','sf63Tour','sf63DiscoverTools','sf63RoomTools'])assert.ok(body.includes('id="'+id+'"'),id);
 assert.ok(body.includes('card.dataset.slug = r.slug'));
 console.log('SonoraFan 63 tests: 19 checks passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
