# SonoraFan 52.0 — UX, acessibilidade e votação refinada

**Base:** instalar sobre a versão 51.1 (a atualização 51.1 corrige o cabeçalho de Favoritas). Preserve os outros arquivos da plataforma, imagens, `gamification-45.js` e dados Firebase.

## Arquivos alterados
| Arquivo | Ação |
|---|---|
| `server.js` | Substituir na raiz (é necessário reiniciar o Node.js) |
| `public/index.html` | Substituir |
| `public/sonorafan-ux-50.js` | Substituir (módulo de Design/UX da versão 50, preservando filtros e Club) |
| `public/sonorafan-votos-ux-52.css` | Adicionar |
| `tests/voting52.test.js` | Opcional: testes automatizados |

## Mudanças
- **Modo Foco retirado:** removidos seus dois botões, painel explicativo, atalhos, persistência e tecla de atalho `F`. A sala volta a priorizar o modo social único, mantendo abas mobile, vídeo, fila e chat.
- **Votação clara:** dois botões independentes com contagens reais, 👍 Apoiar e 👎 Pedir remoção (N/10). O saldo misturado foi eliminado; cada botão indica quando está selecionado.
- **Desfazer/trocar voto:** servidor trata novo clique na opção selecionada como remoção do voto; trocar de opção altera o voto. Um usuário só pode escolher uma opção por música.
- **Regras mantidas:** a votação negativa retira uma faixa futura após 10 votos 👎; a faixa atual é gerenciada pelo botão **Pular faixa** separado; votar positivo não reordena a fila automaticamente.
- **XP preservado:** o servidor usa a base da v45 e mantém a proteção contra duplicidade dos XP de voto do Club (sem zerar pontos, medição ou missões).
- **Acessibilidade:** links para pular ao conteúdo, foco de teclado visível, botões de voto com `aria-pressed` e nomes descritivos, feedback anunciado, alvo de toque maior e suporte a redução de movimento.

## Instalação
1. Faça backup de `server.js` e `public/index.html`, e da coleção `points` do Firestore.
2. Extraia os arquivos preservando `public/` e `tests/`; mantenha `.env`, Firebase, `gamification-45.js`, as imagens antigas e os demais arquivos.
3. Reinicie o Node.js e faça Ctrl+F5 no navegador. Teste com duas contas diferentes na mesma sala.
4. Confirme 👍, 👎, troca e retirada de voto, que a música atual não recebe esses votos e que os XP antigos e o ranking do Club continuam corretos.

## Limitação
Os testes automatizados executam sem conexão real ao Firebase, Socket.IO ou YouTube. É necessário testar a sincronização com dois usuários no ambiente publicado antes de implantar em produção.
