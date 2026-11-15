# SonoraFan 67.0 — Menus compactos + Favoritos por gênero

**Atualização incremental da base 66.0.** Contém somente arquivos alterados ou necessários para compatibilidade. Aplique na raiz do projeto, respeitando a pasta `public/`.

## Arquivos

| Arquivo | O que fazer |
|---|---|
| `server.js` | Substituir na raiz do projeto |
| `favorite-genres-67.js` | Adicionar na raiz do projeto, ao lado de `server.js` |
| `public/index.html` | Substituir |
| `public/sonorafan-menu-favorites-67.css` | Adicionar |
| `public/sonorafan-menu-favorites-67.js` | Adicionar |
| `public/sonorafan-ui-65.css` e `.js` | Restaurados no pacote por compatibilidade com o seletor de ordenação customizado da versão 65 |
| `tests/favorite-genres-67.test.js` | Testes opcionais do servidor |

**Não exclua os demais CSS, JS ou imagens anteriores.** Não altere o `.env`, o Firebase nem o `package.json`.

## O que mudou

1. **Menu mais simples:** ícones de 24 px, linhas com 36 px, brilho discreto e “Mais opções” para os recursos secundários. Atalhos originais preservados. O menu do lado direito continua controlando o recolhimento da barra lateral da sala (base 66).
2. **Favoritos por gênero criado pelo usuário:** novas coleções personalizadas, criação, renomeação, exclusão, busca, filtro e organização manual de cada música. A lista completa permanece acessível em “Todas”.
3. **Músicas antigas preservadas:** músicas que já estavam salvas começam em “Sem gênero”. Excluir uma coleção devolve suas músicas para “Sem gênero”; não as exclui.
4. **Persistência entre dispositivos:** gêneros e atribuições são mantidos na coleção `favorites` do Firestore, associada à conta autenticada; não dependem só do navegador.
5. **Ordenação preservada:** `index.html` volta a carregar os arquivos de ordenação customizada da versão 65 (contraste do menu escuro).

## Passos para instalar

1. Faça **backup** do projeto e, se possível, da coleção `favorites` do Firestore.
2. Sobre o projeto na versão **66.0**, copie o conteúdo deste ZIP para a raiz, substituindo `server.js` e `public/index.html`.
3. Confirme que `favorite-genres-67.js` está **na raiz**, não em `public/`.
4. Reinicie o Node.js (as APIs de gêneros são novas) e recarregue a página com **Ctrl + F5**.
5. Entre com sua conta, abra Favoritos, crie um gênero, mova uma música, atualize a página e confira se tudo permaneceu salvo.
6. Teste o menu “Mais opções” no lobby e na sala, e o botão único à direita para recolher o menu da sala.

## Testes e limitações

- Testes Node: `node --test tests/favorite-genres-67.test.js`.
- Verificações feitas: sintaxe JavaScript, estrutura HTML, CSS, operações de criação/renomeação/atribuição/exclusão, prévias de Favoritos em desktop e celular.
- A interface foi testada em navegador isolado, com respostas simuladas da API. **A persistência no Firebase real e a sincronização em múltiplas contas precisam ser testadas no seu servidor publicado.**
- Até **24 gêneros** por usuário, com nomes de até **28 caracteres**. Não há classificação automática: a pessoa escolhe onde guardar cada faixa.
