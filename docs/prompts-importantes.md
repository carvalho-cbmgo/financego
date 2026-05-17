# Prompts Importantes

Registro de prompts que direcionaram implementacoes e ajustes relevantes.

## Prompts usados para implementacao
- Objetivo: implementar navegacao lateral mobile conforme referencia visual.
- Prompt base: "Quando o sistema for acessado de um celular, ao clicar nas tres barras laterais..."
- Resultado:
  - Painel lateral na tela `/mobile` implementado.
  - Opcoes entregues: `Visao geral`, `Saldo das contas`, `Extrato mensal` e `Grafico mensal`.
  - `Metas` e `Sonhos` nao incluidos no painel.

- Objetivo: habilitar onboarding de dispositivo para captura automatica de notificacoes bancarias.
- Prompt base: "Pode implementar o proximo passo: tela de pareamento + app Android companion minimo..."
- Resultado:
  - Nova tela `/mobile/pair` para gerar `Device Public ID` e `Device Token`.
  - Listagem de dispositivos pareados.
  - Projeto `android-companion-min/` criado para Android Studio com listener + fila offline + sync em lote.

- Objetivo: manter visao mobile dedicada com dados financeiros.
- Prompt base: "Quero desenvolver uma interface diferente para utilizacao em celulares..."
- Resultado:
  - Rota `/mobile` mantida com visao geral, graficos e secoes de acompanhamento mensal.

## Prompts usados para processo
- Objetivo: garantir deploy automatico continuo apos alteracoes.
- Prompt base: "Toda vez que alteracoes no sistema forem realizadas, proceder com commit + push..."
- Resultado: regra aplicada e registrada no fluxo de entrega.

## Prompts usados para documentacao
- Artefato documentado: atualizacao completa de `/docs` apos menu lateral mobile e pareamento Android.
- Prompt base: "Atualize os arquivos da pasta docs com todas atualizacoes..."
- Resultado: estado atual consolidado para continuidade rapida do projeto.
