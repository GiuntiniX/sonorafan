'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {installFanClubs71}=require('../fan-clubs-71');

test('Fanclub badge: legacy links, indexed links, live updates and ownership',async t=>{
 const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 const B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 const C='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 const D='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
 const CLUBS='sonorafanFanClubs71',INDEX='sonorafanFanclubRoomLinks';
 const rock='hoje-e-dia-do-rock',army='bts-army',legacy='noite-do-metal';
 const docs=new Map(),events=[],routes=new Map();
 const key=(col,id)=>col+':'+id;
 function ref(col,id){
  return {
   id,
   async get(){return snap(col,id)},
   async update(next){docs.set(key(col,id),{...(docs.get(key(col,id))||{}),...next})},
   async set(next){docs.set(key(col,id),next)},
   collection(child){return collection(col+'/'+id+'/'+child)}
  };
 }
 function snap(col,id){
  return {id,ref:ref(col,id),exists:docs.has(key(col,id)),
   data(){return docs.get(key(col,id))||{}}};
 }
 function collection(col){
  return {
   doc(id){return ref(col,id)},
   async get(){return {docs:[...docs.keys()].filter(k=>k.startsWith(col+':'))
     .map(k=>snap(col,k.slice(col.length+1)))}} ,
   where(field,op,value){
    assert.equal(field,'roomSlugs');assert.equal(op,'array-contains');
    return {async get(){return {docs:[...docs].filter(([k,v])=>
      k.startsWith(col+':')&&Array.isArray(v.roomSlugs)&&v.roomSlugs.includes(value))
      .map(([k])=>snap(col,k.slice(col.length+1)))}}};
   }
  };
 }
 const db={collection,async runTransaction(fn){
  const operations=[];
  const tx={get:r=>r.get(),update:(r,v)=>operations.push([r,'update',v]),
   set:(r,v)=>operations.push([r,'set',v])};
  const result=await fn(tx);
  for(const [r,method,v] of operations)await r[method](v);
  return result;
 }};
 docs.set(key(CLUBS,A),{id:A,title:'Headbangers',artist:'Rock',roomSlugs:[rock],
  ownerId:'owner',memberIds:['owner'],genre:'metal',defaultRoomSlug:rock});
 docs.set(key(CLUBS,B),{id:B,title:'ARMYS',artist:'BTS',roomSlugs:[army],
  ownerId:'owner',memberIds:['owner'],genre:'kpop'});
 docs.set(key(CLUBS,C),{id:C,title:'Outro Fanclub',artist:'Rock',roomSlugs:[],
  ownerId:'owner',memberIds:['owner'],genre:'rock'});
 docs.set(key(CLUBS,D),{id:D,title:'Metal Underground',artist:'Metal',roomSlugs:['NOITE-DO-METAL'],
  ownerId:'owner',memberIds:['owner'],genre:'metal'});
 docs.set(key(INDEX,army),{clubIds:[B]});
 const rooms=new Map([[rock,{slug:rock,name:'Hoje é dia do Rock, bebê!',
  ownerEmail:'dono@example.com',isPrivate:false}],
  [army,{slug:army,name:'BTS Army',ownerEmail:'dono@example.com',isPrivate:false}],
  [legacy,{slug:legacy,name:'Noite do Metal',ownerEmail:'dono@example.com',isPrivate:false}],
  ['lobby',{slug:'lobby',isPrivate:false}]]);
 const app={};
 for(const method of ['get','post','patch','delete'])
  app[method]=(route,...handlers)=>routes.set(method.toUpperCase()+' '+route,handlers.at(-1));
 const module=installFanClubs71({app,db,sessionEmail:()=> 'dono@example.com',
  users:new Map(),rooms,socialEvents:new Map(),publicUserId:()=> 'owner',
  adminEmails:new Set(),rateLimit:()=>()=>{},io:{to(slug){return {
   emit(name,payload){events.push({slug,name,payload})}
  }}}});
 async function request(method,route,params={},body={}){
  const fn=routes.get(method+' '+route);
  assert.ok(fn,'Route registered: '+route);
  const res={code:200,body:null,set(){return this},
   status(code){this.code=code;return this},
   json(body){this.body=body;return this}};
  await fn({params,body,query:{}},res);
  return res;
 }
 await t.test('Headbangers legacy link renders without reverse index',async()=>{
  const r=await request('GET','/api/fan-clubs/room/:slug',{slug:rock});
  assert.equal(r.code,200);assert.deepEqual(r.body.clubs.map(c=>c.id),[A]);
 });
 await t.test('BTS index renders same badge contract',async()=>{
  const r=await request('GET','/api/fan-clubs/room/:slug',{slug:army});
  assert.equal(r.code,200);assert.equal(r.body.clubs[0].title,'ARMYS');
 });
 await t.test('Legacy Fanclub still renders when stored slug has different casing and no index',async()=>{
  const r=await request('GET','/api/fan-clubs/room/:slug',{slug:legacy});
  assert.equal(r.code,200);assert.deepEqual(r.body.clubs.map(c=>c.id),[D]);
 });
 await t.test('lobby cannot have a badge',async()=>{
  const r=await request('GET','/api/fan-clubs/room/:slug',{slug:'lobby'});
  assert.deepEqual(r.body.clubs,[]);
 });
 await t.test('link a second Fanclub and notify all room listeners',async()=>{
  const r=await request('POST','/api/fan-clubs/:id/rooms',{id:C},{slug:rock});
  assert.equal(r.body.success,true);
  assert.deepEqual(docs.get(key(INDEX,rock)).clubIds,[C]);
  const status=await request('GET','/api/fan-clubs/room/:slug',{slug:rock});
  assert.deepEqual(new Set(status.body.clubs.map(c=>c.id)),new Set([A,C]));
  assert.ok(events.some(e=>e.slug===rock&&e.name==='sf208RoomFanclubs'&&e.payload.clubs.length===2));
 });
 await t.test('unlink removes only requested Fanclub',async()=>{
  const r=await request('DELETE','/api/fan-clubs/:id/rooms/:slug',{id:C,slug:rock});
  assert.equal(r.body.success,true);
  const status=await request('GET','/api/fan-clubs/room/:slug',{slug:rock});
  assert.deepEqual(status.body.clubs.map(c=>c.id),[A]);
 });
 await t.test('Lobby is not eligible for linking',async()=>{
  const r=await request('POST','/api/fan-clubs/:id/rooms',{id:C},{slug:'lobby'});
  assert.equal(r.code,404);
 });
 assert.equal(typeof module.findRoomFanclubs,'function');
});
