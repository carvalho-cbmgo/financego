# Prompts Importantes

Registro de prompts que direcionaram implementacoes e ajustes relevantes.

## Prompts usados para implementacao
- Objetivo: simplificar a home mobile e preparar teste real no Android sem Android Studio para usuario final.
- Prompt base: "Vamo fazer pelo APK Pronto então. Mudar a página principal do sistema para celular retirando o componente que envolve o texto 'Nova experiencia'..."
- Resultado:
  - Removido banner `Nova experiencia` da home mobile.
  - Docs atualizados com o novo estado.
  - Build web validado.
  - APKs gerados para teste (`debug` e `release` assinado).

- Objetivo: implementar menu lateral mobile e pareamento Android.
- Prompt base: "Quando o sistema for acessado de um celular... Pode implementar o proximo passo: tela de pareamento + app Android companion minimo..."
- Resultado:
  - Menu lateral com opcoes principais entregue.
  - Tela `/mobile/pair` criada.
  - Companion Android minimo criado no repositorio.

## Prompts usados para processo
- Objetivo: garantir deploy automatico continuo apos alteracoes.
- Prompt base: "Toda vez que alteracoes no sistema forem realizadas, proceder com commit + push..."
- Resultado: regra aplicada e mantida no fluxo de entrega.

## Prompts usados para documentacao
- Artefato documentado: atualizacao completa de `/docs` apos ajuste da home mobile e geracao de APK para testes.
- Prompt base: "Atualize os arquivos da pasta docs com todas atualizacoes..."
- Resultado: estado atual consolidado para continuidade rapida do projeto.
