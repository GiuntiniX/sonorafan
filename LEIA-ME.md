# SonoraFan 71.0 — Central Comunidade (Amigos · Fan Clubs · Eventos)

**Atualização incremental sobre a versão 70.0.** Não substitui o projeto completo. Mantenha todos os demais módulos, assets, configurações Firebase e arquivos não listados neste pacote.

## Arquivos do ZIP

| Arquivo | Instalação |
|---|---|
| `server.js` | Substituir na raiz |
| `fan-clubs-71.js` | Adicionar na raiz |
| `public/index.html` | Substituir |
| `public/social-4.js` | Substituir |
| `public/community-5.js` | Substituir |
| `public/sonorafan-community-71.css` | Adicionar |
| `public/sonorafan-community-71.js` | Adicionar |
| `tests/fan-clubs-71.test.js` | Testes opcionais |

## Funcionalidades

### Amigos
- Preserva seguir usuários, amigos online (respeitando a privacidade), mensagens privadas e convites para salas públicas.
- Usa o módulo social da versão 69.0. Nenhum dado anterior é migrado nem apagado.

### Fan Clubs (novo)
- Criar Fan Club por artista/banda, com nome, descrição, regras e tema ilustrado abstrato (vinil, palco, cassete ou ondas).
- Buscar comunidades, filtrar **Meus Fan Clubs**, participar ou sair da comunidade.
- Mural com publicações persistidas no Firestore, para membros autenticados.
- Autor ou administrador da comunidade pode excluir publicações.
- Criador pode remover e bloquear membros; também pode desbloquear.
- Criador pode vincular até 3 salas **públicas** das quais é dono; membros conseguem abrir essas salas.
- Se existirem eventos futuros relacionados às salas vinculadas, eles aparecem no detalhe do Fan Club, levando à aba Eventos para confirmar presença.
- Comunidades são identificadas como **criadas por fãs / não oficiais**.

### Eventos
- Preserva a agenda real existente, confirmações de presença e criação de eventos por donos de salas públicas.
- Nova navegação em uma aba própria, no mesmo centro social.

## Limites e decisões de segurança
- Identidade, participação e moderação são verificadas no servidor pela **sessão autenticada**, sem depender do nickname.
- Dados persistem na coleção Firestore `sonorafanFanClubs71`; publicações ficam na subcoleção `posts`.
- O servidor utiliza IDs públicos derivados da identidade e não devolve os e-mails dos participantes.
- Limites iniciais: 5 Fan Clubs criados por conta, 300 membros por Fan Club, 3 salas públicas vinculadas e 35 publicações recentes por consulta.
- As comunidades são **públicas para descoberta, com participação necessária para ler e publicar no mural**. Comunidades privadas e cargos adicionais de moderador não foram implementados nesta etapa.
- O mural é atualizado ao abrir ou clicar em **Atualizar**. Não há envio em tempo real neste recurso; amigos e eventos conservam seus mecanismos anteriores.
- Não foram alterados Firebase Auth, lógica do YouTube, XP, sistema de favoritos ou fila colaborativa.

## Instalação

1. Faça backup dos arquivos existentes, especialmente `server.js` e `public/index.html`.
2. Extraia este ZIP na raiz do projeto SonoraFan, respeitando a hierarquia dos diretórios.
3. Reinicie o processo Node.js porque há novas rotas no servidor.
4. No navegador pressione **Ctrl+F5** para limpar o cache de CSS/JS.
5. Abra **Comunidade → Fan Clubs**, crie um grupo para um artista, participe com uma segunda conta e valide o mural.
6. Se administrar uma sala pública, associe-a ao Fan Club e confira a aba Eventos.

## Testes realizados

- `node --test tests/fan-clubs-71.test.js` — testes de autenticação, criação, filiação, postagens, moderação e associação de salas.
- Validação de sintaxe de `server.js`, `fan-clubs-71.js` e scripts alterados.
- Prévia isolada em navegador Chromium para desktop (1440 px) e celular (390 px), com dados simulados.

**Não foi executada uma implantação real com Firestore e dois clientes Socket.IO simultâneos.** Teste em homologação antes de publicar.
