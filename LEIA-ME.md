# SonoraFan 72.0 — Busca estável, Favoritos simplificados e Fan Clubs ao vivo

**Pacote incremental sobre o SonoraFan 71.0.** Não é o projeto completo. Faça backup da aplicação antes de substituir os arquivos. Preserve o `.env`, os assets e as demais dependências anteriores.

## Arquivos alterados

| Arquivo | Ação |
|---|---|
| `server.js` | Substituir na raiz |
| `fan-clubs-71.js` | Substituir na raiz |
| `public/index.html` | Substituir |
| `public/sonorafan-evolution-63.js` | Substituir |
| `public/sonorafan-menu-favorites-67.js` | Substituir |
| `public/sonorafan-menu-favorites-67.css` | Substituir |
| `public/sonorafan-discovery-70.js` | Substituir |
| `public/sonorafan-community-71.js` | Substituir |
| `public/social-stage3.js` | Substituir |
| `public/sonorafan-polish-72.css` | Adicionar |
| `tests/fan-clubs-72.test.js` | Testes opcionais |

## 1. Buscar músicas voltou a funcionar

Causas investigadas e corrigidas:

1. O observador de alterações de DOM reescrevia os rótulos do painel sem necessidade e disparava novas alterações em ciclo.
2. A janela `Favoritar / Escolher categoria` usava `z-index: 1300`, mas a janela `Descobrir músicas` usava `z-index: 10050`, deixando o fluxo de classificação invisível/sem clique.

Correções: observador idempotente, alterações do DOM agendadas, janela de favoritos com camada superior, limite de espera em requisições, estados de falha, Esc e foco por teclado, proteção contra salvamentos duplicados.

## 2. Favoritos organizados por categoria

- **Todas**: os seletores de gênero continuam disponíveis para organizar ou transferir músicas.
- **Rock, MPB, Indie e qualquer categoria criada**: mostra apenas as músicas da categoria, sem repetir um seletor de gênero em cada faixa.
- As categorias existentes e músicas salvas no Firestore são preservadas.
- Excluir a categoria continua trazendo suas faixas para `Sem gênero`, conforme a versão 67.

## 3. Menu sem Mais/Menos opções

- Removida a criação dinâmica desse botão no lobby e na sala.
- Todos os atalhos permanecem acessíveis, em formato compacto e com brilho suave nos ícones.
- O botão independente de recolher/reabrir **o menu lateral da sala** continua existindo no lado direito do cabeçalho.

## 4. Comunidade: Fan Clubs com atualizações e notificações

- O mural de um Fan Club aberto atualiza automaticamente quando alguém publica ou exclui uma publicação.
- Foi criada uma rota **SSE (Server-Sent Events)** autenticada: `/api/fan-clubs/:id/stream`.
- Apenas membros autorizados recebem o canal; remover ou bloquear um membro encerra a conexão.
- O aviso de mudança no canal contém **somente identificador e tipo de evento**, nunca o conteúdo do mural.
- As publicações continuam sendo obtidas pela rota autenticada existente.
- Novas publicações geram notificações no sistema social para membros cadastrados, exceto o autor, usando a estrutura existente de notificações.
- Na notificação, o usuário pode clicar em **Abrir Fan Club**.
- A conexão SSE é encerrada ao trocar de aba, sair do Fan Club ou fechar a Comunidade.
- Sem suporte nativo a EventSource, o mural usa atualização periódica de 25 segundos enquanto a comunidade estiver aberta.

**Infraestrutura:** a conexão SSE usa `text/event-stream`, `Cache-Control: no-store`, `Content-Encoding: identity`, `X-Accel-Buffering: no` e heartbeat. Garanta que seu proxy não armazene essas respostas em buffer nem encerre conexões longas prematuramente. Notificações são entregues em lotes assíncronos e podem falhar temporariamente sem desfazer a publicação.

## Instalação

1. Faça backup da versão 71.0 e da configuração Firebase.
2. Extraia este ZIP na **raiz** do projeto SonoraFan, respeitando a pasta `public/`.
3. Substitua os arquivos correspondentes e adicione `public/sonorafan-polish-72.css`.
4. **Reinicie o Node.js**, pois existem alterações no servidor e nos Fan Clubs.
5. Atualize o navegador com **Ctrl + F5**.
6. Abra `Descobrir músicas`, faça uma busca e salve uma favorita em Rock. Confirme que a categoria Rock lista apenas suas músicas e que `Todas` continua permitindo trocar o gênero.
7. Confira os menus do lobby e da sala, incluindo o botão de recolhimento independente.
8. Com duas contas reais, entre no mesmo Fan Club, publique pelo primeiro perfil e confira a atualização do mural e a notificação no segundo perfil. Teste também saída e bloqueio.

## Validações feitas nesta entrega

- **8 testes automatizados** do backend, incluindo sessão/membros, publicações, moderação, vínculo de salas, SSE sem vazamento de conteúdo e encerramento de conexões.
- Testes isolados em Chromium (1440 px e 390 px), com API simulada: abertura de Descobrir músicas, busca, favoritar, classificar, alternar Rock/Todas e receber atualização do mural, sem erro JavaScript.
- Sintaxe dos scripts, IDs únicos no HTML, parsing dos novos CSS, referências de assets verificadas contra a base anterior e integridade do ZIP.

**Limite de validação:** não foi possível abrir a aplicação completa via localhost no Chromium de teste deste ambiente. Não foram executados testes reais com Firebase publicado, YouTube ou duas sessões de produção. Os fluxos críticos devem ser verificados em homologação antes de substituir a produção. A revisão não equivale a uma auditoria integral de segurança da aplicação.

## Preservado

Firebase Auth, YouTube, Socket.IO das salas, XP, missões, fila, votação, histórico de músicas, páginas e configurações anteriores. Nenhum dado do Firestore foi alterado ou migrado por este pacote.
