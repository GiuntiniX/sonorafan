'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {installFavoriteGenres67, normalizeGenres, cleanName, countByGenre}=require('../favorite-genres-67');

function fake(){
  const docs=new Map(); const routes=new Map();
  const db={
    collection(name){
      return { doc(id){
        return {
          key:`${name}/${id}`,
          async get(){const d=docs.get(this.key);return {exists:!!d,data:()=>d?structuredClone(d):undefined};}
        };
      }};
    },
    async runTransaction(callback){
      const changes=[];
      const tx={get:ref=>ref.get(),set(ref,data,opts){changes.push({ref,data,opts})}};
      const value=await callback(tx);
      changes.forEach(({ref,data,opts})=>{
        const before=docs.get(ref.key)||{};
        docs.set(ref.key,structuredClone(opts?.merge?{...before,...data}:data));
      });
      return value;
    }
  };
  const app={get(path,fn){routes.set('GET '+path,fn)},post(path,fn){routes.set('POST '+path,fn)},patch(path,fn){routes.set('PATCH '+path,fn)},delete(path,fn){routes.set('DELETE '+path,fn)}};
  installFavoriteGenres67({app,db,sessionEmail:req=>req.email||null});
  const call=async(method,path,body={},email='person@exemplo.com')=>{
    // Direct route match (the fake server registers param placeholders).
    let route=routes.get(method+' '+path),params={};
    if(!route){for(const [pattern,fn] of routes){const [verb,template]=pattern.split(' ');if(verb!==method)continue;const parts=template.split('/'),actual=path.split('/');if(parts.length!==actual.length)continue;
      const p={};const matches=parts.every((v,i)=>{if(v.startsWith(':')){p[v.slice(1)]=decodeURIComponent(actual[i]);return true;}return v===actual[i];});if(matches){route=fn;params=p;break;}}
    }
    assert.ok(route,method+' '+path);
    const response={statusCode:200,status(code){this.statusCode=code;return this;},json(data){this.data=data;return this;}};
    await route({email,params,body},response);return response;
  };
  return {db,docs,call};
}

test('cleanName and counts preserve ungrouped favorites',()=>{
  assert.equal(cleanName('  Rock  Clássico '),'Rock Clássico');
  assert.equal(cleanName('x'.repeat(30)),'');
  assert.deepEqual(normalizeGenres(null),[]);
  assert.deepEqual(countByGenre([{id:'a'},{id:'b',genreId:'g1'}],[{id:'g1',name:'Rock'}]),{g1:1,none:1});
});

test('create, rename, assign, delete; existing music not deleted',async()=>{
  const {docs,call}=fake(); const key='favorites/person@exemplo.com';
  docs.set(key,{items:[{id:'V1a2b3c4D5E',title:'Faixa antiga',artist:'Artista'}],note:'keep',genres:[]});
  const created=await call('POST','/api/favorite-genres',{name:'Indie'});
  assert.equal(created.statusCode,201);const id=created.data.genre.id;
  const moved=await call('PATCH','/api/favorites/V1a2b3c4D5E/genre',{genreId:id});
  assert.equal(moved.statusCode,200);assert.equal(docs.get(key).items[0].genreId,id);
  const duplicate=await call('POST','/api/favorite-genres',{name:'INDIE'});assert.equal(duplicate.statusCode,409);
  const renamed=await call('PATCH',`/api/favorite-genres/${id}`,{name:'Indie / Alternativo'});assert.equal(renamed.statusCode,200);
  const removed=await call('DELETE',`/api/favorite-genres/${id}`);assert.equal(removed.statusCode,200);
  assert.equal(docs.get(key).items[0].title,'Faixa antiga');
  assert.equal(docs.get(key).items[0].genreId,'');
  assert.equal(docs.get(key).note,'keep');
  assert.deepEqual(docs.get(key).genres,[]);
});

test('reject unauthenticated, category missing and invalid moves',async()=>{
  const {docs,call}=fake(); docs.set('favorites/person@exemplo.com',{items:[]});
  assert.equal((await call('POST','/api/favorite-genres',{name:'Rock'},null)).statusCode,401);
  assert.equal((await call('POST','/api/favorite-genres',{name:''})).statusCode,400);
  assert.equal((await call('PATCH','/api/favorites/Y1234567890/genre',{genreId:'missing'})).statusCode,404);
});
