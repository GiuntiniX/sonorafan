# SonoraFan 16.0 — Pacote consolidado de arquivos atualizados

Este ZIP reúne os arquivos de código mais recentes das atualizações anteriores, para instalação sem ter que aplicar os pacotes incrementalmente. Não inclui dados pessoais, credenciais nem o arquivo `.env`.

## Instalação

1. Faça um backup do projeto em execução e do seu `.env`.
2. Extraia este ZIP **na pasta raiz do projeto**, preservando a estrutura `public/`.
3. Substitua o `server.js` existente pelo deste pacote.
4. Substitua `public/index.html` e copie os arquivos `.css` e `.js` incluídos em `public/`.
5. Mantenha os arquivos anteriores não incluídos (por exemplo `package.json`, `package-lock.json`, `room-settings.js`, `.env` e outros do seu deploy).
6. Reinicie o servidor para carregar o backend atualizado.
7. Faça um recarregamento completo do navegador (Ctrl+F5) e confira o painel, o chat, a busca de músicas e o fluxo da reprodução.

## Versões e dependências

- `public/index.html`: versão 16.0 (mais recente).
- `server.js`: versão 15.0 (última etapa que alterou o backend; a versão 16 não o mudou).
- `public/sonorafan-11.css`: revisão 11.1 (chat e Convidar).
- Demais assets `.css` e `.js`: versões pertinentes a cada funcionalidade acumulada (player, sala, descoberta, comunidade, administração, música, notificações e visual).

## Arquivos que não estão neste ZIP

O projeto original utiliza também `public/manifest.json`, `public/icon.svg`, `package.json`, `package-lock.json` e `room-settings.js`. Esses arquivos não são parte das atualizações consolidadas. **Mantenha os seus**. `icon.svg` não havia sido enviado nos anexos anteriores.

## Validação

Sintaxe do servidor e dos arquivos JavaScript externos conferida com `node --check`; scripts inline do HTML também conferidos. As referências CSS/JS locais do HTML correspondem aos arquivos presentes neste pacote. O ZIP foi testado quanto à integridade. **Não foram realizados testes completos de integração com Firebase, YouTube e Socket.IO em produção**.

## Atenção

Esta entrega substitui todos os ZIPs incrementais anteriores para fins de atualização de arquivos, mas **não é um projeto autônomo**: mantenha os arquivos originais do seu repositório. O admin global é destinado à conta `admin@sonora.com`.
