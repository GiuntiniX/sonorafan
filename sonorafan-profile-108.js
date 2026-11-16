'use strict';
/* SonoraFan 108 — persistent, consent-based avatar studio.
 * Portraits are either project-owned SVG characters or user-supplied,
 * client-resized JPEG photos; no third-party image hosts or arbitrary URLs.
 */
const AVATARS=Object.freeze(['indie','pop','eletronico','rock','festival','rapper','jazz','mpb']);
const jpegSize=buf=>{
 if(buf.length<160||buf[0]!==0xff||buf[1]!==0xd8||buf[buf.length-2]!==0xff||buf[buf.length-1]!==0xd9)return null;
 let p=2;
 while(p+9<buf.length){
   if(buf[p]!==0xff)return null;
   while(buf[p]===0xff)p++;
   const mark=buf[p++];if(mark===0xda)break;
   if(mark===0x01||(mark>=0xd0&&mark<=0xd9))continue;
   if(p+2>buf.length)return null;
   const len=buf.readUInt16BE(p);if(len<2||p+len>buf.length)return null;
   if([0xc0,0xc1,0xc2].includes(mark)){
     if(len<7)return null;
     return {height:buf.readUInt16BE(p+3),width:buf.readUInt16BE(p+5)};
   }
   p+=len;
 }
 return null;
};
function installProfile108({app,db,users,sessionEmail,publicUserId,rateLimit,getUserFromFirestore}){
 const mine=email=>db.collection('sf108AvatarPhotos').doc(publicUserId(email));
 const userRef=email=>db.collection('users').doc(email);
 const requireMe=(req,res)=>{const email=sessionEmail(req);if(!email)res.status(401).json({error:'Entre na sua conta.'});return email;};
 const publicAvatar=(data={},email)=>({
   kind:AVATARS.includes(data?.id)&&data.kind==='character'?'character':
      data?.kind==='photo'?'photo':'default',
   id:data?.kind==='character'&&AVATARS.includes(data?.id)?data.id:null,
   url:data?.kind==='photo'?'/api/profile108/photo/'+publicUserId(email)+'?v='+Number(data.updatedAt||0):
       data?.kind==='character'&&AVATARS.includes(data?.id)?'/avatars-108/'+data.id+'.svg':null
 });
 app.get('/api/profile108/avatar',rateLimit(35,60000),async(req,res)=>{
   const email=requireMe(req,res);if(!email)return;
   try {
     const user=users.get(email)||await getUserFromFirestore(email);
     if(!user)return res.status(404).json({error:'Perfil não encontrado.'});
     res.set('Cache-Control','no-store');
     res.json(publicAvatar(user.avatar108,email));
   }catch(e){console.error('profile108 get:',e.message);res.status(503).json({error:'Avatar indisponível.'});}
 });
 app.post('/api/profile108/avatar',rateLimit(8,60000),async(req,res)=>{
   const email=requireMe(req,res);if(!email)return;
   const type=req.body?.kind;
   try {
     const user=users.get(email)||await getUserFromFirestore(email);
     if(!user)return res.status(404).json({error:'Perfil não encontrado.'});
     let meta={kind:type,updatedAt:Date.now()};
     if(type==='character'){
       if(!AVATARS.includes(req.body?.id))return res.status(400).json({error:'Personagem indisponível.'});
       meta.id=req.body.id;
       // Switching to a drawing deletes the previously uploaded portrait.
       await mine(email).delete();
     }else if(type==='photo'){
       const input=req.body?.data;
       if(typeof input!=='string'||input.length>165000||input.length<200||
          !/^[A-Za-z0-9+/]+={0,2}$/.test(input)||input.length%4!==0)
         return res.status(400).json({error:'Imagem inválida ou muito grande.'});
       const buf=Buffer.from(input,'base64');
       if(buf.length>120000)return res.status(413).json({error:'Foto muito grande. Use outra imagem.'});
       const size=jpegSize(buf);
       if(!size||size.width<48||size.height<48||size.width>512||size.height>512)
         return res.status(400).json({error:'Envie uma foto JPEG reduzida, entre 48 e 512 pixels.'});
       await mine(email).set({base64:input,updatedAt:meta.updatedAt,mime:'image/jpeg'});
     }else if(type==='default'){
       meta={kind:'default',updatedAt:Date.now()};
       await mine(email).delete();
     }else return res.status(400).json({error:'Tipo de avatar inválido.'});
     await userRef(email).set({avatar108:meta},{merge:true});
     users.set(email,{...user,avatar108:meta});
     res.set('Cache-Control','no-store');
     res.json({success:true,avatar:publicAvatar(meta,email)});
   }catch(e){console.error('profile108 save:',e.message);res.status(503).json({error:'Não foi possível salvar o avatar.'});}
 });
 app.get('/api/profile108/photo/:id',rateLimit(100,60000),async(req,res)=>{
   const id=String(req.params.id||'');
   if(!/^[0-9a-f]{24}$/.test(id))return res.status(404).end();
   try{
     const snap=await db.collection('sf108AvatarPhotos').doc(id).get();
     if(!snap.exists||typeof snap.data()?.base64!=='string')return res.status(404).end();
     res.set({'Cache-Control':'public,max-age=300,immutable','Content-Type':'image/jpeg',
       'Content-Security-Policy':"default-src 'none'; sandbox",'X-Content-Type-Options':'nosniff'});
     res.send(Buffer.from(snap.data().base64,'base64'));
   }catch(e){console.error('profile108 photo:',e.message);res.status(503).end();}
 });
 async function deleteUserData(email){if(email)await mine(email).delete();}
 return {deleteUserData, jpegSize};
}
module.exports={installProfile108,jpegSize,AVATARS};
