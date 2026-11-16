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
const b=html.indexOf('<!-- ===== LOGIN ===== -->',a);
const landing=html.slice(a,b);

test('approved mockup has centered functional nav, big lime signup and no how CTA',()=>{
 assert.ok(a>=0 && b>a,'home region missing');
 assert.match(landing,/class="landing-screen sf120-home sf121-home" id="landingScreen"/);
 assert.match(landing,/class="sf121-nav-links"/);
 for(const label of ['Início','Salas','Comunidade','Experiências']) assert.ok(landing.includes('>'+label+'<'),label);
 assert.match(landing,/class="sf121-search-button"[^>]*onclick="showLogin\(\)"/);
 assert.match(landing,/id="sf120HeroTitle"/);
 assert.match(landing,/class="btn-hero-primary sf120-signup sf121-hero-signup"/);
 assert.doesNotMatch(landing,/Ver como funciona|id="sf120How"/);
 assert.match(html,/sonorafan-home-121\.css\?v=121\.1/);
});

test('features and login/signup actions are preserved',()=>{
 assert.equal((landing.match(/class="sf120-feature sf121-pillar" data-color=/g)||[]).length,4);
 assert.ok((landing.match(/onclick="openSignup\(\)"/g)||[]).length>=4);
 assert.ok((landing.match(/onclick="showLogin\(\)"/g)||[]).length>=3);
 for(const id of ['sf63LandingHighlight','sf63LandingActivity']) {
  assert.equal(html.split('id="'+id+'"').length,2,'dynamic activity id '+id);
 }
});

test('preview clearly marked as mockup; existing local assets are used',()=>{
 assert.match(landing,/Prévia ilustrativa/);
 assert.match(landing,/sf121-room-preview/);
 assert.match(landing,/src="\/art-121\/preview-guitar.webp"/);
 assert.match(landing,/src="\/brand-64\/sonorafan-logo-transparent.png"/);
 assert.match(landing,/src="\/avatars-108\/rock.svg"/);
 assert.match(landing,/src="\/art-121\/highlight-singer.webp"/);
 assert.match(landing,/src="\/art-121\/discover-headphones.webp"/);
});

test('approved near-black background and neon features, responsive layout',()=>{
 for(const expected of ['--sf120-bg:#141414','--sf120-lime:#c5ff00','--sf120-orange:#ff8200']) {
  assert.ok(css.includes(expected),'missing palette '+expected);
 }
 for(const t of ['.sf121-room-preview','.sf121-nav-links','.sf121-pillar','.sf121-highlights','@media(max-width:675px)'])
  assert.ok(css121.includes(t),'missing new style '+t);
 assert.match(css121,/@media\(max-width:410px\)/);
});

test('developer credit and social icons are actually removed from the app DOM',()=>{
 assert.doesNotMatch(html,/Desenvolvido por <a href=/);
 assert.doesNotMatch(html,/class="social-icons"/);
 assert.doesNotMatch(landing,/sf120-home-footer/);
});
