# Decisoes do Projeto

Registro das decisoes arquiteturais, de interface e de dados.

## Decisoes tecnicas
- Data: `2026-05-15`
- Decisao: recorrencia de transacoes gerada no backend com vinculo por `installment_group_key`.
- Motivo: suportar parcelamento e recorrencia avancada com rastreabilidade.
- Impacto: criacao/edicao/exclusao por escopo no mesmo grupo de recorrencia.
- Referencia: `b0a7711`.

- Data: `2026-05-16`
- Decisao: reutilizar padrao de recorrencia no formulario de `Adicionar transacao`.
- Motivo: manter consistencia entre criar e editar.
- Impacto: menos ambiguidade de uso e menor curva de aprendizado.
- Referencia: `310b3c4`.

## Decisoes de interface
- Data: `2026-05-16`
- Tela: `transactions`
- Decisao: reorganizar a barra de acoes com `Adicionar transacao` a esquerda e acoes em lote a direita.
- Motivo: melhorar hierarquia visual e foco de uso.
- Impacto: interface mais limpa e previsivel.
- Referencias: `516ccbd`, `c8a502b`.

- Data: `2026-05-16`
- Tela: `transactions`
- Decisao: remover `Clique na linha para editar`, remover linha `Todos` e remover `Exportar` da barra principal.
- Motivo: reduzir ruido visual e priorizar fluxo operacional.
- Impacto: area de transacoes mais objetiva.
- Referencia: `c8a502b`.

- Data: `2026-05-16`
- Tela: `transactions`
- Decisao: incluir linha de saldo antes do cabecalho e apos ultima transacao.
- Motivo: dar contexto de saldo antes/depois do conjunto exibido.
- Impacto: leitura financeira imediata sem depender de outra tela.
- Referencia: `c8a502b`.

## Decisoes de banco de dados
- Data: `2026-05-15`
- Entidade: `transactions`
- Decisao: manter campos `installment_current`, `installment_total`, `installment_group_key` e `raw.recurrence`.
- Motivo: permitir recorrencia com metadata sem quebrar compatibilidade.
- Impacto: flexibilidade de modelagem e controle de exclusao por escopo.

- Data: `2026-05-16`
- Entidade: `transactions`
- Decisao: sem nova migracao de schema nos refinamentos recentes de UI.
- Motivo: mudancas focadas em layout/UX e reaproveitamento da base existente.
- Impacto: deploy mais simples e menor risco de regressao em dados.

## Decisoes futuras
- [ ] Definir testes automatizados para fluxos de recorrencia (`none/installment/advanced`).
- [ ] Definir estrategia de selecao de conta no formulario de adicao sem perder layout compacto.
- [ ] Definir padrao unico de mensagens de erro e sucesso no frontend.
