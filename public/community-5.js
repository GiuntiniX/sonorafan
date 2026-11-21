/* SonoraFan 5.0 — área social discreta e edição de perfil persistente */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const EL=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e};
const genres=['Pop','Rock','Hip-hop','Eletrônica','Indie','Sertanejo','Funk','MPB','Jazz','Reggae','K-pop','Clássica'];
const colors=['#7c3aed','#ec4899','#ff6b35','#0ea5e9','#10b981','#f59e0b'];
let activeLayer=null;
const socialHubHome=$('sfSocialHub')?.parentElement;
const warn=(message,kind='error')=>{if(typeof toast==='function')toast(message,kind);else console[kind==='error'?'error':'info'](message)};
async function request(path,opts={}){const res=await fetch(path,{credentials:'include',...opts});const value=await res.json().catch(()=>({}));if(!res.ok)throw Error(value.error||'Não foi possível carregar');return value;}
function shell(title,subtitle){
 if(activeLayer){if(socialHubHome && $('sfSocialHub'))socialHubHome.append($('sfSocialHub'));activeLayer.remove();activeLayer=null;}
 const layer=EL('div','sf5-community-layer');layer.setAttribute('role','presentation');
 const dialog=EL('section','sf5-community-shell');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label',title);
 const head=EL('header','sf5-community-top');const info=EL('div');info.append(EL('span','sf5-kicker','SONORAFAN · CONVIVÊNCIA'),EL('h2','',title),EL('p','',subtitle));
 const close=EL('button','sf5-close','×');close.type='button';close.setAttribute('aria-label','Fechar');head.append(info,close);
 const scroller=EL('div','sf5-community-scroll');dialog.append(head,scroller);layer.append(dialog);document.body.append(layer);activeLayer=layer;
 const prior=document.activeElement;const onKey=e=>{if(layer.classList.contains('sf207-in-page'))return;if(e.key==='Escape')stop();if(e.key==='Tab'){const f=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled)')].filter(x=>x.getClientRects().length);if(f.length){if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&document.activeElement===f[f.length-1]){e.preventDefault();f[0].focus()}}}};
 function stop(){document.removeEventListener('keydown',onKey);if(activeLayer===layer)activeLayer=null;if(socialHubHome && $('sfSocialHub'))socialHubHome.append($('sfSocialHub'));layer.remove();if(prior&&prior.isConnected)prior.focus();}
 close.addEventListener('click',stop);layer.addEventListener('click',e=>{if(e.target===layer)stop()});document.addEventListener('keydown',onKey);close.focus();return scroller;
}
function community(){
 const slot=shell('Comunidade SonoraFan','Amigos online, Fan Clubs por artista e encontros musicais em um só lugar.');
 // A navegação principal agora é a barra compacta de três abas dentro do hub.
 const hub=$('sfSocialHub');if(hub){hub.style.display='block';slot.append(hub);hub.querySelector('[data-sf-tab].active')?.click();const tabs=hub.querySelector('[data-sf-tab="friends"]');if(tabs&&$('sfFriendsPanel')?.hidden){tabs.click();}}
}
window.sf5OpenCommunity=community;
const profile=async()=>{
 const slot=shell('Meu perfil','Sua identidade musical: conte quem você é e como quer conviver por aqui.');
 const loading=EL('p','','Carregando seu perfil…');slot.append(loading);
 let data;try{data=await request('/api/community/profile')}catch(e){loading.textContent=e.message;return;}loading.remove();
 const hero=EL('div','sf5-profile-hero');const avatar=EL('span','sf5-profile-avatar',data.avatar||'🎧');const about=EL('div');const nameTitle=EL('h3','',data.nome);const tagline=EL('p','',data.bio||'A música é melhor quando a gente compartilha.');about.append(nameTitle,tagline);hero.append(avatar,about);slot.append(hero);
 const form=EL('form','sf5-profile-form');slot.append(form);
 const field=(label,control,wide=false)=>{const wrap=EL('label',wide?'sf5-wide':'');wrap.append(document.createTextNode(label),control);form.append(wrap);return control};
 const name=EL('input');name.required=true;name.minLength=2;name.maxLength=40;name.value=data.nome;field('Nome de exibição',name);
 const bio=EL('textarea');bio.maxLength=240;bio.value=data.bio||'';bio.placeholder='Qual é a sua vibe? Conte um pouco sobre você…';field('Sobre mim',bio,true);
 const genreWrap=EL('div','sf5-tags');const checks=[];genres.forEach(g=>{const tag=EL('label','sf5-tag');const chk=document.createElement('input');chk.type='checkbox';chk.value=g;chk.checked=(data.musicGenres||[]).includes(g);tag.append(chk,document.createTextNode(g));genreWrap.append(tag);checks.push(chk);});field('Meu som · até 6 estilos',genreWrap,true);
 let selected=colors.includes(data.profileColor)?data.profileColor:colors[0];const palette=EL('div','sf5-colors');const dots=[];const changeColor=val=>{selected=val;hero.style.setProperty('--profile-accent',val);dots.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color===val)))};colors.forEach(color=>{const b=EL('button','sf5-color');b.type='button';b.dataset.color=color;b.style.background=color;b.setAttribute('aria-label','Selecionar cor '+color);b.addEventListener('click',()=>changeColor(color));palette.append(b);dots.push(b)});changeColor(selected);field('Cor do meu perfil',palette,true);
 const priv=EL('div','sf5-toggle');const visible=document.createElement('input');visible.type='checkbox';visible.checked=data.showListeningActivity!==false;const txt=EL('span','','Mostrar aos amigos quando estou ouvindo em salas públicas');priv.append(visible,txt);field('Privacidade e presença',priv,true);
 const feedback=EL('span','sf5-feedback','');const actions=EL('div','sf5-profile-actions sf5-wide');const avatarBtn=EL('button','sf5-secondary','Alterar avatar');avatarBtn.type='button';avatarBtn.addEventListener('click',()=>{if(typeof openAvatarModal==='function')openAvatarModal();warn('Escolha um avatar na janela aberta.','success')});const submit=EL('button','sf5-primary','Salvar meu perfil');submit.type='submit';actions.append(feedback,avatarBtn,submit);form.append(actions);
 form.addEventListener('submit',async e=>{e.preventDefault();const chosen=checks.filter(x=>x.checked).map(x=>x.value);if(chosen.length>6){feedback.textContent='Escolha no máximo 6 estilos.';return;}submit.disabled=true;feedback.textContent='Salvando…';try{const res=await request('/api/community/profile',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({nome:name.value,bio:bio.value,musicGenres:chosen,profileColor:selected,showListeningActivity:visible.checked})});const p=res.profile;nameTitle.textContent=p.nome;tagline.textContent=p.bio||'A música é melhor quando a gente compartilha.';if(typeof currentUser!=='undefined'&&currentUser){currentUser.nome=p.nome;currentUser.bio=p.bio;currentUser.musicGenres=p.musicGenres;currentUser.profileColor=p.profileColor;currentUser.showListeningActivity=p.showListeningActivity;}if(typeof myName!=='undefined')myName=p.nome;if(typeof updateUserInfo==='function')updateUserInfo();feedback.textContent='Perfil atualizado! Seu novo nome aparecerá nas salas ao entrar novamente.';warn('Perfil salvo com sucesso!','success');}catch(err){feedback.textContent=err.message;warn(err.message)}finally{submit.disabled=false;}});
};
window.sf5OpenProfile=profile;
// The legacy social component stays fully functional, but now belongs to the community dialog.
// Move only once; when closed the hub remains in its dialog (not the lobby).
})();
