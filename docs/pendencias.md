# Pendencias do Projeto

Backlog operacional para manter visibilidade do que ainda precisa ser entregue.

## Pendencias criticas
- [ ] Validar em dispositivo real (Android e iOS) o fluxo completo: login -> redirect automatico -> tela `/mobile`.
- [ ] Validar consistencia de indicadores da tela `/mobile` com a tela `/dashboard` para o mesmo `month_ref`.
- [ ] Revisar deteccao de user-agent para evitar classificacao incorreta em tablets.

## Pendencias importantes
- [ ] Refinar microinteracoes da tela mobile (icones, densidade e feedback de clique).
- [ ] Definir se a tela mobile deve oferecer filtros por conta/categoria na propria pagina.
- [ ] Revisar textos para padronizacao final (acentuacao e nomenclatura).
- [ ] Validar desempenho da tela mobile em aparelhos de entrada.

## Melhorias futuras
- [ ] Adicionar navegacao secundaria mobile para abrir rapidamente transacoes/orcamento/graficos.
- [ ] Evoluir grafico de fluxo de caixa mobile com tooltips por dia.
- [ ] Criar testes E2E para fluxo mobile com Playwright/Cypress.

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
