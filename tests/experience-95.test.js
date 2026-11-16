(function SonoraFan95Tests() {
  'use strict';
  const test=require('node:test');
  const assert=require('node:assert/strict');
  const install=require('../sonorafan-experience-95');
  function setup() {
    const routes=new Map(),docs=new Map(),rooms=new Map(),users=new Map();
    const app={
      get:(name,...handlers)=>routes.set('GET '+name,handlers.at(-1)),
      post:(name,...handlers)=>routes.set('POST '+name,handlers.at(-1))
    };
    const db={
      collection(name){
        return {
          doc(id){
            const key=name+'/'+id;
            const ref={
              key,
              async get(){return {exists:docs.has(key),data:()=>docs.get(key)};},
              async set(data,{merge}={}){
                const existing=merge?(docs.get(key)||{}):{};
                docs.set(key,{...existing,...data});
              },
              async delete(){docs.delete(key);},
              collection(child){
                return {
                  doc(slug){
                    return {async set(data){docs.set(key+'/'+child+'/'+slug,data)}};
                  },
                  orderBy(){
                    return {limit(n){return {async get(){
                      return {docs:[...docs.entries()].filter(([k])=>k.startsWith(key+'/'+child+'/'))
                        .map(([,data])=>({data:()=>data})).sort((a,b)=>b.data().at-a.data().at).slice(0,n)};
                    }}}};
                  }
                };
              }
            };
            return ref;
          }
        };
      },
      async runTransaction(fn){
        const tx={get:ref=>ref.get(),set:(ref,data,options)=>ref.set(data,options)};
        return fn(tx);
      },
      async recursiveDelete(ref){for(const k of [...docs.keys()])if(k===ref.key||k.startsWith(ref.key+'/'))docs.delete(k);}
    };
    const experience=install({app,db,rooms,users,sessionEmail:()=> 'person@example.test',
      publicUserId:email=>email==='person@example.test'?'uid-own':'uid-other',rateLimit:()=>()=>{}});
    const socketEvents=new Map(),events=[];
    const socket={
      userEmail:'person@example.test',userName:'Pessoa',isAdmin:false,
      rooms:new Set(['lounge']),on:(name,fn)=>socketEvents.set(name,fn),
      nsp:{to:()=>({emit:(...args)=>events.push(args)})}
    };
    const votes={};let broadcasts=0,persists=0;
    experience.registerSocket(socket,()=> 'lounge',()=>votes,()=>{broadcasts++},()=>{persists++});
    const call=(name,payload)=>new Promise(resolve=>socketEvents.get(name)(payload,resolve));
    return {routes,docs,db,rooms,users,experience,socket,events,votes,call,
      get broadcasts(){return broadcasts;},get persists(){return persists;}};
  }
  function song(id,owner,title){return {id,title,artist:'Banda',dj:owner==='uid-own'?'Pessoa':'Outra',addedByUserId:owner};}
  test('removal is limited to own future tracks and does not affect playback',async()=>{
    const x=setup();
    const now=song('AAAAAAAAAAA','uid-own','tocando');
    const other=song('BBBBBBBBBBB','uid-other','outra');
    const mine=song('CCCCCCCCCCC','uid-own','minha');
    x.rooms.set('lounge',{slug:'lounge',queue:[now,other,mine],waitingQueue:[],currentIndex:0});
    assert.equal((await x.call('sf95:removeOwnSong',{id:other.id})).ok,false);
    assert.equal((await x.call('sf95:removeOwnSong',{id:now.id})).ok,false);
    assert.equal((await x.call('sf95:removeOwnSong',{id:mine.id})).ok,true);
    assert.deepEqual(x.rooms.get('lounge').queue.map(t=>t.id),[now.id,other.id]);
    assert.equal(x.broadcasts,1);
  });
  test('priority requires owner and does not conflict with fair mode',async()=>{
    const x=setup();
    const room={slug:'lounge',queue:[song('AAAAAAAAAAA','uid-own','current'),
      song('BBBBBBBBBBB','uid-own','first'),song('CCCCCCCCCCC','uid-own','more votes')],
      waitingQueue:[],currentIndex:0,musicMode:'all',votePriority:false};
    x.rooms.set('lounge',room);
    assert.equal((await x.call('sf95:setVotePriority',{enabled:true})).ok,false);
    x.socket.isAdmin=true;
    assert.equal((await x.call('sf95:setVotePriority',{enabled:true})).ok,true);
    x.votes['BBBBBBBBBBB']={up:['a']};x.votes['CCCCCCCCCCC']={up:['a','b']};
    assert.equal(x.experience.applyPriority(room,x.votes),true);
    assert.deepEqual(room.queue.map(s=>s.id),['AAAAAAAAAAA','CCCCCCCCCCC','BBBBBBBBBBB']);
    assert.equal(x.experience.applyPriority(room,x.votes),false);
    room.musicMode='fair';
    assert.equal((await x.call('sf95:setVotePriority',{enabled:true})).ok,false);
  });
  test('saved rooms are account-scoped and inaccessible private rooms cannot be pinned',async()=>{
    const x=setup();
    x.rooms.set('lounge',{slug:'lounge',name:'Lounge',listenerCount:3,isPlaying:true,isPrivate:false});
    x.rooms.set('private',{slug:'private',name:'Restrita',listenerCount:1,isPrivate:true,ownerEmail:'someone-else',allowed:new Set()});
    const post=x.routes.get('POST /api/experience95/pin');
    const respond=async body=>{
      const res={statusCode:200,body:null,status(n){this.statusCode=n;return this;},
        json(data){this.body=data;return this;}};
      await post({body},res);return res;
    };
    assert.equal((await respond({slug:'private',pinned:true})).statusCode,404);
    assert.equal((await respond({slug:'lounge',pinned:true})).body.pinned,true);
    const get=x.routes.get('GET /api/experience95/profile');
    const res={statusCode:200,body:null,status(n){this.statusCode=n;return this;},
      json(data){this.body=data;return this;}};
    await get({},res);
    assert.equal(res.statusCode,200);
    assert.equal(res.body.pinnedRooms.length,1);
    assert.equal(res.body.pinnedRooms[0].slug,'lounge');
    assert.equal(res.body.userId,'uid-own');
  });
  test('personal profile can be removed recursively on account deletion',async()=>{
    const x=setup();
    const doc=x.db.collection('sf95_music_profiles').doc('uid-own');
    await doc.set({totalAdded:2});
    await doc.collection('adds').doc('song').set({title:'Teste',artist:'Artista',at:1});
    assert.equal(x.docs.size,2);
    await x.experience.deleteUserData('person@example.test');
    assert.equal(x.docs.size,0);
  });
})();