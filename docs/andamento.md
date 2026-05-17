# Andamento do Projeto

Documento vivo para registrar o estado do projeto e permitir continuidade em qualquer ambiente.

## Ultima etapa concluida
- Data: `2026-05-17`
- Entrega principal: replicacao automatica de orcamento ao salvar o mes atual em `budgets`.
- Resultado entregue:
  - API `POST /api/budgets/save`:
    - Quando `month_ref` salvo for o mes atual, o mesmo orcamento e replicado automaticamente para todos os meses seguintes do mesmo ano.
    - A sincronizacao replica o conjunto de categorias e valores (upsert) e remove categorias nao selecionadas tambem nos meses replicados.
    - Quando `month_ref` nao for o mes atual, o salvamento continua apenas no mes escolhido.
  - UX da pagina `budgets`:
    - Mensagem de sucesso diferenciada quando houve replicacao automatica (`saved_replicated`).
  - Build web:
    - `npm run build` executado com sucesso apos os ajustes.

## Etapa atual
- Objetivo: validar a regra de replicacao automatica no fluxo mensal de orcamento.
- Em andamento:
  - [ ] Validar salvamento no mes atual com criacao automatica dos meses seguintes do ano.
  - [ ] Validar que salvamento em mes futuro/passado nao dispara replicacao.
  - [ ] Validar ajuste manual posterior em um mes futuro apos replicacao.

## Proximas etapas
- Curto prazo:
  - [ ] Adicionar acao de desparear dispositivo na tela `/mobile/pair`.
  - [ ] Refinar visual do menu lateral mobile conforme feedback de uso.
- Medio prazo:
  - [ ] Publicar rotina simplificada de distribuicao de APK (release interna).
  - [ ] Criar monitor de saude do companion (fila offline, ultimo envio, erros).
- Longo prazo:
  - [ ] Evoluir estrategia de distribuicao (assinatura definitiva e canal de release).

## Observacoes importantes
- Regra obrigatoria: **sempre atualizar os arquivos da pasta `/docs` apos qualquer mudanca no sistema**.
- Regra obrigatoria: **sempre realizar commit + push apos alteracoes no sistema para acionar deploy automatico no Vercel**.
- Antes de publicar, validar `npm run build`.
