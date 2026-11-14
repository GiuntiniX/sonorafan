# SonoraFan 20.0 — Todo mundo é DJ + animações na pista

Atualização incremental a partir da versão 19.0. O ZIP contém somente arquivos alterados ou novos.

## Arquivos
- `server.js` — substituir
- `public/index.html` — substituir
- `public/room-interactive-19.js` — substituir
- `public/room-social-20.css` — adicionar

## Mudanças
- Remoção do bloco Modo musical (Todos / Fila justa / DJ) e de seus controles de rádio da playlist.
- Todas as salas, inclusive as antigas carregadas do banco, operam com **adição colaborativa**. Todo participante autenticado na sala pode adicionar faixas (respeitando cooldown, limites e permissões gerais).
- Na criação e edição, a escolha 'colaborativa ou DJ único' foi removida; todos são DJs. Opções de privacidade e formato permanecem.
- O servidor rejeita tentativas de ativar modos exclusivos por clientes antigos.
- Novos movimentos de avatar: balançar, pular, dançar e ficar parado, transmitidos pelo Socket.IO aos participantes da sala.
- Preferência de movimento temporária; a saída da sala reinicia a escolha.

## Importante
- O botão Rádio Automática saiu junto com a seleção de modo musical. O servidor desativa automaticamente a rádio de salas existentes ao carregá-las e recusa reativação por clientes antigos.
- Isto **não** torna todos administradores nem concede poderes de moderação: 'DJ' significa poder sugerir/adicionar músicas.
- O backend ainda restringe vídeos longos e lives ao administrador global conforme a implementação existente.
- Nenhuma mudança no Firebase Authentication; o problema anterior com login admin não é corrigido nesta atualização.
- Reinicie o servidor após substituir `server.js`. Faça backup antes de aplicar.
- Sintaxe validada localmente; testes reais de múltiplos usuários, Firebase/YouTube ainda necessários.
