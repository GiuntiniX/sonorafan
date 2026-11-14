# SonoraFan 22.0 — Editor de personagens 2D

Aplicar sobre a **versão 21.0** (com o backend da 20.0).

## Arquivos modificados
- `server.js` — substituir; sincroniza a aparência validada no Socket.IO.
- `public/index.html` — substituir; inclui o editor no modal de avatar e o CSS.
- `public/room-interactive-19.js` — substituir; atualiza SVG e personalização.
- `public/room-characters-22.css` — adicionar; estilos do novo editor.

## Recursos
- Seis cores de roupa, seis penteados e quatro acessórios.
- Prévia imediata; os demais ouvintes veem a aparência ao receber a atualização de presença.
- Preferências da aparência lembradas neste navegador via localStorage; reaplicadas na próxima entrada na sala. Não há persistência multiplataforma no Firebase nesta etapa.
- Mantém as 24 posições, movimentos e colaboração musical da versão 20.0.
- O servidor valida cada código de aparência; não aceita HTML, URLs nem estilos arbitrários.

## Antes de publicar
Reinicie o Node.js após substituir o `server.js`. Teste com duas contas conectadas: cor da roupa, penteado, acessório, movimento e saída/reentrada. O login Firebase que foi relatado anteriormente não é alterado nesta atualização.
