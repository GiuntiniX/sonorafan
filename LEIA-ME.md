# SonoraFan 5.0 — Comunidade e Perfil | Apenas arquivos alterados

Base: **SonoraFan Sala Imersiva Layout Referência / Social 4**.

## Substitua
- `server.js` na raiz
- `public/index.html`

## Adicione
- `public/community-5.css`
- `public/community-5.js`

Não substitua os outros arquivos do projeto. Landing page, player, fila, Firebase, salas e eventos existentes continuam na versão-base.

## Novidades
- A área de Amigos/Eventos foi retirada visualmente do lobby e aberta pelo menu **Comunidade**.
- O usuário pode abrir o Perfil no menu da sala ou cabeçalho do lobby/sala.
- Perfil: nome público, bio, até 6 gêneros, cor e opção de ocultar presença pública dos amigos.
- Dados do perfil são gravados no Firestore pelo servidor autenticado.
- O servidor continua sem revelar sala privada na atividade social.
- O avatar continua usando a seleção existente na plataforma.

## Limitações
- A edição de nome aparece nas sessões de chat **após sair e entrar novamente** na sala.
- Não foram implementados uploads de imagem nem estatísticas históricas não existentes.
- O pacote exige os demais arquivos da versão-base, como `social-4.js` e `room-reference.css`.
- Requer validação com Firestore/Socket.IO real antes de publicar.
