# 🎧 VibeChat

Salas colaborativas de música onde todo mundo adiciona suas músicas do YouTube e conversa em tempo real — como um show, mas com você no controle da playlist.

![VibeChat](https://img.shields.io/badge/version-2.0.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-purple)

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

## 🚀 Tecnologias

- **Frontend:** HTML5, CSS3, JavaScript (vanilla), YouTube IFrame Player API
- **Backend:** Node.js, Express, Socket.io, Firebase Admin (Firestore)
- **Auth:** Firebase Authentication (e-mail/senha)

## 📁 Estrutura

```
vibechat/
├── public/
│   └── index.html      ← frontend completo
├── server.js           ← backend + Socket.io
├── package.json
├── Dockerfile
└── .env.example
```

## ⚙️ Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Chave de serviço do Firebase Admin (JSON em uma linha) |
| `FIREBASE_CLIENT_CONFIG` | Config do Firebase **cliente** (o JSON que antes ficava no HTML) |
| `YOUTUBE_API_KEY` | Chave da API do YouTube (busca de vídeos) |
| `PORT` | Porta (o Render define automaticamente) |

## 🔒 Segurança

- Config do Firebase cliente é servida pelo backend (`GET /api/firebase-config`, via env var) — nenhuma chave no HTML
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

O e-mail `admin@sonora.com` é admin global por padrão (definido em `server.js`, variável `adminEmails`).

---

Desenvolvido com 🎶 por Guilherme Giuntini
