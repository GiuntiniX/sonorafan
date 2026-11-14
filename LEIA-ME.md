# SonoraFan 29.0 — Menu lateral e novo tour de primeira visita

Aplicar sobre a versão 28.0. Substitua `public/index.html` e adicione `public/sonorafan-tour-29.css` e `public/sonorafan-tour-29.js`. Preserve os demais arquivos e `server.js`.

## Alterações
- Convidar e Temas saem do cabeçalho da sala e ficam no menu esquerdo, mantendo as ações originais.
- O convite promocional duplicado do cartão lateral foi removido.
- O novo tour tem 7 etapas no lobby e 8 dentro da sala; destaca as áreas do novo layout.
- Inicia automaticamente uma vez por conta em cada contexto e pode ser reaberto em Ajuda / Tour.
- Não abre formulários ou adiciona músicas durante o guia; é apenas demonstrativo.
- O tour anterior deixa de ser acionado automaticamente.

**Atenção:** testes estáticos feitos; validar o tour com navegador/servidor real, sobretudo responsividade e permissões Firebase/Socket.IO.
