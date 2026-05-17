# Decisoes do Projeto

Registro das decisoes arquiteturais, de interface e de dados.

## Decisoes tecnicas
- Data: `2026-05-17`
- Decisao: remodelar `budgets` para um fluxo guiado por `mes de referencia`, com selecao dinamica de categorias e limite individual por categoria.
- Motivo: o formulario fixo anterior nao representava o uso real e nao permitia flexibilidade por mes.
- Impacto: a gestao de orcamento virou um processo mensal interativo, com persistencia exata por mes/categoria.

- Data: `2026-05-17`
- Decisao: no monitoramento de `budgets`, considerar apenas gastos consolidados (`is_consolidated !== false`) para medir consumo de orcamento.
- Motivo: previsoes e pendencias nao devem distorcer percentual de execucao do orcamento mensal realizado.
- Impacto: indicadores de consumo (% e R$) ficam alinhados ao realizado no periodo.

- Data: `2026-05-17`
- Decisao: ajustar `POST /api/budgets/save` para sincronizar integralmente as categorias do mes (upsert das selecionadas + remocao das desmarcadas).
- Motivo: evitar sobras de categorias antigas quando o usuario replaneja o mesmo mes.
- Impacto: estado salvo no backend passa a refletir exatamente o conjunto de categorias selecionadas na UI.

- Data: `2026-05-17`
- Decisao: saldos de conta no `dashboard`/`transactions` devem considerar apenas transacoes consolidadas na composicao dinamica.
- Motivo: evitar inflar saldo com despesas previstas (`is_consolidated = false`) e corrigir divergencias como a do `NUBANK Cartao`.
- Impacto: o painel de contas volta a refletir saldo real consolidado, mantendo previsoes separadas em indicadores proprios.

- Data: `2026-05-17`
- Decisao: aplicar fallback de saldo por prioridade:
  1) snapshot (`last_balance_at` + `balance`), 2) saldo base manual + consolidado, 3) apenas consolidado.
- Motivo: `accounts.balance` isolado nao e atualizado automaticamente em todos os fluxos; usar fallback evita valores nulos.
- Impacto: maior robustez de exibicao sem perder compatibilidade com contas sincronizadas e contas manuais.

- Data: `2026-05-17`
- Decisao: **revisada**. A estrategia de usar apenas `accounts.balance` foi substituida por composicao com consolidado + fallback de snapshot.
- Motivo: em contas manuais, `accounts.balance` isolado deixou saldos nulos/zerados.
- Impacto: manter historico da decisao e registrar o ajuste corretivo aplicado na etapa seguinte.

- Data: `2026-05-17`
- Decisao: implementar exclusao de conta via rota dedicada `POST /api/accounts/delete` com etapa explicita de confirmacao na UI.
- Motivo: permitir manutencao completa das contas diretamente na tela `accounts`.
- Impacto: usuario consegue remover contas sem manipulacao manual no banco; transacoes vinculadas sao removidas por cascade.

- Data: `2026-05-17`
- Decisao: implementar pareamento automatico via deep link (`financego-companion://pair`) entre `/mobile/pair` e APK.
- Motivo: eliminar digitacao manual de URL/ID/token no app companion.
- Impacto: onboarding em 1 toque no celular quando app estiver instalado.

- Data: `2026-05-17`
- Decisao: reforcar feedback no APK apos `Salvar configuracao` com validacao de campos e teste automatico de conectividade.
- Motivo: evitar percepcao de "nada aconteceu" ao salvar e reduzir erro de configuracao silencioso.
- Impacto: onboarding no app ficou mais claro e autoexplicativo.

- Data: `2026-05-17`
- Decisao: manter companion Android como caminho principal para captura automatica no celular.
- Motivo: entrega registro quase imediato de transacoes por notificacao sem depender de Android Studio para uso final.
- Impacto: usuario final instala APK pronto e configura token de pareamento.

- Data: `2026-05-17`
- Decisao: gerar e disponibilizar APK de teste (debug e release assinado) como artefato local.
- Motivo: acelerar testes em dispositivo real sem necessidade de abrir Android Studio no uso diario.
- Impacto: validação em campo ficou direta e imediata.

## Decisoes de interface
- Data: `2026-05-17`
- Tela: `mobile`
- Decisao: remover o componente/banner com texto `Nova experiencia` da tela principal mobile.
- Motivo: alinhamento com solicitacao do produto para simplificar a home no celular.
- Impacto: interface mais limpa e foco direto nos indicadores e no extrato.

- Data: `2026-05-17`
- Tela: `mobile`
- Decisao: manter painel lateral com `Visao geral`, `Saldo das contas`, `Extrato mensal` e `Grafico mensal`, sem `Metas`/`Sonhos`.
- Motivo: seguir escopo funcional definido para navegacao mobile.
- Impacto: menu objetivo e orientado ao uso financeiro diario.

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
- [ ] Definir processo oficial de distribuicao de APK para usuarios (canal interno ou store privada).
- [ ] Definir politica de assinatura de release final (keystore de producao).
- [ ] Definir estrategia de atualizacao automatica do companion no dispositivo.
