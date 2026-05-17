# Andamento do Projeto

Documento vivo para registrar o estado do projeto e permitir continuidade em qualquer ambiente.

## Ultima etapa concluida
- Data: `2026-05-17`
- Entrega principal: inclusao de grafico pizza unico no resumo da pagina `budgets`.
- Resultado entregue:
  - Resumo mensal em `budgets`:
    - Abaixo de `Gasto fora do orcamento` foi adicionado um grafico tipo pizza unico.
    - Cada categoria orcada aparece como fatia proporcional ao valor orcado.
    - Em cada fatia, o consumo da categoria no mes e mostrado visualmente (parte consumida x parte restante).
    - Incluida legenda com:
      - percentual consumido por categoria;
      - barra de consumo da categoria;
      - valores `R$ gasto` e `R$ orcado`.
  - Build web:
    - `npm run build` executado com sucesso apos os ajustes.

## Etapa atual
- Objetivo: validar leitura visual do novo grafico pizza no acompanhamento mensal de orcamentos.
- Em andamento:
  - [ ] Validar legibilidade do grafico com muitas categorias (8+).
  - [ ] Validar comportamento visual quando categoria ultrapassa 100% do orcamento.
  - [ ] Validar comportamento quando nenhuma categoria estiver orcada.

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
