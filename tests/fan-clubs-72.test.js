'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {installFanClubs71,clean}=require('../fan-clubs-71');

function mock(){
 const docs=new Map(),routes=[];
 function ref(key){return {key, async get(){const d=docs.get(key);return {exists:!!d,data:()=>d?structuredClone(d):undefined,ref:this};},
   async create(data){if(docs.has(key))throw Error('exists');docs.set(key,structuredClone(data));},
   async set(data){docs.set(key,structuredClone(data));},
   async update(data){docs.set(key,{...docs.get(key),...structuredClone(data)});},
   async delete(){docs.delete(key);},
   collection(name){return collection(`${key}/${name}`)},doc(id){return ref(`${key}/${id}`)} };
 }
 function collection(key){return {
   doc(id){return ref(`${key}/${id}`)},
   orderBy(field,direction='asc'){return query(key,field,direction)},
   where(field,op,value){return query(key,null,'asc',{field,op,value})}
 };}
 function query(key,order,direction='asc',where=null){return {limit(n){this.max=n;return this;},async get(){
   let entries=[...docs].filter(([k])=>k.startsWith(key+'/')&&!k.slice(key.length+1).includes('/'));
   if(where){entries=entries.filter(([,value])=>(where.op==='=='&&value[where.field]===where.value||where.op==='array-contains'&&Array.isArray(value[where.field])&&value[where.field].includes(where.value)));}
   if(order){entries.sort(([,a],[,b])=>direction==='desc'?b[order]-a[order]:a[order]-b[order]);}
   if(this.max)entries=entries.slice(0,this.max);
   return {size:entries.length,docs:entries.map(([k,value])=>({id:k.slice(key.length+1),data:()=>structuredClone(value),ref:ref(k)}))};
  }};}
 const db={collection,async runTransaction(cb){const writes=[];const tx={get:r=>r.get(),update:(r,v)=>writes.push(()=>r.update(v)),delete:r=>writes.push(()=>r.delete()),set:(r,v)=>writes.push(()=>r.set(v))};
   const result=await cb(tx);for(const run of writes)await run();return result;
 }};
 const users=new Map([['ana@exemplo.com',{nome:'Ana Indie'}],['leo@exemplo.com',{nome:'Leo Rock'}],['admin@sonora.com',{nome:'Admin'}]]);
 const owners=new Set(['admin@sonora.com']);
 const room=new Map([['sala-indie',{slug:'sala-indie',name:'Sala Indie',ownerEmail:'ana@exemplo.com',isPrivate:false,listenerCount:3,isPlaying:true,queue:[{title:'Faixa indie',artist:'Banda'}],currentIndex:0}],['sala-privada',{slug:'sala-privada',ownerEmail:'ana@exemplo.com',isPrivate:true,queue:[]}]]);
 const publicUserId=email=>({ 'ana@exemplo.com':'a'.repeat(24),'leo@exemplo.com':'b'.repeat(24),'admin@sonora.com':'c'.repeat(24)})[email];
 const notifications=[];
 const app={};for(const method of ['get','post','patch','delete'])app[method]=(path,...funcs)=>routes.push({method,path,handler:funcs.at(-1)});
 installFanClubs71({app,db,users,rooms:room,sessionEmail:req=>req.email,publicUserId,adminEmails:owners,rateLimit:()=>((req,res,next)=>next?.()),sf15Notify:async(email,data)=>{notifications.push({email,...data});}});
 async function call(method,path,body={},email='ana@exemplo.com',query={}){
   const match=routes.find(r=>r.method===method&&new RegExp('^'+r.path.replace(/:[^/]+/g,'[^/]+')+'$').test(path));assert.ok(match,method+' '+path);
   const params={};const template=match.path.split('/'),actual=path.split('/');template.forEach((part,i)=>{if(part.startsWith(':'))params[part.slice(1)]=actual[i];});
   const res={code:200,status(code){this.code=code;return this;},json(data){this.data=data;return this;}};
   await match.handler({body,email,params,query},res);return res;
 }
 async function stream(email,id){
   const route=routes.find(r=>r.method==='get'&&r.path==='/api/fan-clubs/:id/stream');
   const response={code:200,writes:[],closed:false,headers:{},status(code){this.code=code;return this;},json(data){this.data=data;return this;},setHeader(k,v){this.headers[k]=v;},flushHeaders(){},write(chunk){this.writes.push(chunk)},on(event,cb){if(event==='close')this.closeHandler=cb;},end(){this.closed=true;this.closeHandler?.();}};
   await route.handler({email,params:{id},on(){}},response);
   return response;
 }
 return {call,docs,room,stream,notifications};
}

async function create(m){const response=await m.call('post','/api/fan-clubs',{artist:'Linkin Park',title:'Fãs de Linkin Park',description:'Nossas músicas',theme:'stage',rules:'Sem spam'});assert.equal(response.code,201);return response.data.club.id;}

test('clean strips tags and control characters',()=>{assert.equal(clean('  Rock<>\u0000  Indie  ',50),'Rock Indie');});
test('creating club requires session, validates input, and returns no email',async()=>{
 const m=mock();assert.equal((await m.call('post','/api/fan-clubs',{artist:'X',title:'xx'})).code,400);
 assert.equal((await m.call('post','/api/fan-clubs',{artist:'Radiohead',title:'Fãs de Radiohead'},null)).code,401);
 const id=await create(m);const response=await m.call('get','/api/fan-clubs');assert.equal(response.data.clubs.length,1);
 assert.equal(response.data.clubs[0].ownerName,'Ana Indie');assert.ok(!JSON.stringify(response.data).includes('ana@exemplo.com'));assert.equal(response.data.clubs[0].isUnofficial,true);
 assert.match(id,/^[a-f0-9-]{36}$/);
});
test('membership required before posting; join/leave and owner remains',async()=>{
 const m=mock();const id=await create(m);
 assert.equal((await m.call('post',`/api/fan-clubs/${id}/posts`,{text:'Nova faixa'},'leo@exemplo.com')).code,403);
 assert.equal((await m.call('post',`/api/fan-clubs/${id}/join`,{},'leo@exemplo.com')).code,200);
 assert.equal((await m.call('post',`/api/fan-clubs/${id}/posts`,{text:'Nova faixa'},'leo@exemplo.com')).code,201);
 assert.equal((await m.call('get',`/api/fan-clubs/${id}/posts`,{},'leo@exemplo.com')).data.posts.length,1);
 assert.equal((await m.call('delete',`/api/fan-clubs/${id}/join`,{},'leo@exemplo.com')).code,200);
 assert.equal((await m.call('get',`/api/fan-clubs/${id}/posts`,{},'leo@exemplo.com')).code,403);
 assert.equal((await m.call('delete',`/api/fan-clubs/${id}/join`)).code,403);
});
test('only author or moderator can remove a post',async()=>{
 const m=mock();const id=await create(m);await m.call('post',`/api/fan-clubs/${id}/join`,{},'leo@exemplo.com');
 const post=(await m.call('post',`/api/fan-clubs/${id}/posts`,{text:'Vamos ouvir rock'})).data.post;
 assert.equal((await m.call('delete',`/api/fan-clubs/${id}/posts/${post.id}`,{},'leo@exemplo.com')).code,403);
 assert.equal((await m.call('delete',`/api/fan-clubs/${id}/posts/${post.id}`)).code,200);
});
test('moderation blocks rejoining, unblock restores access',async()=>{
 const m=mock();const id=await create(m);await m.call('post',`/api/fan-clubs/${id}/join`,{},'leo@exemplo.com');
 assert.equal((await m.call('post',`/api/fan-clubs/${id}/moderation`,{userId:'b'.repeat(24),action:'block'},'leo@exemplo.com')).code,403);
 assert.equal((await m.call('post',`/api/fan-clubs/${id}/moderation`,{userId:'b'.repeat(24),action:'block'})).code,200);
 assert.equal((await m.call('post',`/api/fan-clubs/${id}/join`,{},'leo@exemplo.com')).code,403);
 assert.equal((await m.call('post',`/api/fan-clubs/${id}/moderation`,{userId:'b'.repeat(24),action:'unblock'})).code,200);
 assert.equal((await m.call('post',`/api/fan-clubs/${id}/join`,{},'leo@exemplo.com')).code,200);
});
test('linking public rooms requires ownership and private rooms are forbidden',async()=>{
 const m=mock();const id=await create(m);await m.call('post',`/api/fan-clubs/${id}/join`,{},'leo@exemplo.com');
 assert.equal((await m.call('post',`/api/fan-clubs/${id}/rooms`,{slug:'sala-indie'},'leo@exemplo.com')).code,403);
 assert.equal((await m.call('post',`/api/fan-clubs/${id}/rooms`,{slug:'sala-privada'})).code,404);
 assert.equal((await m.call('post',`/api/fan-clubs/${id}/rooms`,{slug:'sala-indie'})).code,200);
 const detail=await m.call('get',`/api/fan-clubs/${id}`);assert.equal(detail.data.club.rooms.length,1);assert.equal(detail.data.club.rooms[0].track.title,'Faixa indie');
 assert.equal((await m.call('delete',`/api/fan-clubs/${id}/rooms/sala-indie`)).code,200);
});


test('SSE stream requires membership and emits metadata only', async()=>{
 const m=mock();const id=await create(m);
 const stranger=await m.stream('leo@exemplo.com',id);assert.equal(stranger.code,403);
 await m.call('post',`/api/fan-clubs/${id}/join`,{},'leo@exemplo.com');
 const s=await m.stream('leo@exemplo.com',id);
 assert.equal(s.code,200);assert.equal(s.headers['Content-Type'],'text/event-stream; charset=utf-8');
 const result=await m.call('post',`/api/fan-clubs/${id}/posts`,{text:'Canção especial!'});
 assert.equal(result.code,201);
 assert.match(s.writes.join(''),/event: post/);
 assert.ok(!s.writes.join('').includes('Canção especial!'),'stream must not broadcast private post text');
 await new Promise(resolve=>setTimeout(resolve,30));
 assert.equal(m.notifications.some(n=>n.email==='leo@exemplo.com'&&n.fanClubId===id),true);
 await m.call('delete',`/api/fan-clubs/${id}/join`,{},'leo@exemplo.com');
 assert.equal(s.closed,true,'leave must close member stream');
});

test('moderation revokes SSE access immediately',async()=>{
 const m=mock();const id=await create(m);await m.call('post',`/api/fan-clubs/${id}/join`,{},'leo@exemplo.com');
 const s=await m.stream('leo@exemplo.com',id);assert.equal(s.code,200);
 const blocked=await m.call('post',`/api/fan-clubs/${id}/moderation`,{userId:'b'.repeat(24),action:'block'});
 assert.equal(blocked.code,200);assert.equal(s.closed,true);
 const attempt=await m.stream('leo@exemplo.com',id);assert.equal(attempt.code,403);
});
