# SonoraFan 43.0 — Perfil renovado, tour atualizado e presença por nickname

## Arquivos alterados
- `public/index.html` — substituir
- `public/sonorafan-profile-tour-43.css` — adicionar
- `public/sonorafan-enhancements-43.js` — adicionar

## Ajustes aplicados
1. **Busca corrigida no lobby.** O campo principal agora usa um único controle de limpeza, eliminando o efeito de “××” na lateral direita.
2. **Perfil redesenhado.** Abertura do perfil trocada por um modal mais bonito e consistente, com scroll interno, topo visual sem repetição/corte estranho, avatar em destaque, bio, estilos musicais e ações rápidas.
3. **Tour atualizado.** O tour agora acompanha o layout real do lobby e da sala, destacando banner, busca, filtros, salas, player, fila, presença e chat.
4. **Presença com nicknames.** As áreas “Quem está ouvindo?” e “Pessoas ouvindo” mostram os nomes da galera na sala, deixando a leitura mais clara do que somente ícones.
5. **Popup de ouvintes refinado.** A listagem de quem está na sala passa a priorizar o nickname também no pop de usuários.

## Instalação
Aplicar sobre a versão 42.0. Mantenha a estrutura atual do projeto, faça backup antes de substituir e atualize o navegador com **Ctrl + F5**.

## Observações
- O novo perfil salva bio, estilos e apelido visual no navegador para preservar a experiência sem depender de nova API.
- As integrações reais de Firebase, Socket.IO e YouTube continuam dependendo de validação no seu ambiente publicado.
