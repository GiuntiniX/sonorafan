# SonoraFan 75.0 — Fila ampliada e exclusão de Fan Club

**Atualização incremental sobre a versão 74.0.** Faça backup do projeto e dos dados do Firestore antes de aplicar.

## Arquivos para atualizar

| Caminho no projeto | Ação |
|---|---|
| `fan-clubs-71.js` | **Substituir** na raiz — nova rota autenticada de exclusão |
| `public/sonorafan-community-71.js` | **Substituir** — botão de exclusão e confirmação por nome |
| `public/index.html` | **Substituir** — carregar o novo CSS da versão 75 |
| `public/sonorafan-fila-fanclub-75.css` | **Adicionar** — fila ampliada, separação do formulário e estilos de exclusão |
| `tests/fan-clubs-75.test.js` | Teste automatizado opcional |

Os demais arquivos, inclusive `server.js`, continuam os mesmos da base **74.0**. Como o módulo `fan-clubs-71.js` é carregado pelo servidor Node.js, **é necessário reiniciar o Node.js**.

## 1. Fila colaborativa

- Em desktop, a grade reserva menos altura para o formulário de adicionar música e mais para a playlist.
- A fila utiliza o espaço restante, e músicas adicionais permanecem acessíveis pelo scroll interno.
- A fila não invade o formulário abaixo. As votações e os controles existentes continuam intactos.
- Em mobile, o layout da aba Fila é respeitado; a fila não aparece na tela do player antes que a aba seja selecionada.

## 2. Excluir Fan Club

- Criador **ou administrador global** pode visualizar o botão `Excluir Fan Club` dentro do detalhe da comunidade.
- A interface exige **digitar o nome exato do Fan Club** para confirmar. Erros e cancelamento deixam o grupo intacto.
- O servidor verifica a sessão, o papel do solicitante e a confirmação; manipular o HTML não dá permissão a outros usuários.
- Exclui de modo **permanente**: cadastro da comunidade, vínculos de membros, imagem de capa e publicações do mural.
- **Não apaga as salas de música** que estavam vinculadas ao Fan Club — elas seguem independentes.
- As conexões de atualização ao vivo do mural são encerradas quando a comunidade é excluída.
- Durante a exclusão, a comunidade é marcada como indisponível para impedir novas operações. Se a remoção dos documentos falhar, uma nova tentativa autorizada pela mesma rota pode completar a limpeza.
- Notificações enviadas anteriormente podem permanecer no histórico de notificações, mas não reabrem uma comunidade excluída.

## Testes

Com Node.js instalado na raiz do projeto, execute:

```bash
node --test tests/fan-clubs-75.test.js
```

Testes locais executados: **14 testes de backend passaram**, cobrindo autenticação, permissão do criador e administrador, confirmação exata, remoção da capa e 110 publicações, preservação de salas e encerramento do canal ao vivo. A janela de exclusão foi verificada no navegador em **1440px e 390px**, inclusive confirmação incorreta e correta. A grade da fila foi examinada com seis faixas simuladas no desktop; no mobile foi verificado que a aba continua oculta até seleção.

**Limite:** a integração publicada com Firebase/Firestore e a reprodução YouTube em sala real ainda precisam de validação no seu ambiente. A exclusão é irreversível; faça backup do Firestore antes de testar com uma comunidade que contenha dados importantes.
