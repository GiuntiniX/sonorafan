# SonoraFan — Etapa 1/4: Estabilidade e Sincronização (13.0)

**Base:** versão 12.0 Admin Control Center com estilos da 11.1 mantidos.

## Arquivos modificados

- `public/index.html` — substituir.
- `server.js` — substituir e reiniciar o servidor.

Os demais CSS e JS existentes permanecem como estão.

## Alterações

- API do YouTube carregada apenas uma vez por sessão de página.
- Cancelamento dos temporizadores antigos ao trocar de faixa/sair da sala, evitando executar comandos numa música posterior.
- Eventos `videoEnded` incluem ID da música; servidor ignora eventos atrasados de outra faixa.
- Ao receber `roomState`, o estado da sala fica disponível mesmo antes do carregamento do player.
- Reconexão só refaz a entrada se o usuário ainda estiver na mesma sala; aviso de desconexão mantido.
- Verificação de áudio quando o navegador bloqueia autoplay; volume definido pelo usuário preservado.
- Ressincronização não busca posições inválidas depois do término estimado da música.

## Como validar

1. Suba o servidor em ambiente de desenvolvimento com variáveis Firebase corretas.
2. Entre em uma sala com duas sessões de navegador.
3. Coloque ao menos quatro faixas e deixe avançar automaticamente sem tocar no volume.
4. Desconecte e reconecte uma sessão; confirme que volta à sala atual sem iniciar música antiga.
5. Teste com o navegador bloqueando autoplay e confirme que o botão **Ativar som** aparece quando necessário.
6. Verifique o Console do navegador e logs do servidor ao pular/encerrar faixas.

**Limitação:** verificações locais de sintaxe e de consistência de código não substituem testes reais com YouTube/Firebase e múltiplos usuários. O teste completo de `npm test` depende de `tests/run.js`, que não foi enviado no projeto original.

## Próximas etapas

- **Etapa 2 — Música:** fila inteligente, pedidos justos, votação e modo DJ, incluindo novas regras no servidor.
- **Etapa 3 — Comunidade:** notificações sociais e melhorias de convivência com privacidade.
- **Etapa 4 — Visual e performance:** reorganização gradual do CSS/JS acumulado e temas consistentes.
