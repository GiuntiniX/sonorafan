# SonoraFan — Guia oficial de identidade e interface (v266)

> Design system da plataforma SonoraFan, definido a partir das telas de referência fornecidas pelo responsável do projeto em 22/11/2026. Não afirma reproduzir um guia externo de marca.

## 1. Brand Core — paleta padrão obrigatória

| Token | Hex | Uso |
| --- | --- | --- |
| `--sf-bg` | `#120616` | Fundo principal vinho-escuro |
| `--sf-surface` | `#1A0C21` | Superfície do chat e modais |
| `--sf-surface-2` | `#24112D` | Cards, cabeçalhos e janelas |
| `--sf-surface-3` | `#2D1735` | Hover e painéis elevados |
| `--sf-border` | `#8A4B16` | Borda de destaque em interface |
| `--sf-border-soft` | `#5D3150` | Divisórias e bordas discretas |
| `--sf-text` | `#F6F1FB` | Texto principal |
| `--sf-text-secondary` | `#CDB9DA` | Conteúdo secundário |
| `--sf-text-muted` | `#A895B3` | Metadados e placeholders (ajustado para contraste) |
| `--sf-lime` | `#C8FF00` | Adicionar música, AO VIVO, tocar e progresso |
| `--sf-orange` | `#FF9300` | Enviar mensagem, ações de comunicação |
| `--sf-purple-soft` | `#9F82FF` | Apoio visual |
| `--sf-danger` | `#FF6B6B` | Remoção e erros (uso com moderação) |

**Regra:** as cores oficiais acima são a identidade padrão em toda a plataforma, não um tema opcional. A UI usa texto claro e botões primários com texto escuro sobre lime/laranja.

## 2. Arquitetura de temas

As camadas devem permanecer independentes:

1. **Identidade SonoraFan:** cores, chat, cards, inputs, botões e interfaces, sempre padrão;
2. **Wallpaper / atmosfera da sala:** arte, imagem de fundo, palco e capas, selecionados no catálogo de temas existente, com controles pessoais/compartilhados;
3. **Cores da página (opt-in pessoal):** em Aparência → *Seguir cores do tema* permite que os acentos e parte dos painéis sigam o tema da sala. Não modifica tema compartilhado nem preferência de outras pessoas.

A preferência local `sonoraUIColorMode` admite `brand` (padrão) ou `theme`. `sonoraUIGlow` admite `low`, `medium` ou `high` (padrão `low`). Quando não há tema válido de sala, mesmo o modo `theme` usa o padrão da marca.

**Atenção:** a opção “Seguir cores do tema” não é a identidade da marca e deve permanecer sempre desativada para novos usuários. Wallpaper não muda automaticamente a paleta.

## 3. Chat da sala / privado

| Componente | Padrão |
| --- | --- |
| Painel externo e cabeçalho | `--sf-surface` / `--sf-surface-2` |
| Área de mensagens | `#0F0B12` |
| Mensagem própria | `#2B1732`, contorno `#6A436D` |
| Mensagem de outro participante | `#1D1623` e borda suave |
| Mensagem de sistema | Superfície secundária com borda tracejada |
| Campo de texto | Superfície escura, foco laranja |
| Enviar | Laranja `#FF9300` com texto escuro |
| Status conectado | Verde-limão `#C8FF00` |
| Contador de não lidas | Laranja, texto escuro |
| Horários | Tipografia secundária com legibilidade |

Aplica-se ao chat de sala, privada (inbox, conversa, busca de pessoas, configurações), indicador digitando, respostas, reações, badges e estados vazios. Evitar wallpaper atrás de texto de chat.

## 4. Fila / player / favoritas

- CTA **Adicionar música**: lime. Botões **Enviar**: laranja.
- Estado tocando e conexões ativas: lime. Remover e excluir: secundários, com confirmação.
- Fila: cards compactos, texto legível, estimativas qualificadas; elementos da fila não duplicados.
- Player: progresso e foco consistentes com lime/laranja; preservar controles e regras existentes.
- Favoritas: botões Adicionar e Excluir distintos, compactos, sem menus redundantes.

## 5. Controles e acessibilidade

- Layout responsivo em desktop/tablet/mobile, sem cortar elementos em modais.
- Foco de teclado evidente. Respeitar `prefers-reduced-motion`.
- Brilhos ajustáveis em Aparência, com modo discreto por padrão.
- Não tratar cores como única indicação de status: manter textos e rótulos.
- Mantenha arte da sala independente dos dados de música e do chat.

## 6. Arquivos de implementação

- `public/sonorafan-brand-266.css`: tokens e aplicação global, chat, inbox, fila, player, modais e seletor de aparência.
- `public/sonorafan-brand-266.js`: preferência local de cor/brilho e integração de cores com o wallpaper.
- `public/sonorafan-room-themes-88.js`: seletor de wallpapers e linguagem de aparência.
- `public/sonorafan-festival-guide-265.js`: apenas informações complementares da fila.
- `public/index.html`: importação versionada dos assets.

## 7. Validações de aceite

1. Com navegador limpo, abrir início, lobby, sala, chat e inbox. Confirmar identidade SonoraFan padrão.
2. Escolher wallpaper no seletor; confirmar que o chat e a fila **não mudam de cor**.
3. Ativar “Seguir cores do tema”; verificar a mudança visual local, trocar o wallpaper e voltar ao padrão.
4. Testar os níveis de brilho, persistência após recarregar e compatibilidade com mobile.
5. Verificar ações de chat, DM, reações, favoritos, fila, player e autenticação.
6. Confirmar deploy do commit `main`; alterações de repositório não garantem publicação automática.
