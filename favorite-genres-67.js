'use strict';
// SonoraFan 67 — coleções por gênero. A coleção Firestore `favorites` e os
// favoritos anteriores permanecem intactos: apenas campos novos são adicionados.
const crypto = require('crypto');

function normalizeGenres(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter(x => x && typeof x.id === 'string' && typeof x.name === 'string')
    .map(x => ({ id: x.id, name: x.name }))
    .slice(0, 24);
}
function cleanName(value) {
  if (typeof value !== 'string') return '';
  const s = value.normalize('NFC').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().replace(/\s+/g, ' ');
  return s.length <= 28 ? s : '';
}
function sameName(a,b) { return String(a).toLocaleLowerCase('pt-BR') === String(b).toLocaleLowerCase('pt-BR'); }
function countByGenre(items, genres) {
  const valid = new Set(genres.map(x=>x.id)); const counts = Object.fromEntries(genres.map(x=>[x.id,0])); counts.none=0;
  (Array.isArray(items)?items:[]).forEach(item=>{const key=valid.has(item?.genreId)?item.genreId:'none';counts[key]++;});
  return counts;
}
function installFavoriteGenres67({ app, db, sessionEmail }) {
  const authorized = (req,res) => {
    const email = sessionEmail(req);
    if (!email) { res.status(401).json({ error: 'Entre na sua conta para organizar favoritos.' }); return null; }
    return db.collection('favorites').doc(email);
  };
  const fail = (res, e) => { console.error('Favoritos 67:',e?.message||e);res.status(500).json({error:'Não foi possível salvar os gêneros. Tente novamente.'}); };

  app.get('/api/favorite-genres', async (req,res)=>{
    const ref=authorized(req,res);if(!ref)return;
    try { const doc=await ref.get();const data=doc.exists?doc.data():{};const genres=normalizeGenres(data.genres);res.json({genres,counts:countByGenre(data.items,genres)}); }
    catch(e){fail(res,e);}
  });
  app.post('/api/favorite-genres', async (req,res)=>{
    const ref=authorized(req,res);if(!ref)return;
    const name=cleanName(req.body?.name);
    if(!name)return res.status(400).json({error:'Digite um nome com até 28 caracteres.'});
    try {
      const created=await db.runTransaction(async tx=>{
        const doc=await tx.get(ref),genres=normalizeGenres(doc.data()?.genres);
        if(genres.length>=24)throw Object.assign(new Error('Limite de 24 gêneros atingido.'),{status:409});
        if(genres.some(g=>sameName(g.name,name)))throw Object.assign(new Error('Esse gênero já existe.'),{status:409});
        const genre={id:'g_'+crypto.randomBytes(8).toString('hex'),name};
        tx.set(ref,{genres:[...genres,genre]},{merge:true});return genre;
      });
      res.status(201).json({genre:created});
    } catch(e){if(e.status)res.status(e.status).json({error:e.message});else fail(res,e);}
  });
  app.patch('/api/favorite-genres/:id',async (req,res)=>{
    const ref=authorized(req,res);if(!ref)return;
    const name=cleanName(req.body?.name),id=req.params.id;
    if(!name)return res.status(400).json({error:'Digite um nome com até 28 caracteres.'});
    try {
      const renamed=await db.runTransaction(async tx=>{
        const doc=await tx.get(ref),genres=normalizeGenres(doc.data()?.genres),genre=genres.find(g=>g.id===id);
        if(!genre)throw Object.assign(new Error('Gênero não encontrado.'),{status:404});
        if(genres.some(g=>g.id!==id&&sameName(g.name,name)))throw Object.assign(new Error('Esse gênero já existe.'),{status:409});
        const next=genres.map(g=>g.id===id?{...g,name}:g);
        tx.set(ref,{genres:next},{merge:true});return next.find(g=>g.id===id);
      });res.json({genre:renamed});
    }catch(e){if(e.status)res.status(e.status).json({error:e.message});else fail(res,e);}
  });
  app.delete('/api/favorite-genres/:id',async (req,res)=>{
    const ref=authorized(req,res);if(!ref)return;
    try {
      await db.runTransaction(async tx=>{
        const doc=await tx.get(ref),data=doc.data()||{},genres=normalizeGenres(data.genres),id=req.params.id;
        if(!genres.some(g=>g.id===id))throw Object.assign(new Error('Gênero não encontrado.'),{status:404});
        const items=(Array.isArray(data.items)?data.items:[]).map(i=>i.genreId===id?{...i,genreId:''}:i);
        tx.set(ref,{genres:genres.filter(g=>g.id!==id),items},{merge:true});
      });res.json({success:true});
    }catch(e){if(e.status)res.status(e.status).json({error:e.message});else fail(res,e);}
  });
  // Estilos musicais independentes das coleções pessoais (legado genreId).
  app.patch('/api/favorites/:id/styles', async (req,res)=>{
    const ref=authorized(req,res);if(!ref)return;
    const raw=req.body?.styles;
    if(!Array.isArray(raw)||raw.length>6)return res.status(400).json({error:'Selecione até seis estilos.'});
    const styles=[...new Set(raw.map(cleanName))].filter(Boolean);
    if(styles.length!==raw.length && raw.length>0 && styles.length===0)return res.status(400).json({error:'Estilos inválidos.'});
    try {
      const item=await db.runTransaction(async tx=>{
        const doc=await tx.get(ref),data=doc.data()||{},items=Array.isArray(data.items)?data.items:[],id=req.params.id;
        const index=items.findIndex(x=>x.id===id);
        if(index<0)throw Object.assign(new Error('Favorita não encontrada.'),{status:404});
        const updated=items.map((track,i)=>i===index?{...track,styles}:track);
        tx.set(ref,{items:updated},{merge:true});return updated[index];
      });
      res.json({success:true,item});
    }catch(e){if(e.status)res.status(e.status).json({error:e.message});else fail(res,e);}
  });

  app.patch('/api/favorites/:id/genre',async (req,res)=>{
    const ref=authorized(req,res);if(!ref)return;
    const id=req.params.id, genreId=req.body?.genreId;
    if(typeof genreId!=='string'||genreId.length>64)return res.status(400).json({error:'Gênero inválido.'});
    try {
      const item=await db.runTransaction(async tx=>{
        const doc=await tx.get(ref),data=doc.data()||{},genres=normalizeGenres(data.genres);
        if(genreId&&!genres.some(g=>g.id===genreId))throw Object.assign(new Error('Gênero não encontrado.'),{status:404});
        const items=Array.isArray(data.items)?data.items:[],idx=items.findIndex(i=>i.id===id);
        if(idx<0)throw Object.assign(new Error('Música não encontrada em seus favoritos.'),{status:404});
        const updated=items.map((item,i)=>i===idx?{...item,genreId}:item);
        tx.set(ref,{items:updated},{merge:true});return updated[idx];
      });res.json({success:true,item});
    }catch(e){if(e.status)res.status(e.status).json({error:e.message});else fail(res,e);}
  });
}
module.exports = { installFavoriteGenres67,normalizeGenres,cleanName,countByGenre };
