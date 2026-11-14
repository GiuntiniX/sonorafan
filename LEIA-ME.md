# SonoraFan 23.0 — Personagens Chibi e Perfil Firebase

Atualização incremental sobre a versão **22.0**.

## Arquivos alterados
- `server.js` — substituir
- `public/index.html` — substituir
- `public/room-interactive-19.js` — substituir
- `public/room-characters-23.css` — adicionar

Mantenha todos os outros arquivos CSS/JS das versões anteriores. Reinicie o backend.

## Mudanças
- Personagens com proporções *chibi*: cabeça grande, corpo pequeno, olhos, expressões, roupa e acessórios.
- O usuário mantém as opções de cabelo, cor de roupa e acessórios já existentes.
- Novas rotas autenticadas `GET /api/avatar/me` e `PATCH /api/avatar/me` (perfil próprio).
- Ao personalizar pela sala, o servidor valida e salva `stageAvatar` e `stageLook` no documento do usuário no Firestore.
- Ao entrar em qualquer sala, o servidor recupera a aparência persistida. Posição na pista e movimento permanecem temporários.
- A busca de músicas, fila colaborativa, player e permissões de sala são preservados.

## Segurança e privacidade
- Nunca usa e-mail enviado pelo navegador para selecionar o perfil; usa a sessão autenticada.
- Avatar e aparência aceitam apenas valores de listas definidas no servidor.
- Não inclui credenciais Firebase no ZIP.

## Validação
Sintaxe Node.js e arquivo ZIP verificados localmente. Não foram executados testes de integração com Firestore real e múltiplos clientes Socket.IO.
