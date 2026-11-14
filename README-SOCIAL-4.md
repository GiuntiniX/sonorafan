# SonoraFan — Social & Eventos (itens 4 e 5 da proposta 4.0)

Este pacote parte do Premium 3.0 e adiciona uma seção **Community** no lobby (landing page inalterada).

## Amigos / atividade social
- Pesquisa de usuários pelo nome, seguir e deixar de seguir (persistidos no Firestore em `socialFollowing`).
- Mostra em qual sala **pública** alguém seguido está ouvindo; oferece entrada rápida.
- Não exibe endereço de email; usa identificadores públicos hash.
- Não revela presença em salas privadas. Não implementa pedidos de amizade recíprocos nem notificações push.

## Eventos
- Agenda pública com data, sala, anfitrião, descrição e número de confirmações.
- Donos de salas públicas e administradores globais criam eventos com 5 minutos a 90 dias de antecedência.
- Usuários autenticados podem confirmar ou cancelar presença. Eventos persistidos em `socialEvents`.
- Salas privadas não são listadas nem aceitam novos eventos públicos.
- `DELETE /api/social/events/:id` permite excluir eventos pelo criador, dono da sala ou admin global (endpoint disponível para gestão posterior).

## Arquivos alterados
- `server.js` — APIs social, evento e rastreamento de presença pública no Socket.IO.
- `public/index.html` — seção Community no lobby e imports.

## Arquivos novos
- `public/social-4.js` — interface e ações de amigos/eventos.
- `public/social-4.css` — estilo responsivo do Community.

## Publicação
1. Preserve suas variáveis de ambiente no provedor, sem fazer commit de `.env`.
2. Substitua os arquivos do projeto pela versão deste pacote.
3. Rode `npm ci`, `node --check server.js`, `node --check public/social-4.js` e `npm test` (os testes originais incluem casos não disponibilizados no pacote).
4. Verifique regras de acesso do Firebase Admin ao Firestore e teste criação/confirmação em ambiente de homologação.

Observação: o pacote não inclui segredos de produção. O agendamento cria um evento na agenda; não inicia automaticamente a reprodução na sala.
