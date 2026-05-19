# Decisoes do Projeto

Registro das decisoes arquiteturais, de interface e de dados.

## Decisoes tecnicas
- Data: `2026-05-19`
- Decisão: instalar o Gradle localmente no repositório, dentro de `.tools/gradle-8.7`, em vez de exigir instalação global no Windows.
- Motivo: garantir compilação Android imediata nesta máquina e reduzir dependência de configuração manual do `PATH`.
- Impacto: builds Android passam a ser executados de forma previsível usando o Gradle local; `.tools/` fica fora do Git por ser dependência local gerada.

- Data: `2026-05-19`
- Decisão: criar o script `scripts/build-android-companion.ps1` para centralizar a configuração de Java, Android SDK, Gradle e truststore.
- Motivo: simplificar futuras compilações e validações do APK com comandos objetivos (`debug`, `release`, `test`, `lint`, `validate`).
- Impacto: qualquer nova etapa Android pode ser validada com `powershell -ExecutionPolicy Bypass -File .\scripts\build-android-companion.ps1 -Mode validate`.

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
