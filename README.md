# 🎧 SonoraFan

Salas colaborativas de música onde todo mundo adiciona suas músicas do YouTube e conversa em tempo real — como um show, mas com você no controle da playlist.

![SonoraFan](https://img.shields.io/badge/version-2.0.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-22%2B-green)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-purple)

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
