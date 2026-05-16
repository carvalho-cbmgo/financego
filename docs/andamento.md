# Andamento do Projeto

Este documento registra o estado atual do desenvolvimento para facilitar continuidade em qualquer máquina.

## Última etapa concluída
- Data: `2026-05-15`
- Entrega: Implementação de recorrência de transações (`Sem repetição`, `Parcelamento (mensal)`, `Avançado`), com vínculo entre transações recorrentes.
- Resultado:
  - Criação/edição com campos de recorrência.
  - Indicador visual de recorrência na tabela de transações.
  - Exclusão com escopo (`somente atual`, `atuais+anteriores`, `atuais+posteriores`).
- Referência técnica:
  - Commit: `b0a7711`
  - Arquivos principais:
    - `src/app/api/transactions/save/route.ts`
    - `src/app/api/categories/update/route.ts`
    - `src/components/transactions-table.tsx`
    - `src/app/dashboard/page.tsx`
    - `src/app/globals.css`

## Etapa atual
- Objetivo da etapa:
  - Refinar experiência de uso e validar regras de negócio no fluxo de transações.
- Em andamento:
  - [ ] Validação funcional completa das modalidades de recorrência.
  - [ ] Testes manuais de exclusão por escopo.
  - [ ] Revisão visual em resoluções desktop e mobile.
- Responsável: `Mayko / Finance GO`

## Próximas etapas
- Curto prazo:
  - [ ] Consolidar testes de importação CSV/OFX/PDF com categorias e contas.
  - [ ] Revisar performance de carregamento em páginas com muitos registros.
  - [ ] Criar checklist de regressão da aba `Transações`.
- Médio prazo:
  - [ ] Padronizar componentes visuais de feedback (loading, sucesso, erro).
  - [ ] Expandir testes automatizados para rotas críticas de API.
- Longo prazo:
  - [ ] Evoluir painel analítico (gráficos e filtros avançados).

## Observações importantes
- Sempre manter este arquivo atualizado ao final de cada entrega relevante.
- Em toda alteração de regra de negócio, registrar também em `docs/decisoes.md`.
- Em toda nova demanda, registrar itens abertos em `docs/pendencias.md`.
- Antes de publicar, revisar comandos de deploy em `docs/comandos.md`.
