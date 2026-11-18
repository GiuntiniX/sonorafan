'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {installFanClubs71,clean}=require('../fan-clubs-71');

function mock(gamification45){
 const docs=new Map(),routes=[];let autoPostId=0;
 function ref(key){return {key,id:key.split('/').at(-1), async get(){const d=docs.get(key);return {exists:!!d,data:()=>d?structuredClone(d):undefined,ref:this};},
   async create(data){if(docs.has(key))throw Error('exists');docs.set(key,structuredClone(data));},
   async set(data){docs.set(key,structuredClone(data));},
   async update(data){docs.set(key,{...docs.get(key),...structuredClone(data)});},
   async delete(){docs.delete(key);},
   collection(name){return collection(`${key}/${name}`)},doc(id){return ref(`${key}/${id}`)} };
 }
 function collection(key){return {
   doc(id){return ref(`${key}/${id||('auto-'+(++autoPostId))}`)},
   orderBy(field,direction='asc'){return query(key,field,direction)},
   where(field,op,value){return query(key,null,'asc',{field,op,value})}
 };}
 function query(key,order,direction='asc',where=null){return {limit(n){this.max=n;return this;},async get(){
   let entries=[...docs].filter(([k])=>k.startsWith(key+'/')&&!k.slice(key.length+1).includes('/'));
   if(where){entries=entries.filter(([,value])=>where.op==='=='&&value[where.field]===where.value);}
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
 const app={};for(const method of ['get','post','delete'])app[method]=(path,...funcs)=>routes.push({method,path,handler:funcs.at(-1)});
 installFanClubs71({app,db,users,rooms:room,sessionEmail:req=>req.email,publicUserId,adminEmails:owners,rateLimit:()=>((req,res,next)=>next?.()),sf15Notify:async(email,data)=>{notifications.push({email,...data});},gamification45});
 async function call(method,path,body={},email='ana@exemplo.com',query={}){
   const match=routes.find(r=>r.method===method&&new RegExp('^'+r.path.replace(/:[^/]+/g,'[^/]+')+'$').test(path));assert.ok(match,method+' '+path);
   const params={};const template=match.path.split('/'),actual=path.split('/');template.forEach((part,i)=>{if(part.startsWith(':'))params[part.slice(1)]=actual[i];});
   const res={code:200,headers:{},status(code){this.code=code;return this;},json(data){this.data=data;return this;},set(k,v){this.headers[k]=v;return this;},send(data){this.binary=data;return this;}};
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

const SAMPLE_WEBP=Buffer.concat([
 Buffer.from('RIFF','ascii'),Buffer.from([20,0,0,0]),Buffer.from('WEBP','ascii'),Buffer.alloc(32,1)
]);

test('Fan Club cover: owner uploads and signed-in members retrieve it',async()=>{
 const m=mock();const id=await create(m);
 let res=await m.call('post',`/api/fan-clubs/${id}/cover`,SAMPLE_WEBP,'leo@exemplo.com');assert.equal(res.code,403);
 res=await m.call('post',`/api/fan-clubs/${id}/cover`,SAMPLE_WEBP,'ana@exemplo.com');assert.equal(res.code,200);
 assert.ok(res.data.coverVersion>0);
 const list=await m.call('get','/api/fan-clubs');assert.equal(list.data.clubs[0].coverVersion,res.data.coverVersion);
 assert.ok(!JSON.stringify(list.data).includes('imageBase64'));
 res=await m.call('get',`/api/fan-clubs/${id}/cover`,{},'leo@exemplo.com');assert.equal(res.code,200);
 assert.equal(res.headers['Content-Type'],'image/webp');assert.deepEqual(res.binary,SAMPLE_WEBP);
 assert.equal((await m.call('get',`/api/fan-clubs/${id}/cover`,{},null)).code,401);
});
test('Cover rejects invalid image and large files; only owner deletes it',async()=>{
 const m=mock();const id=await create(m);
 assert.equal((await m.call('post',`/api/fan-clubs/${id}/cover`,Buffer.from('<script>alert(1)</script>'))).code,400);
 assert.equal((await m.call('post',`/api/fan-clubs/${id}/cover`,Buffer.concat([SAMPLE_WEBP,Buffer.alloc(181*1024)]))).code,400);
 await m.call('post',`/api/fan-clubs/${id}/cover`,SAMPLE_WEBP);
 assert.equal((await m.call('delete',`/api/fan-clubs/${id}/cover`,{},'leo@exemplo.com')).code,403);
 assert.equal((await m.call('delete',`/api/fan-clubs/${id}/cover`)).code,200);
 assert.equal((await m.call('get',`/api/fan-clubs/${id}/cover`)).code,404);
});

test('delete Fan Club denies non-owner; requires exact name and preserves room',async()=>{
  const m=mock();const id=await create(m);const path=`/api/fan-clubs/${id}`;
  assert.equal((await m.call('delete',path,{confirmation:'Fãs de Linkin Park'},'leo@exemplo.com')).code,403);
  assert.equal((await m.call('delete',path,{confirmation:'outro nome'})).code,400);
  assert.equal((await m.call('get',path)).code,200);
  const removed=await m.call('delete',path,{confirmation:'Fãs de Linkin Park'});
  assert.equal(removed.code,200);assert.equal(removed.data.roomsPreserved,true);
  assert.equal((await m.call('get',path)).code,404);
  assert.equal((await m.call('get','/api/fan-clubs')).data.clubs.length,0);
  assert.equal(m.room.has('sala-indie'),true);
});

test('global admin may permanently delete another creator’s Fan Club',async()=>{
  const m=mock();const id=await create(m);
  const detail=await m.call('get',`/api/fan-clubs/${id}`,{},'admin@sonora.com');
  assert.equal(detail.data.club.owner,false);
  assert.equal(detail.data.club.canDelete,true);
  const response=await m.call('delete',`/api/fan-clubs/${id}`,{confirmation:'Fãs de Linkin Park'},'admin@sonora.com');
  assert.equal(response.code,200);
});

test('deletion removes cover and every publication, not just parent doc',async()=>{
  const m=mock();const id=await create(m);
  const bin=Buffer.concat([Buffer.from('RIFF'),Buffer.alloc(4),Buffer.from('WEBP'),Buffer.alloc(24)]);
  assert.equal((await m.call('post',`/api/fan-clubs/${id}/cover`,bin)).code,200);
  // Populate many distinct post documents; mock doc() without id does not generate random Firestore ids.
  for(let i=0;i<110;i++)m.docs.set(`sonorafanFanClubs71/${id}/posts/p_${String(i).padStart(4,'0')}`,
    {authorId:'a'.repeat(24),authorName:'Ana',text:`Nova mensagem ${i}`,createdAt:i});
  const before=[...m.docs.keys()].filter(key=>key.includes(`/${id}/posts/`));assert.equal(before.length,110);
  assert.ok([...m.docs.keys()].some(key=>key.endsWith(`/${id}`)&&key.includes('Covers73')));
  const response=await m.call('delete',`/api/fan-clubs/${id}`,{confirmation:'Fãs de Linkin Park'});
  assert.equal(response.code,200);
  assert.equal([...m.docs.keys()].filter(key=>key.includes(`/${id}/posts/`)).length,0);
  assert.equal([...m.docs.keys()].filter(key=>key.endsWith(`/${id}`)).length,0);
});

test('deletion closes SSE member subscriptions and denies further writes',async()=>{
  const m=mock();const id=await create(m);
  await m.call('post',`/api/fan-clubs/${id}/join`,{},'leo@exemplo.com');
  const s=await m.stream('leo@exemplo.com',id);assert.equal(s.code,200);
  const r=await m.call('delete',`/api/fan-clubs/${id}`,{confirmation:'Fãs de Linkin Park'});
  assert.equal(r.code,200);
  assert.equal(s.closed,true);
  assert.match(s.writes.join(''),/event: deleted/);
  assert.equal((await m.call('post',`/api/fan-clubs/${id}/posts`,{text:'Depois da exclusão'})).code,404);
  assert.equal((await m.call('post',`/api/fan-clubs/${id}/join`,{},'leo@exemplo.com')).code,404);
});

test('v151: somente moderação fixa posts; o destaque é único e pode ser removido',async()=>{
 const m=mock(),id=await create(m);
 await m.call('post',`/api/fan-clubs/${id}/join`,{},'leo@exemplo.com');
 const a=(await m.call('post',`/api/fan-clubs/${id}/posts`,{text:'Primeira música'})).data.post;
 const b=(await m.call('post',`/api/fan-clubs/${id}/posts`,{text:'Segunda música'},'leo@exemplo.com')).data.post;
 assert.equal((await m.call('post',`/api/fan-clubs/${id}/posts/${a.id}/pin`,{pinned:true},'leo@exemplo.com')).code,403);
 assert.equal((await m.call('post',`/api/fan-clubs/${id}/posts/${a.id}/pin`,{pinned:true})).code,200);
 let posts=(await m.call('get',`/api/fan-clubs/${id}/posts`)).data.posts;
 assert.equal(posts[0].id,a.id);assert.equal(posts[0].pinned,true);
 assert.equal((await m.call('post',`/api/fan-clubs/${id}/posts/${b.id}/pin`,{pinned:true})).code,200);
 posts=(await m.call('get',`/api/fan-clubs/${id}/posts`)).data.posts;
 assert.equal(posts.filter(p=>p.pinned).length,1);assert.equal(posts[0].id,b.id);
 await m.call('delete',`/api/fan-clubs/${id}/posts/${b.id}`,'','leo@exemplo.com');
 posts=(await m.call('get',`/api/fan-clubs/${id}/posts`)).data.posts;
 assert.equal(posts.some(p=>p.pinned),false);
});

test('v151: reação é exclusiva de membros e não revela IDs nem concede XP',async()=>{
 const awards=[],m=mock({award:async(...args)=>{awards.push(args);}}),id=await create(m);
 const a=(await m.call('post',`/api/fan-clubs/${id}/posts`,{text:'Descoberta indie'})).data.post;
 const url=`/api/fan-clubs/${id}/posts/${a.id}/like`;
 assert.equal((await m.call('post',url,{},'leo@exemplo.com')).code,403);
 await m.call('post',`/api/fan-clubs/${id}/join`,{},'leo@exemplo.com');
 assert.deepEqual(awards,[[ 'leo@exemplo.com', 'club', id ]]);
 assert.deepEqual((await m.call('post',url,{},'leo@exemplo.com')).data,{liked:true,likeCount:1});
 let p=(await m.call('get',`/api/fan-clubs/${id}/posts`,{},'leo@exemplo.com')).data.posts[0];
 assert.equal(p.likeCount,1);assert.equal(p.liked,true);
 assert.equal(JSON.stringify(p).includes('likedBy'),false);
 assert.equal(JSON.stringify(p).includes('b'.repeat(24)),false);
 assert.deepEqual((await m.call('post',url,{},'leo@exemplo.com')).data,{liked:false,likeCount:0});
 assert.equal(awards.length,1,'curtidas não concedem XP');
 await m.call('post',`/api/fan-clubs/${id}/join`,{},'leo@exemplo.com');
 assert.equal(awards.length,1,'reentrada idempotente não gera XP');
 await m.call('post',`/api/fan-clubs/${id}/moderation`,{userId:'b'.repeat(24),action:'block'});
 assert.equal((await m.call('post',url,{},'leo@exemplo.com')).code,403);
});

test('v160: comentários exigem participação, respeitam autoria e moderação',async()=>{
 const m=mock(),id=await create(m);
 const post=(await m.call('post',`/api/fan-clubs/${id}/posts`,{text:'Minha música favorita'})).data.post;
 const base=`/api/fan-clubs/${id}/posts/${post.id}/comments`;
 assert.equal((await m.call('get',base,{},'leo@exemplo.com')).code,403);
 assert.equal((await m.call('post',base,{text:'Legal!'},'leo@exemplo.com')).code,403);
 await m.call('post',`/api/fan-clubs/${id}/join`,{},'leo@exemplo.com');
 const created=await m.call('post',base,{text:'Ótima recomendação'},'leo@exemplo.com');
 assert.equal(created.code,201);
 const result=await m.call('get',base,{},'leo@exemplo.com');
 assert.equal(result.data.comments.length,1);
 assert.equal(result.data.comments[0].text,'Ótima recomendação');
 assert.equal((await m.call('delete',`/api/fan-clubs/${id}/comments/${created.data.comment.id}`,{},'admin@sonora.com')).code,200);
 assert.equal((await m.call('get',base,{},'leo@exemplo.com')).data.comments.length,0);
});
test('v160: enquete valida opções, uma pessoa só vota uma vez e bloqueio impede voto',async()=>{
 const m=mock(),id=await create(m),base=`/api/fan-clubs/${id}/polls`;
 assert.equal((await m.call('post',base,{question:'Melhor música?',options:['X','X']})).code,400);
 assert.equal((await m.call('post',base,{question:'Melhor música?',options:['Rock','Indie']},'leo@exemplo.com')).code,403);
 const made=await m.call('post',base,{question:'Qual gênero domina?',options:['Rock','Indie']});
 assert.equal(made.code,201);
 const vote=`${base}/${made.data.id}/vote`;
 assert.equal((await m.call('post',vote,{choice:1},'leo@exemplo.com')).code,403);
 await m.call('post',`/api/fan-clubs/${id}/join`,{},'leo@exemplo.com');
 assert.equal((await m.call('post',vote,{choice:1},'leo@exemplo.com')).code,200);
 assert.equal((await m.call('post',vote,{choice:0},'leo@exemplo.com')).code,409);
 const polls=(await m.call('get',base,{},'leo@exemplo.com')).data.polls;
 assert.deepEqual(polls[0].counts,[0,1]);assert.equal(polls[0].voted,true);
 await m.call('post',`/api/fan-clubs/${id}/moderation`,{userId:'b'.repeat(24),action:'block'});
 assert.equal((await m.call('post',vote,{choice:0},'leo@exemplo.com')).code,403);
});
test('v160: música do YouTube aparece somente a membros e é agregada por vídeo',async()=>{
 const m=mock(),id=await create(m),url=`/api/fan-clubs/${id}/music`;
 assert.equal((await m.call('get',url,{},'leo@exemplo.com')).code,403);
 await m.call('post',`/api/fan-clubs/${id}/join`,{},'leo@exemplo.com');
 for(const text of ['♫ https://www.youtube.com/watch?v=dQw4w9WgXcQ','https://youtu.be/dQw4w9WgXcQ'])
   await m.call('post',`/api/fan-clubs/${id}/posts`,{text});
 const data=(await m.call('get',url,{},'leo@exemplo.com')).data;
 assert.equal(data.tracks[0].videoId,'dQw4w9WgXcQ');
 assert.equal(data.tracks[0].shares,2);
});

test('v160: denúncias são privadas e somente moderação resolve',async()=>{
 const m=mock(),id=await create(m),base=`/api/fan-clubs/${id}`;
 const p=(await m.call('post',base+'/posts',{text:'Mensagem da comunidade'})).data.post;
 const reportUrl=base+'/posts/'+p.id+'/report';
 assert.equal((await m.call('post',reportUrl,{reason:'Conteúdo ofensivo'},'leo@exemplo.com')).code,403);
 await m.call('post',base+'/join',{},'leo@exemplo.com');
 assert.equal((await m.call('post',reportUrl,{reason:'Conteúdo ofensivo'},'leo@exemplo.com')).code,201);
 assert.equal((await m.call('post',reportUrl,{reason:'Conteúdo ofensivo'},'leo@exemplo.com')).code,409);
 assert.equal((await m.call('get',base+'/reports',{},'leo@exemplo.com')).code,403);
 const reports=(await m.call('get',base+'/reports')).data.reports;
 assert.equal(reports.length,1);assert.equal(reports[0].status,'open');
 assert.equal((await m.call('post',base+'/reports/'+reports[0].id+'/resolve',{},'leo@exemplo.com')).code,403);
 assert.equal((await m.call('post',base+'/reports/'+reports[0].id+'/resolve')).code,200);
 assert.equal((await m.call('get',base+'/reports')).data.reports[0].status,'resolved');
});
test('v160: ranking de contribuidores usa dados do mural, sem email nem XP fictício',async()=>{
 const m=mock(),id=await create(m),base=`/api/fan-clubs/${id}`;
 assert.equal((await m.call('get',base+'/contributors',{},'leo@exemplo.com')).code,403);
 await m.call('post',base+'/join',{},'leo@exemplo.com');
 const p=(await m.call('post',base+'/posts',{text:'Recomendo essa faixa'})).data.post;
 await m.call('post',base+'/posts/'+p.id+'/comments',{text:'Gostei'},'leo@exemplo.com');
 const ranks=(await m.call('get',base+'/contributors')).data.ranking;
 assert.equal(ranks[0].name,'Ana Indie');assert.equal(ranks[0].posts,1);
 assert(ranks.some(v=>v.name==='Leo Rock'&&v.comments===1));
 assert(!JSON.stringify(ranks).includes('ana@exemplo.com'));
});
