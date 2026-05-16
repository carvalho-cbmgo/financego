# Pendencias do Projeto

Backlog operacional para manter visibilidade do que ainda precisa ser entregue.

## Pendencias criticas
- [ ] Validar em producao (Vercel) os 3 modos de recorrencia na criacao e na edicao.
- [ ] Confirmar que exclusao por escopo nao reintroduz transacoes em sincronizacoes futuras.
- [ ] Garantir consistencia de saldo antes/depois quando filtros de conta/categoria estao ativos.

## Pendencias importantes
- [ ] Revisar responsividade da area `Adicionar transacao` em larguras menores.
- [ ] Avaliar permitir selecao de conta no bloco de criacao sem comprometer layout em linha.
- [ ] Revisar rotulos/textos para padronizacao (acentuacao e nomenclatura).

## Melhorias futuras
- [ ] Adicionar acao de alterar categoria em lote de forma funcional (hoje apenas seletor visual).
- [ ] Criar resumo de validacao mensal (entradas, saidas, saldo) na propria aba `transactions`.
- [ ] Evoluir experiencia de filtros com presets salvos por usuario.

## Bugs conhecidos
- ID: `TRX-001`
- Descricao: primeira tentativa de `npm run build` desta sessao excedeu timeout de execucao do terminal (na segunda tentativa concluiu normalmente).
- Severidade: baixa
- Como reproduzir: executar build com timeout curto em ambiente com carga alta.
- Status: monitorar
- Responsavel: time de desenvolvimento
