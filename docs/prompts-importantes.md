# Prompts Importantes

Registro de prompts que direcionaram implementacoes e ajustes relevantes.

## Prompts usados para implementacao
- Objetivo: ajustar UX da login e incluir logout por icone na tela mobile.
- Prompt base: "Na página login, retirar o componente ... Carregando... mudar botão para Acessar ... disponibilizar ícone para deslogar."
- Resultado:
  - `Carregando...` removido do bloco de status abaixo do botao na login.
  - Texto do botao principal alterado para `Acessar`.
  - Icone de logout adicionado no topo direito do mobile e opcao `Sair` no drawer.

- Objetivo: permitir exclusao de dispositivos pareados no mobile/pair e gerar release-signed para teste paralelo no Xiaomi.
- Prompt base: "Na parte mobile/pair, disponibilizar uma opcao para excluir dispositivos pareados... gerar versao release-signed..."
- Resultado:
  - Botao `Excluir dispositivo` implementado na lista de pareados em `/mobile/pair`.
  - Nova rota `POST /api/devices/delete` adicionada com validacao de ownership.
  - Companion com versao incrementada e release-signed novo gerado para reteste.

- Objetivo: corrigir falha de registro automatico de notificacoes Nubank apos pareamento do APK.
- Prompt base: "Instalei o apk... recebi notificacao do NuBank e nao registrou automaticamente... corrigir para funcionar automatico."
- Resultado:
  - Listener Android ficou mais tolerante a variacoes de pacote/conteudo.
  - Rebind automatico do servico implementado.
  - Parser monetario no backend ampliado para mais formatos.
  - APK debug atualizado para reteste rapido no celular.

- Objetivo: automatizar replicacao de orcamento quando o mes de referencia for o mes atual.
- Prompt base: "Na pagina budget, se o mes de referencia for o mes atual... replicado para todos os meses seguintes dentro do ano..."
- Resultado:
  - Regra implementada em `POST /api/budgets/save`.
  - Salvamento no mes atual replica categorias/valores ate dezembro.
  - Mensagem visual de sucesso especifica informa quando houve replicacao.

- Objetivo: incluir grafico pizza unico em `budgets` para visualizar fatias orcadas e consumo por categoria.
- Prompt base: "Abaixo de 'Gasto fora do orcamento' criar um unico grafico tipo pizza..."
- Resultado:
  - Grafico pizza adicionado no card `Resumo mensal` da pagina `budgets`.
  - Fatias proporcionais ao valor orcado por categoria.
  - Segmentacao visual por categoria entre parte consumida e parte restante.
  - Legenda com `%`, `R$ gasto` e `R$ orcado` por categoria.

- Objetivo: remodelar completamente `budgets` para planejamento mensal por categorias selecionadas pelo usuario com monitoramento por `%` e `R$`.
- Prompt base: "A pagina budgets deve ser completamente remodelada... escolher mes de referencia... selecionar categorias... estabelecer orcamento individual... monitorar gastos por percentual e R$."
- Resultado:
  - Tela de `budgets` refeita com seletor de mes + categorias dinamicas + valores por categoria.
  - API `budgets/save` adaptada para sincronizar o conjunto de categorias do mes.
  - Monitoramento no proprio `budgets` com tabela de orcado, gasto, saldo e barra de consumo percentual.
  - Build validado com sucesso.

- Objetivo: corrigir saldo nulo no painel de contas e separar previsto de saldo consolidado.
- Prompt base: "Na pagina accounts... despesa prevista... e no dashboard/transactions os saldos estao nulos."
- Resultado:
  - Saldo de contas passou a usar composicao por transacoes consolidadas com fallback de snapshot.
  - `Despesa prevista` permaneceu como indicador separado (nao entra no saldo consolidado).
  - Correcao aplicada em `dashboard` e `accounts`.

- Objetivo: habilitar exclusao de conta e corrigir saldo incorreto na tela de transacoes.
- Prompt base: "A pagina accounts deve permitir que o usuario possa deletar uma determinada conta... Corrigir saldo negativo incorreto da conta NUBANK Cartao."
- Resultado:
  - Acao de exclusao de conta adicionada na pagina `accounts`.
  - Nova rota `POST /api/accounts/delete` criada com validacao de ownership.
  - Correcao do saldo lateral em `transactions` para usar `accounts.balance`.
  - Build validado com sucesso.

- Objetivo: simplificar a home mobile e preparar teste real no Android sem Android Studio para usuario final.
- Prompt base: "Vamo fazer pelo APK Pronto então. Mudar a página principal do sistema para celular retirando o componente que envolve o texto 'Nova experiencia'..."
- Resultado:
  - Removido banner `Nova experiencia` da home mobile.
  - Docs atualizados com o novo estado.
  - Build web validado.
  - APKs gerados para teste (`debug` e `release` assinado).

- Objetivo: corrigir experiencia no APK quando o usuario salva configuracao e nao percebe retorno.
- Prompt base: "Fiz as configurações, mas após apertar 'Salvar configuração' no apk, nada aconteceu..."
- Resultado:
  - Validacao de campos obrigatorios no app companion.
  - Toasts e mensagens de status explicitas no salvar.
  - Teste automatico de conectividade apos salvar configuracao.
  - Novo APK de compatibilidade gerado para reteste.

- Objetivo: remover necessidade de digitacao manual no pareamento.
- Prompt base: "Mas na nova implementação a ideia é não precisar digitar nada..."
- Resultado:
  - Botao de auto-pareamento implementado em `/mobile/pair`.
  - Deep link para abertura direta do APK com dados de configuracao.
  - APK atualizado para consumir o deep link e salvar automaticamente.

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

- Objetivo: testar automaticamente no celular se o companion registra transacao apos notificacao tipo PIX, mesmo sem push real de banco.
- Prompt base: "Nao consigo ativar as notificacoes do apk... Conseguimos simular de alguma maneira um teste recebendo uma notificacao de pix..."
- Resultado:
  - Novo botao `Simular notificacao PIX (listener)` criado no APK.
  - Companion passou a gerar notificacao local com payload estilo Nubank PIX.
  - Listener passou a aceitar o proprio pacote para capturar a simulacao.
  - Status do app mostra listener/permissao/fila para facilitar diagnostico rapido.
  - Build Android e build web validados com sucesso.
