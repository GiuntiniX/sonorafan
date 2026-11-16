'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'../public');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'sonorafan-auth-123.css'),'utf8');
const server=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
const start=html.indexOf('<!-- ===== SONORAFAN 123 • LOGIN');
const end=html.indexOf('<!-- ===== SONORAFAN 12 ADMIN CONTROL CENTER',start);
const form=html.slice(start,end);

test('login and registration reproduce the approved mockups with the existing logo',()=>{
 assert.ok(start>=0&&end>start,'auth screens missing');
 assert.match(html,/sonorafan-auth-123\.css\?v=123/);
 assert.equal((form.match(/src="\/brand-64\/sonorafan-logo-transparent\.png"/g)||[]).length,2);
 assert.match(form,/class="sf123-login-layout"/);
 assert.match(form,/class="sf123-login-art"/);
 assert.match(form,/class="sf123-signup-layout"/);
 assert.match(form,/Entre para a/);
 assert.match(form,/Junte-se ao SonoraFan/);
 for(const filename of ['login-festival.webp','signup-crowd.webp']){
  const file=path.join(root,'art-123',filename);
  assert.ok(fs.existsSync(file),filename+' missing from repository');
  assert.ok(fs.statSync(file).size>2500,filename+' has no actual image pixels');
 }
});

test('original Firebase-compatible ids and newly functioning fields remain unique',()=>{
 for(const id of [
  'loginScreen','loginEmail','loginPassword','loginBtn','loginError',
  'signupModal','signupNome','signupUsername','signupEmail','signupPassword',
  'signupConfirm','signupStyles','sf123SignupConsent'
 ]) assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.match(form,/onclick="doLogin\(\)"/);
 assert.match(form,/onclick="submitSignup\(\)"/);
 assert.match(form,/onclick="sf123ResetPassword\(\)"/);
 assert.match(form,/onclick="sf123TogglePassword\('loginPassword',this\)"/);
 assert.match(form,/onclick="sf123GoLogin\(\)"/);
 assert.match(form,/onclick="openLegal\('terms'\)"/);
 assert.match(form,/onclick="openLegal\('priv'\)"/);
 assert.match(form,/autocomplete="new-password"/);
});

test('form actions validate username confirmation, terms and selected genres',()=>{
 assert.match(html,/senha !== confirmacao/);
 assert.match(html,/const username = \(\$\('signupUsername'\)/);
 assert.match(html,/if \(!consent\) return toast/);
 assert.match(html,/JSON\.stringify\(\{ nome, username, estilos, idToken \}\)/);
 assert.match(html,/setAttribute\('aria-pressed', String\(selected\)\)/);
 assert.match(html,/sendPasswordResetEmail\(email\)/);
 assert.match(html,/sf123RememberLogin/);
 assert.match(server,/const \{ nome, username, estilos, idToken \} = req\.body/);
 assert.match(server,/username: publicUsername \|\| null/);
 assert.match(server,/where\('username', '==', publicUsername\)/);
});

test('auth styles match black backdrop, neon buttons and responsive layouts',()=>{
 assert.match(css,/--auth-bg:#141414/);
 assert.match(css,/--auth-lime:#c4ff00/);
 assert.match(css,/#loginScreen\.sf123-login-screen \.sf123-login-layout/);
 assert.match(css,/#signupModal\.sf123-signup-screen \.sf123-signup-layout/);
 assert.match(css,/#legalModal\.active \{ z-index:260!important/);
 assert.match(css,/@media\(max-width:800px\)/);
 assert.match(css,/@media\(max-width:490px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
