'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createCommunityCenter303}=require('../community-center-303');

function harness(){
 const docs=new Map(),routes=new Map(),broadcasts=[],sockets=new Map();
 const copy=obj=>JSON.parse(JSON.stringify(obj));
 const snap=(key)=>({
   exists:docs.has(key),id:key.split('/').at(-1),ref:ref(key),
   data:()=>copy(docs.get(key))
 });
 function ref(key){
   return {path:key,id:key.split('/').at(-1),collection:name=>coll(key+'/'+name),
     get:async()=>snap(key),
     set:async data=>{docs.set(key,copy(data))},
     update:async update=>{docs.set(key,{...docs.get(key),...copy(update)})}
   };
 }
 const coll=name=>({
   doc:id=>ref(name+'/'+id),
   orderBy:()=>({limit:n=>({get:async()=>({
     docs:[...docs.keys()].filter(k=>k.startsWith(name+'/')&&!k.slice(name.length+1).includes('/')).slice(0,n).map(snap)
   })})})
 });
 const db={collection:coll,runTransaction:async task=>{
   const writes=[];
   const tx={get:async r=>snap(r.path),set:(r,data)=>writes.push(['set',r.path,copy(data)]),
     update:(r,data)=>writes.push(['update',r.path,copy(data)])};
   const result=await task(tx);
   for(const [op,p,data] of writes)docs.set(p,op==='set'?{...docs.get(p),...data}:{...docs.get(p),...data});
   return result;
 }};
 const app={
   get:(path,...handlers)=>routes.set('GET '+path,handlers.at(-1)),
   post:(path,...handlers)=>routes.set('POST '+path,handlers.at(-1))
 };
 const io={sockets:{sockets},emit:(name,payload)=>broadcasts.push({name,payload})};
 const roles=['admin@example.com','fan@example.com'];
 const calls=[];
 const instance=createCommunityCenter303({
   app,db,io,users:new Map(),rooms:new Map([['lounge',{slug:'lounge'}]]),
   sessionEmail:req=>req.user,
   rateLimit:()=>((req,res,next)=>next()),
   audit:(...args)=>calls.push(args),
   gamification45:{awardCampaignBonus:async(...args)=>calls.push(['XP',...args])}
 });
 async function req(method,path,{body={},params={},user='admin@example.com'}={}){
   const fn=routes.get(method+' '+path);assert(fn,'Missing route: '+method+' '+path);
   const res={code:200,payload:null,headers:{},status(n){this.code=n;return this;},
      set(k,v){this.headers[k]=v;return this;},json(value){this.payload=value;return this;}};
   await fn({body,params,user,adminEmail:user},res);
   return res;
 }
 return {req,instance,docs,broadcasts,calls,io};
}
test('campanhas começam em rascunho, publicam, aceitam um único voto e podem pausar',async()=>{
 const h=harness();
 await new Promise(resolve=>setImmediate(resolve));
 const created=await h.req('POST','/api/admin/community303/campaigns',{body:{
   type:'poll',title:'Qual estilo musical?',choices:['Rock','Pop'],scope:'all',channel:'card'
 }});
 assert.equal(created.code,201);
 const id=created.payload.campaign.id;
 assert.equal(created.payload.campaign.status,'draft');
 let visible=await h.req('GET','/api/community303/active',{user:'fan@example.com'});
 assert.equal(visible.payload.campaigns.length,0);
 const published=await h.req('POST','/api/admin/community303/campaigns/:id/action',{params:{id},body:{action:'publish'}});
 assert.equal(published.payload.campaign.status,'published');
 visible=await h.req('GET','/api/community303/active',{user:'fan@example.com'});
 assert.equal(visible.payload.campaigns.length,1);
 const vote=await h.req('POST','/api/community303/:id/vote',{user:'fan@example.com',params:{id},body:{option:1}});
 assert.equal(vote.code,200);assert.equal(vote.payload.totalVotes,1);
 const duplicate=await h.req('POST','/api/community303/:id/vote',{user:'fan@example.com',params:{id},body:{option:1}});
 assert.equal(duplicate.code,409);
 assert.equal(h.docs.get('sonorafanCampaigns303/'+id).totalVotes,1);
 await h.req('POST','/api/admin/community303/campaigns/:id/action',{params:{id},body:{action:'pause'}});
 visible=await h.req('GET','/api/community303/active',{user:'fan@example.com'});
 assert.equal(visible.payload.campaigns.length,0);
});
test('segmentação por sala não pode ser forjada pelo visitante',async()=>{
 const h=harness();await new Promise(resolve=>setImmediate(resolve));
 const c=await h.req('POST','/api/admin/community303/campaigns',{body:{
  type:'battle',title:'Rock contra K-pop',choices:['Rock','K-pop'],scope:'room',scopeId:'lounge',channel:'chat'
 }});
 const id=c.payload.campaign.id;
 await h.req('POST','/api/admin/community303/campaigns/:id/action',{params:{id},body:{action:'publish'}});
 let v=await h.req('GET','/api/community303/active',{user:'fan@example.com'});
 assert.equal(v.payload.campaigns.length,0);
 h.io.sockets.sockets.set('client',{userEmail:'fan@example.com',rooms:new Set(['lounge'])});
 v=await h.req('GET','/api/community303/active',{user:'fan@example.com'});
 assert.equal(v.payload.campaigns.length,1);
});
test('modos operacionais persistem e só são alterados por ação explícita',async()=>{
 const h=harness();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.instance.isChatHeld(),false);
 const saved=await h.req('POST','/api/admin/community303/operations',{body:{chatHold:true,createHold:true}});
 assert.equal(saved.code,200);
 assert.equal(h.instance.isChatHeld(),true);assert.equal(h.instance.isCreationHeld(),true);
 assert.equal(h.docs.get('sonorafanOperations303/current').chatHold,true);
});
test('missão entrega recompensa somente após voto persistido',async()=>{
 const h=harness();await new Promise(resolve=>setImmediate(resolve));
 const c=await h.req('POST','/api/admin/community303/campaigns',{body:{
  type:'mission',title:'Missão musical da comunidade',choices:['Rock','Pop'],bonusXP:15,scope:'all',channel:'card'
 }});
 const id=c.payload.campaign.id;
 await h.req('POST','/api/admin/community303/campaigns/:id/action',{params:{id},body:{action:'publish'}});
 await h.req('POST','/api/community303/:id/vote',{user:'fan@example.com',params:{id},body:{option:0}});
 assert.equal(h.calls.filter(x=>x[0]==='XP').length,1);
 await h.req('POST','/api/community303/:id/vote',{user:'fan@example.com',params:{id},body:{option:0}});
 assert.equal(h.calls.filter(x=>x[0]==='XP').length,1);
});
