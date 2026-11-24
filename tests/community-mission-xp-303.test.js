'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createGamification45}=require('../gamification-45');

function harness(){
 const data=new Map(),emitted=[];
 const ref=path=>({path,id:path.split('/').at(-1),collection:name=>collection(path+'/'+name),
  async get(){return snapshot(path);}
 });
 const snapshot=path=>({exists:data.has(path),id:path.split('/').at(-1),ref:ref(path),data:()=>structuredClone(data.get(path))});
 const apply=(path,body,options)=>{
  const previous=data.get(path)||{};
  data.set(path,options?.merge?{...previous,...structuredClone(body)}:structuredClone(body));
 };
 const collection=path=>({
  doc:id=>ref(path+'/'+id),
  orderBy:()=>({limit:limit=>({
    async get(){
      const docs=[...data.keys()].filter(x=>x.startsWith(path+'/')&&!x.slice(path.length+1).includes('/')).sort().slice(0,limit).map(snapshot);
      return {docs,size:docs.length,empty:docs.length===0};
    },
    startAfter:()=>({get:async()=>({docs:[],size:0,empty:true})})
  })})
 });
 const db={collection,
  async runTransaction(fn){
   const writes=[];
   const tx={get:async r=>snapshot(r.path),set:(r,body,options)=>writes.push([r.path,body,options])};
   const result=await fn(tx);
   for(const [p,body,options] of writes)apply(p,body,options);
   return result;
  },
  batch(){
   const actions=[];
   return {set:(r,body,opts)=>actions.push([r.path,body,opts]),async commit(){for(const [p,b,o] of actions)apply(p,b,o);}};
  }
 };
 const sockets={sockets:new Map([['one',{userEmail:'fan@example.com',emit:(...args)=>emitted.push(args)}]])};
 const userPoints=new Map();
 const service=createGamification45({db,app:{get(){}},sessionEmail:()=>null,users:new Map(),userPoints,io:{sockets}});
 return {service,data,userPoints,emitted};
}

test('missão entrega XP e medalha uma única vez mesmo após reset global',async()=>{
 const {service,data,emitted}=harness();
 const id='12345678-1234-4234-8234-123456789abc',email='fan@example.com';
 const first=await service.awardCampaignBonus(email,id,15,'Explorador de Festivais');
 assert.equal(first.gained,15);
 assert.equal(data.get('points/'+email).points,15);
 assert(data.get('points/'+email).badges.includes('Explorador de Festivais'));
 assert(data.has('points/'+email+'/campaignRewards/'+id));
 const duplicate=await service.awardCampaignBonus(email,id,15,'Explorador de Festivais');
 assert.equal(duplicate,null);
 await service.resetAllProgress();
 assert.equal(data.get('points/'+email).points,0);
 assert.deepEqual(data.get('points/'+email).badges,[]);
 assert(data.has('points/'+email+'/campaignRewards/'+id));
 const again=await service.awardCampaignBonus(email,id,15,'Explorador de Festivais');
 assert.equal(again,null);
 assert.equal(data.get('points/'+email).points,0);
 assert(emitted.some(x=>x[0]==='gamificationUpdate'));
});
