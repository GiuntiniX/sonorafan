'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {installFanClubs71,clean}=require('../fan-clubs-71');

function mock(gamification45){
 const docs=new Map(),routes=[];let autoPostId=0;
 function ref(key){return {key,id:key.split('/').at(-1), async get(){const d=docs.get(key);return {exists:!!d,data:()=>d?structuredClone(d):undefined,ref:this};},
   async create(data){if(docs.has(key))throw Error('exists');docs.set(key,structuredClone(data));},
   async set(data,opts){docs.set(key,opts?.merge?{...docs.get(key),...structuredClone(data)}:structuredClone(data));},
   async update(data){docs.set(key,{...docs.get(key),...structuredClone(data)});},
   async delete(){docs.delete(key);},
   collection(name){return collection(`${key}/${name}`)},doc(id){return ref(`${key}/${id}`)} };
 }
 function collection(key){return {
   doc(id){return ref(`${key}/${id||('auto-'+(++autoPostId))}`)},
   orderBy(field,direction='asc'){return query(key,field,direction)},
   where(field,op,value){return query(key,null,'asc',{field,op,value})}
 };}
 function query(key,order,direction='asc',where=null){return {limit(n){this.max=n;return this;},startAfter(v){this.after=v;return this;},async get(){
   let entries=[...docs].filter(([k])=>k.startsWith(key+'/')&&!k.slice(key.length+1).includes('/'));
   if(where){entries=entries.filter(([,value])=>where.op==='=='&&value[where.field]===where.value);}
   if(order){entries.sort(([,a],[,b])=>direction==='desc'?b[order]-a[order]:a[order]-b[order]);}
    if(this.after!==undefined&&order){const index=entries.findIndex(([key])=>key===this.after.ref?.key);entries=index>=0?entries.slice(index+1):[];}
   if(this.max)entries=entries.slice(0,this.max);
   return {size:entries.length,docs:entries.map(([k,value])=>({id:k.slice(key.length+1),data:()=>structuredClone(value),ref:ref(k)}))};
  }};}
 const db={collection,async runTransaction(cb){const writes=[];const tx={get:r=>r.get(),update:(r,v)=>writes.push(()=>r.update(v)),delete:r=>writes.push(()=>r.delete()),set:(r,v,opts)=>writes.push(()=>r.set(v,opts))};
   const result=await cb(tx);for(const run of writes)await run();return result;
 }};
 const users=new Map([['ana@exemplo.com',{nome:'Ana Indie'}],['leo@exemplo.com',{nome:'Leo Rock'}],['admin@sonora.com',{nome:'Admin'}],['bia@exemplo.com',{nome:'Bia Indie'}],['caio@exemplo.com',{nome:'Caio Rock'}]]);
 const owners=new Set(['admin@sonora.com']);
 const room=new Map([['sala-indie',{slug:'sala-indie',name:'Sala Indie',ownerEmail:'ana@exemplo.com',isPrivate:false,listenerCount:3,isPlaying:true,queue:[{title:'Faixa indie',artist:'Banda'}],currentIndex:0}],['sala-privada',{slug:'sala-privada',ownerEmail:'ana@exemplo.com',isPrivate:true,queue:[]}]]);
 const publicUserId=email=>({ 'ana@exemplo.com':'a'.repeat(24),'leo@exemplo.com':'b'.repeat(24),'admin@sonora.com':'c'.repeat(24),'bia@exemplo.com':'d'.repeat(24),'caio@exemplo.com':'e'.repeat(24)})[email];
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

test('Fan Club não oferece rota de ranking musical; publicações anteriores são preservadas',async()=>{
 const m=mock(),id=await create(m);
 const original='Compartilhamento antigo https://youtu.be/dQw4w9WgXcQ';
 const result=await m.call('post',`/api/fan-clubs/${id}/posts`,{text:original});
 assert.equal(result.code,201);
 const posts=(await m.call('get',`/api/fan-clubs/${id}/posts`)).data.posts;
 assert(posts.some(post=>post.text===original));
 assert(posts.every(post=>!Object.hasOwn(post,'musicVideoId')));
});
test('Fan Club continua permitindo comentários, enquetes, salas e moderação',async()=>{
 const m=mock(),id=await create(m);
 const p=(await m.call('post',`/api/fan-clubs/${id}/posts`,{text:'Vamos conversar sobre o artista'})).data.post;
 assert.equal((await m.call('post',`/api/fan-clubs/${id}/posts/${p.id}/comments`,{text:'Boa ideia'})).code,201);
 assert.equal((await m.call('post',`/api/fan-clubs/${id}/polls`,{question:'Qual o melhor show?',options:['Ao vivo','Acústico']})).code,201);
});

test('v170: ideias têm proposta, voto por membro, retirada de apoio e status restrito',async()=>{
 const m=mock(),id=await create(m),base=`/api/fan-clubs/${id}`;
 assert.equal((await m.call('get',base+'/ideas',{},'leo@exemplo.com')).code,403);
 await m.call('post',base+'/join',{},'leo@exemplo.com');
 assert.equal((await m.call('post',base+'/ideas',{title:'oi'},'leo@exemplo.com')).code,400);
 const idea=(await m.call('post',base+'/ideas',{title:'Organizar um encontro',description:'Conversar sobre o próximo show'},'leo@exemplo.com'));
 assert.equal(idea.code,201);
 const vote=base+'/ideas/'+idea.data.id+'/vote';
 assert.equal((await m.call('post',vote,{},'leo@exemplo.com')).data.votes,1);
 assert.equal((await m.call('post',vote,{},'leo@exemplo.com')).data.votes,0);
 assert.equal((await m.call('post',base+'/ideas/'+idea.data.id+'/status',{status:'planned'},'leo@exemplo.com')).code,403);
 assert.equal((await m.call('post',base+'/ideas/'+idea.data.id+'/status',{status:'planned'})).code,200);
 assert.equal((await m.call('post',vote,{},'leo@exemplo.com')).code,409);
 const list=(await m.call('get',base+'/ideas',{},'leo@exemplo.com')).data.ideas;
 assert.equal(list[0].status,'planned');
 assert(!JSON.stringify(list).includes('voterIds'));
});

test('v170: moderador delegado pode gerir enquetes sem excluir o Fan Club',async()=>{
 const m=mock(),id=await create(m),base=`/api/fan-clubs/${id}`,userId='b'.repeat(24);
 await m.call('post',base+'/join',{},'leo@exemplo.com');
 assert.equal((await m.call('post',base+'/moderators',{userId,enabled:true},'leo@exemplo.com')).code,403);
 assert.equal((await m.call('post',base+'/moderators',{userId,enabled:true})).code,200);
 const detail=(await m.call('get',base,{},'leo@exemplo.com')).data.club;
 assert.equal(detail.canModerate,true);
 assert.equal(detail.canDelete,false);
 assert.equal((await m.call('post',base+'/polls',{question:'Qual horário é melhor?',options:['Sábado','Domingo']},'leo@exemplo.com')).code,201);
 assert.equal((await m.call('delete',base,{confirmation:'Fãs de Linkin Park'},'leo@exemplo.com')).code,403);
 assert.equal((await m.call('post',base+'/moderators',{userId:'c'.repeat(24),enabled:true},'leo@exemplo.com')).code,403);
 assert.equal((await m.call('post',base+'/moderators',{userId,enabled:false})).code,200);
 assert.equal((await m.call('get',base,{},'leo@exemplo.com')).data.club.canModerate,false);
});

test('v170: usuário pode silenciar notificações do clube sem sair da comunidade',async()=>{
 const m=mock(),id=await create(m),base=`/api/fan-clubs/${id}`;
 await m.call('post',base+'/join',{},'leo@exemplo.com');
 assert.equal((await m.call('post',base+'/notifications',{enabled:false},'leo@exemplo.com')).data.notificationsEnabled,false);
 assert.equal((await m.call('get',base,{},'leo@exemplo.com')).data.club.notificationsEnabled,false);
 assert.equal((await m.call('post',base+'/notifications',{enabled:true},'leo@exemplo.com')).data.notificationsEnabled,true);
 assert.equal((await m.call('get',base,{},'leo@exemplo.com')).data.club.notificationsEnabled,true);
});

test('v170: agendamento do Fan Club existe sem sala e RSVP respeita participação',async()=>{
 const m=mock(),id=await create(m),base=`/api/fan-clubs/${id}`;
 const startAt=Date.now()+3*86400000;
 assert.equal((await m.call('post',base+'/events',{title:'Encontro online',startAt},'leo@exemplo.com')).code,403);
 const result=await m.call('post',base+'/events',{title:'Encontro online',description:'Conhecer a comunidade',startAt,durationMinutes:60});
 assert.equal(result.code,201);
 const url=base+'/events/'+result.data.id+'/rsvp';
 assert.equal((await m.call('post',url,{going:true},'leo@exemplo.com')).code,403);
 await m.call('post',base+'/join',{},'leo@exemplo.com');
 assert.equal((await m.call('post',url,{going:true},'leo@exemplo.com')).data.attendees,1);
 assert.equal((await m.call('post',url,{going:true},'leo@exemplo.com')).data.attendees,1);
 assert.equal((await m.call('get',base+'/events',{},'leo@exemplo.com')).data.events[0].going,true);
 assert.equal((await m.call('get',base+'/insights',{},'leo@exemplo.com')).code,403);
 assert.equal((await m.call('get',base+'/insights')).data.members,2);
});

test('v170: fotos anexadas ficam privadas e são apagadas com o post',async()=>{
 const m=mock(),id=await create(m),base=`/api/fan-clubs/${id}`;
 const p=(await m.call('post',base+'/posts',{text:'Foto do encontro',topic:'evento'})).data.post;
 const url=base+'/posts/'+p.id+'/image';
 const webp=Buffer.alloc(40);webp.write('RIFF',0);webp.write('WEBP',8);
 assert.equal((await m.call('post',url,webp,'leo@exemplo.com')).code,403);
 assert.equal((await m.call('post',url,webp)).code,200);
 assert.equal((await m.call('get',url,{},'leo@exemplo.com')).code,403);
 assert.equal((await m.call('get',url)).binary.length,40);
 const post=(await m.call('get',base+'/posts')).data.posts.find(x=>x.id===p.id);
 assert.equal(post.hasImage,true);assert.equal(post.topic,'evento');
 assert.equal((await m.call('delete',base+'/posts/'+p.id)).code,200);
 assert.equal((await m.call('get',url)).code,404);
});

test('v170: mural oferece carregamento progressivo sem repetir mensagens',async()=>{
 const m=mock(),id=await create(m),base=`/api/fan-clubs/${id}`;
 for(let i=0;i<40;i++){
   const response=await m.call('post',base+'/posts',{text:'Post de teste número '+i});
   assert.equal(response.code,201);
 }
 const first=(await m.call('get',base+'/posts')).data;
 assert.equal(first.posts.length,35);assert.equal(first.hasMore,true);
 assert(first.nextBefore);
 const second=(await m.call('get',base+'/posts',undefined,'ana@exemplo.com',{before:String(first.nextBefore)})).data;
 assert(second.posts.length>0);assert.equal(second.hasMore,false);
 assert(second.posts.every(p=>!first.posts.some(x=>x.id===p.id)));
});

test('v180: somente criador e até dois coadministradores editam bio e regras',async()=>{
 const m=mock(),id=await create(m),base=`/api/fan-clubs/${id}`;
 const update=base+'/profile';
 await m.call('post',base+'/join',{},'leo@exemplo.com');
 await m.call('post',base+'/join',{},'bia@exemplo.com');
 await m.call('post',base+'/join',{},'caio@exemplo.com');
 const payload={description:'Bio nova do fã clube',rules:'Trate a comunidade com respeito'};
 assert.equal((await m.call('post',update,payload,'leo@exemplo.com')).code,403);
 assert.equal((await m.call('post',update,payload)).code,200);
 assert.equal((await m.call('get',base,{},'leo@exemplo.com')).data.club.description,payload.description);
 assert.equal((await m.call('get',base,{},'leo@exemplo.com')).data.club.rules,payload.rules);
 assert.equal((await m.call('post',base+'/moderators',{userId:'b'.repeat(24),enabled:true})).code,200);
 assert.equal((await m.call('post',base+'/moderators',{userId:'d'.repeat(24),enabled:true})).code,200);
 assert.equal((await m.call('post',base+'/moderators',{userId:'e'.repeat(24),enabled:true})).code,409);
 assert.equal((await m.call('post',update,{description:'Atualizado pelo coadmin',rules:'Novas regras'},'leo@exemplo.com')).code,200);
 assert.equal((await m.call('post',update,{description:'Inválido',rules:'Sem acesso'},'caio@exemplo.com')).code,403);
 assert.equal((await m.call('post',base+'/moderators',{userId:'b'.repeat(24),enabled:false})).code,200);
 assert.equal((await m.call('post',update,payload,'leo@exemplo.com')).code,403);
 assert.equal((await m.call('get',base,{},'leo@exemplo.com')).data.club.canEditProfile,false);
});

test('v180: todas as cinco categorias mantêm classificação e edição é exclusiva do autor',async()=>{
 const m=mock(),id=await create(m),base=`/api/fan-clubs/${id}`;
 await m.call('post',base+'/join',{},'leo@exemplo.com');
 for(const topic of ['duvida','evento','conversa','novidade','ideia']){
   const response=await m.call('post',base+'/posts',{text:'Uma publicação sobre '+topic,topic},'leo@exemplo.com');
   assert.equal(response.code,201);
 }
 const posts=(await m.call('get',base+'/posts',{},'leo@exemplo.com')).data.posts;
 assert.deepEqual(new Set(posts.map(p=>p.topic)),new Set(['duvida','evento','conversa','novidade','ideia']));
 const entry=posts.find(p=>p.topic==='novidade'),route=base+'/posts/'+entry.id+'/edit';
 assert.equal(entry.authorCanEdit,true);
 assert.equal((await m.call('post',route,{text:'Texto atualizado pelo criador do post'})).code,403);
 assert.equal((await m.call('post',route,{text:'Texto atualizado'},'leo@exemplo.com')).code,200);
 const updated=(await m.call('get',base+'/posts',{},'leo@exemplo.com')).data.posts.find(p=>p.id===entry.id);
 assert.equal(updated.text,'Texto atualizado');
 assert(updated.editedAt>0);
 assert.equal(updated.authorCanEdit,true);
});

test('v180: somente dúvida pode ser resolvida e resposta escolhida pertence à pergunta',async()=>{
 const m=mock(),id=await create(m),base=`/api/fan-clubs/${id}`;
 await m.call('post',base+'/join',{},'leo@exemplo.com');
 const question=(await m.call('post',base+'/posts',{topic:'duvida',text:'Como participar do próximo encontro?'},'leo@exemplo.com')).data.post;
 const normal=(await m.call('post',base+'/posts',{topic:'conversa',text:'Olá comunidade'})).data.post;
 const r1=(await m.call('post',base+'/posts/'+question.id+'/comments',{text:'Você pode confirmar a presença.'})).data.comment;
 const r2=(await m.call('post',base+'/posts/'+normal.id+'/comments',{text:'Resposta de outro tópico.'})).data.comment;
 const q=base+'/posts/'+question.id;
 assert.equal((await m.call('post',base+'/posts/'+normal.id+'/resolve',{resolved:true})).code,400);
 assert.equal((await m.call('post',q+'/resolve',{resolved:true})).code,200);
 assert.equal((await m.call('post',q+'/best-answer',{commentId:r2.id},'leo@exemplo.com')).code,404);
 assert.equal((await m.call('post',q+'/best-answer',{commentId:r1.id},'leo@exemplo.com')).code,200);
 let posts=(await m.call('get',base+'/posts',{},'leo@exemplo.com')).data.posts;
 assert.equal(posts.find(p=>p.id===question.id).resolved,true);
 const comments=(await m.call('get',q+'/comments',{},'leo@exemplo.com')).data.comments;
 assert.equal(comments.find(c=>c.id===r1.id).best,true);
 assert.equal((await m.call('post',q+'/resolve',{resolved:false},'leo@exemplo.com')).code,200);
 posts=(await m.call('get',base+'/posts',{},'leo@exemplo.com')).data.posts;
 assert.equal(posts.find(p=>p.id===question.id).bestCommentId,null);
});

test('v180: permissões de coadministrador não incluem exclusão e transferência de controle',async()=>{
 const m=mock(),id=await create(m),base=`/api/fan-clubs/${id}`;
 await m.call('post',base+'/join',{},'leo@exemplo.com');
 await m.call('post',base+'/moderators',{userId:'b'.repeat(24),enabled:true});
 const club=(await m.call('get',base,{},'leo@exemplo.com')).data.club;
 assert.equal(club.canModerate,true);
 assert.equal(club.canEditProfile,true);
 assert.equal(club.canDelete,false);
 assert.equal((await m.call('delete',base,{confirmation:'Fãs de Linkin Park'},'leo@exemplo.com')).code,403);
 assert.equal((await m.call('post',base+'/moderators',{userId:'d'.repeat(24),enabled:true},'leo@exemplo.com')).code,403);
});

test('v180: saída voluntária revoga coadministração e impede edição futura',async()=>{
 const m=mock(),id=await create(m),base=`/api/fan-clubs/${id}`;
 await m.call('post',base+'/join',{},'leo@exemplo.com');
 assert.equal((await m.call('post',base+'/moderators',{userId:'b'.repeat(24),enabled:true})).code,200);
 assert.equal((await m.call('get',base,{},'leo@exemplo.com')).data.club.canEditProfile,true);
 assert.equal((await m.call('delete',base+'/join',{},'leo@exemplo.com')).code,200);
 const detail=(await m.call('get',base,{},'leo@exemplo.com')).data.club;
 assert.equal(detail.canEditProfile,false);
 assert.equal(detail.canModerate,false);
 assert.equal((await m.call('post',base+'/profile',{description:'Não autorizado',rules:'Nada'},'leo@exemplo.com')).code,403);
 assert.equal((await m.call('get',base)).data.club.moderators.length,0);
});
test('v180: admin global não edita identidade do clube sem delegação do criador',async()=>{
 const m=mock(),id=await create(m),base=`/api/fan-clubs/${id}`;
 assert.equal((await m.call('get',base,{},'admin@sonora.com')).data.club.canEditProfile,false);
 assert.equal((await m.call('post',base+'/profile',{description:'Tentativa',rules:'Tentativa'},'admin@sonora.com')).code,403);
 assert.equal((await m.call('post',base+'/moderators',{userId:'b'.repeat(24),enabled:true},'admin@sonora.com')).code,403);
});

test('forum6: posts antigos mantêm ID, título derivado e permalink persistente',async()=>{
 const m=mock(),id=await create(m),base=`/api/fan-clubs/${id}`;
 const old=(await m.call('post',base+'/posts',{text:'Como conseguir ingressos para o show?'})).data.post;
 const key='sonorafanFanClubs71/'+id+'/posts/'+old.id;
 const stored=m.docs.get(key);delete stored.title;delete stored.tags;delete stored.replyCount;delete stored.lastActivityAt;
 m.docs.set(key,stored);
 const d=(await m.call('get',base+'/posts/'+old.id)).data;
 assert.equal(d.post.id,old.id);
 assert.equal(d.post.title,'Como conseguir ingressos para o show');
 assert.deepEqual(d.post.tags,[]);
 assert.equal(d.post.unread,false);
 assert.equal(d.permalink,'#fanclub/'+id+'/topic/'+old.id);
 assert.equal(m.docs.get(key).title,undefined,'migração em leitura não modifica posts antigos');
});
test('forum6: tags e títulos novos, edição e busca no histórico além da primeira página',async()=>{
 const m=mock(),id=await create(m),base=`/api/fan-clubs/${id}`;
 const old=(await m.call('post',base+'/posts',{text:'Dúvida exclusiva sobre um ingresso raro',topic:'duvida'})).data.post;
 for(let i=0;i<40;i++)await m.call('post',base+'/posts',{text:'Assunto secundário número '+i});
 const newer=(await m.call('post',base+'/posts',{text:'Vamos falar sobre esta turnê',title:'Turnê no Brasil',tags:['Ingressos','Shows','Ingressos'] })).data.post;
 let p=(await m.call('get',base+'/posts/'+newer.id)).data.post;
 assert.equal(p.title,'Turnê no Brasil');assert.deepEqual(p.tags,['ingressos','shows']);
 assert.equal((await m.call('post',base+'/posts/'+newer.id+'/edit',{text:'Texto editado',title:'Nova turnê',tags:['Shows']})).code,200);
 p=(await m.call('get',base+'/posts/'+newer.id)).data.post;assert.equal(p.title,'Nova turnê');
 const res=(await m.call('get',base+'/forum/search',{},'ana@exemplo.com',{q:'ingresso raro'})).data;
 assert(res.posts.some(x=>x.id===old.id));
 assert(res.scanned>35);
 const tag=(await m.call('get',base+'/forum/search',{},'ana@exemplo.com',{tag:'shows'})).data;
 assert(tag.posts.some(x=>x.id===newer.id));
 const forbidden=(await m.call('get',base+'/forum/search',{},'leo@exemplo.com',{q:'show'}));
 assert.equal(forbidden.code,403);
});
test('forum6: favoritos são privados, limitados ao clube e leitura detecta novas respostas',async()=>{
 const m=mock(),id=await create(m),base=`/api/fan-clubs/${id}`;
 await m.call('post',base+'/join',{},'leo@exemplo.com');
 const created=(await m.call('post',base+'/posts',{text:'Uma conversa muito interessante',title:'Qual o melhor show?' })).data.post;
 const link=base+'/posts/'+created.id;
 let feed=(await m.call('get',base+'/posts',{},'leo@exemplo.com')).data.posts[0];
 assert.equal(feed.unread,true);
 assert.equal(feed.favorite,false);
 assert.equal((await m.call('get',link,{},'leo@exemplo.com')).data.post.unread,false);
 assert.equal((await m.call('post',link+'/favorite',{favorite:true},'leo@exemplo.com')).data.favorite,true);
 assert.equal((await m.call('get',base+'/posts',{},'leo@exemplo.com')).data.posts[0].favorite,true);
 assert.equal((await m.call('get',base+'/posts',{},'ana@exemplo.com')).data.posts[0].favorite,false);
 assert.equal((await m.call('post',link+'/favorite',{favorite:false},'leo@exemplo.com')).data.favorite,false);
 assert.equal((await m.call('post',link+'/comments',{text:'Outra resposta ótima'})).code,201);
 const changed=(await m.call('get',base+'/posts',{},'leo@exemplo.com')).data.posts[0];
 assert.equal(changed.replyCount,1);
 assert.equal(changed.unread,true);
 assert.equal((await m.call('get',link,{},'leo@exemplo.com')).data.post.unread,false);
});
test('forum6: respostas encadeadas e citações não atravessam tópicos',async()=>{
 const m=mock(),id=await create(m),base=`/api/fan-clubs/${id}`;
 const a=(await m.call('post',base+'/posts',{text:'Um tópico para iniciar conversa'})).data.post;
 const b=(await m.call('post',base+'/posts',{text:'Outro tópico completamente diferente'})).data.post;
 const first=(await m.call('post',base+'/posts/'+a.id+'/comments',{text:'Primeira resposta'})).data.comment;
 const quoted=(await m.call('post',base+'/posts/'+a.id+'/comments',{text:'Segunda resposta',parentId:first.id,quoteId:first.id})).data.comment;
 assert.equal(quoted.parentId,first.id);assert.equal(quoted.depth,1);assert.equal(quoted.quoteText,'Primeira resposta');
 const third=(await m.call('post',base+'/posts/'+a.id+'/comments',{text:'Terceira resposta',parentId:quoted.id})).data.comment;
 assert.equal(third.depth,2);
 const comments=(await m.call('get',base+'/posts/'+a.id+'/comments')).data.comments;
 assert(comments.some(x=>x.id===third.id&&x.parentId===quoted.id));
 assert.equal((await m.call('post',base+'/posts/'+b.id+'/comments',{text:'Citação cruzada',parentId:first.id})).code,404);
 assert.equal((await m.call('post',base+'/posts/'+a.id+'/comments',{text:'Id inválido',quoteId:'invalid@id'})).code,400);
});
test('forum6: relacionados preservam privacidade e compartilham tags/categorias',async()=>{
 const m=mock(),id=await create(m),base=`/api/fan-clubs/${id}`;
 const x=(await m.call('post',base+'/posts',{text:'Falar sobre ingressos',title:'Ingressos de shows',tags:['ingressos'],topic:'duvida'})).data.post;
 const y=(await m.call('post',base+'/posts',{text:'Outra dúvida de bilhetes',title:'Venda de ingressos',tags:['ingressos'],topic:'duvida'})).data.post;
 const data=(await m.call('get',base+'/posts/'+x.id+'/related')).data;
 assert(data.related.some(p=>p.id===y.id));
 assert.equal((await m.call('get',base+'/posts/'+x.id+'/related',{},'leo@exemplo.com')).code,403);
});
