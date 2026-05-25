# Decisoes do Projeto

Registro das decisoes arquiteturais, de interface e de dados.

## Decisoes tecnicas
- Data: `2026-05-25`
- Decisao: o formulario web de edicao de transacao deve enviar `intent` por campo oculto estavel, nao pelo botao submit.
- Motivo: ao desabilitar botoes no `onSubmit`, o navegador pode deixar de incluir o botao clicado no `FormData`, fazendo uma exclusao ser interpretada como salvamento.
- Impacto: `Excluir` define `intent=delete` antes da submissao; `Salvar` define `intent=save`; a rota recebe a acao correta mesmo com overlay/loading.

- Data: `2026-05-25`
- Decisao: links que abrem apenas a escolha de escopo de recorrencia nao devem acionar o overlay global de carregamento.
- Motivo: o overlay era iniciado pelo listener global de cliques antes do `preventDefault`, ficando sobreposto a janela de recorrencia e travando a interface ate o timeout.
- Impacto: links com `data-no-global-loading=true` sao ignorados pelo overlay global, e a janela de recorrencia aparece sem o `Carregando...` preso.

- Data: `2026-05-25`
- Decisao: edicao de transacoes recorrentes/parceladas nao consolidadas deve exigir escolha previa de escopo tambem na web.
- Motivo: evitar alteracao acidental de apenas uma parcela ou de toda a serie sem o usuario perceber o impacto.
- Impacto: `transactions` abre uma janela com `Alterar apenas esta`, `Alterar a partir desta` e `Alterar a partir da primeira`; a rota `/api/categories/update` recebe `repeat_scope` e recria somente transacoes nao consolidadas do escopo.

- Data: `2026-05-25`
- Decisao: `R$ Total` em parcelamento mensal deve ser derivado de `valor da parcela x quantidade total de parcelas`.
- Motivo: o total da compra representa o compromisso completo, mesmo quando a edicao/criacao comeca em uma parcela diferente da primeira.
- Impacto: o campo fica somente leitura na web e no APK; a API calcula parcelas restantes a partir do total completo sem superdimensionar os valores.

- Data: `2026-05-25`
- Decisao: exclusao de transacao recorrente na web deve solicitar escopo diretamente no modal de edicao.
- Motivo: o editor modal anterior nao enviava `delete_scope`, entao recorrencias podiam nao ser encerradas da forma esperada pelo usuario.
- Impacto: recorrencias passam a oferecer `Somente esta transacao`, `Esta e proximas vinculadas`, `Esta e anteriores vinculadas` e `Toda a recorrencia`; o padrao e `Esta e proximas vinculadas`.

- Data: `2026-05-25`
- Decisao: recorrencias avancadas com `Repetir infinitamente` nao devem usar nem exigir `installment_total`.
- Motivo: recorrencia infinita nao tem quantidade total de parcelas; manter o campo gera confusao e labels como `1/1`.
- Impacto: web e APK ocultam `Total de Parcelas` nessa condicao; dados salvos usam `installment_total=null` quando aplicavel.

- Data: `2026-05-25`
- Decisao: a consolidacao individual de transacoes na web deve ser feita por checkbox direto na lista.
- Motivo: reduzir friccao e permitir alternar entre consolidada/nao consolidada sem abrir edicao.
- Impacto: a coluna `C` de `transactions` chama `/api/transactions/batch` com `consolidate` ou `unconsolidate` e atualiza a tela em seguida.

- Data: `2026-05-25`
- Decisao: o build Android local deve usar truststore do Windows para resolver dependencias quando houver erro PKIX.
- Motivo: a JVM local falhou ao confiar nos certificados dos repositorios Maven/Google.
- Impacto: comando manual de build usa `JAVA_TOOL_OPTIONS=-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT`, `ANDROID_HOME`, Gradle `8.14.3` e `--gradle-user-home`.

- Data: `2026-05-25`
- Decisao: adicionar tela nativa `Categorias` no APK reutilizando a rota `/api/categories/manage`.
- Motivo: permitir gestao de categorias diretamente no celular sem depender da tela web de transacoes.
- Impacto: o APK passa a exibir arvore de categorias, criar categorias/subcategorias, editar nome/pai e excluir categorias com atualizacao imediata do bootstrap.

- Data: `2026-05-25`
- Decisao: manter a regra de exclusao existente para categorias no APK.
- Motivo: preservar consistencia com a web e evitar perda de historico financeiro.
- Impacto: ao excluir uma categoria, transacoes associadas sao movidas para `Outros` e subcategorias ficam vinculadas a `Raiz`.

- Data: `2026-05-25`
- Decisao: criar filtro `Somente Transacoes Consolidadas` no APK usando estado global da tela.
- Motivo: permitir ao usuario alternar rapidamente entre visao completa e visao apenas realizada/consolidada.
- Impacto: listas de transacoes, saldos, entradas, saidas, saldo final/atual, saldos de contas e graficos passam a respeitar o filtro quando marcado.

- Data: `2026-05-25`
- Decisao: notificacoes bancarias devem ser classificadas por regras explicitas de produto financeiro.
- Motivo: evitar que notificacoes de cartao de credito ou PIX sejam registradas com tipo incorreto.
- Impacto: cartao de credito vira despesa salvo estorno/reembolso; PIX/transferencia recebida vira receita; PIX/transferencia enviada vira despesa; fallback permanece despesa.

- Data: `2026-05-25`
- Decisao: reforcar visualmente transacoes nao consolidadas no APK usando fonte bold real e `fakeBoldText` na primeira linha.
- Motivo: a configuracao anterior nao estava ficando evidente em aparelho real.
- Impacto: a linha `data - descricao` passa a chamar mais atencao para lancamentos futuros/previstos.

- Data: `2026-05-22`
- Decisao: usar seletor nativo de calendario para o campo `Data` no cadastro/edicao de transacoes do APK.
- Motivo: reduzir erro de digitacao e tornar a escolha de data mais simples no celular.
- Impacto: o campo continua salvando em `posted_at`, mas agora o usuario escolhe a data pelo calendario Android.

- Data: `2026-05-22`
- Decisao: trocar o selo de pagina do APK de verde para rosa.
- Motivo: o verde ja representa marca/saldos positivos e o usuario pediu destaque mais chamativo para identificar a tela atual.
- Impacto: os badges de `Transacoes`, `Contas`, `Graficos`, `Bancos` e demais titulos do cabecalho ficam visualmente mais evidentes.

- Data: `2026-05-22`
- Decisao: criar uma tela nativa `Graficos` no APK em vez de abrir a pagina web `/charts`.
- Motivo: manter o uso principal do app Android sem navegador e permitir filtros rapidos por periodo, mes e contas.
- Impacto: o APK passa a desenhar grafico pizza nativo com percentuais e toque em fatias para exibir valor em reais.

- Data: `2026-05-22`
- Decisao: criar rotas Android dedicadas para salvar e excluir bancos.
- Motivo: o APK precisa gerenciar bancos por JSON e Bearer token, sem depender de rotas web baseadas em `FormData` e redirect.
- Impacto: adicionadas `/api/android/banks/save` e `/api/android/banks/delete`; exclusao de banco bloqueia quando ha contas vinculadas.

- Data: `2026-05-22`
- Decisao: manter a exclusao de banco bloqueada quando houver contas vinculadas.
- Motivo: preservar integridade dos dados financeiros e evitar exclusao acidental de banco que ainda organiza contas e transacoes.
- Impacto: o usuario deve remover ou mover as contas antes de excluir o banco.

- Data: `2026-05-22`
- Decisao: tratar `accounts.balance` no APK como saldo base da conta.
- Motivo: ao editar uma conta pelo APK, o usuario espera que o saldo base seja considerado no saldo anterior/inicial e no saldo final, nao apenas exibido no cadastro.
- Impacto: saldos da tela principal, tela de conta e `computed_balance` do bootstrap Android passam a somar `saldo base + transacoes`.

- Data: `2026-05-22`
- Decisao: diferenciar transacoes consolidadas e nao consolidadas pelo peso do texto.
- Motivo: permitir que o usuario identifique rapidamente transacoes futuras/previstas sem adicionar poluicao visual ao card.
- Impacto: transacoes nao consolidadas aparecem em negrito; transacoes consolidadas aparecem com peso normal nas telas principal e de conta.

- Data: `2026-05-22`
- Decisao: permitir que `/api/android/accounts/save` crie contas novas quando nao receber `id`.
- Motivo: o APK passou a ter acao `Adicionar Conta` no menu principal e precisa reutilizar a mesma rota autenticada usada para edicao.
- Impacto: payload sem `id` faz `insert`; payload com `id` continua fazendo `update` com validacao de `profile_id`.

- Data: `2026-05-22`
- Decisao: o menu de 3 pontos da tela principal do APK deve ter `Adicionar Conta` antes de `Atualizar`.
- Motivo: criar conta e uma acao frequente durante a organizacao inicial das financas, e o usuario pediu acesso rapido sem entrar em outra tela.
- Impacto: o cadastro de conta fica disponivel diretamente na tela de transacoes, usando uma janela compacta.

- Data: `2026-05-22`
- Decisao: o titulo da pagina no APK deve ser exibido como selo destacado abaixo da marca `Finance GO`.
- Motivo: melhorar orientacao visual do usuario na tela principal e na tela de conta especifica sem aumentar a complexidade do topo.
- Impacto: `Transacoes`, `Perfil`, `Configuracao` e titulos de conta ficam mais identificaveis no cabecalho nativo.

- Data: `2026-05-21`
- Decisao: criar rotas Android dedicadas para salvar e excluir contas.
- Motivo: o APK precisa editar/excluir contas usando JSON e Bearer token, enquanto as rotas web existentes usam `FormData` e redirecionamento.
- Impacto: adicionadas `/api/android/accounts/save` e `/api/android/accounts/delete`, consumidas pelo APK nativo.

- Data: `2026-05-21`
- Decisao: criar rota Android dedicada para exclusao de transacoes (`POST /api/android/transactions/delete`).
- Motivo: o APK precisa excluir transacoes sem depender das rotas web e preservando validacao de usuario autenticado.
- Impacto: a exclusao nativa passa a funcionar para transacao simples, pares de transferencia interna e escopos de repeticao nao consolidada.

- Data: `2026-05-21`
- Decisao: o APK nativo passa a calcular resumo e saldos por um `periodo de calculo` selecionado pelo usuario.
- Motivo: permitir analise separada entre realizado ate hoje, previsoes futuras do mes e mes completo.
- Impacto: `Entradas`, `Saidas`, `Saldo atual` e saldos de `Contas` no APK respeitam o periodo selecionado, preservando a opcao `Incluir saldo anterior`.

- Data: `2026-05-21`
- Decisao: transacoes parceladas/recorrentes criadas no APK devem compartilhar `installment_group_key` e ser editadas por escopo.
- Motivo: o usuario precisa alterar somente uma parcela, as parcelas futuras ou a serie recorrente nao consolidada sem perder o vinculo entre lancamentos.
- Impacto: `/api/android/transactions/save` aceita `repeat_scope` e recria apenas o conjunto elegivel de transacoes nao consolidadas.

- Data: `2026-05-21`
- Decisao: o campo `R$ Total` no APK deve ser derivado automaticamente de `valor da parcela x total de parcelas`.
- Motivo: evitar divergencia manual entre valor da parcela, quantidade e total da compra/recorrencia.
- Impacto: o campo fica bloqueado para edicao e serve como conferencia visual durante criacao/edicao.

- Data: `2026-05-20`
- Decisao: definir `https://financego-eight.vercel.app` como URL oficial de producao do APK Android.
- Motivo: o dominio real usado pelo sistema web no Vercel e `https://financego-eight.vercel.app/`; a URL antiga `https://app-financego.vercel.app` causava falha de login no app.
- Impacto: APK `1.0.2` usa o dominio correto por padrao e migra automaticamente instalacoes que ainda tenham a URL antiga salva no armazenamento interno.

- Data: `2026-05-20`
- Decisao: o script `scripts/build-android-financego.ps1` deve limpar atributos `ReadOnly` em pastas de build Android antes de executar o Gradle.
- Motivo: o Windows marcou subpastas geradas do Gradle como somente leitura e isso bloqueou `generateDebugBuildConfig`.
- Impacto: validacoes Android ficam mais repetiveis sem precisar limpeza manual de `android-financego/app/build`.

- Data: `2026-05-20`
- Decisao: usar `android.app.Activity` no APK nativo em vez de `AppCompatActivity`.
- Motivo: o app Android usa tema nativo (`android:style/Theme.Material.Light.NoActionBar`); `AppCompatActivity` exige tema `Theme.AppCompat` e pode causar crash imediato na abertura.
- Impacto: o APK `1.0.1` fica alinhado ao tema nativo, remove dependencia AppCompat desnecessaria e reduz risco de falha antes da tela de login.

- Data: `2026-05-20`
- Decisão: remover as bases Android antigas (`android-companion-min` e `android-notification-forwarder`) e criar uma nova base nativa em `android-financego`.
- Motivo: o produto passou a exigir um APK novo, independente da versão companion/WebView antiga, com login próprio e uso direto dos dados do Supabase via APIs do FinanceGO.
- Impacto: o Android agora usa APIs `/api/android/*`, login nativo, sincronização nativa e listener de notificações em segundo plano.

- Data: `2026-05-20`
- Decisão: usar `profiles.full_name` como dado central do cadastro do usuário.
- Motivo: o nome completo é necessário para interpretar notificações de PIX e diferenciar recebimentos de terceiros, pagamentos e transferências entre contas próprias.
- Impacto: cadastro coleta nome completo, página `/profile` permite edição e parser de notificações usa esse dado.

- Data: `2026-05-20`
- Decisão: representar transferência interna manual com duas transações vinculadas.
- Motivo: a tabela `transactions` possui apenas um `account_id`; duas linhas permitem debitar a origem e creditar o destino sem classificar como receita/despesa.
- Impacto: saldos por conta ficam corretos e relatórios que excluem `type=transfer` não contam a movimentação como entrada/saída operacional.

- Data: `2026-05-20`
- Decisão: criação/edição de transações na web deve ocorrer em modal focado com fundo escurecido.
- Motivo: evitar interação acidental com o restante da página enquanto o usuário está criando ou editando uma transação.
- Impacto: o fluxo fica mais seguro e visualmente claro na página `transactions`.

- Data: `2026-05-20`
- Decisão: criar APIs Android autenticadas por Bearer token da sessão Supabase.
- Motivo: o novo APK precisa operar sem pareamento antigo por device token e com login direto do usuário.
- Impacto: adicionadas `/api/android/login`, `/api/android/bootstrap`, `/api/android/transactions/save` e `/api/android/notifications/ingest`.

- Data: `2026-05-19`
- Decisão: instalar o Gradle localmente no repositório, dentro de `.tools/gradle-8.7`, em vez de exigir instalação global no Windows.
- Motivo: garantir compilação Android imediata nesta máquina e reduzir dependência de configuração manual do `PATH`.
- Impacto: builds Android passam a ser executados de forma previsível usando o Gradle local; `.tools/` fica fora do Git por ser dependência local gerada.

- Data: `2026-05-19`
- Decisão: criar o script `scripts/build-android-financego.ps1` para centralizar a configuração de Java, Android SDK, Gradle e truststore.
- Motivo: simplificar futuras compilações e validações do APK com comandos objetivos (`debug`, `release`, `test`, `lint`, `validate`).
- Impacto: qualquer nova etapa Android pode ser validada com `powershell -ExecutionPolicy Bypass -File .\scripts\build-android-financego.ps1 -Mode validate`.

- Data: `2026-05-19`
- Decisão: usar o Java/JBR do Android Studio (`C:\Program Files\Android\Android Studio\jbr`) para builds Android.
- Motivo: o Android Gradle Plugin é validado com versões LTS do Java; o Java global da máquina estava em versão mais nova e menos previsível para Android.
- Impacto: maior compatibilidade com AGP, Kotlin e ferramentas do Android SDK.

- Data: `2026-05-19`
- Decisão: criar uma truststore local `.tools/financego-android-cacerts` com o certificado raiz do AVG Web/Mail Shield.
- Motivo: a resolução de dependências Gradle falhava porque o antivírus fazia inspeção HTTPS e substituía a cadeia de certificados.
- Impacto: Gradle conseguiu baixar e resolver dependências do Android Gradle Plugin sem desativar proteção do sistema.

- Data: `2026-05-19`
- Decisão: atualizar o Android Gradle Plugin para `8.6.1` e manter `compileSdk=35`.
- Motivo: remover alerta de compatibilidade do AGP anterior com `compileSdk 35`.
- Impacto: builds `debug`, `release`, `lintDebug` e testes passaram com configuração mais alinhada ao SDK instalado.

- Data: `2026-05-19`
- Decisão: atualizar o companion Android para `versionCode=4` e `versionName=0.1.3`.
- Motivo: facilitar upgrade/testes no Android e distinguir o APK gerado nesta validação.
- Impacto: o APK atual pode ser identificado como build `0.1.3`.

- Data: `2026-05-19`
- Decisão: remover usos depreciados em `MobileWebActivity`.
- Motivo: eliminar avisos de build e preparar a Activity para versões atuais do AndroidX/Android.
- Impacto: `databaseEnabled` foi removido e o tratamento de voltar passou a usar `OnBackPressedCallback`.

- Data: `2026-05-19`
- Decisao: remover o painel "Central de controle financeiro" do topo de `dashboard` e `transactions`.
- Motivo: o usuario solicitou retirar o bloco e seus indicadores para simplificar o topo das paginas desktop.
- Impacto: as funcionalidades de dashboard/transacoes continuam preservadas, sem o painel adicional criado anteriormente.

- Data: `2026-05-19`
- Decisao: transformar o APK companion em um ponto de entrada tambem para uso do FinanceGO via WebView interno.
- Motivo: permitir que o usuario use o sistema pelo app instalado, sem depender de abrir navegador, mantendo captura de notificacoes em segundo plano.
- Impacto: novo botao `Abrir FinanceGO no app` abre `/mobile` dentro do APK e preserva o listener nativo para notificacoes bancarias.

- Data: `2026-05-19`
- Decisao: adicionar `BootReceiver` no companion Android.
- Motivo: reforcar a confiabilidade da fila offline e do agendamento de sincronizacao apos reinicio do aparelho.
- Impacto: ao reiniciar o Android, o app agenda nova sincronizacao e tenta reenviar eventos pendentes quando houver rede.

- Data: `2026-05-19`
- Decisao: remodelar `/mobile` como uma experiencia de aplicativo financeiro, com saldo projetado, indicadores e insights.
- Motivo: melhorar leitura no celular e aproximar o uso de uma experiencia nativa mais clara e confiavel.
- Impacto: tela mobile ganha resumo mais forte sem remover extrato, categorias, fluxo, pendencias e pareamento.

- Data: `2026-05-17`
- Decisao: remover o estado textual `Carregando...` do bloco de mensagem inferior da tela de login e manter feedback visual no proprio botao.
- Motivo: reduzir ruido visual e atender ao fluxo solicitado para tela de acesso.
- Impacto: login fica mais limpo, preservando mensagens apenas para erros/sucessos relevantes.

- Data: `2026-05-17`
- Decisao: adicionar logout imediato na barra superior do mobile e no menu lateral, com limpeza de sessao server cookie + cliente Supabase.
- Motivo: facilitar saida rapida da conta em uso pelo celular.
- Impacto: usuario encerra sessao com um toque e retorna direto para `/login`.

- Data: `2026-05-17`
- Decisao: adicionar exclusao de dispositivo pareado direto em `/mobile/pair`, com endpoint dedicado e validacao por usuario autenticado.
- Motivo: permitir manutencao de pares antigos/invalidos sem precisar limpeza manual no banco.
- Impacto: fluxo de pareamento ficou autossuficiente no mobile.

- Data: `2026-05-17`
- Decisao: incrementar versao do companion para `versionCode=2` e `versionName=0.1.1` antes de novo release-signed.
- Motivo: reduzir chance de erro de instalacao/upgrade no Android ao testar builds consecutivos.
- Impacto: retestes no Xiaomi com instalacao mais previsivel.

- Data: `2026-05-17`
- Decisao: ampliar a captura no `NotificationForwarderService` com heuristicas menos restritivas e fallback de pacote por prefixo.
- Motivo: notificacoes reais do Nubank estavam sendo perdidas antes do envio ao backend por filtros locais muito rigidos.
- Impacto: maior taxa de captura automatica imediata para eventos bancarios reais.

- Data: `2026-05-17`
- Decisao: aplicar `requestRebind` no listener de notificacoes quando ocorrer desconexao do servico.
- Motivo: manter funcionamento automatico continuo em cenarios de MIUI/Android que desconectam listeners em background.
- Impacto: reducao de quedas silenciosas no fluxo de ingestao automatica.

- Data: `2026-05-17`
- Decisao: atualizar parser monetario de notificacoes para aceitar mais formatos (`1.234,56`, `1,234.56`, `19.90`, `19,90`).
- Motivo: alguns pushes bancarios variam formato local e podiam resultar em `parsed=false`.
- Impacto: aumento na taxa de parse e criacao de transacoes automaticas.

- Data: `2026-05-17`
- Decisao: ao salvar `budgets` no mes atual, replicar automaticamente o mesmo planejamento para os meses seguintes do mesmo ano.
- Motivo: reduzir atrito operacional e evitar configuracao manual recorrente mes a mes.
- Impacto: usuario define o planejamento uma vez no mes corrente e recebe pre-preenchimento ate dezembro.

- Data: `2026-05-17`
- Decisao: representar o consumo de orcamento por categoria em um unico grafico pizza no card de resumo de `budgets`.
- Motivo: dar leitura visual imediata das fatias orcadas e do quanto cada fatia ja foi consumida no mes de referencia.
- Impacto: acompanhamento do orcamento ficou mais intuitivo sem sair da pagina.

- Data: `2026-05-17`
- Decisao: compor cada fatia da pizza com duas cores da mesma categoria (consumido x restante dentro da fatia).
- Motivo: atender ao requisito de mostrar simultaneamente tamanho do orcamento e nivel de consumo de cada categoria.
- Impacto: um unico grafico comunica participacao no orcamento e execucao do gasto.

- Data: `2026-05-17`
- Decisao: remodelar `budgets` para um fluxo guiado por `mes de referencia`, com selecao dinamica de categorias e limite individual por categoria.
- Motivo: o formulario fixo anterior nao representava o uso real e nao permitia flexibilidade por mes.
- Impacto: a gestao de orcamento virou um processo mensal interativo, com persistencia exata por mes/categoria.

- Data: `2026-05-17`
- Decisao: no monitoramento de `budgets`, considerar apenas gastos consolidados (`is_consolidated !== false`) para medir consumo de orcamento.
- Motivo: previsoes e pendencias nao devem distorcer percentual de execucao do orcamento mensal realizado.
- Impacto: indicadores de consumo (% e R$) ficam alinhados ao realizado no periodo.

- Data: `2026-05-17`
- Decisao: ajustar `POST /api/budgets/save` para sincronizar integralmente as categorias do mes (upsert das selecionadas + remocao das desmarcadas).
- Motivo: evitar sobras de categorias antigas quando o usuario replaneja o mesmo mes.
- Impacto: estado salvo no backend passa a refletir exatamente o conjunto de categorias selecionadas na UI.

- Data: `2026-05-17`
- Decisao: saldos de conta no `dashboard`/`transactions` devem considerar apenas transacoes consolidadas na composicao dinamica.
- Motivo: evitar inflar saldo com despesas previstas (`is_consolidated = false`) e corrigir divergencias como a do `NUBANK Cartao`.
- Impacto: o painel de contas volta a refletir saldo real consolidado, mantendo previsoes separadas em indicadores proprios.

- Data: `2026-05-17`
- Decisao: aplicar fallback de saldo por prioridade:
  1) snapshot (`last_balance_at` + `balance`), 2) saldo base manual + consolidado, 3) apenas consolidado.
- Motivo: `accounts.balance` isolado nao e atualizado automaticamente em todos os fluxos; usar fallback evita valores nulos.
- Impacto: maior robustez de exibicao sem perder compatibilidade com contas sincronizadas e contas manuais.

- Data: `2026-05-17`
- Decisao: **revisada**. A estrategia de usar apenas `accounts.balance` foi substituida por composicao com consolidado + fallback de snapshot.
- Motivo: em contas manuais, `accounts.balance` isolado deixou saldos nulos/zerados.
- Impacto: manter historico da decisao e registrar o ajuste corretivo aplicado na etapa seguinte.

- Data: `2026-05-17`
- Decisao: implementar exclusao de conta via rota dedicada `POST /api/accounts/delete` com etapa explicita de confirmacao na UI.
- Motivo: permitir manutencao completa das contas diretamente na tela `accounts`.
- Impacto: usuario consegue remover contas sem manipulacao manual no banco; transacoes vinculadas sao removidas por cascade.

- Data: `2026-05-17`
- Decisao: implementar pareamento automatico via deep link (`financego-companion://pair`) entre `/mobile/pair` e APK.
- Motivo: eliminar digitacao manual de URL/ID/token no app companion.
- Impacto: onboarding em 1 toque no celular quando app estiver instalado.

- Data: `2026-05-17`
- Decisao: reforcar feedback no APK apos `Salvar configuracao` com validacao de campos e teste automatico de conectividade.
- Motivo: evitar percepcao de "nada aconteceu" ao salvar e reduzir erro de configuracao silencioso.
- Impacto: onboarding no app ficou mais claro e autoexplicativo.

- Data: `2026-05-17`
- Decisao: manter companion Android como caminho principal para captura automatica no celular.
- Motivo: entrega registro quase imediato de transacoes por notificacao sem depender de Android Studio para uso final.
- Impacto: usuario final instala APK pronto e configura token de pareamento.

- Data: `2026-05-17`
- Decisao: gerar e disponibilizar APK de teste (debug e release assinado) como artefato local.
- Motivo: acelerar testes em dispositivo real sem necessidade de abrir Android Studio no uso diario.
- Impacto: validação em campo ficou direta e imediata.

## Decisoes de interface
- Data: `2026-05-21`
- Tela: APK Android / topo
- Decisao: concentrar acoes secundarias em um menu de 3 pontos e manter `Sair` como icone direto.
- Motivo: reduzir poluicao visual no topo e preservar a acao de logout como acesso rapido.
- Impacto: tela principal exibe `Atualizar` e `Perfil` no menu; tela de conta exibe `Edicao de Conta`, `Atualizar` e `Perfil` no menu.

- Data: `2026-05-21`
- Tela: APK Android / conta especifica
- Decisao: manter o botao flutuante de nova transacao na tela da conta e preselecionar essa conta como origem.
- Motivo: acelerar lancamentos relacionados a uma conta especifica e evitar selecao manual repetitiva.
- Impacto: o usuario cria transacoes de uma conta em menos toques e com menor risco de escolher a conta errada.

- Data: `2026-05-21`
- Tela: APK Android / cards de transacao
- Decisao: terceira linha dos cards deve mostrar apenas banco em selo roxo e tipo da conta.
- Motivo: simplificar leitura da lista principal e manter consistencia com os cards de contas.
- Impacto: o nome completo da conta deixa de ocupar a terceira linha, deixando banco/tipo mais claros.

- Data: `2026-05-21`
- Tela: APK Android / topo
- Decisao: trocar icones textuais por drawables vetoriais nativos.
- Motivo: melhorar legibilidade, profissionalismo e consistencia visual do app.
- Impacto: `Atualizar`, `Perfil`, `Sair` e `Editar conta` passam a usar miniaturas visuais.

- Data: `2026-05-21`
- Tela: APK Android / contas
- Decisao: exibir banco em selo roxo, tipo da conta ao lado e saldo alinhado a direita.
- Motivo: destacar banco e tipo de forma compacta sem perder o saldo como informacao principal.
- Impacto: painel de contas fica mais sofisticado e facil de escanear no celular.

- Data: `2026-05-21`
- Tela: APK Android / marca
- Decisao: destacar `GO` na marca `Finance GO` com cor verde e fundo suave.
- Motivo: dar mais personalidade visual ao produto sem poluir o topo.
- Impacto: a marca fica mais reconhecivel nas telas principal e de conta.

- Data: `2026-05-21`
- Tela: APK Android / cards de transacao
- Decisao: cards de transacao devem usar a mesma borda das contas e organizar informacoes em tres linhas.
- Motivo: reduzir confusao visual, destacar somente as informacoes importantes e manter consistencia com o painel de contas.
- Impacto: data/descricao, categoria/parcela/recorrencia, conta/tipo e valor ficam mais legiveis no celular.

- Data: `2026-05-21`
- Tela: APK Android / cards de transacao
- Decisao: `Recorrente` deve ser exibido somente para modalidade `Avancado`; parcelamento mensal usa selo `Parcela X de Y`.
- Motivo: parcelamento e recorrencia sao conceitos diferentes para o usuario.
- Impacto: evita que transacoes parceladas ou transferencias sejam interpretadas como recorrentes.

- Data: `2026-05-21`
- Tela: APK Android / edicao de transacao
- Decisao: o botao `Excluir` deve ficar na mesma linha de `Editar Transacao`, alinhado a direita e em vermelho.
- Motivo: permitir manutencao rapida da transacao durante a edicao sem ocupar area extra do formulario.
- Impacto: usuario consegue apagar lancamentos diretamente do modal de edicao.

- Data: `2026-05-21`
- Tela: APK Android / `Transacoes`
- Decisao: recorrencias e parcelamentos devem aparecer com selo azul e legenda de parcela/recorrencia.
- Motivo: destacar visualmente que o lancamento faz parte de uma serie e evitar confusao com transacao avulsa.
- Impacto: linhas parceladas exibem indicativo como `Parcela 1 de 10`; recorrencias avancadas exibem `Recorrente`.

- Data: `2026-05-21`
- Tela: APK Android / formulario de transacao
- Decisao: botoes `Cancelar` e `Salvar` devem ficar centralizados no final do formulario.
- Motivo: manter simetria visual e facilitar toque em telas pequenas.
- Impacto: o formulario fica mais equilibrado para criacao e edicao.

- Data: `2026-05-17`
- Tela: `mobile`
- Decisao: remover o componente/banner com texto `Nova experiencia` da tela principal mobile.
- Motivo: alinhamento com solicitacao do produto para simplificar a home no celular.
- Impacto: interface mais limpa e foco direto nos indicadores e no extrato.

- Data: `2026-05-17`
- Tela: `mobile`
- Decisao: manter painel lateral com `Visao geral`, `Saldo das contas`, `Extrato mensal` e `Grafico mensal`, sem `Metas`/`Sonhos`.
- Motivo: seguir escopo funcional definido para navegacao mobile.
- Impacto: menu objetivo e orientado ao uso financeiro diario.

## Decisoes de processo
- Data: `2026-05-17`
- Decisao: tornar obrigatoria a atualizacao da pasta `/docs` a cada mudanca no sistema.
- Motivo: preservar contexto e continuidade entre sessoes.
- Impacto: rastreabilidade maior de estado, pendencias e decisoes.

- Data: `2026-05-17`
- Decisao: tornar obrigatorio commit + push apos alteracoes para acionar deploy automatico no Vercel.
- Motivo: manter ambiente publicado sempre sincronizado com o codigo validado localmente.
- Impacto: reducao de divergencia entre local, GitHub e Vercel.

## Decisoes futuras
- [ ] Definir processo oficial de distribuicao de APK para usuarios (canal interno ou store privada).
- [ ] Definir politica de assinatura de release final (keystore de producao).
- [ ] Definir estrategia de atualizacao automatica do companion no dispositivo.

- Data: `2026-05-17`
- Decisao: habilitar simulacao local de notificacao PIX no APK (`Simular notificacao PIX (listener)`) para validar captura automatica fim a fim sem depender de push real de banco.
- Motivo: em alguns aparelhos Android o sistema so libera confianca no listener apos eventos reais; o botao de simulacao cria um evento controlado para diagnostico rapido.
- Impacto: equipe e usuario conseguem testar no proprio celular o caminho completo (notificacao -> listener -> ingest -> transacao) de forma repetivel.

- Data: `2026-05-17`
- Decisao: incluir pacote `com.financego.companion` na whitelist do `NotificationForwarderService`.
- Motivo: permitir que o listener capture a notificacao de simulacao emitida pelo proprio companion.
- Impacto: teste local ganhou previsibilidade e reduz falsos negativos de configuracao.

- Data: `2026-05-20`
- Decisao: o APK nativo deve esconder a URL de producao do usuario e usar `BuildConfig.DEFAULT_BASE_URL` internamente.
- Motivo: reduzir ruido visual e evitar que o usuario final precise lidar com configuracao tecnica.
- Impacto: login fica mais simples, profissional e menos sujeito a erro de digitacao.

- Data: `2026-05-20`
- Decisao: aplicar overlay global `Carregando...` em acoes Android de login, sincronizacao, salvamento e navegacao interna.
- Motivo: dar feedback imediato durante operacoes remotas e evitar impressao de travamento.
- Impacto: experiencia mobile mais clara e previsivel.

- Data: `2026-05-20`
- Decisao: a tela principal do APK deve ser orientada por mes de referencia, com setas de navegacao e opcao `Incluir saldo anterior`.
- Motivo: alinhar o comportamento do APK ao fluxo financeiro mensal usado no sistema web.
- Impacto: o usuario consegue analisar saldo anterior, entradas, saidas e saldo atual no celular sem abrir navegador.

- Data: `2026-05-20`
- Decisao: as contas no APK devem aparecer ordenadas por banco/conta e marcadas visualmente como `CREDITO` ou `CORRENTE`.
- Motivo: facilitar leitura rapida das contas e distinguir cartoes de credito de contas correntes.
- Impacto: painel de contas ficou mais resumitivo e acionavel.

- Data: `2026-05-20`
- Decisao: o cadastro nativo de transacoes deve suportar os mesmos conceitos da web: transferencia interna, consolidacao, parcelamento e recorrencia avancada.
- Motivo: permitir uso real do Finance GO pelo APK sem depender do navegador para operacoes principais.
- Impacto: API Android de salvamento passou a criar multiplas ocorrencias e movimentacoes de transferencia quando necessario.

- Data: `2026-05-20`
- Decisao: `GET /api/android/bootstrap` deve retornar categorias dinamicas e historico ampliado de transacoes.
- Motivo: permitir que o app nativo exiba listas, saldos mensais e seletores de categoria com dados reais do Supabase.
- Impacto: tela Android fica sincronizada com categorias criadas no sistema web.

- Data: `2026-05-21`
- Decisao: o resumo financeiro do APK deve usar linhas compactas `rotulo + valor`, em vez de cards grandes.
- Motivo: melhorar leitura em telas pequenas e reduzir ocupacao vertical.
- Impacto: `Saldo anterior`, `Entradas`, `Saidas` e `Saldo atual` ficam visiveis de forma mais direta no celular.

- Data: `2026-05-21`
- Decisao: a navegacao principal do APK deve usar icones no topo para atualizar, perfil e sair, e botao flutuante para nova transacao.
- Motivo: liberar area util da tela e aproximar a experiencia de um aplicativo nativo moderno.
- Impacto: botoes textuais foram removidos da linha de acoes e substituidos por icones compactos.

- Data: `2026-05-21`
- Decisao: o APK deve receber categorias do backend com `depth` para representar hierarquia visual no seletor.
- Motivo: o usuario precisa identificar categoria pai e subcategorias no momento da classificacao.
- Impacto: `/api/android/bootstrap` passa a devolver categorias estruturadas para o app.

- Data: `2026-05-21`
- Decisao: classificacao automatica de notificacoes deve tratar `Compra no credito aprovada` como despesa e `estorno`/`reembolso` como receita.
- Motivo: evitar inversao de sinais no registro automatico de cartao de credito e devolucoes.
- Impacto: notificacoes bancarias ficam mais confiaveis e coerentes com o controle financeiro.
