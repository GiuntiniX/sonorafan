# SonoraFan 11 — somente arquivos modificados

Base: SonoraFan 10.0 (com todos os arquivos anteriores mantidos).

Substituir: `public/index.html`, `server.js`
Adicionar: `public/sonorafan-11.css`, `public/sonorafan-11.js`

**Busca musical:** movida para o cartão inferior esquerdo, no lugar do cartão Sobre a Sala. Informações da sala agora ficam em painel expansível dentro da playlist.

**Cabeçalho:** removido Mais; botão Temas ao lado de Convidar. Temas adicionados: Winamp Classic, Neon Nights e Studio Pro.

**Admin:** o servidor autoriza painel global somente para `admin@sonora.com`, independente de `ADMIN_EMAILS`; promoção global via API desativada. Donos continuam administrando suas próprias salas.

**Importante:** mantenha todos os CSS/JS anteriores. Esse pacote é incremental. Reinicie o Node para aplicar `server.js`. As variáveis do `.env` não são incluídas.

Valide em navegador com dois usuários, principalmente troca de tema, busca/preview e permissões do admin. O bloqueio global de admins pode alterar qualquer automação anterior que dependesse de `ADMIN_EMAILS` ou de promoção.
