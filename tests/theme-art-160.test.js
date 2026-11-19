'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const ids=['indie','metal','emo','mpb','eletronica','rock','pop','rap','funk','pagode','sertanejo','reggae','jazz','forro'];
test('theme artwork uses original generated AVIF for all existing 14 IDs without changing catalog',()=>{
 const css=read('public/sonorafan-theme-art-160.css'),catalog=JSON.parse(read('public/themes/catalog-88.json'));
 const base64=css.match(/data:image\/avif;base64,([A-Za-z0-9+/=]+)/)?.[1];
 assert(base64);assert.equal(base64.length,8556);
 const buffer=Buffer.from(base64,'base64');
 assert.equal(buffer.length,6415);
 assert.equal(buffer.toString('ascii',4,12),'ftypavif');
 const found=catalog.filter(x=>x.id!=='geral').map(x=>x.id);
 assert.deepEqual(found,ids);
 for(const id of ids){
   assert(css.includes('.sf88-theme-card[data-theme="'+id+'"]'));
   assert(css.includes('#sf88CreateTheme[data-sf143-theme="'+id+'"]'));
   assert(css.includes('#screen-room[data-room-theme="'+id+'"]'));
 }
 assert(css.includes('background-size:400% 400%'));
 assert(css.includes(':root{--sf160-atlas:'));
 assert(!css.includes('.sf88-theme-card[data-theme="geral"]::after'));
});
test('the theme chooser keeps personal and shared choices and previews',()=>{
 const html=read('public/index.html'),js=read('public/sonorafan-room-themes-88.js'),css=read('public/sonorafan-theme-art-160.css');
 assert.match(html,/sonorafan-theme-art-160\.css\?v=\d+(?:\.\d+)*/);
 assert(js.includes("sf88ThemePersonal"));
 assert(js.includes("sf88ThemeShared"));
 assert(js.includes("sf88ThemePreviewArt"));
 assert(css.includes('sf88-preview::after'));
 assert(css.includes('.sf88-mini::before'));
});
test('profile modal close X is available, visible and keyboard accessible',()=>{
 const html=read('public/index.html'),css=read('public/sonorafan-profile-60.css');
 assert(/class="sf43-profile-close" aria-label="Fechar perfil" onclick="window.sf43CloseProfile\?\.\(\)"/.test(html));
 assert(css.includes('#sf43ProfileModal.active .sf43-profile-close'));
 assert(css.includes('position:sticky!important'));
 assert(css.includes('z-index:1002!important'));
 assert(css.includes(':focus-visible'));
 assert(css.includes('safe-area-inset-top'));
});
test('room chat shows trusted circular profile avatars, with a fallback for missing portraits',()=>{
 const html=read('public/index.html'),server=read('server.js'),css=read('public/sonorafan-sala-chat-55.css');
 assert(server.includes("const userAvatar108=users.get(socket.userEmail)?.avatar108"));
 assert(server.includes('avatarUrl'));
 assert(html.includes('safeAvatarUrl'));
 assert(html.includes('sf160-chat-avatar'));
 assert(html.includes('sf160-chat-avatar-fallback'));
 assert(html.includes('referrerpolicy="no-referrer"'));
 assert(css.includes('border-radius:50%'));
 assert(css.includes('width:32px'));
 assert(css.includes('@media(max-width:740px)'));
});
