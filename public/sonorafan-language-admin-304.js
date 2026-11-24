/* SonoraFan 304 — dicionário e histórico de linguagem (somente administração). */
(() => {
 'use strict';
 const section=document.querySelector('[data-sf12-view="language"]');
 if(!section)return;
 const $=id=>document.getElementById(id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const note=(msg,error=false)=>{const el=$('sf304Note');if(el){el.textContent=msg||'';el.classList.toggle('is-error',!!error);}};
 const api=async (path,body)=>{
  const r=await fetch('/api/admin/language'+path,{
   credentials:'include',cache:'no-store',
   ...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(data.error||'Falha ao consultar o filtro de linguagem.');
  return data;
 };
 const label={pt:'Português',en:'Inglês',es:'Espanhol',custom:'Termos personalizados'};
 const surface={room:'Chat da sala',dm:'Mensagem privada','fanclub-post':'Publicação no Fan Club',
  'fanclub-title':'Título do Fan Club','fanclub-comment':'Comentário no Fan Club'};
 function render(data){
  const dictionary=data.dictionary||{};
  const items=Array.isArray(data.recent)?data.recent:[];
  const counts=new Map();
  items.forEach(event=>(event.terms||[]).forEach(term=>counts.set(term,(counts.get(term)||0)+1)));
  const top=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,8);
  const total=Object.values(dictionary).reduce((n,list)=>n+(Array.isArray(list)?list.length:0),0);
  $('sf304Totals').textContent=total+' entradas no dicionário · '+items.length+' ocorrências recentes registradas';
  $('sf304Top').innerHTML=top.length?top.map(([term,count])=>'<span class="sf304-chip">'+esc(term)+' <strong>'+count+'</strong></span>').join(''):'<span class="sf304-muted">Ainda não há termos registrados no histórico.</span>';
  $('sf304Dictionary').innerHTML=Object.entries(label).map(([lang,name])=>{
   const terms=Array.isArray(dictionary[lang])?dictionary[lang]:[];
   return '<details class="sf304-details" '+(lang==='custom'?'open':'')+'><summary>'+esc(name)+' <span>('+terms.length+')</span></summary>'+
    '<div class="sf304-terms">'+(terms.length?terms.map(term=>
    '<span class="sf304-chip">'+esc(term)+(lang==='custom'?' <button type="button" data-sf304-remove="'+esc(term)+'" aria-label="Remover termo '+esc(term)+'">×</button>':'')+'</span>').join(''):'<span class="sf304-muted">Nenhum termo adicional.</span>')+'</div></details>';
  }).join('');
  $('sf304History').innerHTML=items.length?items.map(item=>{
   const ts=new Date(Number(item.at)||0).toLocaleString('pt-BR');
   return '<div class="sf304-event"><div><strong>'+esc((item.terms||[]).join(', ')||'Termo detectado')+
   '</strong><small>'+esc(surface[item.surface]||item.surface||'Chat')+' · '+esc(ts)+'</small></div>'+
   '<span class="sf304-count">'+Number(item.count||0)+' ocorrência(s)</span></div>';
  }).join(''):'<p class="sf304-muted">Nenhuma mensagem precisou ser censurada até agora.</p>';
 }
 async function load(){
  note('Consultando o histórico…');
  try{render(await api(''));note('Histórico atualizado. Mensagens originais não são armazenadas aqui.');}
  catch(e){note(e.message,true);}
 }
 $('sf304Refresh')?.addEventListener('click',load);
 $('sf304TermForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const input=$('sf304Term'),term=input?.value.trim();
  if(!term)return;
  try{await api('/terms',{action:'add',term});input.value='';await load();note('Novo termo incluído no filtro.');}
  catch(err){note(err.message,true);}
 });
 section.addEventListener('click',async e=>{
  const btn=e.target.closest('[data-sf304-remove]');if(!btn)return;
  const term=btn.dataset.sf304Remove;
  if(!window.confirm('Remover "'+term+'" dos termos personalizados?'))return;
  try{await api('/terms',{action:'remove',term});await load();note('Termo personalizado removido.');}
  catch(err){note(err.message,true);}
 });
 window.sf304Language={load};
})();
