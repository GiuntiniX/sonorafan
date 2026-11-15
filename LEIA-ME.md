# SonoraFan 63.0 — Evolução 57–63 + Home e Tour

Pacote incremental para aplicar **sobre SonoraFan 56.0**.
Contém **somente arquivos novos ou alterados**. Preserve as demais dependências, as artes e seu arquivo de ambiente.

## Arquivos

- `server.js` — **substituir** na raiz do projeto.
- `sonorafan-platform-63.js` — **adicionar** na raiz, ao lado de `server.js`.
- `public/index.html` — **substituir**.
- `public/sonorafan-evolution-63.css` — **adicionar**.
- `public/sonorafan-evolution-63.js` — **adicionar**.
- `tests/sonorafan63.test.js` — **adicionar**, para os testes opcionais.

## O que muda, por etapa

- **57 — Fila e busca**: novas salas usam distribuição justa por padrão; quando há 2 ou mais ouvintes, limita a 5 faixas futuras pendentes por pessoa. Salas existentes e regras de votação foram preservadas. Nova aba de busca reúne pesquisa YouTube e favoritos, mantendo o fluxo de confirmação de músicas original.
- **58 — Social**: painel compacto de conversas recentes, amigos, notificações e convites. Fixação de conversas por navegador. Mantém mensagens privadas, reações, bloqueios e permissões existentes da 53.0.
- **59 — Descoberta**: ranqueamento das salas públicas por gêneros favoritos persistidos, execução real, participantes e música atual. Sem inventar ouvintes, músicas ou eventos.
- **60 — Batalha Musical**: votação autenticada entre as duas próximas músicas durante 90 segundos; intervalo de 2 minutos entre rodadas. Exige estar conectado à sala. Recompensas no servidor: 4 XP por participação e 12 XP por voto vencedor (quando há vencedor). As batalhas não alteram a ordem da playlist.
- **61 — Passaporte e desafio coletivo**: carimbos por estilo realmente visitado em salas públicas, mais 12 XP por gênero novo; medalha e XP adicionais ao completar 8 estilos. Desafio semanal coletivo: 5 faixas diferentes de pelo menos 3 participantes, 25 XP para contribuidores elegíveis.
- **62 — Histórico e setlist**: registro das faixas concluídas **a partir desta atualização** em Firestore, com histórico no painel e exportação CSV. Não recupera sessões anteriores.
- **63 — UX e desempenho**: novidades reunidas em um único painel de seis abas para não empurrar as salas para baixo. Home com dimensões e animações ajustadas; conteúdo exemplificativo substituído por dados reais quando disponíveis. Tour atualizado para entrada, lobby e sala; suporte a teclado e redução de movimento.

## Instalação

1. Faça **backup** do código e dos dados do Firestore antes de atualizar, especialmente a coleção `points`.
2. Mantenha o projeto na **versão 56.0** (incluindo todas as dependências dos pacotes anteriores).
3. Substitua `server.js` e `public/index.html` pelos deste ZIP.
4. Adicione o novo `sonorafan-platform-63.js` na raiz e os dois módulos `sonorafan-evolution-63.*` em `public/`.
5. **Não remova** `gamification-45.js`, `chat-social-53.js`, `room-settings.js`, `package.json`, a configuração Firebase, nem os estilos e imagens antigos. Não substitua `.env`.
6. Reinicie o Node.js e recarregue o navegador com **Ctrl+F5**. Verifique se os novos arquivos CSS/JS retornam HTTP 200.

### Testes

Execute `node tests/sonorafan63.test.js`. Testes automatizados verificam as recompensas sem reinicializar os pontos antigos, progresso, desafio coletivo, votação, histórico, CSV e referências HTML.

Faça teste de integração no ambiente publicado com **pelo menos duas contas**: login, entrar na mesma sala, adicionar músicas, verificar justiça da fila, votar em batalha, atualizar progresso do passaporte e desafio, concluir faixas, exportar a setlist, abrir mensagens privadas e executar o tour em celular e computador.

## Limitações e segurança

- **Não foram realizados testes de ponta a ponta com Firebase, YouTube e Socket.IO publicados**: testes unitários de backend e prévias HTML/CSS isoladas não substituem essa validação.
- Batalhas em andamento ficam em memória e são perdidas se o Node.js reiniciar; as recompensas já concedidas, desafios, carimbos e histórico permanecem no Firestore.
- A descoberta personalizada depende de preferências salvas e dos estilos inferidos do nome/descrição da sala.
- Novas recompensas de XP utilizam transações na mesma coleção `points` da gamificação 45.0; não há migração ou exclusão do XP anterior.
- A configuração de permissões do Firestore e o consumo de cotas do YouTube devem ser conferidos antes da publicação em produção.
