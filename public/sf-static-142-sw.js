/* SonoraFan 142 — cache restrito a imagens públicas estáticas.
 * Nunca armazena HTML, scripts, APIs, sessão, Socket.IO ou vídeos.
 */
'use strict';
const CACHE='sonorafan-public-images-v142';
const LIMIT=56;
const isPublicImage=url=>url.origin===self.location.origin &&
  /^\/(?:art-[\w-]+|brand-[\w-]+)\/[^?#]+\.(?:png|jpe?g|webp|avif|svg)$/i.test(url.pathname);
self.addEventListener('install',event=>{event.waitUntil(self.skipWaiting());});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('sonorafan-public-images-')&&key!==CACHE)
      .map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||req.mode==='navigate'||req.headers.has('authorization')||
     !isPublicImage(new URL(req.url)))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(req);
    const update=fetch(req).then(async response=>{
      if(response.ok&&response.type==='basic'){
        await cache.put(req,response.clone());
        const keys=await cache.keys();
        if(keys.length>LIMIT)await Promise.all(keys.slice(0,keys.length-LIMIT).map(k=>cache.delete(k)));
      }
      return response;
    });
    if(cached){event.waitUntil(update.catch(()=>{}));return cached;}
    return update.catch(()=>Response.error());
  })());
});
