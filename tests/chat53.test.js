'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {installChat53,safeText,threadId,validId,validPolicy} = require('../chat-social-53');
const uid=email=>crypto.createHash('sha256').update('sf-public-v1:'+email.toLowerCase()).digest('hex').slice(0,24);
const emails=['ana@example.com','bia@example.com','carlos@example.com'];
const users=new Map(emails.map((e,i)=>[e,{nome:['Ana','Bia','Carlos'][i],avatar:'🎧'}]));
const idFor=e=>uid(e);
function fakeDb(){
  const docs=new Map();
  class Ref{
    constructor(key){this.key=key;this.id=key.split('/').at(-1);}
    async get(){const v=docs.get(this.key);return {exists:v!==undefined,data:()=>v,id:this.id};}
    async set(value,opt={}){const before=docs.get(this.key)||{};let merged=opt.merge?merge(before,value):value;docs.set(this.key,structuredClone(merged));}
    collection(name){return new Coll(this.key+'/'+name);}
  }
  const merge=(a,b)=>Object.fromEntries([...new Set([...Object.keys(a),...Object.keys(b)])].map(k=>[k,a[k]&&b[k]&&typeof a[k]==='object'&&!Array.isArray(a[k])&&typeof b[k]==='object'&&!Array.isArray(b[k])?merge(a[k],b[k]):b[k]===undefined?a[k]:b[k]]));
  class Coll{
    constructor(key,cond=[],sort=null,max=Infinity){this.key=key;this.cond=cond;this.sort=sort;this.max=max;}
    doc(id){return new Ref(this.key+'/'+id);}
    where(field,op,value){return new Coll(this.key,[...this.cond,[field,op,value]],this.sort,this.max);}
    orderBy(field,dir){return new Coll(this.key,this.cond,[field,dir],this.max);}
    limit(n){return new Coll(this.key,this.cond,this.sort,n);}
    async get(){let arr=[...docs.entries()].filter(([key])=>key.startsWith(this.key+'/')&&!key.slice(this.key.length+1).includes('/')).map(([key,v])=>({id:key.split('/').at(-1),data:()=>v}));
      for(const [k,op,v] of this.cond){arr=arr.filter(e=>op==='array-contains'?(e.data()[k]||[]).includes(v):false);}
      if(this.sort){const [k,d]=this.sort;arr.sort((a,b)=>(Number(a.data()[k])-Number(b.data()[k]))*(d==='desc'?-1:1));}
      return {forEach:cb=>arr.slice(0,this.max).forEach(cb)};
    }
  }
  return {collection:n=>new Coll(n),batch:()=>{const ops=[];return {set:(r,v)=>ops.push([r,v]),commit:async()=>{for(const [r,v] of ops)await r.set(v,{merge:true});}};},runTransaction:async cb=>cb({get:r=>r.get(),set:(r,v,o)=>r.set(v,o)})};
}
function fakeApp(){const routes=new Map();return {routes,get:(route,...fn)=>routes.set('GET '+route,fn),post:(route,...fn)=>routes.set('POST '+route,fn),patch:(route,...fn)=>routes.set('PATCH '+route,fn)};}
function fakeIO(){const handlers=[];const events=[];const socks=new Map();return {handlers,events,sockets:{sockets:socks},on:(event,fn)=>{if(event==='connection')handlers.push(fn);},to:room=>({emit:(event,data)=>events.push([room,event,data])})};}
async function route(app,method,path,email,body={}){
  let key=method+' '+path,params={};let handlers=app.routes.get(key);
  if(!handlers){for(const [k,v] of app.routes){const [m,routePath]=k.split(' ');const match=routePath.match(/:id/)?routePath.replace(':id','([^/]+)'):null;if(m===method&&match){const re=new RegExp('^'+match+'$'),r=path.match(re);if(r){handlers=v;params.id=r[1];break;}}}}
  assert.ok(handlers,'route missing '+key);
  const req={_email:email,body,params,path};const res={statusCode:200,status(n){this.statusCode=n;return this;},json(data){this.data=data;return this;}};
  for(const fn of handlers){if(fn.length>=3){let nextCalled=false;await fn(req,res,()=>{nextCalled=true;});if(!nextCalled)break;}else await fn(req,res);}return res;
}
async function main(){
  let clock=Date.now();Date.now=()=>{clock+=1700;return clock;};
  assert.equal(validPolicy('everyone'),true);assert.equal(validPolicy('any'),false);
  assert.equal(validId(uid(emails[0])),true);
  assert.equal(threadId(uid(emails[0]),uid(emails[1])),threadId(uid(emails[1]),uid(emails[0])));
  assert.equal(safeText('oi\n tudo',10),'oi  tudo');
  const db=fakeDb(),app=fakeApp(),io=fakeIO(),tokens=new Map(),following=new Map();
  installChat53({app,io,db,sessionEmail:req=>req._email,users,rooms:new Map(),publicUserId:idFor,findSocialUser:id=>[...users.entries()].find(([e])=>idFor(e)===id),getFollowing:async email=>following.get(email)||[],sf15Notify:async()=>{},socketTokens:tokens,sessions:{get:()=>null},rateLimit:()=> (req,res,next)=>next()});
  const a=uid(emails[0]),b=uid(emails[1]),c=uid(emails[2]);
  let res=await route(app,'GET','/api/chat53/me',null);assert.equal(res.statusCode,401);
  res=await route(app,'POST','/api/chat53/messages',emails[0],{to:b,text:'Oi Bia, escuta essa faixa!'});assert.equal(res.statusCode,201);
  let id=res.data.message.id;
  res=await route(app,'GET','/api/chat53/inbox',emails[1]);assert.equal(res.data[0].unread,true);assert.equal(res.data[0].preview,'Oi Bia, escuta essa faixa!');
  assert.equal(JSON.stringify(res.data).includes('@example.com'),false);
  res=await route(app,'GET','/api/chat53/messages/'+a,emails[1]);assert.equal(res.data.messages[0].id,id);
  res=await route(app,'POST','/api/chat53/messages/'+a+'/read',emails[1]);assert.equal(res.statusCode,200);
  res=await route(app,'GET','/api/chat53/inbox',emails[1]);assert.equal(res.data[0].unread,false);
  res=await route(app,'POST','/api/chat53/block',emails[1],{userId:a,block:true});assert.equal(res.statusCode,200);
  res=await route(app,'POST','/api/chat53/messages',emails[0],{to:b,text:'Bloqueado'});assert.equal(res.statusCode,403);
  res=await route(app,'POST','/api/chat53/block',emails[1],{userId:a,block:false});assert.equal(res.data.blocked,false);
  res=await route(app,'PATCH','/api/chat53/settings',emails[1],{allowDM:'following',notify:true});assert.equal(res.statusCode,200);
  res=await route(app,'POST','/api/chat53/messages',emails[0],{to:b,text:'Privado'});assert.equal(res.statusCode,403);
  following.set(emails[1],[a]);
  res=await route(app,'POST','/api/chat53/messages',emails[0],{to:b,text:'Agora pode'});assert.equal(res.statusCode,201);
  res=await route(app,'GET','/api/chat53/messages/'+c,emails[1]);assert.equal(res.data.messages.length,0);
  res=await route(app,'POST','/api/chat53/messages',emails[0],{to:b,text:'X'.repeat(701)});assert.equal(res.statusCode,400);
  // Reações no chat público: votar e desfazer com identidade vinculada ao socket.
  const room={chatHistory:[{_id:'public-1',user:'Bia',text:'Essa é minha música'}]};
  const publicRooms=new Map([['lounge',room]]);
  const db2=fakeDb(),app2=fakeApp(),io2=fakeIO(),st=new Map();
  installChat53({app:app2,io:io2,db:db2,sessionEmail:req=>req._email,users,rooms:publicRooms,publicUserId:idFor,findSocialUser:id=>[...users.entries()].find(([e])=>idFor(e)===id),getFollowing:async()=>[],sf15Notify:async()=>{},socketTokens:st,sessions:{get:()=>null},rateLimit:()=> (req,res,next)=>next()});
  const handlers={};const sock={sfSocialRoom:'lounge',userEmail:emails[0],handshake:{headers:{cookie:''}},on:(event,fn)=>handlers[event]=fn,emit:()=>{},join:()=>{}};
  io2.handlers[0](sock);
  handlers.sf53Reaction({messageId:'public-1',emoji:'🔥'});
  assert.deepEqual(room.chatHistory[0].reactions['🔥'],[a]);
  handlers.sf53Reaction({messageId:'public-1',emoji:'🔥'});
  assert.deepEqual(room.chatHistory[0].reactions['🔥'],[]);
  handlers.sf53Reaction({messageId:'public-1',emoji:'😂'});
  assert.deepEqual(room.chatHistory[0].reactions['😂'],[a]);
  assert.deepEqual(room.chatHistory[0].reactions['🔥'],[]);
  assert.equal(io2.events.filter(x=>x[1]==='sf53ReactionUpdate').length,3);
  // Socket autenticado com token temporário: ingressa apenas no canal do próprio usuário.
  let joined='';sock.join=channel=>joined=channel;
  st.set('f'.repeat(32),{email:emails[0],exp:Date.now()+60000});
  handlers.sf53Auth({token:'f'.repeat(32)});
  assert.equal(joined,'sf53-user-'+a);

  console.log('PASS 11 chat social checks: private auth, inbox, read, block, privacy, following, limits, IDs');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
