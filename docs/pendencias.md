# Pendencias do Projeto

Backlog operacional para manter visibilidade do que ainda precisa ser entregue.

## Pendencias criticas
- [ ] Validar em producao (Vercel) os 3 modos de recorrencia na criacao e na edicao.
- [ ] Confirmar que exclusao por escopo nao reintroduz transacoes em sincronizacoes futuras.
- [ ] Validar o calculo de saldo anterior na aba `transactions` com combinacoes de filtros (conta/banco/categoria).
- [ ] Validar parcelamento mensal com datas de fim de mes (28/29/30/31) em cenarios reais.

## Pendencias importantes
- [ ] Revisar responsividade da area `Adicionar transacao` em larguras menores.
- [ ] Avaliar permitir selecao de conta no bloco de criacao sem comprometer layout em linha.
- [ ] Revisar rotulos/textos para padronizacao (acentuacao e nomenclatura).
- [ ] Definir comportamento desejado de `Saldo com as transacoes exibidas` quando houver filtro por categoria.

## Melhorias futuras
- [ ] Adicionar acao de alterar categoria em lote de forma funcional (hoje apenas seletor visual).
- [ ] Criar resumo de validacao mensal (entradas, saidas, saldo) na propria aba `transactions`.
- [ ] Evoluir experiencia de filtros com presets salvos por usuario.

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
