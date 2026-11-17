'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const start=html.indexOf('    function sf145AuthErrorMessage(');
const end=html.indexOf('    function doLogout() {',start);
assert.ok(start>=0&&end>start,'authentication helpers present');
const code=html.slice(start,end);

function fixture({create,signIn,responses={}}={}){
  const messages=[],calls=[];
  const elements={
    signupNome:{value:'Pessoa Teste'},signupEmail:{value:'pessoa@example.com'},
    signupPassword:{value:'senha-teste'},signupConfirm:{value:'senha-teste'},
    signupUsername:{value:'pessoa.teste'},sf123SignupConsent:{checked:true},
    loginEmail:{value:'pessoa@example.com'},loginPassword:{value:'senha-teste'},
    loginError:{textContent:'',classList:{add(){},remove(){}}},
    loginBtn:{disabled:false,innerHTML:'Login',textContent:'Login'},
    landingScreen:{style:{display:'block'}}
  };
  const btn={disabled:false,innerHTML:'Criar conta'};
  const credential={user:{getIdToken:async()=> 'token-falso'}};
  const auth={
    createUserWithEmailAndPassword:async(...args)=>{
      calls.push(['create',...args]);return create?create(...args):credential;
    },
    signInWithEmailAndPassword:async(...args)=>{
      calls.push(['signin',...args]);return signIn?signIn(...args):credential;
    },
    setPersistence:async()=>{}
  };
  const user={nome:'Pessoa Teste',avatar:'🎸',points:0,badges:[]};
  const ctx={
    firebase:{auth:()=>auth},
    $:id=>elements[id]||null,
    document:{
      querySelector:s=>s==='#signupModal .btn-primary'?btn:null,
      querySelectorAll:s=>s==='#signupStyles .chip.selected'?[{dataset:{style:'rock'}}]:[]
    },
    fetch:async(url,opts)=>{
      calls.push(['request',url,JSON.parse(opts.body)]);
      const item=responses[url]?.shift?.()||{status:200,body:url==='/api/login'?{user}:{success:true}};
      return {ok:item.status>=200&&item.status<300,status:item.status,json:async()=>item.body};
    },
    toast:(text,type)=>messages.push({text,type}),
    currentUser:null,myName:'',myAvatar:'',myPoints:0,myBadges:[],
    currentTheme:'dark',applyTheme(){},closeSignup(){},hideLogin(){},
    showScreen(){},updateUserInfo(){},loadRooms(){},checkAdmin(){},loadFavorites(){},
    console
  };
  vm.runInNewContext(code,ctx,{timeout:2000});
  return {ctx,calls,messages,btn,elements};
}
const firebaseError=(code)=>Object.assign(new Error(code),{code});

test('new account creates Firebase user, persists profile, then opens session',async()=>{
 const fx=fixture();
 await fx.ctx.submitSignup();
 assert.deepEqual(fx.calls.map(x=>x[0]==='request'?x[1]:x[0]),['create','/api/signup','/api/login']);
 assert.equal(fx.calls[1][2].idToken,'token-falso');
 assert.deepEqual(Object.keys(fx.calls[1][2]).sort(),['estilos','idToken','nome','username']);
 assert.equal(fx.ctx.currentUser.nome,'Pessoa Teste');
 assert.equal(fx.btn.disabled,false);
 assert.equal(fx.messages.at(-1).type,'success');
});

test('existing email with incorrect password shows guidance, not raw Firebase message',async()=>{
 const fx=fixture({
  create:async()=>{throw firebaseError('auth/email-already-in-use')},
  signIn:async()=>{throw firebaseError('auth/invalid-credential')}
 });
 await fx.ctx.submitSignup();
 assert.deepEqual(fx.calls.map(x=>x[0]),['create','signin']);
 assert.match(fx.messages.at(-1).text,/já possui cadastro/);
 assert.doesNotMatch(fx.messages.at(-1).text,/Firebase:|auth\/invalid-credential/);
 assert.equal(fx.btn.disabled,false);
});

test('existing fully registered Firebase account uses login, never overwrites its profile',async()=>{
 const fx=fixture({create:async()=>{throw firebaseError('auth/email-already-in-use')}});
 await fx.ctx.submitSignup();
 assert.deepEqual(fx.calls.map(x=>x[0]==='request'?x[1]:x[0]),['create','signin','/api/login']);
 assert.equal(fx.ctx.currentUser.nome,'Pessoa Teste');
 assert.equal(fx.messages.at(-1).type,'success');
});

test('incomplete Firebase account finishes missing backend registration',async()=>{
 const fx=fixture({
  create:async()=>{throw firebaseError('auth/email-already-in-use')},
  responses:{'/api/login':[
    {status:401,body:{error:'Usuário não encontrado'}},
    {status:200,body:{user:{nome:'Pessoa Teste'}}}
  ]}
 });
 await fx.ctx.submitSignup();
 assert.deepEqual(fx.calls.map(x=>x[0]==='request'?x[1]:x[0]),[
  'create','signin','/api/login','/api/signup','/api/login'
 ]);
 assert.equal(fx.ctx.currentUser.nome,'Pessoa Teste');
});

test('backend signup failure is visible and does not attempt a login',async()=>{
 const fx=fixture({responses:{'/api/signup':[
  {status:400,body:{error:'Esse username já está em uso.'}}
 ]}});
 await fx.ctx.submitSignup();
 assert.deepEqual(fx.calls.map(x=>x[0]==='request'?x[1]:x[0]),['create','/api/signup']);
 assert.match(fx.messages.at(-1).text,/username já está em uso/);
 assert.equal(fx.ctx.currentUser,null);
 assert.equal(fx.btn.disabled,false);
});

test('login gives neutral credential errors instead of claiming user has no account',async()=>{
 const fx=fixture({signIn:async()=>{throw firebaseError('auth/invalid-credential')}});
 await fx.ctx.doLogin();
 assert.match(fx.elements.loginError.textContent,/Confira os dados ou use Recuperar senha/);
 assert.doesNotMatch(fx.elements.loginError.textContent,/Sem cadastro|Firebase:/);
 assert.equal(fx.elements.loginBtn.disabled,false);
});
