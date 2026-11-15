# SonoraFan 76.0 — Músicas e Favoritas no celular

**Atualização incremental para instalar sobre a versão 75.0.**

## Arquivos

- `public/index.html` — **substituir**.
- `public/sonorafan-mobile-music-76.css` — **adicionar**.
- `public/sonorafan-mobile-music-76.js` — **adicionar**.

Os demais arquivos da versão 75.0 devem permanecer. Esta atualização não altera o servidor, Firebase, pontos, histórico, chat ou regras das salas.

## O que mudou

1. **Botão “＋ Música” no mobile:** agora abre uma janela própria, disponível a partir de qualquer aba da sala.
2. **Buscar música:** a janela reutiliza o formulário de busca já existente, com resultados do YouTube e a confirmação antes de adicionar. Texto livre abre a busca; link do YouTube/ID mantém o fluxo original.
3. **Minhas favoritas:** nova aba dentro dessa janela, com busca, filtros por gênero criado pelo usuário e botão “＋ Adicionar” diretamente à fila.
4. **Confirmação da fila:** ao adicionar uma favorita, a interface verifica disponibilidade e duração do vídeo, envia pelo Socket.IO e espera confirmação via estado da sala. Rejeições do servidor e desconexões aparecem no próprio painel, sem falso sucesso.
5. **Ver fila:** atalho para fechar o painel e mostrar a aba Fila após escolher uma música.
6. **Responsividade:** adapta-se a telas pequenas; o formulário original volta ao seu lugar quando a janela fecha. O desktop permanece como estava.

## Instalação

1. Faça backup da versão 75.0.
2. Extraia este pacote na raiz do projeto, preservando a estrutura de pastas.
3. Substitua `public/index.html` e copie os dois arquivos CSS/JS para `public/`.
4. Recarregue o site no celular. Caso a versão antiga apareça por cache, force a atualização do navegador.
5. Entre em uma sala e toque em **＋ Música** na navegação inferior.
6. Experimente buscar uma faixa e usar **Minhas favoritas**, selecione um gênero e toque em **＋ Adicionar**.

## Testes realizados

Foram executados testes isolados em Chromium com larguras **320, 360, 390 e 768 px**, verificando:
- abertura da janela mesmo com o formulário original oculto na aba Player;
- busca textual, escolha de resultado e prévia de confirmação;
- favoritos por gênero e envio de música;
- confirmação da fila, duplicatas, falta de rede, vídeo não reproduzível e erro do servidor;
- fechar e devolver o formulário ao local original;
- fallback da navegação desktop.

**Importante:** o teste foi realizado em uma interface isolada, com APIs e Socket.IO simulados. A operação com YouTube, Firebase e usuários reais precisa ser confirmada na implantação publicada.
