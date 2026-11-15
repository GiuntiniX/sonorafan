# SonoraFan 73.0 — Criação de Fan Club corrigida + Capa personalizável

**Base obrigatória: SonoraFan 72.0.** Este ZIP é incremental e inclui apenas os arquivos novos/alterados da 73.0.
Faça backup dos arquivos e do banco de dados antes da instalação.

## Arquivos para substituir

| Arquivo | Ação |
|---|---|
| `server.js` | Substituir na raiz |
| `fan-clubs-71.js` | Substituir na raiz |
| `public/sonorafan-community-71.js` | Substituir |
| `public/sonorafan-community-71.css` | Substituir |
| `tests/fan-clubs-73.test.js` | Teste adicional (opcional) |

**Não há `public/index.html` novo**: a versão 72.0 já carrega os CSS e JS acima. Não sobrescreva seus outros arquivos.

## Correções da criação

- `#sf71Modal` passa a ter prioridade visual superior aos painéis, com foco por teclado, Esc e rolagem interna.
- O formulário de criação é fechado após a resposta de sucesso do servidor, **antes** de navegar à comunidade criada. Isso evita a janela nova atrás da criação.
- O botão Salvar fica desabilitado durante o envio, impedindo cliques duplos.
- A criação anterior tinha `rateLimit(5,3600000)`: 5 tentativas por IP/hora (inclusive tentativas inválidas). Agora é `rateLimit(20,60000)` para evitar bloqueios prematuros. O limite real de **até 5 comunidades por criador** continua aplicado no Firestore.
- Erro HTTP 429 recebe mensagem orientativa; nenhuma falha de upload da capa desfaz um Fan Club já criado.

## Imagem de capa

- Campo `Imagem de capa (opcional)` com prévia na criação.
- Arquivos de origem: JPG, PNG ou WebP, até **8 MB antes da compressão**.
- O navegador recorta a imagem em formato panorâmico e converte em WebP até **175 KiB**.
- O servidor limita a **180 KiB**, verifica assinaturas JPEG/PNG/WebP, rejeita HTML/SVG/arquivos inválidos e valida a sessão.
- Somente o criador ou administrador pode trocar/remover a capa.
- O hero e os cards passam a mostrar a imagem real, com degradê para assegurar a legibilidade do título.
- Fan Clubs antigos aparecem normalmente sem capa e podem ganhar imagem depois.
- Em caso de falha na imagem, o Fan Club já criado é aberto e o usuário recebe aviso de que pode adicionar a capa posteriormente.

### Persistência

As capas otimizadas são salvas separadamente em `sonorafanFanClubCovers73` no Firestore, em documentos com ID do Fan Club. O documento principal guarda apenas `coverVersion`. Não é preciso instalar bibliotecas novas nem configurar Firebase Storage para este pacote. Cada capa tem limite estrito para não ultrapassar o tamanho máximo de um documento Firestore.

**Escala futura:** para alto volume de Fan Clubs/imagens, migrar a coleção de capas para Firebase Cloud Storage (mais adequado para mídia). Este pacote privilegia a implantação sem nova dependência e com imagens pequenas.

## Instalação

1. Faça backup da versão 72.0 e do `.env`/variáveis de ambiente (não os compartilhe).
2. Extraia o ZIP na raiz do repositório, preservando a pasta `public/`.
3. Substitua apenas os quatro arquivos indicados.
4. Reinicie o processo Node.js. A redefinição das contagens em memória do limitador depende do reinício.
5. No navegador: Ctrl+F5.
6. Abra Comunidade → Fan Clubs → Criar Fan Club; preencha, escolha uma foto e confirme. Verifique se a criação fecha e exibe o hero.
7. Abra o mesmo Fan Club com a outra conta: confirme a capa, entre no grupo, publique no mural e verifique o evento/notificação com a primeira conta.
8. Confira Buscar músicas e Favoritos por gênero; eles não foram modificados nesta rodada.

## Validação realizada

- **10 testes Node.js** (contas simuladas) passando: autenticação, membros, moderação, SSE, notificações e capa.
- Fluxo visual isolado com APIs simuladas em Chromium: **1440 px e 390 px**, formulário, seleção/compactação e envio da imagem, navegação e hero; sem erros JS.
- Testes isolados de Buscar músicas e Favoritos da versão 72.0 repetidos em 1440 px e 390 px, sem regressões detectadas.
- Não foi possível verificar a integração com o Firebase publicado nem com duas sessões reais simultâneas. Teste esses cenários após implantar.
