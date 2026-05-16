# Decisões do Projeto

Registro das decisões tomadas, com contexto e impacto.

## Decisões técnicas
- Formato recomendado de registro:
  - Data:
  - Decisão:
  - Motivo:
  - Impacto:
  - Referência (commit/arquivo):

- Decisões já aplicadas:
  - Data: `2026-05-15`
  - Decisão: Implementar recorrência via backend (geração de múltiplas transações) e manter vínculo por `installment_group_key`.
  - Motivo: Permitir parcelamento e recorrência avançada com rastreabilidade e edição/exclusão por grupo.
  - Impacto: Fluxo de transações ficou mais robusto e compatível com cenários reais de finanças pessoais.

## Decisões de interface
- Formato recomendado de registro:
  - Data:
  - Tela:
  - Decisão:
  - Motivo:
  - Impacto:

- Decisões já aplicadas:
  - Data: `2026-05-15`
  - Tela: `Transações`
  - Decisão: Exibir indicador visual para transações recorrentes e campos dinâmicos conforme modalidade escolhida.
  - Motivo: Melhorar entendimento do usuário sobre parcelas e recorrências.
  - Impacto: Edição mais clara e menos ambígua.

## Decisões de banco de dados
- Formato recomendado de registro:
  - Data:
  - Entidade/Tabela:
  - Decisão:
  - Motivo:
  - Impacto:

- Decisões já aplicadas:
  - Data: `2026-05-15`
  - Entidade: `transactions`
  - Decisão: Utilizar campos `installment_current`, `installment_total`, `installment_group_key` e metadados em `raw.recurrence`.
  - Motivo: Preservar vínculo e contexto de recorrência sem perder compatibilidade com o modelo existente.
  - Impacto: Permite exclusão por escopo e melhor visualização no frontend.

## Decisões futuras
- [ ] Definir estratégia formal de testes automatizados (unitário + integração) para regras de recorrência.
- [ ] Definir política de versionamento de regras de importação (`CSV/OFX/PDF`).
- [ ] Definir padrão único para mensagens de erro orientadas ao usuário.
