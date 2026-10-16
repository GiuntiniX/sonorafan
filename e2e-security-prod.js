const B = 'http://localhost:3998'; let ok = 0, bad = 0; const chk = (c, m) => { console.log(c ? 'OK  ' : 'FAIL', m); c ? ok++ : bad++; };
(async () => {
  const sec = await fetch(B + '/', { headers: { 'x-forwarded-proto': 'https' } });
  chk(/max-age=\d+/.test(sec.headers.get('strict-transport-security') || ''), 'producao + HTTPS: HSTS enviado (navegador passa a exigir HTTPS)');
  const red = await fetch(B + '/?a=1', { headers: { 'x-forwarded-proto': 'http', host: 'exemplo.onrender.com' }, redirect: 'manual' });
  chk(red.status === 301 && /^https:\/\/.+\/\?a=1$/.test(red.headers.get('location')), 'producao + HTTP: redireciona para HTTPS mantendo o caminho');
  chk((await fetch(B + '/healthz')).ok, 'health check interno (sem cabecalho de proxy) continua funcionando');
  console.log(ok + ' ok, ' + bad + ' falhas'); process.exit(0);
})();
