'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createStudio100}=require('../sonorafan-studio-100');

function harness() {
 const routes=new Map(),documents=new Map(),connections=new Map(),rooms=new Map();
 const app={get:(p,...args)=>routes.set('GET '+p,args.at(-1)),
   post:(p,...args)=>routes.set('POST '+p,args.at(-1)),
   delete:(p,...args)=>routes.set('DELETE '+p,args.at(-1))};
 const db={collection(name){
   const refs={
    doc(id){
      const key=name+'/'+id;
      return {
        async get(){return {exists:documents.has(key),data:()=>documents.get(key),ref:refs.doc(id)};},
        async set(data){documents.set(key,data);},
        async update(data){documents.set(key,{...(documents.get(key)||{}),...data});},
        async delete(){documents.delete(key);},
        collection(child){return {orderBy(){return {limit(){return {async get(){return {docs:[]};}};}};}};}
      };
    },
    where(key,op,value){return {limit(){return {async get(){
      return {docs:[...documents.entries()].filter(([k,v])=>k.startsWith(name+'/')&&v?.[key]===value).map(([k,v])=>({data:()=>v,ref:refs.doc(k.slice(name.length+1))}))};
    }};}};}
   };
   return refs;
 }};
 db.runTransaction=async fn=>{
   const tx={get:ref=>ref.get(),set:async(ref,data)=>ref.set(data)};
   return fn(tx);
 };
 db.recursiveDelete=async ref=>ref.delete();
 const me='one@sample.test';
 const room={slug:'lounge',name:'Lounge',isPrivate:false,listenerCount:2,
  queue:[{id:'AAAAAAAAAAA',title:'Song 1',artist:'Band 1',dj:'One'},
    {id:'BBBBBBBBBBB',title:'Song 2',artist:'Band 2',dj:'Two'}],currentIndex:0,isPlaying:true,startedAt:Date.now()-5000};
 rooms.set('lounge',room);
 const socket={
   userEmail:me,userName:'One',isAdmin:false,rooms:new Set(['lounge']),
   on(name,cb){this.handlers[name]=cb;},handlers:{}
 };
 connections.set('abc',socket);
 const io={sockets:{sockets:connections},in(slug){return {fetchSockets:async()=>[...connections.values()].filter(s=>s.rooms.has(slug))};}};
 const qualityAdmin=new Set(['admin@sample.test']);
 const controller=createStudio100({app,db,io,rooms,users:new Map([[me,{nome:'One',musicGenres:['indie']}]]),
   sessionEmail:req=>req.user||null,publicUserId:e=>e,rateLimit:()=>()=>{},
   adminEmails:qualityAdmin,getPosition:()=>12,getFollowing:async()=>[],publicActivity:()=>null});
 controller.attachSocket(socket,()=> 'lounge',()=>true);
 const response=()=>({statusCode:200,body:null,status(code){this.statusCode=code;return this;},
   set(){return this;},json(json){this.body=json;return this;}});
 async function call(method,url,body={},params={},email=me){
   const res=response();const handler=routes.get(method+' '+url);
   assert.ok(handler,'missing route '+method+' '+url);
   await handler({body,params,user:email},res);return res;
 }
 return {controller,db,rooms,io,socket,call,documents,response,me};
}
test('server exposes only authenticated scoped sync state',()=>{
 const h=harness();
 let data;
 h.socket.handlers['sf100:sync']({},x=>data=x);
 assert.equal(data.ok,true);
 assert.equal(data.videoId,'AAAAAAAAAAA');
 assert.equal(data.position,12);
 h.socket.userEmail=null;
 h.socket.handlers['sf100:sync']({},x=>data=x);
 assert.equal(data.ok,false);
});
test('mixtape must be created from a room actually joined by the account',async()=>{
 const h=harness();
 let r=await h.call('POST','/api/studio100/mixtapes',{title:'Indie Set',roomSlug:'lounge'});
 assert.equal(r.statusCode,200);assert.equal(r.body.trackCount,2);
 assert.equal(r.body.shared,false);
 h.socket.rooms.clear();
 r=await h.call('POST','/api/studio100/mixtapes',{title:'New Set',roomSlug:'lounge'});
 assert.equal(r.statusCode,403);
});
test('match requires explicit opt-in and remains private by default',async()=>{
 const h=harness();
 let r=await h.call('GET','/api/studio100/preferences');
 assert.deepEqual(r.body,{match:false,alerts:false});
 r=await h.call('GET','/api/studio100/match/:slug',{}, {slug:'lounge'});
 assert.equal(r.body.enabled,false);assert.deepEqual(r.body.people,[]);
 r=await h.call('POST','/api/studio100/preferences',{match:true,alerts:false});
 assert.equal(r.body.match,true);
});
test('admin quality endpoint never discloses data to regular listeners',async()=>{
 const h=harness();
 let r=await h.call('GET','/api/admin/studio100/quality');
 assert.equal(r.statusCode,403);
 r=await h.call('GET','/api/admin/studio100/quality',{}, {},'admin@sample.test');
 assert.equal(r.statusCode,200);
 assert.equal(typeof r.body.events,'number');
});
test('telemetry is constrained to known, coarse events',async()=>{
 const h=harness();
 let r=await h.call('POST','/api/studio100/telemetry',
   {event:'arbitrary',device:'mobile',roomSlug:'lounge'});
 assert.equal(r.statusCode,400);
 r=await h.call('POST','/api/studio100/telemetry',
   {event:'player-error',device:'mobile',roomSlug:'lounge'});
 assert.equal(r.statusCode,200);
 assert.equal(h.controller.quality.totals['player-error'],1);
});
