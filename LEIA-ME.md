# SonoraFan 53.0 — Chat Social Completo

**Base para instalação: versão 52.0** (com a gamificação da 45.0 e os demais arquivos anteriores preservados).

## Arquivos deste pacote

| Arquivo | Ação |
|---|---|
| `server.js` | Substituir na raiz |
| `chat-social-53.js` | Adicionar na raiz |
| `public/index.html` | Substituir |
| `public/sonorafan-chat-53.css` | Adicionar |
| `public/sonorafan-chat-53.js` | Adicionar |
| `tests/chat53.test.js` | Testes opcionais (não carregados em produção) |

**Não substituir nem remover:** `.env`, `package.json`, `gamification-45.js`, `room-settings.js`, imagens e arquivos CSS/JS anteriores que o `index.html` referencie.

## Novas funções

1. Clique no **nickname** de alguém que está na sala: **Mencionar** (já existente), **Mensagem privada**, **Seguir**, **Bloquear** e **Copiar nickname**.
2. Chat da sala: **Responder mensagem**, **cinco reações por emoji** (toque para ativar/remover), menções com aviso pessoal e **Denunciar**.
3. **Caixa de Entrada** no lobby e na sala, com busca de pessoas, conversas recentes, contagem de não lidas e histórico privado.
4. Conversas privadas persistidas no **Firestore**, atualizadas via **Socket.IO** quando os usuários autenticam seus sockets; a leitura também funciona por HTTP quando o socket está indisponível.
5. **Privacidade**: permitir mensagens de todos, apenas pessoas que você segue ou de ninguém; desligar notificações; bloqueio bidirecional para novas mensagens.
6. **Contatos**: lista de pessoas seguidas com indicador apenas quando participam de salas públicas e permitem divulgar atividade.
7. **Denúncias** registradas no Firestore e disponíveis ao admin na seção **Moderação** → **Denúncias do chat**.

## Instalação

1. Faça backup do código e do Firestore antes da atualização.
2. Extraia o ZIP na raiz do repositório e substitua os arquivos indicados.
3. Reinicie o Node.js para carregar `chat-social-53.js` junto com o novo `server.js`.
4. Atualize o navegador com **Ctrl + F5**.
5. Teste com duas contas: ambos em uma sala, menção pública, resposta, reação e mensagem privada. Teste bloqueio, privacidade, notificações e denúncia com uma conta administrativa.

O Firebase Admin SDK deve estar configurado com credenciais válidas, pois esta versão cria automaticamente as coleções: `chatSettings53`, `chatConversations53` (com subcoleção `messages`) e `chatReports53`. A leitura de conversas e a autenticação são verificadas no servidor.

## Segurança e limitações

- Os dados são armazenados no Firestore; **não há criptografia ponta a ponta**. Não apresente o recurso como mensagens criptografadas entre os usuários.
- Conversas privadas usam IDs derivados de contas autenticadas, não apenas apelidos; o servidor verifica acesso e bloqueios, limita requisições e não envia e-mails pessoais nas respostas das APIs.
- Contadores de reações e respostas **públicas** pertencem ao histórico em memória da sala; não sobrevivem ao reinício do servidor. Mensagens **privadas** são persistentes.
- O histórico privado é paginado com limite de 80 mensagens recentes por solicitação, mas esta versão não implementa ainda paginação completa, exportação ou exclusão definitiva do histórico. Defina política de retenção/eliminação antes de operar em grande escala.
- As notificações de menção e DM usam o sistema social existente. É necessário permitir o tráfego de eventos Socket.IO no servidor publicado.
- `tests/chat53.test.js` usa dados simulados e pode ser executado com `node tests/chat53.test.js`. O teste com múltiplas contas reais e regras publicadas ainda é obrigatório.
