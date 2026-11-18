# 🎧 SonoraFan

Salas colaborativas de música onde todo mundo adiciona suas músicas do YouTube e conversa em tempo real — como um show, mas com você no controle da playlist.

![SonoraFan](https://img.shields.io/badge/version-2.0.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-22%2B-green)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-purple)

## ✦ Meu Perfil 6.0 — Minha Jornada e Estúdio de Avatares

O Meu Perfil integra **Minha Jornada, Biblioteca, DNA musical, Comunidade e Avatares** na mesma janela, preservando todos os dados existentes. A antiga identidade de gamificação "SonoraFan Club" foi renomeada na experiência do usuário para **Minha Jornada**, evitando confusão com os **Fan Clubs**, que são comunidades e fóruns.

### Navegação e compatibilidade

- **Meu Perfil:** bio e gostos musicais, além do resumo do progresso, sem modal extra.
- **Minha Jornada:** XP, nível, progresso, missões diárias/semanais, medalhas históricas e novas, histórico real de eventos, seleção de até três medalhas, marcos de participação e quatro trilhas visuais de especialização (DJ, Explorador, Especialista e Comunidade).
- **Minha Biblioteca:** preserva mixtapes, favoritos, artistas e salas previamente implementados.
- **Meu DNA:** continua baseado em contribuições reais, não presume tempo de audição.
- **Comunidade:** participação nos Fan Clubs, pontuação de reputação e respostas aceitas; integra o Fórum 6.0 sem reintroduzir compartilhamento de músicas.
- **Avatares:** seção dedicada com 40 personagens ilustrados originais, filtros por estilo e busca por texto.

Os atalhos antigos `window.sf45OpenClub()` redirecionam para `window.sf112OpenProfile('achievements')` sem exigir migração ou alterar as rotas históricas. O Ranking 6.0 continua acessível pelo perfil, mas não duplica a pontuação.

### Personagens e identidade

O catálogo compartilhado `avatar-catalog-60.js` contém oito personagens originais existentes e 32 novas ilustrações vetoriais locais em `public/avatars-108/`. Os estilos incluem músicas urbanas e brasileiras, robôs, cyberpunk, personagens cósmicos, fantasias, visuais tropicais e diversas apresentações de gênero. **Qualquer pessoa pode escolher qualquer personagem** sem informação obrigatória sobre gênero. O endpoint autenticado `GET /api/profile108/characters` lista o catálogo e o endpoint legado `POST /api/profile108/avatar` valida estritamente os 40 IDs; caminhos externos ou arbitrários não são aceitos. Upload de foto JPEG otimizada continua disponível.

### Gamificação preservada e ampliada

- XP histórico continua em `points/{email}`, com níveis e missões originais intactos.
- O catálogo recebe oito medalhas cosméticas adicionais associadas a limiares de participação validada (músicas, salas, votos, curtidas e Fan Clubs), sem XP extra automático.
- Marcos já comprovados por contadores históricos são reconhecidos na leitura sem alterar documentos legados.
- Especializações são visualizações distintas dos contadores de atividades verificadas; não concedem XP nem reputação sem validação.
- Reputação do Fórum continua segregada do XP musical, e a vitrine de medalhas usa a API de preferências do Ranking 6.0.
- Design mantém a identidade dark/indie com destaques verde-limão, navegação mobile, foco de teclado, textos alternativos e preferência de movimento reduzido.

### Arquivos e testes

- `public/sonorafan-profile-library-112.js` — Minha Jornada e Comunidade
- `public/sonorafan-profile-108.js` — galeria de 40 avatares
- `sonorafan-profile-108.js` — validação e API do catálogo
- `public/sonorafan-profile-60.css` — layout integrado e responsivo
- `tests/profile-60.test.js` — integridade dos desenhos, compatibilidade, conquistas e acessibilidade
- `.github/workflows/sonorafan-checks.yml` — verificações de sintaxe e testes

O código e os testes automatizados não substituem a verificação do deploy no Render nem a inspeção manual em desktop e dispositivos móveis.

## ✦ Ranking 6.0 — temporadas, conquistas e Hall da Fama

O antigo modal de 420 px foi substituído por uma central responsiva em cinco seções: **Ranking, Meu progresso, Conquistas, Desafios e Hall da Fama**. O mesmo guide dark/roxo/lima do SonoraFan é preservado.

### 20 pontos de evolução
1. Ranking global histórico com XP legado preservado (`points/{email}`).
2. Ranking semanal com XP validado no servidor.
3. Ranking mensal com XP validado no servidor.
4. Posição pessoal até o limite consultado e pontuação pessoal precisa mesmo fora desse recorte.
5. Classificação Top 50 com pódio para os três primeiros.
6. Ranking de DJ com XP por música validado, separado do total de XP.
7. Reputação do Fórum separada do ranking musical, somente por respostas escolhidas em dúvidas.
8. Perfil de progressão com nível, XP e atividades recentes.
9. Barra de progressão para o próximo nível legado.
10. Catálogo de medalhas desbloqueadas e ainda bloqueadas.
11. Missões diárias existentes com progresso e recompensa real.
12. Missões semanais existentes com progresso e recompensa real.
13. Desafio comunitário de respostas aceitas, sem geração artificial de XP.
14. Marcos de participação de 30, 90 e 365 dias quando a conta tem data de criação válida.
15. Hall da Fama de períodos encerrados, sem campeões fictícios.
16. Vitrine de até três medalhas conquistadas por participante.
17. Comparação opcional de progresso com participantes visíveis no ranking.
18. Destaques de membros da comunidade via filtro de reputação do Fórum.
19. Transparência dos ganhos recentes de XP e opção de privacidade do perfil público.
20. Proteções por transação, idempotência, limite diário de reputação, testes e responsividade.

### Modelo de dados e segurança
- **XP histórico:** continua em `points/{email}`. Níveis, medalhas e recompensas anteriores não são zerados.
- **Temporadas:** `ranking60Weeks/{semana}/players/{id}` e `ranking60Months/{mes}/players/{id}`. Apenas os eventos validados pelo `gamification-45.js` passam a contabilizar XP nessas temporadas a partir da implantação da versão 6.0. Não há histórico de temporadas inventado para pontos anteriores.
- **DJ:** `ranking60.djXP` registra a pontuação musical validada a partir da v6.0; o XP acumulado antigo continua no ranking geral.
- **Reputação:** `ranking60Reputation/{id}` e registros por semana/mês. Uma dúvida gera no máximo uma recompensa de 15 pontos de reputação por resposta aceita; o limite é de três concessões por dia a cada participante. Não altera XP musical nem pode ser concedida pelo navegador.
- **Desafio coletivo:** `ranking60CommunityWeeks/{semana}`, atualizado juntamente com a reputação verificada do Fórum.
- **Privacidade:** `ranking60Preferences/{id}` permite ocultar o perfil e destacar até três medalhas que de fato constem entre as conquistadas. A ocultação também se aplica a campeões históricos.
- **Hall da Fama:** consulta semanas e meses já encerrados com dados reais. Não fabrica temporadas ou vencedores anteriores.
- **Limitação de escala declarada:** cada consulta do ranking examina até 500 participantes elegíveis; a aplicação indica quando o recorte pode ser parcial. Colocação fora do recorte é desconhecida, nunca estimada; a pontuação pessoal continua exata.

### Endpoints do Ranking 6.0
- `GET /api/ranking60?period=week|month|all&category=overall|dj|forum`
- `GET /api/ranking60/me`
- `GET /api/ranking60/hall`
- `POST /api/ranking60/preferences`

Nenhum endpoint de pontuação aceita XP ou reputação arbitrários do navegador. Eventos validados atualizam pontos e temporadas por transação Firestore. A implantação no Render e a validação visual em dispositivos reais devem ser conferidas separadamente da CI.

## ✦ Fórum 6.0 — discussões permanentes nos Fan Clubs

O Fórum 6.0 reutiliza **as mesmas coleções de posts e comentários** dos Fan Clubs, preservando os IDs, autoria, textos, datas, categorias, likes, respostas, status de dúvidas, imagens e moderação. Não há migração destrutiva nem alteração obrigatória dos posts legados. Tópicos antigos sem título recebem um **título derivado somente na leitura**.

- **Tópicos individuais:** título, descrição, até cinco tags normalizadas, categoria, autor e atividade recente.
- **Permalinks:** `#fanclub/<id-do-clube>/topic/<id-do-post>`, preservando os identificadores existentes, com restauração ao abrir o link.
- **Respostas encadeadas:** parentId, citações verificadas no mesmo tópico, destaque de melhor resposta e profundidade de apresentação limitada.
- **Busca no histórico:** endpoint server-side com termos no título/texto/autor/tags, filtro por categoria, tag, dúvidas sem resposta, favoritos, não lidos, e navegação por cursor para consultar registros além dos 35 posts iniciais. Cada requisição examina no máximo 800 registros; use “carregar mais” para continuar pelo arquivo.
- **Favoritos e leitura:** estado individual privado na subcoleção `forumProfiles`, com até 150 favoritos e até 150 marcadores de leitura recentes por usuário/club.
- **Tópicos relacionados:** sugestões calculadas sobre os 120 registros mais recentes, a partir de categoria e tags compartilhadas, sem recomendações de músicas.
- **Atualização em tempo real:** mantém pesquisa e discussão ativa durante os eventos do mural.
- **Segurança:** acesso condicionado à sessão e participação ativa, sem fornecer conteúdo privado de um Fan Club a visitantes de fora.
- **Guide visual:** preserva o tema dark/roxo/lima e os cinco tipos de publicação, ajustado para telas pequenas.
- **Permanecem:** dois coadministradores, bio/regras protegidas, ideias, enquetes, encontros, conquistas e salas musicais separadas do fórum.

**Nota de escala:** a busca percorre o histórico progressivamente, não utiliza um índice externo de pesquisa. Os filtros de atividade/popularidade ordenam as páginas encontradas; não representam uma classificação global de todo o arquivo. A interface precisa de verificação manual em navegador real e o deploy do Render deve ser confirmado à parte da CI.

## ✦ Fan Clubs 5.1 — evolução v180 (fórum organizado e coadministração)

Fórum do Fan Club com **cinco classificações**, integração nativa ao guide visual atual e identidade separada das salas musicais:

1. Fundo visual específico por assunto: conversa, dúvida, novidade, evento e ideia.
2. Etiquetas com ícones consistentes para cada categoria.
3. Explicação do tipo de assunto em cada publicação.
4. Prévia contextual do tipo escolhido antes de publicar.
5. Filtros por todas as cinco categorias e opção geral.
6. Contagem de posts carregados por assunto.
7. Busca textual combinada ao filtro selecionado.
8. Visualização de publicações fixadas.
9. Ordenação dos posts carregados por curtidas.
10. Botão para limpar busca e filtros.
11. Estados vazios personalizados por categoria.
12. Edição textual de publicações exclusiva do autor.
13. Registro visual de publicação editada.
14. Dúvidas podem ser marcadas como respondidas ou reabertas pelo autor/moderação.
15. Escolha de uma resposta dentro da própria discussão.
16. Remoção da resposta escolhida reabre automaticamente a dúvida.
17. Bio do Fan Club editável mediante permissão autenticada.
18. Regras do Fan Club editáveis mediante a mesma autorização.
19. **Até dois coadministradores** convidados pelo criador, com revogação e limites transacionais.
20. Testes de permissões, responsividade, estados do fórum e fluxos de edição.

**Permissões:** apenas o fundador concede ou revoga coadministração. O fundador e até dois coadministradores podem editar bio/regras. Os coadministradores mantêm moderação do conteúdo, mas não podem excluir o Fan Club nem conceder novas permissões. O administrador global do site não ganha automaticamente direito de editar a bio e as regras, a menos que também seja o fundador ou um coadministrador autorizado.

**Escopo dos filtros:** contagem, pesquisa e classificação atuam sobre as publicações carregadas no navegador; use “Carregar publicações anteriores” para ampliar a amostra. Não são indicadores do histórico completo.

## ✦ Fan Clubs 5.0 — evolução v170

Os Fan Clubs priorizam **convivência entre fãs, ideias, enquetes, eventos e comunidade**. Não existe compartilhamento de músicas no Fan Club; ouvir e adicionar músicas continua nas salas colaborativas.

### Nova distribuição visual
- A coluna **Salas do Fan Club** foi removida da tela interna e substituída por **Ideias dos fãs** (propostas, votos, planejadas e concluídas) e **Enquetes em destaque**.
- O guide atual do SonoraFan (grafite, roxo e destaque lima) permanece, com layout adaptável ao mobile e foco acessível.
- As abas Mural, Enquetes, Eventos e Membros mantêm o restante da experiência. Eventos antes exibidos na lateral agora ficam na aba própria.

### Comunidade e moderação
- Posts classificados por assunto (conversa, dúvida, novidade, evento ou ideia), comentários, fotos JPG/PNG/WebP otimizadas até 180 KiB e busca no mural.
- Notificações de novos posts, respostas, menções e encontros, com preferência individual de silenciamento no Fan Club.
- Moderadores convidados pelo criador (até dois, desde a v180), sem permissão para excluir o Fan Club, alterar capa ou nomear outros moderadores.
- Enquetes com prazo opcional de 1, 3, 7 ou 14 dias e votação limitada a uma por usuário.
- Ideias com apoio revogável, estados em discussão, planejada, realizada e encerrada; não geram XP por votos repetidos.
- Encontros próprios da comunidade, independentes de salas, com RSVP e convite de calendário (arquivo ICS).
- Diretório de membros, destaque de contribuidores, denúncias privadas e indicadores agregados visíveis apenas para a moderação.
- Mural com paginação por cursor de documento para evitar perda de publicações com timestamps iguais; imagens protegidas por autenticação e autorização.

### Qualidade
- Testes de backend para ideias, votos, moderadores, notificações, encontros, imagens e paginação, além de testes de estrutura visual/responsividade.
- O deploy real deve ser confirmado no Render e revisado em browser desktop e mobile antes de considerar a experiência de produção validada.

## ✦ Fan Clubs 4.0 — evolução v160

O Fan Club agora utiliza o mesmo guide visual escuro/indie do SonoraFan, com layout compacto, hero sem sobreposição, regras recolhíveis e navegação por **Mural, Enquetes, Eventos e Membros**.

- **Mural com filtros e busca local**: todos, fixados e mais curtidos; busca sobre os 35 posts carregados.
- **Comentários por publicação**: respostas persistentes, acesso por membro e exclusão por autor ou moderação.
- **Separação de experiências:** Fan Clubs concentram mural, comentários, enquetes e eventos. Compartilhamento de música e mixtapes permanece nas salas/Estúdio; não há mais botão de compartilhar música nem ranking de vídeos no Fan Club. Posts antigos são preservados.
- **Enquetes musicais**: criação e exclusão por criador/admin; membros votam uma vez por enquete, com limite de 300 votos.
- **Destaques da comunidade**: ranking de contribuições recentes, calculado por posts, comentários e curtidas recebidas; não equivale a XP.
- **Denúncias privadas**: membros podem denunciar uma publicação uma vez; apenas criador e administradores podem ver e resolver os relatos.
- **Mobile**: abas compactas roláveis, controles maiores, colunas em fluxo único e suporte a movimento reduzido.
- **Segurança**: bloqueios, acesso a membros e permissões aplicados nas rotas do servidor. Exclusões do Fan Club removem comentários, enquetes e denúncias, além de posts e capas.

Validação: `npm test` e checagens de sintaxe via GitHub Actions na `main`. Confirmar o deploy do Render e testar interações em dispositivos reais antes de considerar a versão publicada ao público.

## ✦ Fan Clubs 3.0 — evolução v151

- **Mural em destaque:** somente criadores e administradores globais podem fixar uma publicação por Fan Club. A exclusão de um post fixado remove o destaque.
- **Reações de membros:** curtidas com alternância, contagem persistente e atualização por eventos do mural; IDs dos participantes não são expostos pela API de leitura.
- **Gamificação conectada:** o primeiro novo ingresso elegível em Fan Club concede 5 XP no dia; a missão semanal **Conexão entre fãs** concede 30 XP por participação em duas comunidades diferentes. A medalha **Fã de Carteirinha** reconhece 3 comunidades distintas contabilizadas na progressão.
- **Prevenção de abuso:** ingressos repetidos não pontuam na mesma chamada, reações não geram XP, verificações de permissão ocorrem no servidor e os pontos continuam na coleção existente.
- **Qualidade:** testes novos de moderação, privacidade, curtidas, idempotência, missões e medalhas; GitHub Actions agora roda também nos Pull Requests.
- **Disponibilização:** publicar a branch de recurso, revisar a CI e validar fluxo de Fan Clubs em desktop/mobile antes do merge para `main`.

## ✦ Experience Evolution — v150

Evolução incremental sobre os módulos existentes; preserva player YouTube, fila colaborativa, chat, autenticação, Fan Clubs e permissões:

- **Performance 2.0 (primeira etapa):** cache de 90 segundos e limite de 16 consultas na busca ampliada; cache de 12 consultas na busca rápida/mobile; resultados únicos por vídeo; deduplicação e timeout em consultas de salas; renderização seletiva de cards.
- **Mobile:** alvos de toque das abas de sala e filtro de mural adaptados à área segura, ajustes em tablets e respeito ao movimento reduzido.
- **Presença social:** contagem real de amigos online e opção de entrar em salas públicas de amigos seguidos somente quando `Avisos inteligentes` estiver ativo (API de atualização respeita opt-in).
- **Identidade e conquistas:** resumo de gêneros declarados e contagem das medalhas oficiais já concedidas no perfil. Não cria pontuação fictícia.
- **Histórico:** filtro local por música, artista ou DJ na setlist existente; exportação CSV e autorização atual preservadas.
- **Busca inteligente:** resultados recentes reutilizados, sem duplicar IDs nem novas chaves do YouTube.
- **Fan Clubs (histórico v150):** filtro de recomendações musicais introduzido anteriormente; removido posteriormente para manter o foco em comunidade.
- **Temas:** refinamento de legibilidade, foco e responsividade na galeria atual; preservadas as imagens e os 14 estilos.
- **Estabilidade:** prevenção de consultas simultâneas ao Lobby, AbortController e fallback diante de falhas, sem alterar a fila.
- **Lobby:** nome da faixa tocando agora nos cards das salas públicas, quando disponível.
- **Analytics administrativo:** resumo de eventos agregados por dispositivo e amostra de atividade recente na Central de Qualidade já protegida.

**Limites desta etapa:** 87 estilos CSS continuam referenciados e demandam consolidação visual testada em uma fase posterior. Os indicadores representam eventos, não usuários únicos. Nenhuma chave de API ou configuração de ambiente foi alterada.

## ✨ Funcionalidades

- 🎵 **Fila colaborativa ilimitada** — sem limite de músicas por usuário e sem limite de fila
- 💬 **Chat ao vivo** — mensagens, reações com emojis e curtidas
- 🗳️ **Votação democrática** — votos ligados à música (não à posição na fila): 10 negativos removem, e o tocar/pausar nunca quebra os votos
- 🔴 **Salas LIVE e vídeos longos** — opção exclusiva do admin global: vídeos de até 6h e lives do YouTube que tocam até serem puladas
- 🧹 **Chat limpo** — adicionar música e votar para pular não geram mais mensagens automáticas no chat
- ⏭️ **Votação para pular** — a galera decide quando pular a música atual
- ⭐ **Favoritos** — salve músicas e readicione com um clique
- 🎛️ **Painel admin** — gerencie usuários, salas, filas e estatísticas
- 🎨 **7 temas visuais** — dark, ocean, sunset, forest, high-contrast, cherry e retro
- 🌐 **3 idiomas** — PT, EN e ES
- 🎧 **Fila de espera** — quando a sala lota (20 ouvintes), você entra automaticamente quando abrir vaga

## ✦ Estúdio SonoraFan — evolução 100–105

As experiências avançadas ficam em **Meu universo musical → Estúdio**, sem novos painéis permanentes na sala.

- **Sincronização e recuperação**: compara o tempo de reprodução com a sala em intervalos moderados, corrige atrasos no player quando autorizado e registra erros de vídeo. Vídeos restritos só avançam automaticamente após confirmação de vários ouvintes, pelo responsável, ou por verificação do YouTube em sala com apenas uma pessoa.
- **Mixtapes colaborativas**: salve a fila de uma sala pública, acrescente faixas enquanto participa e compartilhe por link. Criador controla compartilhamento e exclusão; o envio ao mural dos Fan Clubs foi descontinuado.
- **Match musical**: opt-in por conta, disponível apenas entre pessoas presentes na mesma sala pública que aceitaram participar. Comparação de gêneros declarados e artistas adicionados, sem inferir características pessoais.
- **Sessões temáticas**: extensão dos eventos existentes, com estilo, duração, contagem regressiva, inscrições e acesso à sala. Apenas o responsável pela sala agenda.
- **Avisos inteligentes**: opt-in, checagem enquanto a aplicação está aberta, permissão do navegador solicitada pela pessoa; nunca expõe atividade em salas privadas.
- **Cartão social**: imagem PNG para divulgar a música atual e a sala, com arte da capa do YouTube quando autorizada pelo navegador e fallback gráfico.
- **Layouts Ouvir e Interagir**: redistribuição de espaço entre player, fila e chat, preservando o funcionamento em notebook e mobile.
- **Paletas Aurora e Festival**: opcionais, com respeito aos temas personalizados das salas.
- **Central de qualidade**: diagnóstico agregado de falhas, sincronização, busca e disponibilidade, com acesso administrativo validado pelo servidor e sem armazenar identidade nos eventos.

**Dados e privacidade:** mixtapes são privadas até o criador ativar o link; Match e avisos são desativados por padrão; dados pessoais novos são excluídos com a conta. Métricas de qualidade ficam em memória desde o último início do servidor, e recomendações dependem da API do YouTube.

**Testes:** `npm test` executa os testes de permissões, filas, mixtapes, privacidade e integrações. O workflow verifica a sintaxe dos módulos. Para a implantação, confirme o deploy no Render e teste reprodução, notificações e autorização de mídia em navegador e celular reais.

## 🚀 Tecnologias

- **Frontend:** HTML5, CSS3, JavaScript (vanilla), YouTube IFrame Player API
- **Backend:** Node.js, Express, Socket.io, Firebase Admin (Firestore)
- **Auth:** Firebase Authentication (e-mail/senha)

## 📁 Estrutura

```
sonorafan/
├── public/
│   └── index.html      ← frontend completo
├── server.js           ← backend + Socket.io
├── package.json
├── Dockerfile
├── .node-version
└── .env.example
```

## ⚙️ Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Chave de serviço do Firebase Admin (JSON em uma linha) |
| `ADMIN_EMAILS` | E-mails de admins globais, separados por vírgula (se vazio, usa `admin@sonora.com`) |
| `NODE_ENV` | Use `production` no Render (cookie `secure`) |
| `CORS_ORIGIN` | Opcional: só se o front ficar em outro domínio |
| `YOUTUBE_API_KEY` | Chave da API do YouTube (busca de vídeos) |
| `PORT` | Porta (o Render define automaticamente) |

## 🔒 Segurança

- Login e cadastro validam o `idToken` do Firebase no servidor (a senha nunca chega ao backend)
- Sessões persistem no Firestore (guardadas como hash) e salas criadas sobrevivem a reinícios
- Headers de segurança: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- Rotas `/api/admin/*` exigem sessão de administrador (antes estavam abertas para qualquer um)
- Rate limiting em login (10/min) e cadastro (5/min)
- Cookie de sessão `httpOnly` + `secure` em produção
- CORS do Socket.io restrito à origem do próprio site
- Limite de 400 caracteres por mensagem de chat

## 💻 Rodando localmente

```bash
npm install
npm start
# → http://localhost:3000
```

## ☁️ Deploy no Render

1. Suba este projeto para um repositório no GitHub (o `index.html` **precisa estar dentro da pasta `public/`**)
2. No Render: **New → Web Service** → conecte o repositório
3. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Em **Environment Variables**, adicione:
   - `FIREBASE_SERVICE_ACCOUNT_KEY` = chave de serviço do Firebase (JSON)
   - `YOUTUBE_API_KEY` = sua chave da API do YouTube
5. Clique em **Deploy** 🚀

### Com Dockerfile (alternativa)

Se preferir, o `Dockerfile` já está pronto — o Render detecta automaticamente.

## 👑 Admin

Admins globais vêm de `ADMIN_EMAILS`. Sem essa variável, `admin@sonora.com` é usado — crie essa conta com senha forte.

## 🩺 Operação

- `GET /healthz` para o health check do Render
- Node 22 (veja `.node-version`); Dependabot e CI em `.github/`

---

Desenvolvido com 🎶 por Guilherme Giuntini
