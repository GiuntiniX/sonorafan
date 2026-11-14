# SonoraFan 19.0 — Plateia Interativa (continuação da versão 18.0)

Aplicar sobre a versão 18.0 com os arquivos auxiliares anteriores mantidos.

## Arquivos a substituir ou adicionar
- `public/index.html` — substituir
- `server.js` — substituir (base: servidor da versão 16/17/18)
- `public/room-interactive-19.css` — adicionar
- `public/room-interactive-19.js` — adicionar

## O que há de novo
- 24 lugares clicáveis na pista, cada um com estado livre/ocupado.
- 12 avatares de emoji à escolha na própria sala.
- Botão “Meu avatar” no palco e janela de personalização.
- Avatar, lugar e reações sincronizados com os outros ouvintes pelo Socket.IO.
- Sem avatares fictícios. O servidor associa mudanças ao socket autenticado que já entrou na sala.
- Validação de lugares ocupados e limites de tamanho no servidor.
- Preferências visuais da sala são temporárias, não alteram o perfil global.

## Limitações e cuidados
- Apenas 24 assentos visuais; participantes excedentes continuam na contagem da sala, mas não têm assento representado.
- Posições e avatar temporário reiniciam ao sair/reentrar na sala.
- Sem movimentação contínua, voz ou áudio espacial nesta etapa.
- Não modifica a landing page, login Firebase, fila, reprodução do YouTube nem o sistema de administração.
- Instale o `server.js` desta versão antes de usar a seleção de lugares no navegador.
- **Atenção:** o problema de login admin relatado anteriormente não foi diagnosticado nem corrigido aqui.

## Validação
Sintaxe de JavaScript e integridade do ZIP verificadas localmente. A sincronização com usuários reais requer validação com Firebase e Socket.IO em ambiente publicado.
