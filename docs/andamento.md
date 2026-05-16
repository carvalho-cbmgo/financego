# Andamento do Projeto

Documento vivo para registrar o estado do projeto e permitir continuidade em qualquer ambiente.

## Última etapa concluída
- Data: `2026-05-16`
- Entrega principal: refinamentos da aba `transactions` (toolbar, formulário de criação e saldos na tabela).
- Resultado entregue:
  - Botão `+ Adicionar transacao` fixado à esquerda da barra.
  - Ações em lote reposicionadas para a direita.
  - `DEL` padronizado em tamanho com os demais ícones.
  - Removidos: `Clique na linha para editar`, linha `Todos` e botão `Exportar`.
  - Inclusão de linha de saldo antes do cabeçalho e após a última transação.
  - Formulário de criação reorganizado:
    - Linha 1: ação (`Despesa`, `Transferencia`, `Receita`).
    - Linha 2: `Data`, `Descricao`, `Categoria`, `Valor`, `Consolidada`.
    - Linha 3+: recorrência (`Sem repeticao`, `Parcelamento (mensal)`, `Avancado`) e botões `Salvar/Cancelar`.
- Referências técnicas (commits):
  - `516ccbd` - botão adicionar + DEL em lote.
  - `d32cb40` - layout aprimorado do bloco de criação.
  - `c8a502b` - ajustes de toolbar e linhas de saldo.
  - `310b3c4` - recorrência no formulário de criação e data compacta.

## Etapa atual
- Objetivo: estabilização visual e validação funcional ponta a ponta da aba `transactions`.
- Em andamento:
  - [ ] Validar recorrência criada no formulário de adição em todos os cenários.
  - [ ] Validar comportamento dos saldos com filtros de contas/categorias.
  - [ ] Revisão final de responsividade (desktop e mobile).

## Próximas etapas
- Curto prazo:
  - [ ] Ajustar seleção de conta no formulário de criação (sem comprometer layout compacto).
  - [ ] Revisar textos e acentuação para consistência global.
  - [ ] Criar checklist de regressão da aba `transactions`.
- Médio prazo:
  - [ ] Expandir testes automatizados para APIs de transações.
  - [ ] Melhorar feedbacks de erro/sucesso no frontend.
- Longo prazo:
  - [ ] Evoluir análises e gráficos por conta, banco e período.

## Observações importantes
- Sempre atualizar este arquivo após qualquer entrega relevante.
- Registrar novas regras em `docs/decisoes.md`.
- Registrar pendências novas em `docs/pendencias.md`.
- Antes de publicar, validar `npm run build` e fluxo de deploy.
