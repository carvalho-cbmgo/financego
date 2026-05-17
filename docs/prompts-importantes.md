# Prompts Importantes

Registro de prompts que direcionaram implementacoes e ajustes relevantes.

## Prompts usados para implementacao
- Objetivo: entregar uma experiencia mobile dedicada inspirada na interface de referencia.
- Prompt base: "Quero desenvolver uma interface diferente para utilizacao em celulares..."
- Resultado:
  - Rota `/mobile` criada com layout e blocos de visao geral mobile.
  - Redirecionamento no login por tipo de dispositivo.
  - Navegacao mensal mobile com setas e seletor de mes.

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

## Prompts usados para correcao de bugs
- Bug: falha de install/build local por TLS no npm (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`).
- Prompt base: "Vamos corrigir o problema que ocorreu que impossibilitou rodar o build local e instalar o next."
- Correcao aplicada: configuracao do PowerShell para definir `NODE_OPTIONS=--use-system-ca` e reinstalacao de dependencias.
- Validacao: `npm ping`, `npm ci` e `npm run build` executados com sucesso em nova sessao PowerShell.

## Prompts usados para processo
- Objetivo: garantir deploy automatico continuo apos alteracoes.
- Prompt base: "Toda vez que alteracoes no sistema forem realizadas, proceder com commit + push no github para que o vercel tambem seja automaticamente atualizado."
- Resultado: regra registrada na documentacao e aplicada no fluxo desta entrega.

## Prompts usados para documentacao
- Artefato documentado: atualizacao completa de `/docs` apos ciclo de ajustes em `transactions` e interface mobile.
- Prompt base: "Atualize os arquivos da pasta docs com todas atualizacoes do sistema e o ponto em que paramos..."
- Resultado: estado atual consolidado e regra de atualizacao continua registrada.
