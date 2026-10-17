const { io } = require('socket.io-client'), B = 'http://localhost:3998', w = ms => new Promise(r => setTimeout(r, ms)), ck = t => 'sessionToken=' + t;
let ok = 0, bad = 0; const chk = (c, m) => { console.log(c ? 'OK  ' : 'FAIL', m); c ? ok++ : bad++; };
const api = (p, t, body, hdr = {}) => fetch(B + p, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(t ? { cookie: ck(t) } : {}), ...hdr }, body: body ? JSON.stringify(body) : undefined });
(async () => {
  const h = (await fetch(B + '/')).headers;
  chk(/upgrade-insecure-requests/.test(h.get('content-security-policy')) && /frame-ancestors 'self'/.test(h.get('content-security-policy')) && /camera=\(\)/.test(h.get('permissions-policy')) && h.get('x-content-type-options') === 'nosniff', 'cabecalhos de seguranca: CSP (HTTPS forcado, sem iframes de terceiros), Permissions-Policy, nosniff');
  chk(!h.get('strict-transport-security'), 'em desenvolvimento o HSTS nao e enviado');
  chk((await fetch(B + '/robots.txt')).ok, 'robots.txt publicado');
  // limite por IP real (anonimo): clientes diferentes atras do proxy nao dividem o mesmo balde
  let last = 0; for (let i = 0; i < 42; i++) last = (await api('/api/login', null, { idToken: 'x' }, { 'x-forwarded-for': '9.9.9.9, 1.1.1.1' })).status;
  const other = (await api('/api/login', null, { idToken: 'x' }, { 'x-forwarded-for': '9.9.9.9, 2.2.2.2' })).status;
  chk(last === 429 && other === 401, 'login: um IP que abusa e barrado (429) e outro IP segue normal (401)');
  // logado: limite por conta, nao por IP
  const mk = n => api('/api/rooms', 'TOKB', { name: 'Sala ' + n });
  const st = []; for (let i = 0; i < 6; i++) st.push((await mk(i)).status);
  chk(st.slice(0, 5).every(s => s === 200) && st[5] === 429, 'criar sala: 5 por minuto por conta (a 6a e barrada)');
  chk((await api('/api/rooms', 'TOKC', { name: 'Sala da Cris' })).status === 200, 'outra conta, mesmo IP, nao e afetada pelo limite');
  // admin: diagnostico do IP
  const dbg = await (await api('/api/admin/ip-debug', 'TOKADM', null, { 'x-forwarded-for': '7.7.7.7, 8.8.8.8' })).json();
  chk(dbg.ip === '8.8.8.8' && dbg.trustProxyHops === 1 && (await api('/api/admin/ip-debug', 'TOKC')).status === 403, 'diagnostico de IP (so admin) mostra o IP considerado e quantos proxies sao confiados');
  // forca bruta de senha de sala: por conta, reconectar nao zera
  const pr = await (await api('/api/rooms', 'TOKD', { name: 'Cofre', isPrivate: true, password: 'segredo' })).json();
  const dani = []; let blocked = false;
  for (let i = 0; i < 8; i++) { const s = io(B, { extraHeaders: { cookie: ck('TOKE') }, transports: ['polling'], forceNew: true }); s.on('error', m => { if (/Muitas tentativas/.test(m)) blocked = true; }); await w(150); s.emit('joinRoom', { slug: pr.slug, name: 'x', avatar: 'x', password: 'errada' + i }); await w(150); s.close(); }
  chk(blocked, 'senha de sala: tentar de novo com conexoes novas nao zera o limite (por conta)');
  console.log(ok + ' ok, ' + bad + ' falhas'); process.exit(0);
})();
