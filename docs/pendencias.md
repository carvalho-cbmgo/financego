# Pendencias do Projeto

Backlog operacional para manter visibilidade do que ainda precisa ser entregue.

## Pendencias criticas
- [ ] Testar instalacao e execucao do APK release assinado em pelo menos 2 aparelhos Android.
- [ ] Validar fluxo real: notificacao bancaria recebida -> transacao criada automaticamente no FinanceGO.
- [ ] Confirmar estabilidade do listener com aparelho bloqueado e apos reinicio.

## Pendencias importantes
- [ ] Implementar acao de desparear/desativar dispositivo direto em `/mobile/pair`.
- [ ] Expandir feedback da tela de pareamento (mostrar status de token ativo e ultimo envio em tempo real).
- [ ] Refinar visual do menu lateral mobile para aproximacao final da referencia.
- [ ] Definir rotina de publicacao recorrente de APK para teste interno.

## Melhorias futuras
- [ ] Incluir verificacao de conectividade e fila offline no UI do companion.
- [ ] Adicionar endpoint de healthcheck para cada dispositivo pareado.
- [ ] Criar pipeline de build Android automatizado (CI) para gerar APK por commit/tag.

## Bugs conhecidos
- ID: `TRX-001`
- Descricao: ambiente local com problema de `npm` (`Exit handler never called`) bloqueando install/build nesta sessao.
- Severidade: media
- Como reproduzir: executar `npm install` ou `npm ci` no ambiente atual.
- Status: resolvido em `2026-05-17`
- Responsavel: time de desenvolvimento

- ID: `TRX-002`
- Descricao: validacao automatica de build indisponivel nesta sessao por dependencia ausente/ambiente (`next` nao reconhecido apos falha de install).
- Severidade: baixa
- Como reproduzir: executar `npm run build` sem dependencias instaladas corretamente.
- Status: resolvido em `2026-05-17`
- Responsavel: time de desenvolvimento
