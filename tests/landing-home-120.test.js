'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'../public');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'sonorafan-home-120.css'),'utf8');
const a=html.indexOf('<!-- ===== SONORAFAN 120');
const b=html.indexOf('<!-- ===== LOGIN ===== -->',a);
const landing=html.slice(a,b);

test('homepage exclusively uses the Terra Sonora-inspired layout, without navigation tabs',()=>{
 assert.ok(a>=0 && b>a,'homepage replacement missing');
 assert.match(landing,/class="landing-screen sf120-home" id="landingScreen"/);
 assert.match(landing,/id="sf52LandingMain"/);
 assert.match(landing,/id="sf120HeroTitle"/);
 assert.match(landing,/id="sf120How"/);
 assert.match(landing,/class="sf120-preview"/);
 assert.doesNotMatch(landing,/>Início<|>Salas<|>Comunidade<|>Experiências</);
 assert.match(html,/sonorafan-home-120\.css\?v=120/);
});

test('feature cards and user access flows remain intact',()=>{
 assert.equal((landing.match(/class="sf120-feature" data-color=/g)||[]).length,4);
 assert.ok((landing.match(/onclick="openSignup\(\)"/g)||[]).length>=5);
 assert.ok((landing.match(/onclick="showLogin\(\)"/g)||[]).length>=2);
 assert.ok(landing.includes('onclick="setLanguage(\'pt\')"'));
 for (const id of ['sf63LandingHighlight','sf63LandingActivity']) {
  assert.equal(html.split('id="'+id+'"').length,2,'missing dynamic activity id '+id);
 }
});

test('mock is clearly labelled as demonstrative and uses real public project assets',()=>{
 assert.match(landing,/PRÉVIA DA FERRAMENTA/);
 assert.match(landing,/Demonstração/);
 assert.match(landing,/src="\/art-44\/festival-stage.webp"/);
 assert.match(landing,/src="\/brand-64\/sonorafan-logo-transparent.png"/);
 assert.match(landing,/src="\/avatars-108\/rock.svg"/);
});

test('visual scheme is near-black with orange, lime, magenta, yellow and mobile rules',()=>{
 for (const expected of ['--sf120-bg:#141414','--sf120-lime:#c5ff00','--sf120-orange:#ff8200','--sf120-pink:#ec91e4','--sf120-yellow:#ffd322']) {
  assert.ok(css.includes(expected),'missing palette '+expected);
 }
 assert.match(css,/#landingScreen\.sf120-home \.sf120-hero/);
 assert.match(css,/@media\(max-width:930px\)/);
 assert.match(css,/@media\(max-width:640px\)/);
 assert.match(css,/@media\(max-width:390px\)/);
 assert.match(css,/#landingScreen\.sf120-home \.landing-bg,/);
});
