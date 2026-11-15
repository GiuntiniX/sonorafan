# SonoraFan 69.0 — Comunidade limpa e amigos conectados

Pacote incremental **sobre a versão 68.0**. Inclui apenas arquivos novos ou modificados desta etapa. As comunidades permanentes por artista **ainda não foram implementadas**; o documento separa a ideia da entrega realizada.

## Arquivos

- `server.js` — **substituir** na raiz.
- `chat-social-53.js` — **substituir** na raiz.
- `public/index.html` — **substituir**.
- `public/social-4.js` — **substituir**.
- `public/sonorafan-social-69.css` — **adicionar**.
- `public/art-33/flowers.webp` — **substituir** por versão transparente para neutralizar as decorações antigas que exibiam texto recortado.

## Novidades implementadas

**Presença de amigos:** a API `/api/social/following` indica se as contas seguidas estão conectadas, sem revelar a atividade de quem desligou a opção de visibilidade. O módulo de mensagens privadas utiliza a mesma regra para a lista de contatos. A presença é baseada na identidade autenticada, nunca no nickname escrito pelo cliente.

**Interações:** usuários seguidos aparecem com status e ordenados por online primeiro. É possível abrir mensagem privada, entrar em uma sala pública onde a pessoa já está ou convidá-la para outra sala pública. Convites usam `/api/social/invite-friend` já existente no servidor, que valida a relação de seguir e a visibilidade da sala.

**Remoção do material floral:** removidos os elementos de flores no perfil, neutralizadas as regras de decoração floral antigas e substituído o arquivo `art-33/flowers.webp` (que continha parte do texto "erme"). Um símbolo musical discreto substitui a decoração no cabeçalho da Comunidade.

## Instalação

1. Faça backup da versão 68.0, incluindo `server.js`, `chat-social-53.js` e a pasta `public/`.
2. Substitua os arquivos correspondentes pelos deste ZIP, mantendo **todos os demais módulos** e imagens existentes.
3. Reinicie Node.js: o `server.js` e `chat-social-53.js` foram modificados.
4. Faça atualização forçada do navegador (`Ctrl + F5`) para descartar a imagem floral do cache.
5. Teste com **duas contas reais**: seguimento, status online no lobby, mensagem privada, convite para sala pública, e privacidade com “mostrar atividade” desativada.

## Próxima proposta — Comunidades de fãs por artista

Desenvolver um módulo de comunidades permanentes por artista, com criação por usuário, listagem/busca, entrada/saída, regras e moderadores, mural de mensagens, eventos e salas públicas vinculadas. Essas funções **não fazem parte deste ZIP**.

## Limites

- Prévia do frontend validada com API simulada em 1440 px e 390 px; fluxos reais com Firebase e Socket.IO publicados devem ser validados no ambiente de implantação.
- Presença online é disponibilizada apenas a usuários que você segue e que não ocultaram sua atividade. “Offline ou presença oculta” evita revelar dados privados.
- Imagens compostas de banners de festival, que podem conter desenhos integrados, foram preservadas. A arte avulsa de flores com texto quebrado foi removida em todos os locais que a referenciavam.
