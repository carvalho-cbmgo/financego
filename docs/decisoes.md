# Decisoes do Projeto

Registro das decisoes arquiteturais, de interface e de dados.

## Decisoes tecnicas
- Data: `2026-05-17`
- Decisao: calcular `Saldo sem as transacoes exibidas` na aba `transactions` a partir do acumulado anterior ao mes de referencia.
- Motivo: garantir consistencia temporal do saldo-base da tela.
- Impacto: saldo-base deixa de depender do total atual de contas e passa a refletir o periodo exibido.

- Data: `2026-05-17`
- Decisao: incluir toggle `Incluir saldo anterior` na propria tabela de transacoes.
- Motivo: permitir comparacao rapida entre visao com base acumulada e visao zerada.
- Impacto: quando desligado, saldo-base vira `0`; quando ligado, usa acumulado pre-mes.

- Data: `2026-05-17`
- Decisao: ajustar geracao de recorrencia mensal para respeitar meses curtos sem perder ocorrencias.
- Motivo: corrigir falha de parcelamentos onde a ultima parcela podia nao ser criada em casos de fim de mes.
- Impacto: maior previsibilidade de parcelas e consistencia de calendario.

- Data: `2026-05-17`
- Decisao: remover sufixos de parcela/recorrencia da descricao das transacoes geradas.
- Motivo: ja existe indicador visual de parcela na listagem.
- Impacto: descricao mais limpa e sem redundancia.

## Decisoes de interface
- Data: `2026-05-17`
- Tela: `transactions`
- Decisao: exibir transacoes nao consolidadas em negrito e consolidadas em fonte normal.
- Motivo: destacar pendencias operacionais de forma direta.
- Impacto: leitura mais rapida do que ainda nao foi consolidado.

- Data: `2026-05-17`
- Tela: `transactions`
- Decisao: alinhar explicitamente cabecalhos e celulas das colunas `Descricao`, `Categoria`, `Conta`, `Valor (R$)` e `C`.
- Motivo: eliminar ambiguidade visual na leitura linha a linha.
- Impacto: tabela mais clara e consistente.

- Data: `2026-05-17`
- Tela: `transactions`
- Decisao: manter setas de navegacao mensal ao lado do seletor de mes.
- Motivo: facilitar navegacao por periodo sem abrir seletor manualmente.
- Impacto: fluxo de uso mais rapido.

## Decisoes de processo
- Data: `2026-05-17`
- Decisao: tornar obrigatoria a atualizacao da pasta `/docs` a cada mudanca no sistema.
- Motivo: preservar contexto e continuidade entre sessoes.
- Impacto: rastreabilidade maior de estado, pendencias e decisoes.

- Data: `2026-05-17`
- Decisao: usar certificados do sistema no Node/npm via `NODE_OPTIONS=--use-system-ca` no ambiente Windows local.
- Motivo: corrigir falha TLS com npm (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`) sem desabilitar validacao SSL.
- Impacto: `npm install` e `npm run build` voltaram a funcionar com seguranca.

## Decisoes futuras
- [ ] Definir cobertura de testes automatizados para saldos por periodo e filtros combinados.
- [ ] Definir estrategia final da selecao de conta no bloco de criacao sem perder layout compacto.
- [ ] Definir padrao unico de mensagens de erro e sucesso no frontend.
