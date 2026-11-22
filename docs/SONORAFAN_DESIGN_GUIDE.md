# SonoraFan — Design Guide · Festival Dark (v265)

> Referência visual: captura do Terra Sonora fornecida pelo responsável do projeto em 22/11/2026. Os valores abaixo são aproximações visuais, **não** um manual de marca oficial. A URL externa não pôde ser inspecionada nesta atualização.

## Direção visual

A linguagem combina a atmosfera de festival / backstage com superfícies escuras, tipografia legível e acentos de alta energia. Preto estrutura; branco comunica; laranja convida à ação; verde-limão identifica estados positivos, som ao vivo e progresso.

## Tokens

| Token | Festival Dark | Uso |
|---|---|---|
| `--bg` | `#161616` | Fundo base |
| `--bg-elevated` | `#1C1C1C` | Painel |
| `--bg-card` | `#222222` | Cards |
| `--bg-hover` | `#2C2C2C` | Hover |
| `--border` | `#383838` | Bordas |
| `--text` | `#F7F7F7` | Tipografia primária |
| `--text-secondary` | `#BCBCBC` | Legendas |
| `--text-muted` | `#929292` | Metadados |
| `--accent` | `#FF8000` | CTA principal |
| `--accent2` | `#B3FA1B` | Live, estado ativo |
| `--danger` | `#EF4444` | Erros e destruição (funcional complementar) |

**Uso de cor:** até uma ação primária laranja por bloco de interface; verde para sinalização, não para múltiplos botões concorrentes. Evitar cor em textos longos. Priorizar contraste e foco visível.

## Componentes

- Fila: cartões `#222222`, contornos `#383838`, título branco; ritmo de espaçamento 8–12px.
- Tocando: status / progresso verde, CTA para adicionar laranja.
- Favoritos: ação de adicionar laranja; excluir secundário discreto com confirmação.
- Cooldown: trilho discreto com preenchimento de laranja para verde.
- Informações de fila: quantidade de músicas, DJs distintos e tempo estimado, sem estimativas inventadas para vídeos de duração desconhecida.
- Mobile: permitir quebra de layout e evitar painéis duplicados; teclas e controles com foco visível.

## Temas

O **Festival Dark** é a aparência padrão da interface da plataforma. O modo **Roxo original** continua como opção, acionável pelo botão `🎨` no painel da fila. A preferência é salva localmente em `sf265:guide`.

**Importante:** a escolha visual é separada dos temas artísticos das salas (capas e cenários). A alteração da paleta não modifica o tema ou a imagem escolhida pelo criador da sala.

## Fila colaborativa — comportamento

- Exibir estatísticas de músicas restantes, DJs distintos e duração conhecida.
- Estimar chegada da música pela duração da faixa atual e anteriores, descontando o tempo decorrido quando disponível.
- Mostrar indicação quando o usuário já tem uma música na fila, com atalho para o filtro existente “Minhas”.
- Oferecer favoritar diretamente na linha da fila com a integração de favoritos existente.
- Manter intactas as regras do servidor, votação, cooldown e rodízio já configurados. Mudanças de reordenação precisam de testes de concorrência e fairness no backend.
- Informações de tempo são aproximadas e devem ser explicitamente marcadas assim.

## Arquivos de implementação

- `public/sonorafan-festival-guide-265.css`
- `public/sonorafan-festival-guide-265.js`
- `public/index.html`

## Checklist para validar após deploy

1. Acessar sala desktop/mobile com preferência limpa; confirmar Festival Dark.
2. Alternar Roxo original / Festival Dark e atualizar página.
3. Confirmar que tema artístico e capa da sala não mudam.
4. Adicionar músicas de duração conhecida/desconhecida; validar estimativas, sem assumir horário exato.
5. Conferir favoritos na fila e respeitar autenticação/servidor.
6. Validar contagem e rolagem no mobile.
7. Validar que notas de fila são recalculadas após o estado da sala mudar.

