# Andamento do Projeto

Documento vivo para registrar o estado do projeto e permitir continuidade em qualquer ambiente.

## Ultima etapa concluida
- Data: `2026-05-17`
- Entrega principal: remodelagem completa da pagina `budgets` com fluxo mensal por categoria.
- Resultado entregue:
  - Pagina `budgets`:
    - Usuario escolhe o `mes de referencia` (input mes + setas de navegacao lateral).
    - Usuario seleciona as categorias que deseja orcar (catalogo + inclusao de categoria personalizada).
    - Usuario define um orcamento individual para cada categoria selecionada.
    - Tudo permanece salvo por `mes_ref + categoria` e volta preenchido ao reabrir o mesmo mes.
    - Painel da propria pagina mostra monitoramento por categoria:
      - Orcado (R$)
      - Gasto consolidado no mes (R$)
      - Saldo (R$)
      - Consumo (%), incluindo barra de progresso visual.
  - API de orcamentos:
    - `POST /api/budgets/save` passou a salvar/atualizar categorias selecionadas do mes.
    - Categorias removidas da selecao passam a ser removidas daquele mes de referencia.
    - Redirecionamento preserva `month_ref` e retorna status de sucesso/erro na tela.
  - Build web:
    - `npm run build` executado com sucesso apos os ajustes.

## Etapa atual
- Objetivo: validacao funcional da nova experiencia de orcamento mensal por categoria.
- Em andamento:
  - [ ] Validar ciclo completo: selecionar categorias -> salvar -> voltar no mesmo mes com dados persistidos.
  - [ ] Validar monitoramento em `%` e `R$` com gastos reais no mes de referencia.
  - [ ] Validar comportamento quando nenhuma categoria for selecionada e salvo (mes sem orcamento).

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
