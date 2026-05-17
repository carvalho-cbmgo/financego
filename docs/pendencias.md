# Pendencias do Projeto

Backlog operacional para manter visibilidade do que ainda precisa ser entregue.

## Pendencias criticas
- [ ] Validar em aparelho Android real: notificacao recebida -> transacao criada automaticamente.
- [ ] Confirmar que o companion continua ativo com tela bloqueada e apos reinicio do aparelho.
- [ ] Validar que o menu lateral mobile atende navegacao esperada em diferentes tamanhos de tela.

## Pendencias importantes
- [ ] Implementar acao de desparear/desativar dispositivo direto em `/mobile/pair`.
- [ ] Melhorar feedback visual de sucesso/erro no pareamento e no teste de envio.
- [ ] Revisar deteccao de pacotes bancarios para ampliar cobertura de instituicoes.
- [ ] Ajustar refinamentos do painel lateral para aproximacao visual final da referencia.

## Melhorias futuras
- [ ] Exibir telemetria do companion (ultima sincronizacao, fila offline, ultimo erro).
- [ ] Criar endpoint de healthcheck do dispositivo pareado.
- [ ] Incluir estrategia de atualizacao simplificada do companion (versao/app update).

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
