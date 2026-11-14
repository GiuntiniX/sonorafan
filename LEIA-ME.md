# SonoraFan 12.0 — Admin Control Center

Este pacote contém **somente os arquivos alterados ou adicionados** em relação ao SonoraFan **11.1**. Não é um projeto independente.

## Instalação

Substitua na raiz do projeto:

- `server.js` — substituição obrigatória para os novos indicadores, histórico de auditoria e proteção adicional.
- `public/index.html` — substituição para abrir o novo painel.

Adicione:

- `public/admin-control-12.css` — estilos do painel.
- `public/admin-control-12.js` — interação e acesso às APIs administrativas.

Não apague os CSS/JS existentes de versões anteriores. **Mantenha o `public/sonorafan-11.css` da versão 11.1** com os ajustes de chat e convite. Reinicie o Node após trocar `server.js`.

## Implementado

- Painel administrativo de tela ampla, sidebar e navegação responsiva.
- Visão geral com indicadores reais retornados por `/api/admin/stats`: usuários cadastrados, salas totais, ouvintes nas salas, músicas enfileiradas, salas com ouvintes, salas privadas, chats travados e sanções ativas. Indicadores são uma fotografia do estado atual; não são métricas históricas.
- Atualização manual e periódica (30 segundos enquanto a visão geral está aberta).
- Gerenciamento de usuários com pesquisa/filtro e ações de banir, desbanir, moderar e excluir (com confirmação). A conta global é protegida.
- Gerenciamento de salas com pesquisa/filtro, travar chat, pular faixa, enviar aviso, limpar fila e encerrar sala (com confirmação).
- Filas musicais: visualização das faixas e remoção pontual por rota autenticada.
- Central de sanções existentes e opção para revogar.
- Auditoria: até 100 registros recentes, recuperados da coleção `adminLog` do Firestore com fallback em memória.
- Operação: comunicado por Socket.IO, exportação, limpeza global de chats e encerramento de salas com confirmação textual.

## Segurança

- Rotas `/api/admin/*` dependem de sessão válida e autorizam exclusivamente `admin@sonora.com`, regra aplicada no servidor.
- Não é possível promover outros administradores globais pela API existente.
- Bloqueio de exclusão, banimento, desbanimento ou expulsão da conta administrativa nas rotas globais correspondentes.
- Operações globais perigosas requerem confirmação textual validada pelo servidor (`LIMPAR CHATS` ou `ENCERRAR SALAS`).
- Gestores de salas continuam com suas próprias permissões dentro da sala, sem acesso às rotas globais.

## Limitações e verificação

- Sintaxe dos dois arquivos JavaScript verificada com `node --check`.
- Teste de navegador isolado com API simulada: dashboard, listagem e filtro de usuários renderizados sem erros.
- Ainda não foi possível executar os testes e2e ou validar Firebase/Socket.IO em execução real neste ambiente, pois as dependências de Node do projeto não estão instaladas aqui.
- As listas de sanções dependem dos registros existentes no servidor. Não foi criada infraestrutura de denúncias; a seção de moderação reúne sanções já existentes.
- O contador de ouvintes usa a soma das presenças registradas nas salas; não representa pessoas únicas entre salas.
- A auditoria recupera os últimos 100 registros existentes. Não foram adicionadas ferramentas de retenção/purga nem relatórios analíticos históricos.
- **Importante:** os fluxos antigos de limpeza global sem corpo JSON deixam de funcionar; utilize o novo painel com confirmação textual.

## Implantação

Mantenha a pasta `public/` e as variáveis de ambiente originais no servidor, sem compartilhá-las no repositório. Faça backup antes de substituir os arquivos e valide com duas contas: a administradora e uma conta comum.
