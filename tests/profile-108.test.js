'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {installProfile108,jpegSize,AVATARS}=require('../sonorafan-profile-108');
const identity='0123456789abcdef01234567';
function makeEnv(){
 const docs=new Map(),users=new Map([['user@example.test',{nome:'Ouvinte',avatar:'🎸'}]]),routes=new Map();
 const ref=(name,id)=>({
   async get(){const key=name+'/'+id;return {exists:docs.has(key),data:()=>docs.get(key)};},
   async set(data,options){
     const key=name+'/'+id;
     docs.set(key,options?.merge?{...(docs.get(key)||{}),...data}:data);
   },
   async delete(){docs.delete(name+'/'+id);}
 });
 const app={get:(p,...f)=>routes.set('GET '+p,f.at(-1)),
   post:(p,...f)=>routes.set('POST '+p,f.at(-1))};
 const db={collection:name=>({doc:id=>ref(name,id)})};
 const ctl=installProfile108({app,db,users,sessionEmail:req=>req.loggedIn===false?null:'user@example.test',
   publicUserId:()=>identity,rateLimit:()=>()=>{},getUserFromFirestore:async()=>users.get('user@example.test')});
 function response(){
   return {code:200,payload:null,headers:{},status(n){this.code=n;return this;},
     json(data){this.payload=data;return this;},set(headers){Object.assign(this.headers,headers);return this;},
     end(){return this;},send(data){this.payload=data;return this;}};
 }
 const call=async(method,path,body,params,loggedIn=true)=>{
   const handler=routes.get(method+' '+path),res=response();assert.ok(handler,path);
   await handler({body:body||{},params:params||{},loggedIn},res);
   return res;
 };
 return {ctl,docs,users,call};
}
function encodedJpeg(){
 const b=Buffer.alloc(256,0);
 b[0]=255;b[1]=216;b[2]=255;b[3]=224;b.writeUInt16BE(16,4);
 b[20]=255;b[21]=192;b.writeUInt16BE(17,22);
 b[24]=8;b.writeUInt16BE(96,25);b.writeUInt16BE(96,27);
 b[254]=255;b[255]=217;
 return b.toString('base64');
}
test('accepts only original character IDs',async()=>{
 const h=makeEnv();
 let r=await h.call('POST','/api/profile108/avatar',{kind:'character',id:'rock'});
 assert.equal(r.code,200);
 assert.deepEqual(r.payload.avatar,{kind:'character',id:'rock',url:'/avatars-108/rock.svg'});
 assert.equal(h.users.get('user@example.test').avatar108.id,'rock');
 r=await h.call('POST','/api/profile108/avatar',{kind:'character',id:'../../evil'});
 assert.equal(r.code,400);
 assert.ok(AVATARS.includes('festival'));
});
test('requires session to select an avatar or upload photo',async()=>{
 const h=makeEnv();
 const r=await h.call('POST','/api/profile108/avatar',{kind:'character',id:'indie'},null,false);
 assert.equal(r.code,401);
});
test('checks JPEG size, pixel dimensions and payload type before persistence',async()=>{
 const h=makeEnv();
 const jpg=Buffer.from(encodedJpeg(),'base64');
 assert.deepEqual(jpegSize(jpg),{width:96,height:96});
 let r=await h.call('POST','/api/profile108/avatar',{kind:'photo',data:encodedJpeg()});
 assert.equal(r.code,200);
 assert.ok(r.payload.avatar.url.includes(identity));
 const stored=h.docs.get('sf108AvatarPhotos/'+identity);
 assert.equal(stored.mime,'image/jpeg');
 assert.equal(h.users.get('user@example.test').avatar108.kind,'photo');
 r=await h.call('POST','/api/profile108/avatar',{kind:'photo',data:Buffer.from('<svg><script>x</script></svg>').toString('base64')});
 assert.equal(r.code,400);
});
test('switching to a character and account deletion clear photo data',async()=>{
 const h=makeEnv();
 await h.call('POST','/api/profile108/avatar',{kind:'photo',data:encodedJpeg()});
 assert.ok(h.docs.has('sf108AvatarPhotos/'+identity));
 await h.call('POST','/api/profile108/avatar',{kind:'character',id:'pop'});
 assert.equal(h.docs.has('sf108AvatarPhotos/'+identity),false);
 await h.call('POST','/api/profile108/avatar',{kind:'photo',data:encodedJpeg()});
 await h.ctl.deleteUserData('user@example.test');
 assert.equal(h.docs.has('sf108AvatarPhotos/'+identity),false);
});
