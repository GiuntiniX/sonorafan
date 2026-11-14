# SonoraFan 26.0 — Landing premium + sala simplificada

Arquivos alterados:

- `public/index.html` → substituir
- `public/sonorafan-wow-26.css` → adicionar
- `public/sonorafan-wow-26.js` → adicionar

## O que entra nesta etapa

### 1. Sala mais leve
- a antiga “pista social” foi simplificada;
- agora a área mostra apenas **quem está ouvindo agora**;
- o bloco superior do player deixa de exibir visualmente o **tempo duplicado**.

### 2. Reversão dos sprites pesados
- o carregamento da camada `character-sprites-25` foi removido do `index.html`;
- isso evita o efeito de quadrado / sprite estranho na presença visual.

### 3. Nova experiência de landing, login e cadastro
- home inicial com visual mais premium, glow, vidro, marquee e animações;
- tela de login redesenhada em formato showcase + formulário;
- modal de cadastro mais forte, com argumentos de valor e visual mais elegante.

## Importante
- esta atualização não exige mudanças no `server.js`;
- mantenha os outros arquivos já existentes no projeto;
- limpe o cache do navegador se a interface antiga continuar aparecendo.
