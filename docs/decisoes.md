# Decisoes do Projeto

Registro das decisoes arquiteturais, de interface e de dados.

## Decisoes tecnicas
- Data: `2026-05-17`
- Decisao: manter arquitetura de captura automatica baseada em notificacoes Android + backend FinanceGO.
- Motivo: entregar registro quase imediato sem dependencia de Open Finance.
- Impacto: fluxo operacional depende de companion Android ativo.

- Data: `2026-05-17`
- Decisao: implementar tela dedicada de pareamento em `mobile/pair` consumindo `POST /api/devices/pair`.
- Motivo: simplificar onboarding de dispositivos e reduzir configuracao manual insegura.
- Impacto: token e device public id passam a ser gerados no proprio produto.

- Data: `2026-05-17`
- Decisao: disponibilizar companion Android minimo como projeto Android Studio em `android-companion-min/`.
- Motivo: acelerar uso diario real com base no backend ja existente de ingestao (`/api/notifications/ingest` e `/api/notifications/batch`).
- Impacto: caminho oficial de uso no celular Android ficou completo ponta a ponta.

## Decisoes de interface
- Data: `2026-05-17`
- Tela: `mobile`
- Decisao: implementar painel lateral ao clicar no icone de tres barras no canto superior esquerdo.
- Motivo: replicar navegacao solicitada para celular com foco em atalhos principais.
- Impacto: usuario navega rapidamente para `Visao geral`, `Saldo das contas`, `Extrato mensal` e `Grafico mensal`.

- Data: `2026-05-17`
- Tela: `mobile`
- Decisao: nao incluir `Metas` e `Sonhos` no painel lateral.
- Motivo: requisito explicito da entrega atual.
- Impacto: painel mobile permanece enxuto e alinhado ao escopo solicitado.

## Decisoes de processo
- Data: `2026-05-17`
- Decisao: tornar obrigatoria a atualizacao da pasta `/docs` a cada mudanca no sistema.
- Motivo: preservar contexto e continuidade entre sessoes.
- Impacto: rastreabilidade maior de estado, pendencias e decisoes.

- Data: `2026-05-17`
- Decisao: tornar obrigatorio commit + push apos alteracoes para acionar deploy automatico no Vercel.
- Motivo: manter ambiente publicado sempre sincronizado com o codigo validado localmente.
- Impacto: reducao de divergencia entre local, GitHub e Vercel.

## Decisoes futuras
- [ ] Definir UX final de gerenciamento de dispositivos (renomear, desativar, revogar token).
- [ ] Definir politica de rotacao de token do companion Android.
- [ ] Definir estrategia de distribuicao (APK interno vs Play Store).
