// Roda cada e2e-*.js contra o server.js real (servidor reiniciado a cada arquivo, por causa dos limites de taxa).
const { spawn } = require('child_process'), path = require('path'), http = require('http'), fs = require('fs');
const files = fs.readdirSync(__dirname).filter(f => /^e2e-.*\.js$/.test(f)).sort();
const env = { ...process.env, FIREBASE_SERVICE_ACCOUNT_KEY: '{}', ADMIN_EMAILS: 'admin@x', YOUTUBE_API_KEY: 'fake', PORT: '3998', NODE_ENV: 'development' };
const wait = ms => new Promise(r => setTimeout(r, ms));
const up = () => new Promise(res => http.get('http://localhost:3998/healthz', r => { r.resume(); res(r.statusCode === 200); }).on('error', () => res(false)));
(async () => {
  let fails = 0;
  for (const f of files) {
    const srv = spawn(process.execPath, ['-r', path.join(__dirname, 'preload.js'), path.join(__dirname, '..', 'server.js')], { env, stdio: 'ignore' });
    for (let i = 0; i < 60 && !(await up()); i++) await wait(250);
    const out = await new Promise(res => { let b = ''; const t = spawn(process.execPath, [path.join(__dirname, f)], { env }); t.stdout.on('data', d => b += d); t.stderr.on('data', d => b += d); t.on('close', () => res(b)); });
    srv.kill(); await wait(400);
    const bad = out.split('\n').filter(l => /^FAIL/.test(l)), m = out.match(/(\d+) ok, (\d+) falhas/);
    fails += bad.length + (m ? 0 : 1);
    console.log(`${m && !bad.length ? '✔' : '✖'} ${f}: ${m ? m[0] : 'sem resultado'}`); bad.forEach(l => console.log('   ' + l)); if (!m) console.log(out.slice(-500));
  }
  console.log(fails ? `\n${fails} falha(s)` : '\nTudo certo'); process.exit(fails ? 1 : 0);
})();
