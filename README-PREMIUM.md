# SonoraFan Premium — evolução visual

## O que mudou
- Layout premium nas salas: player destacado, cartões refinados, fila e chat.
- Indicadores visuais de sessão, equalizador e status ao vivo.
- Estilos isolados em `public/player-premium.css`, sem modificar a landing page.
- Preservados IDs, eventos, funções e integrações do player.
- Estrutura do projeto organizada para Node/Render.

## Como executar
1. Configure variáveis de ambiente no serviço (use `.env.example` como referência). **Nunca publique credenciais**.
2. Execute `npm ci` e `npm start` com Node 22.
3. Abra `http://localhost:3000`.

## Atenção antes de publicar
- O arquivo `arquivo.env` enviado **não foi incluído**. Revogue/rotacione qualquer chave sensível que tenha sido exposta.
- O repositório original referencia `tests/run.js`, mas esse arquivo não foi enviado. Assim, `npm test`/CI precisam do runner original para funcionar. Os testes E2E enviados estão em `tests/`.
- O HTML referencia `/icon.svg`, mas esse recurso não estava entre os anexos. Adicione o ícone original para evitar 404.
- O Dockerfile foi preservado com o nome correto e a versão Node foi ajustada para 22.
- Confirme comportamento real com Firebase, YouTube e Socket.IO no seu ambiente antes do deploy.
