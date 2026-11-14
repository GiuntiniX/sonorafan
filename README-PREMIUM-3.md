# SonoraFan Premium 3.0

## Melhorias implementadas
- Ambient Mode: fundo de capa desfocada e cor de destaque determinística por faixa, sem dependência de acesso a pixels de imagem externa.
- Sala imersiva: cartões translúcidos, novo cabeçalho, presença e apresentação da faixa.
- Presença: avatares atualizados com eventos `users` já existentes.
- Reações rápidas: evento `roomReaction` autenticado, limitado a uma por segundo por conexão, replicado apenas para membros da mesma sala. Não afeta chat, música ou votação.
- Fila: resumo das faixas, animações, destaque da música atual e atribuição a quem adicionou (preservada).
- Mobile: mini-player visual fixo na sala, com capa, título, progresso e botão para abrir a aba do player. Sem controles de reprodução desincronizados.

## Arquivos adicionados
- `public/premium-3.css`
- `public/premium-3.js`

## Como usar
1. Node.js 22. Configure variáveis de ambiente na hospedagem (não inclua segredos no repositório).
2. `npm ci && npm start`
3. Abra `http://localhost:3000`.

## Importante
- Landing page não foi alterada visualmente.
- O projeto ainda depende de `public/icon.svg` e `tests/run.js` originais que não foram incluídos nos anexos.
- Antes de publicar, verifique Firebase e YouTube em ambiente real e faça backup.
- O bloqueio visual de interação com iframe YouTube não constitui garantia técnica de impedir pausa ou manipulação fora da interface.
