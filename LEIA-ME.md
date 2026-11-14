# SonoraFan 45.0 — SonoraFan Club (gamificação real)

**Base:** versão **44.0** do SonoraFan (com o `server.js` consolidado mais recente da versão 16.0).

## Arquivos para instalar

| Arquivo no pacote | Ação |
|---|---|
| `server.js` | **Substituir na raiz do projeto** e reiniciar o servidor |
| `gamification-45.js` | **Adicionar na raiz do projeto**, ao lado de `server.js` |
| `public/index.html` | **Substituir** |
| `public/sonorafan-club-45.css` | **Adicionar** |
| `public/sonorafan-club-45.js` | **Adicionar** |
| `tests/gamification45.test.js` | Opcional: adicionar para executar testes |

**Não é necessário substituir:** `package.json`, `room-settings.js`, `.env`, imagens anteriores, Firebase Auth ou o player YouTube. **Preserve todos os arquivos de versões anteriores**, inclusive as pastas `public/art-33`, `public/art-40`, `public/art-41`, `public/art-44`.

## O que foi implementado

- **SonoraFan Club:** novo painel no lobby, na sala, no perfil e atalho na navegação mobile da sala.
- **XP e níveis** derivados do saldo total existente em `points/{email}.points`.
- **10 títulos**, mantendo os marcos antigos: DJ Iniciante (10), DJ Expert (50) e DJ Lendário (100). Níveis adicionais de prestígio começam a partir de 250 XP.
- **5 missões automáticas** (3 diárias, 2 semanais), com recompensas ao atingir as metas.
- **Medalhas e conquistas**: as antigas permanecem em `badges`, e as novas são adicionadas no mesmo array quando conquistadas.
- **Ranking persistente**: agora lê os maiores saldos diretamente do Firestore, em vez de depender somente da memória do servidor.
- **Atualização ao vivo**: quando uma ação válida concede XP, o Socket.IO atualiza o cabeçalho do usuário e o painel Club, se estiver aberto.
- **Histórico recente**: registra os últimos eventos de XP dentro do documento `points`.

## Regras de XP da versão 45

| Ação no servidor | XP base | Critério |
|---|---:|---|
| Primeira sala visitada no dia | +10 | Somente a primeira do dia recebe XP base |
| Música aceita na fila | +5 | Até 8 músicas distintas/dia, 1 vez por sala+vídeo/dia |
| Voto positivo válido | +1 | Até 15 votos únicos/dia |
| Curtida válida em mensagem de outra pessoa | +1 | Até 15 mensagens únicas/dia |
| Missão: primeira sala do dia | +15 | Automático |
| Missão: 2 músicas diferentes no dia | +25 | Automático |
| Missão: 3 votos diferentes no dia | +20 | Automático |
| Missão: 3 salas diferentes na semana | +50 | Automático |
| Missão: 5 músicas diferentes na semana | +50 | Automático |

Os períodos seguem **America/Sao_Paulo**. XP e resgates são validados no servidor. O navegador **não possui endpoint para creditar XP livremente**. Curtidas em mensagens próprias não concedem XP.

## Preservação dos pontos existentes

- O **saldo atual não é zerado** nem migrado para outra coleção. `points` e `badges` continuam na coleção `points`, por e-mail.
- Na primeira ação nova, a transação adiciona somente o XP conquistado e um campo `gamification` ao mesmo documento.
- Campos desconhecidos ou previamente existentes no documento são preservados (`merge: true`).
- As **medalhas antigas** permanecem; missões e histórico de ações novas começam a ser computados a partir da instalação 45.0 (não são retroativos).
- **Não exclua** a coleção `points` do Firestore.

## Instalação segura

1. Faça backup do código e, principalmente, exporte/guarde uma cópia da coleção Firestore `points` antes da implantação.
2. Extraia o ZIP preservando os caminhos relativos. Sobrescreva `server.js` e `public/index.html`. Adicione `gamification-45.js` à raiz e os dois assets ao `public/`.
3. Reinicie o processo Node.js (`npm start`, serviço ou plataforma de hospedagem).
4. Atualize o navegador com **Ctrl + F5**.
5. Entre com uma conta existente, abra **🏅 SonoraFan Club** e compare o XP ao antigo saldo. Teste adicionar uma música, votar, entrar em outra sala e atualizar o ranking.

## Testes realizados

- `node --check` no servidor, módulo de gamificação, frontend e scripts embutidos.
- 6 testes automatizados de regra de negócio e transação com simulação do Firestore: pontuação antiga, repetição de eventos, missões, virada de período, ranking e medalhas.
- Teste isolado do painel em Chromium nas larguras 1440 px e 390 px, com dados simulados e sem rolagem horizontal.
- Estrutura HTML/CSS, referências dos arquivos e integridade do ZIP.

**Limitação:** sem credenciais de produção, **não foi possível testar ao vivo** o Firebase/Firestore, a autenticação, o Socket.IO entre dois usuários ou o YouTube. Faça primeiro a implantação em ambiente de teste. Nenhuma mudança de configuração do Firebase foi necessária para o código apresentado, mas a conta de serviço deve ter permissão de leitura, escrita e transação em `points`.
