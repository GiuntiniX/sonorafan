'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'../public');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'sonorafan-home-120.css'),'utf8');
const css121=fs.readFileSync(path.join(root,'sonorafan-home-121.css'),'utf8');
const a=html.indexOf('<!-- ===== SONORAFAN 121');
const b=html.indexOf('<!-- ===== SONORAFAN 123',a);
const landing=html.slice(a,b);

test('v122 has no navigation menu, only Login and large signup CTA in the header',()=>{
 assert.ok(a>=0 && b>a,'home region missing');
 assert.match(landing,/class="landing-screen sf120-home sf121-home" id="landingScreen"/);
 assert.match(landing,/class="topnav sf120-topbar sf121-topbar sf122-topbar"/);
 assert.doesNotMatch(landing,/sf121-nav-links|sf121-search-button|>Início<|>Salas<\/a>|>Comunidade<\/button>|>Experiências<\/a>/);
 assert.match(landing,/class="sf122-login-button"[^>]*onclick="showLogin\(\)"/);
 assert.match(landing,/class="btn-landing-primary sf120-signup sf120-top-signup sf122-signup-pulse"/);
 assert.match(landing,/class="btn-hero-primary sf120-signup sf121-hero-signup sf122-signup-pulse"/);
 assert.doesNotMatch(landing,/Ver como funciona|id="sf120How"/);
 assert.match(html,/sonorafan-home-122\.css\?v=122/);
});

test('features and login/signup actions are preserved',()=>{
 assert.equal((landing.match(/class="sf120-feature sf121-pillar" data-color=/g)||[]).length,4);
 assert.ok((landing.match(/onclick="openSignup\(\)"/g)||[]).length>=4);
 assert.equal((landing.match(/onclick="showLogin\(\)"/g)||[]).length,1,'Login is the only login entry');
 assert.equal((landing.match(/onclick="openSignup\(\)"/g)||[]).length,8,'all marketing controls open registration');
 const clickable=(landing.match(/<(?:a|button)\b[^>]*>/g)||[]);
 for(const tag of clickable) {
   if(tag.includes('sf52-skip-link')) continue; // accessibility skip link only
   if(tag.includes('sf122-login-button')) assert.match(tag,/onclick="showLogin\(\)"/);
   else assert.match(tag,/onclick="openSignup\(\)"/,'all other links or buttons must lead to signup: '+tag);
 }
 for(const id of ['sf63LandingHighlight','sf63LandingActivity']) {
  assert.equal(html.split('id="'+id+'"').length,2,'dynamic activity id '+id);
 }
});

test('preview clearly marked as mockup; scalable concert art and original brand are used',()=>{
 assert.doesNotMatch(landing,/Prévia ilustrativa · Não é uma sala conectada/);
 assert.match(landing,/aria-label="Demonstração visual ilustrativa de uma sala SonoraFan"/);
 assert.match(landing,/sf121-room-preview/);
 assert.match(landing,/src="\/art-129\/sonorafan-stage\.svg"/);
 assert.match(landing,/src="\/brand-144\/sonorafan-logo\.svg"/);
 assert.match(landing,/src="\/avatars-108\/rock.svg"/);
 assert.match(landing,/src="\/art-129\/sonorafan-mic-stage\.svg"/);
 assert.match(landing,/src="\/art-129\/sonorafan-headphones\.svg"/);
});

test('approved near-black background and neon features, responsive layout',()=>{
 for(const expected of ['--sf120-bg:#141414','--sf120-lime:#c5ff00','--sf120-orange:#ff8200']) {
  assert.ok(css.includes(expected),'missing palette '+expected);
 }
 for(const t of ['.sf121-room-preview','.sf121-pillar','.sf121-highlights','@media(max-width:675px)'])
  assert.ok(css121.includes(t),'missing existing style '+t);
 const css122=fs.readFileSync(path.join(root,'sonorafan-home-122.css'),'utf8');
 assert.match(css122,/sf122-cta-attention/);
 assert.match(css122,/sf122-cta-shine/);
 assert.match(css122,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css122,/@media\(max-width:410px\)/);
});

test('developer credit and social icons are actually removed from the app DOM',()=>{
 assert.doesNotMatch(html,/Desenvolvido por <a href=/);
 assert.doesNotMatch(html,/class="social-icons"/);
 assert.doesNotMatch(landing,/sf120-home-footer/);
});
