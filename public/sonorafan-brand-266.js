/* SonoraFan 266 · Brand Core | wallpaper independent of user interface.
 * Brand palette is the permanent default. An explicit local opt-in can use room colors.
 * No changes to shared room state, queue, Firebase data or artwork.
 */
(()=>{
 'use strict';
 const root=document.documentElement, $=id=>document.getElementById(id);
 const MODE_KEY='sonoraUIColorMode', GLOW_KEY='sonoraUIGlow';
 const BRAND={
  '--bg':'#120616','--bg-elevated':'#1a0c21','--bg-card':'#24112d',
  '--bg-hover':'#2d1735','--border':'#5d3150','--border-hover':'#8a4b16',
  '--text':'#f6f1fb','--text-secondary':'#cdb9da','--text-muted':'#a895b3',
  '--accent':'#ff9300','--accent2':'#c8ff00','--success':'#c8ff00',
  '--accent-glow':'rgba(255,147,0,.24)','--accent2-glow':'rgba(200,255,0,.15)',
  '--glass':'rgba(18,6,22,.86)'
 };
 const read=(k,valid,def)=>{try{const v=localStorage.getItem(k);return valid.includes(v)?v:def}catch(_){return def}};
 let mode=read(MODE_KEY,['brand','theme'],'brand'),glow=read(GLOW_KEY,['low','medium','high'],'low');
 let applying=false, queued=false;
 const themeScreen=()=>$('screen-room');
 const activeRoom=()=>!!themeScreen()?.classList.contains('active');
 const rgb=hex=>/^#[0-9a-f]{6}$/i.test(hex||'')?hex:null;
 const selectedTheme=()=>{
   const screen=themeScreen();
   if(!activeRoom()||!screen?.hasAttribute('data-room-theme'))return null;
   const style=getComputedStyle(screen);
   const accent=rgb(style.getPropertyValue('--sf88-primary').trim());
   const second=rgb(style.getPropertyValue('--sf88-secondary').trim());
   const bg=rgb(style.getPropertyValue('--sf88-panel').trim());
   return accent?{accent,second:second||BRAND['--accent2'],bg:bg||BRAND['--bg-card']}:null;
 };
 function apply(){
   if(applying)return;
   applying=true;
   try{
     const theme=mode==='theme'?selectedTheme():null;
     const useTheme=mode==='theme'&&!!theme;
     const values={...BRAND};
     if(useTheme){
       values['--accent']=theme.accent;
       values['--accent2']=theme.second;
       values['--bg']=theme.bg;
       values['--bg-elevated']='color-mix(in srgb, '+theme.bg+' 88%, #000)';
       values['--bg-card']='color-mix(in srgb, '+theme.bg+' 82%, #141018)';
       values['--bg-hover']='color-mix(in srgb, '+theme.bg+' 70%, #302338)';
       values['--border']='color-mix(in srgb, '+theme.accent+' 34%, #463047)';
       values['--border-hover']=theme.accent;
       values['--accent-glow']='color-mix(in srgb, '+theme.accent+' 24%, transparent)';
       values['--accent2-glow']='color-mix(in srgb, '+theme.second+' 18%, transparent)';
     }
     for(const [name,value] of Object.entries(values)){
       if(root.style.getPropertyValue(name)!==value||root.style.getPropertyPriority(name)!=='important')
         root.style.setProperty(name,value,'important');
     }
     root.style.setProperty('color-scheme','dark','important');
     root.dataset.sfBrand='official';
     root.dataset.sfUiMode=useTheme?'theme':'brand';
     root.dataset.sfGlow=glow;
     root.dataset.sfGuide='brand';
     root.style.setProperty('--sf-brand-primary',useTheme?theme.accent:'#ff9300');
     root.style.setProperty('--sf-brand-secondary',useTheme?theme.second:'#c8ff00');
     const meta=document.querySelector('meta[name="theme-color"]');
     if(meta)meta.content=useTheme?theme.bg:'#120616';
     syncControls();
   }finally{applying=false}
 }
 function schedule(){
   if(queued)return;queued=true;
   requestAnimationFrame(()=>{queued=false;apply()});
 }
 function setMode(value){
   if(!['brand','theme'].includes(value))return;
   mode=value;try{localStorage.setItem(MODE_KEY,mode)}catch(_){}
   schedule();
 }
 function setGlow(value){
   if(!['low','medium','high'].includes(value))return;
   glow=value;try{localStorage.setItem(GLOW_KEY,glow)}catch(_){}
   schedule();
 }
 function syncControls(){
   const select=$('sf266ColorMode');
   if(select&&select.value!==mode)select.value=mode;
   const intensity=$('sf266Glow');
   if(intensity&&intensity.value!==glow)intensity.value=glow;
   const preview=$('sf266Preview');
   if(preview){
     const actual=root.dataset.sfUiMode==='theme'?'Cores do tema':'Identidade SonoraFan';
     preview.querySelector('[data-sf266-title]').textContent=actual;
   }
 }
 function buildAppearance(){
   const overlay=$('sf88ThemeOverlay'),grid=$('sf88ThemeCards');
   if(!overlay||!grid||$('sf266Appearance'))return;
   const section=document.createElement('section');
   section.id='sf266Appearance';section.className='sf266-appearance';
   section.innerHTML='<div class="sf266-appearance-heading"><strong>APARÊNCIA DA INTERFACE</strong><small>O wallpaper muda com o tema. As cores da marca continuam padrão.</small></div>'+
    '<div class="sf266-appearance-fields"><label>Cores da página<select id="sf266ColorMode"><option value="brand">Padrão SonoraFan</option><option value="theme">Seguir cores do tema</option></select></label>'+
    '<label>Intensidade do brilho<select id="sf266Glow"><option value="low">Discreto</option><option value="medium">Médio</option><option value="high">Intenso</option></select></label></div>'+
    '<div class="sf266-preview" id="sf266Preview" aria-label="Prévia das cores"><span data-sf266-title>Identidade SonoraFan</span><div><i></i><b>Adicionar música</b><em>AO VIVO</em></div></div>';
   grid.before(section);
   $('sf266ColorMode').addEventListener('change',e=>setMode(e.target.value));
   $('sf266Glow').addEventListener('change',e=>setGlow(e.target.value));
   syncControls();
 }
 function init(){
   buildAppearance();apply();
   const overlay=$('sf88ThemeOverlay'),screen=themeScreen();
   if(screen)new MutationObserver(schedule).observe(screen,{attributes:true,attributeFilter:['data-room-theme','class','style']});
   if(overlay)new MutationObserver(()=>buildAppearance()).observe(overlay,{childList:true});
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
   window.addEventListener('focus',schedule);
   // Legacy applyTheme writes inline variables; keep the selected brand mode dominant.
   // Attribute filter avoids observing our own CSS variable writes on :root.
   const original=typeof applyTheme==='function'?applyTheme:null;
   if(original){
     // The existing function may be called by the legacy theme selector.
     // Periodic reconciliation also covers other feature scripts changing variables.
   }
   setInterval(()=>{if(!document.hidden)apply()},4000);
 }
 window.sf266Appearance={setMode,setGlow,getMode:()=>mode,getGlow:()=>glow,refresh:schedule};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
