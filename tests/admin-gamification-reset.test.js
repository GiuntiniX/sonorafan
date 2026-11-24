'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createGamification45,localPeriod,ranking60Month}=require('../gamification-45');

function firestoreForReset(){
 const records=new Map();
 const makeRef=path=>({
   path,
   collection:name=>collection(path+'/'+name),
   async get(){return {exists:records.has(path),data:()=>records.get(path)}}
 });
 const collection=path=>({
   doc:id=>makeRef(path+'/'+id),
   orderBy:()=>({
     limit:size=>{
       const query=after=>({
         startAfter:snapshot=>query(snapshot.ref.path),
         async get(){
           const prefix=path+'/';
           const docs=[...records.keys()].filter(key=>key.startsWith(prefix)&&!key.slice(prefix.length).includes('/'))
             .sort().filter(key=>!after||key>after).slice(0,size)
             .map(key=>({id:key.slice(prefix.length),ref:makeRef(key),exists:true,data:()=>records.get(key)}));
           return {docs,size:docs.length,empty:docs.length===0};
         }
       });
       return query(null);
     }
   })
 });
 const db={
   collection,
   batch(){
     const changes=[];
     return {
       set(ref,data,opt){changes.push({ref,data,opt})},
       async commit(){for(const change of changes){
         const previous=records.get(change.ref.path)||{};
         records.set(change.ref.path,change.opt?.merge?{...previous,...change.data}:change.data);
       }}
     };
   }
 };
 return {db,records};
}

test('reset administrativo zera XP, conquistas e rankings por páginas sem apagar perfis',async()=>{
 const {db,records}=firestoreForReset();
 const period=localPeriod(new Date());
 const week='ranking60Weeks/'+period.week+'/players/';
 const month='ranking60Months/'+ranking60Month(new Date())+'/players/';
 for(let i=0;i<205;i++){
   const email='user'+String(i).padStart(3,'0')+'@example.com';
   records.set('points/'+email,{points:150,badges:['DJ Expert'],gamification:{lifetime:{songs:40}},otherField:'preserve',ranking60:{djXP:120}});
 }
 records.set(week+'player01',{score:150,djXP:80,events:7,actionCounts:{song:7}});
 records.set(month+'player01',{score:150,djXP:80,events:7,actionCounts:{song:7}});
 records.set('users/user000@example.com',{nome:'Pessoa de teste'});
 const events=[];
 const io={sockets:{sockets:new Map([['socket1',{userEmail:'user000@example.com',emit:(name,data)=>events.push({name,data})}]])}};
 const userPoints=new Map([['user000@example.com',{points:150,badges:['DJ Expert']}]]);
 const service=createGamification45({db,app:{get(){}},sessionEmail:()=>null,users:new Map(),userPoints,io});
 const result=await service.resetAllProgress();
 assert.equal(result.players,205);
 assert.equal(result.rankingRecords,2);
 assert.equal(userPoints.size,0);
 assert.equal(records.get('points/user000@example.com').points,0);
 assert.deepEqual(records.get('points/user000@example.com').badges,[]);
 assert.equal(records.get('points/user000@example.com').otherField,'preserve');
 assert.equal(records.get('points/user000@example.com').ranking60.djXP,0);
 assert.equal(records.get(week+'player01').score,0);
 assert.equal(records.get(month+'player01').djXP,0);
 assert.deepEqual(records.get('users/user000@example.com'),{nome:'Pessoa de teste'});
 assert(events.some(event=>event.name==='gamificationUpdate'&&event.data.points===0));
});
