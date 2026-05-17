# Prompts Importantes

Registro de prompts que direcionaram implementacoes e ajustes relevantes.

## Prompts usados para implementacao
- Objetivo: estabilizar UX e calculo financeiro da aba `transactions`.
- Prompt base: "Na pagina transactions, ajustar nao consolidadas em negrito, alinhar colunas, incluir checkbox de saldo anterior e corrigir saldo sem transacoes exibidas..."
- Resultado:
  - Nao consolidadas em negrito.
  - Colunas alinhadas com seus valores.
  - Toggle `Incluir saldo anterior` no cabecalho da tabela.
  - Base de saldo corrigida para usar acumulado antes do mes de referencia.

- Objetivo: melhorar criacao/edicao de recorrencias e parcelamentos.
- Prompt base: "Corrigir parcelamento mensal que cria 9 em vez de 10, calcular R$ Total dinamicamente e remover sufixo 1 de 10 da descricao..."
- Resultado:
  - Correcao da geracao de parcelas mensais.
  - `R$ Total` dinamico no formulario de criacao.
  - Remocao de sufixo de parcela/recorrencia da descricao.

- Objetivo: acelerar navegacao temporal na aba de transacoes.
- Prompt base: "Adicionar icones ao lado do seletor de mes para ir para mes anterior/posterior."
- Resultado: setas implementadas ao lado do seletor de mes com atualizacao de filtro por clique.

## Prompts usados para correcao de bugs
- Bug: variaveis de ambiente ausentes do Supabase em runtime.
- Prompt base: "Ao tentar criar conta pelo site apareceu erro de NEXT_PUBLIC_SUPABASE_URL..."
- Correcao aplicada: revisao de variaveis no ambiente local/Vercel.
- Validacao: criacao de conta/login funcionando.

- Bug: exclusao de categoria reaparecendo no painel.
- Prompt base: "Na pagina transactions, nao estou conseguindo excluir categorias..."
- Correcao aplicada: ajuste de sincronizacao/atualizacao da arvore.
- Validacao: exclusao com refresh consistente.

- Bug: falha de install/build local por TLS no npm (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`).
- Prompt base: "Vamos corrigir o problema que ocorreu que impossibilitou rodar o build local e instalar o next."
- Correcao aplicada: configuracao do PowerShell para definir `NODE_OPTIONS=--use-system-ca` e reinstalacao de dependencias.
- Validacao: `npm ping`, `npm ci` e `npm run build` executados com sucesso em nova sessao PowerShell.

## Prompts usados para documentacao
- Artefato documentado: atualizacao completa de `/docs` apos ciclo de ajustes da `transactions`.
- Prompt base: "Atualize os arquivos da pasta docs com todas atualizacoes do sistema e o ponto em que paramos..."
- Resultado: estado atual consolidado e regra de atualizacao continua registrada.
