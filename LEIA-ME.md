# SonoraFan 74.0 — Revisão visual de home, sala, fila, chat, perfil e Fan Clubs

**Pacote incremental para instalar SOBRE a versão 73.0.**

## Arquivos modificados

Substituir:
- `public/index.html`
- `public/sonorafan-evolution-63.js`
- `public/sonorafan-sala-55.js`

Adicionar:
- `public/sonorafan-visual-74.css`
- `public/sonorafan-visual-74.js`

Nenhum arquivo `.env`, Firebase, banco de dados, credencial, servidor ou dependência npm é substituído. Mantenha os arquivos das versões anteriores.

## Correções aplicadas

1. **Landing:** removidos os textos “Explore a vibe ↓” e “Feito com ♥ pela comunidade SonoraFan”. Desativado o bloco auxiliar antigo que era injetado sem estilos completos. No lugar, três cards menores e alinhados ao tema indie/festival, com destaques úteis para colaboração, amigos e Fan Clubs.
2. **Fila colaborativa:** desativado o painel de resumos duplicado da v67 que causava texto sobreposto. Mantidas a lista oficial da fila, a votação e a busca. Revisados cabeçalho, informações, altura de rolagem, títulos e espaço para a música seguinte. A arte de estado vazio é ocultada enquanto existirem faixas reais.
3. **Chat da sala:** removido o bloco redundante de “Interação rápida”, que apresentava textos e botões espremidos. Reorganizados cabeçalho, presença, mensagens e campo de envio; a ilustração de fundo recebeu camada escura para preservar a legibilidade.
4. **Player:** a coluna central tem rolagem segura quando a altura da janela não é suficiente para exibir vídeo, controles e painéis. O menu recolhível continua compatível. O bloco “Rolando na sala” ficou mais compacto.
5. **Fan Clubs:** adicionado um acesso curto diretamente na sala. Ele abre a aba Fan Clubs da Comunidade, sem criar outra janela. Corrigida também a alternância das abas Amigos/Fan Clubs/Eventos, inclusive a compatibilidade com a implementação social antiga.
6. **Perfil:** corrigidos espaçamentos, cartões, badges, barra de progresso, botão do Club e layout dos estilos/ações rápidas, com adaptação para mobile.
7. **Títulos musicais:** decodificação de uma camada de entidades comuns (`&amp;` → `&`) antes de apresentar a música. Ao inserir os títulos no HTML, o conteúdo segue escapado para manter proteção contra HTML arbitrário.
8. **Tour:** referências a painéis antigos foram removidas, e incluído o novo atalho para Fan Clubs da sala.

## Instalação

1. Faça um backup da **versão 73.0** em uso.
2. Extraia o ZIP na raiz do projeto SonoraFan, preservando a pasta `public/`.
3. Substitua os arquivos indicados; adicione os novos CSS/JS.
4. Reinicie ou recarregue seu servidor web conforme seu processo de publicação. O **Node.js não precisa ser alterado** para esta atualização, mas reiniciar o serviço pode ajudar a limpar caches de implantação.
5. Recarregue o navegador com **Ctrl+F5**. Se houver CDN/service worker, invalide os recursos atualizados.

## O que conferir no teste real

- **Landing:** botões Entrar/Criar conta, hero e cartões no desktop e celular; sem as duas frases removidas.
- **Sala com menu aberto/recolhido:** vídeo, volume, Favoritar/Pular, “Rolando na sala” e Fan Clubs acessíveis por rolagem na coluna central.
- **Fila com 0, 1, 3 e 6 músicas:** títulos legíveis, votação, inserir e remover, e scroll interno onde necessário.
- **Chat:** resposta, clique no nick, privado, mensagens novas, rolagem e envio por Enter.
- **Perfil:** barra XP, medalhas, estilos, favorito e botões dos atalhos.
- **Fan Clubs:** botão Explorar na sala e navegação entre Amigos/Fan Clubs/Eventos; abertura, publicação e notificações com contas reais.

## Validação e limites

- Validação local de sintaxe JS e scripts embutidos, estrutura HTML, referências aos novos recursos, e verificação de ZIP.
- Capturas **estáticas** da home/sala/perfil em desktop e celular com CSS acumulado. Dados do player e do chat simulados para as capturas, sem backend real.
- Teste isolado no Chromium do botão da sala e abas da Comunidade.
- **Não foi executada uma auditoria end-to-end** com Firebase, Socket.IO, YouTube e duas contas reais no servidor publicado. A versão corrige os conflitos visuais observados nos arquivos e prints fornecidos; outros problemas de produção ainda podem existir.
