# SonoraFan 21.0 — Personagens 2D ilustrados

Esta atualização é **incremental sobre a versão 20.0**. O sistema continua 100% colaborativo: todos os participantes podem adicionar músicas, sem modos DJ exclusivos.

## Arquivos alterados
- `public/index.html` — substituir (inclui novo CSS)
- `public/room-interactive-19.js` — substituir (renderiza personagens ilustrados)
- `public/room-characters-21.css` — adicionar

## Como funciona
- Os 12 símbolos de avatar existentes passam a ter personagens 2D desenhados com SVG inline gerado no navegador, sem baixar imagens nem bibliotecas.
- As 24 posições e as animações de dança existentes permanecem.
- As reações continuam aparecendo sobre o personagem correto.
- Quem está na sala, lugar, nome e movimento ainda vêm dos eventos reais do Socket.IO.
- O servidor recebe os mesmos emojis/valores de avatar, portanto não precisa ser substituído nesta versão.
- A seleção é feita no painel de personalização existente.

## Instalação
1. Faça backup.
2. Substitua `public/index.html` e `public/room-interactive-19.js`.
3. Adicione `public/room-characters-21.css`.
4. Preserve **todos os outros arquivos** das versões anteriores, incluindo os CSS da 18, 19 e 20, e o `server.js` da 20.0.
5. Faça recarga forçada no navegador.

## Limitações
- Personagens são desenhos vetoriais estilizados com diferentes roupas, cabelos e tons; não são avatares completamente customizáveis.
- Assentos continuam temporários e são limitados a 24 posições na plateia.
- Não foram executados testes multiplayer reais com Firebase e Socket.IO.
