'use strict';
// SonoraFan 304 — máscara de palavras de baixo calão em português, inglês e espanhol.
const BASE_304=Object.freeze({
 pt:['merda','merdas','bosta','bostas','porra','porras','caralho','caralhos','carai','puta','puto','putas','putos','putaria','putinha','putinho','foda','foder','fode','fodeu','fodase','fodasse','fodido','fodida','fudido','fudida','buceta','boceta','piroca','cuzão','arrombado','arrombada','desgraçado','desgraçada','filhodaputa','vagabunda','vagabundo','fdp','pqp','vsf','tmnc','krl','crl'],
 en:['fuck','fucks','fucker','fuckers','fucking','fucked','motherfucker','motherfucking','shit','shits','shitty','bullshit','bitch','bitches','bastard','bastards','asshole','assholes','dick','dicks','cock','cocks','prick','pricks','pussy','cunt','cunts','slut','sluts','whore','whores','wtf','dammit','douchebag','jackass'],
 es:['mierda','mierdas','joder','jodete','jodido','jodida','puta','puto','putas','putos','coño','cojones','cabrón','cabrona','pendejo','pendeja','chingada','chingado','chingar','chinga','verga','vergas','culero','culera','culo','carajo','gilipollas','maricón','boludo','boluda','pelotudo','pelotuda','gonorrea','malparido','malparida','hijoputa','hijueputa','huevon','soplapollas']
});
const LEET_304={'@':'a','4':'a','0':'o','1':'i','!':'i','3':'e','$':'s','5':'s','7':'t','8':'b'};
const ALT_304={a:'[aáàâãä@4]',e:'[eéèêë3]',i:'[iíìîï1!]',o:'[oóòôõö0]',u:'[uúùûü]',c:'[cç]',n:'[nñ]',s:'[s$5]',t:'[t7]',b:'[b8]'};
const fold304=value=>String(value??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[@401!3$578]/g,c=>LEET_304[c]||c);
const baseMap304=new Map();
for(const [lang,terms] of Object.entries(BASE_304))for(const term of terms){const folded=fold304(term);if(!baseMap304.has(folded))baseMap304.set(folded,lang);}
let extra304=[],lookup304=new Map(baseMap304),separated304=[];
function rebuild304(){
 lookup304=new Map(baseMap304);
 for(const term of extra304)lookup304.set(fold304(term),'custom');
 separated304=[];
 for(const [term,lang] of lookup304){
  if(term.length<4||term.length>24||!/^[a-z]+$/.test(term))continue;
  const expression=Array.from(term,c=>ALT_304[c]||c).join('[\\s._\\-*·/]{1,4}');
  separated304.push({term,lang,regex:new RegExp('(?<![\\p{L}\\p{N}])'+expression+'(?![\\p{L}\\p{N}])','giu')});
 }
}
rebuild304();
function scanText304(value){
 const original=String(value??'');
 if(!original)return {text:original,matches:[]};
 const spans=[];
 // ! is only part of a token when used BETWEEN letters (not sentence punctuation).
 const tokens=/[\p{L}\p{N}@$]+(?:![\p{L}\p{N}@$]+)*/gu;
 for(const match of original.matchAll(tokens)){
  const word=fold304(match[0]);
  let lang=lookup304.get(word),term=word;
  if(!lang&&/(.)\1{2,}/u.test(word)){
   const compact=word.replace(/(.)\1+/gu,'$1');
   const found=[...lookup304].find(([key])=>key.replace(/(.)\1+/gu,'$1')===compact);
   if(found){term=found[0];lang=found[1];}
  }
  if(lang)spans.push({start:match.index,end:match.index+match[0].length,term,lang});
 }
 for(const item of separated304)for(const match of original.matchAll(item.regex)){
  spans.push({start:match.index,end:match.index+match[0].length,term:item.term,lang:item.lang});
 }
 spans.sort((a,b)=>a.start-b.start||b.end-a.end);
 const unique=[];
 for(const hit of spans){if(unique.length&&hit.start<unique[unique.length-1].end)continue;unique.push(hit);}
 let masked=original;
 for(let i=unique.length-1;i>=0;i--)masked=masked.slice(0,unique[i].start)+'***'+masked.slice(unique[i].end);
 return {text:masked,matches:unique.map(({term,lang})=>({term,lang}))};
}
const maskText304=value=>scanText304(value).text;
const dictionary304=()=>({pt:[...BASE_304.pt],en:[...BASE_304.en],es:[...BASE_304.es],custom:[...extra304]});
const validCustom304=value=>typeof value==='string'&&value.trim().length>=3&&value.trim().length<=32&&/^[\p{L}]+$/u.test(value.trim());
function createLanguageModeration304({app,db,rateLimit,audit}){
 const config=db.collection('sonorafanLanguage304').doc('dictionary'),events=db.collection('sonorafanLanguageEvents304');
 async function refresh(){try{
  const snap=await config.get();
  extra304=Array.isArray(snap.data()?.terms)?snap.data().terms.filter(validCustom304).slice(0,300):[];
  rebuild304();
 }catch(e){console.error('Language304: dictionary unavailable',e.message);}}
 refresh().catch(()=>{});
 const timer=setInterval(()=>refresh().catch(()=>{}),60000);timer.unref?.();
 function mask(value,surface){
  const result=scanText304(value);
  if(result.matches.length&&surface){
   const event={at:Date.now(),surface:String(surface).slice(0,24),
    terms:[...new Set(result.matches.map(m=>m.term))].slice(0,15),
    languages:[...new Set(result.matches.map(m=>m.lang))],count:result.matches.length};
   events.add(event).catch(e=>console.error('Language304: incident not saved',e.message));
  }
  return result.text;
 }
 app.get('/api/admin/language',rateLimit(40,60000),async(req,res)=>{
  try{
   const snap=await events.orderBy('at','desc').limit(100).get();
   res.set('Cache-Control','no-store').json({dictionary:dictionary304(),
    recent:snap.docs.map(d=>({id:d.id,...d.data()})),
    note:'Últimas 100 ocorrências. O texto original não é guardado neste histórico.'});
  }catch(e){res.status(503).json({error:'Histórico de linguagem indisponível.'});}
 });
 app.post('/api/admin/language/terms',rateLimit(20,60000),async(req,res)=>{
  const action=req.body?.action,raw=req.body?.term;
  if(!['add','remove'].includes(action)||!validCustom304(raw))return res.status(400).json({error:'Informe um termo de 3 a 32 letras e uma ação válida.'});
  const term=fold304(raw.trim());
  if(baseMap304.has(term))return res.status(400).json({error:'Este termo já pertence ao dicionário padrão.'});
  try{
   const terms=await db.runTransaction(async tx=>{
    const snap=await tx.get(config),old=Array.isArray(snap.data()?.terms)?snap.data().terms.filter(validCustom304):[];
    const next=action==='add'?[...new Set([...old,term])]:old.filter(x=>fold304(x)!==term);
    if(next.length>300)throw Object.assign(new Error('Limite de 300 termos personalizados.'),{status:400});
    tx.set(config,{terms:next,updatedAt:Date.now()},{merge:true});return next;
   });
   extra304=terms;rebuild304();audit(req.adminEmail,'language-dictionary',action+' '+term);
   res.set('Cache-Control','no-store').json({success:true,dictionary:dictionary304()});
  }catch(e){res.status(e.status||503).json({error:e.status?e.message:'Não foi possível atualizar o dicionário.'});}
 });
 return {mask,display:maskText304,refresh};
}
module.exports={BASE_304,scanText304,maskText304,dictionary304,createLanguageModeration304};
