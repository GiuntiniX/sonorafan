'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {maskText304,scanText304,createLanguageModeration304}=require('../chat-language-304');

test('portuguese, english and spanish swear words become exactly three stars',()=>{
 assert.equal(maskText304('Que porra!'), 'Que ***!');
 assert.equal(maskText304('Fucking shit!'), '*** ***!');
 assert.equal(maskText304('¡Cabrón, vete a la mierda!'), '¡***, vete a la ***!');
 assert.equal(maskText304('PQP e fdp'), '*** e ***');
});

test('case, accents, leetspeak and separated letters are normalized',()=>{
 assert.equal(maskText304('P0RR@, f.u.c.k, SH!T!'), '***, ***, ***!');
 assert.equal(maskText304('p u t a / C A R A L H O'), '*** / ***');
 assert.equal(maskText304('fuuuck!'), '***!');
});

test('does not redact innocent words containing shorter letter sequences',()=>{
 assert.equal(maskText304('computador, classificado, passar, segurança e chocolate'),
  'computador, classificado, passar, segurança e chocolate');
 assert.equal(maskText304('Pop, rock, indie e festival 🎸'), 'Pop, rock, indie e festival 🎸');
});

test('only exact matched spans are redacted',()=>{
 const result=scanText304('Rock e merda, depois shit.');
 assert.equal(result.text,'Rock e ***, depois ***.');
 assert.equal(result.matches.length,2);
 assert.equal(result.matches[0].lang,'pt');
 assert.equal(result.matches[1].lang,'en');
});

test('moderation incident only stores recognized terms, not raw messages or user identifiers',async()=>{
 const events=[];
 const routes=[];
 const mockDb={
  collection(name){
   if(name==='sonorafanLanguage304')return {doc:()=>({get:async()=>({exists:false,data:()=>({})})})};
   if(name==='sonorafanLanguageEvents304')return {add:async obj=>{events.push(obj);return {};}};
   throw Error('Unknown collection '+name);
  }
 };
 const mockApp={get:(url,fn)=>routes.push(url),post:(url,fn)=>routes.push(url)};
 const service=createLanguageModeration304({app:mockApp,db:mockDb,rateLimit:()=>()=>{},audit:()=>{}});
 assert.equal(service.mask('porra, minha senha é segredo','dm'),'***, minha senha é segredo');
 await Promise.resolve();
 assert.equal(events.length,1);
 assert.deepEqual(events[0].terms,['porra']);
 assert.equal(events[0].surface,'dm');
 assert.equal(JSON.stringify(events).includes('segredo'),false);
 assert.ok(routes.includes('/api/admin/language'));
 assert.ok(routes.includes('/api/admin/language/terms'));
});
