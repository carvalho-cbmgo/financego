# Prompts Importantes

Registro de prompts que direcionaram implementacoes e ajustes relevantes.

## Prompts usados para implementacao
- Objetivo: corrigir erro de login no APK Android causado por URL de producao incorreta.
- Prompt base: "instalei o app-debug.apk e executei o aplicativo no celular, mas na tela inicial de login, tudo está preenchido, mas ao clicar em 'ENTRAR' aparece um erro. Será que o https utilizado está incorreto? O link utilizado para acessar o FinanceGO pelo vercel no sistema web é https://financego-eight.vercel.app/"
- Resultado:
  - URL padrao do APK alterada para `https://financego-eight.vercel.app`.
  - Migracao automatica criada para substituir URL antiga salva no celular.
  - Versao Android atualizada para `1.0.2`.
  - Script de build Android reforcado para remover atributos `ReadOnly` das pastas geradas antes do Gradle.
  - Endpoint `/api/android/login` validado em producao.
  - Login real em producao validado com retorno `ok=true`.

- Objetivo: corrigir crash imediato do APK Android nativo ao abrir no celular.
- Prompt base: "Instalei o app-debug.apk no meu celular andoid, mas ao tentar iniciar o aplicativo não foi possível, pois deu erro e o aplicativo fechou imediatamente."
- Resultado:
  - Causa provável identificada: uso de `AppCompatActivity` com tema nativo Android, incompatibilidade que pode derrubar o app antes da tela inicial.
  - `MainActivity` passou a herdar de `android.app.Activity`.
  - Dependencia `androidx.appcompat:appcompat` removida.
  - Versao Android atualizada para `1.0.1`.
  - Build `debug`, `lint`, `test` e `release` validados com sucesso.
  - APK `debug` verificado como assinado.

- Objetivo: adicionar perfil com nome completo, ajustar transações com foco modal/transferência interna e substituir Android antigo por novo APK nativo.
- Prompt base: "Altere o sistema FinanceGO para que haja um registro do nome completo do usuário... Crie uma versão do sistema FinanceGO para celular android (apk) complementamente nova..."
- Resultado:
  - Cadastro passou a registrar nome completo.
  - Página `/profile` criada para visualizar e editar dados do usuário.
  - Menu superior passou a ter `Perfil` antes de `Sair`.
  - Transações passaram a abrir criação/edição em modal focado com fundo escurecido.
  - Transferência manual passou a solicitar origem/destino e gerar duas linhas vinculadas de `type=transfer`.
  - Parser de notificações passou a usar nome completo para diferenciar PIX recebido, PIX realizado e transferência própria.
  - Android antigo removido e nova base `android-financego` criada com login nativo, sincronização e listener de notificações.
  - Builds validados: `npm run build`, Android `debug`, `test`, `lint` e `release`.

- Objetivo: instalar Gradle, compilar o companion Android e executar validações para funcionamento do FinanceGO em celulares Android.
- Prompt base: "Instale o Gradle para realizar as compilações do campanion Android e realizar todas as validações e testes necessários para o perfeito funcionamento do FinanceGO em celulares android."
- Resultado:
  - Gradle `8.7` instalado localmente em `.tools/gradle-8.7`.
  - Truststore local criada para resolver dependências Gradle em ambiente com inspeção HTTPS do AVG.
  - Android Gradle Plugin atualizado para `8.6.1`.
  - Companion atualizado para `versionCode=4` e `versionName=0.1.3`.
  - `MobileWebActivity` ajustada para remover APIs depreciadas.
  - Script `scripts/build-android-financego.ps1` criado para builds Android repetíveis.
  - Validações concluídas: `assembleDebug`, `assembleRelease`, `testDebugUnitTest`, `lintDebug` e `npm run build`.
  - APK `debug` verificado como assinado para teste; APK `release` gerado como unsigned e pendente de keystore de produção.

- Objetivo: remover painel superior do dashboard/transacoes, remodelar experiencia mobile e preparar uso por APK sem navegador.
- Prompt base: "Retirar o Painel de 'Central de controle financeiro'... Realizar uma remodelagem aprofundada do designer do sistema quando utilizado num celular... aplicativo apk FinanceGO possa ser instalado no celular..."
- Resultado:
  - Painel superior `Central de controle financeiro` removido de `dashboard` e `transactions`.
  - `/mobile` remodelado com saldo projetado, KPIs, insights, atalhos e melhor leitura das transacoes.
  - Companion Android ganhou `MobileWebActivity` com WebView interno para abrir `/mobile` no APK.
  - Botao `Abrir FinanceGO no app` adicionado ao companion.
  - `BootReceiver` criado para reagendar sincronizacao apos reinicio do celular.
  - Build web validado; build Android pendente por ausencia de Gradle no ambiente local.

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

- Objetivo: remodelar o APK nativo com login sofisticado, carregamento visual, painel mensal, perfil, detalhe de conta e transacoes recorrentes.
- Prompt base: "No aplicativo apk, ajustar para que seja ocultado da tela de login o informacao https... Trabalhe na parte do design das telas do sistema apk para que sistema fique extremamente sofisticado e profissional."
- Resultado:
  - Login nativo redesenhado, sem URL visivel e sem subtitulo tecnico.
  - Overlay `Carregando...` aplicado nas operacoes principais.
  - Tela principal Android passou a usar mes de referencia, setas, saldo anterior, entradas, saidas e saldo atual.
  - Contas exibidas com saldo e marcador `CREDITO`/`CORRENTE`.
  - Detalhe de conta criado com saldos e transacoes por mes.
  - Perfil criado no APK para visualizar e editar nome completo.
  - Nova transacao nativa passou a suportar transferencia, consolidacao, parcelamento e recorrencia avancada.
  - APIs Android ajustadas para categorias dinamicas e salvamento recorrente.
  - Acentuacao de textos web alterados foi revisada, incluindo orcamento, pareamento mobile, contas, seletores de mes e exportacoes.

- Objetivo: refinar tela de transacoes do APK com icones, resumo compacto, FAB, formulario em linhas e corrigir classificacao de notificacoes.
- Prompt base: "Na tela de transações do apk, exibir os seguintes conjuntos de textos e valores... Corrigir para que o sistema identifique corretamente uma transação de despesa em relação a uma transação de receita..."
- Resultado:
  - Resumo financeiro no APK passou para linhas com texto a esquerda e valor a direita.
  - Acoes `Atualizar`, `Perfil` e `Sair` passaram para icones no topo.
  - `Nova Transacao` passou a ser botao flutuante `+`.
  - Formulario de nova/edicao de transacao passou a usar uma linha por campo.
  - Categoria no APK passou a exibir recuo por profundidade.
  - Saldos por conta passaram a usar normalizacao backend por tipo da transacao.
  - Parser de notificacoes corrigido para `Compra no credito aprovada` como despesa e `estorno` como receita.

- Objetivo: adicionar filtro de periodo financeiro no APK, melhorar icones e estruturar criacao/edicao de recorrencias.
- Prompt base: "Na tela de transações do apk, alterar os ícones dos botões ATUALIZAR e SAIR... implementar um seletor com as opções Inicio de MAIO ate hoje, Amanha ate o final de MAIO e MAIO (1 a 31)... ao clicar para editar transações com repetição..."
- Resultado:
  - APK ganhou seletor de periodo para calcular resumo financeiro e saldos de contas.
  - Icones de atualizar/sair foram refinados no topo da tela.
  - Parcelamentos mensais criados pelo APK passam a gerar parcelas mes a mes vinculadas.
  - Transacoes recorrentes/parceladas aparecem com selo azul e legenda `Parcela X de Y` ou `Recorrente`.
  - Edicao de recorrencias nao consolidadas passou a perguntar o escopo antes de abrir o formulario.
  - Campo `R$ Total` no formulario de repeticao ficou bloqueado e calculado automaticamente.
  - Botoes `Cancelar` e `Salvar` foram centralizados.
  - Versao Android atualizada para `1.0.5`.

- Objetivo: reorganizar visualmente os cards de transacao do APK e permitir exclusao nativa durante edicao.
- Prompt base: "No apk, ajustar a cor da borda das transações para que ela seja da mesma cor que a borda das contas exibidas no painel de contas... Quando o usuário for editar alguma transação, acrescentar o botão Excluir..."
- Resultado:
  - Cards de transacao passaram a usar borda igual aos cards de conta.
  - Primeira linha exibe `DD/MM/AAAA - Descricao`, sem sufixo de parcela dentro da descricao.
  - Segunda linha exibe categoria em selo verde e parcela/recorrencia em selo azul.
  - Terceira linha exibe conta relacionada e selo de tipo da conta.
  - Valor fica alinhado a direita e centralizado verticalmente.
  - `Recorrente` passou a ser reservado para modalidade `Avancado`; parcelamento mostra `Parcela X de Y`.
  - Modal de edicao ganhou botao vermelho `Excluir`.
  - Nova rota Android `/api/android/transactions/delete` criada.
  - Versao Android atualizada para `1.0.6`.

- Objetivo: adicionar edicao/exclusao de contas no APK e refinar topo, icones e marca.
- Prompt base: "Ajustar o apk para que ao clicar em uma das Contas na tela principal esteja disponível... um outro ícone para edição da conta... Trocar os ícones de ATUALIZAR, PERFIL e SAIR por miniaturas de imagens..."
- Resultado:
  - Tela de detalhe da conta ganhou icone de lapis para abrir `Edicao de Conta`.
  - Modal de conta permite editar banco, nome, tipo e saldo base.
  - Modal de conta ganhou botao vermelho `Excluir` e botoes `Cancelar`/`Salvar`.
  - Cards de contas passaram a mostrar banco em selo roxo, tipo ao lado e saldo alinhado a direita.
  - Icones de topo passaram a usar drawables vetoriais nativos.
  - Marca `Finance GO` recebeu destaque visual no `GO`.
  - Rotas Android `/api/android/accounts/save` e `/api/android/accounts/delete` criadas.
  - Versao Android atualizada para `1.0.7`.

- Objetivo: compactar o topo do APK com menu de 3 pontos e manter nova transacao na tela de conta.
- Prompt base: "Ajustar o apk para que o sistema mantenha o botão flutuante de nova transação da tela principal na tela de uma conta específica... crie um botão com uma imagem de 3 pontos verticais..."
- Resultado:
  - Tela principal passou a exibir menu de 3 pontos com `Atualizar` e `Perfil`, alem do icone direto `Sair`.
  - Tela de conta passou a exibir menu de 3 pontos com `Edicao de Conta`, `Atualizar` e `Perfil`, alem do icone direto `Sair`.
  - Icones separados de atualizar/perfil/edicao foram removidos do topo.
  - Botao flutuante `+` foi mantido na tela de conta.
  - Nova transacao criada pela tela de conta ja preseleciona aquela conta como `Conta Origem`.
  - Terceira linha dos cards de transacao passou a exibir banco em selo roxo e tipo de conta.
  - Versao Android atualizada para `1.0.8`.
