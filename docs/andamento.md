# Andamento do Projeto

Documento vivo para registrar o estado do projeto e permitir continuidade em qualquer ambiente.

## Ultima etapa concluida
- Data: `2026-05-20`
- Entrega principal: perfil do usuário, transferência interna estruturada e nova versão Android nativa do FinanceGO.
- Resultado entregue:
  - Web:
    - Cadastro passou a coletar `nome completo` na criação de conta.
    - Nova página `/profile` criada para visualizar e editar o nome completo do usuário.
    - Menu superior passou a exibir `Perfil` ao lado esquerdo de `Sair`.
    - Página `transactions` passou a abrir criação/edição de transação em modo focado, com fundo escurecido e bloqueio visual do restante da página.
    - Criação/edição de `Transferência` passou a mostrar somente data, descrição, valor, conta de origem, conta de destino, consolidada, observações, salvar e cancelar.
    - Transferência interna passou a gerar duas movimentações vinculadas: saída na conta de origem e entrada na conta de destino, ambas com `type=transfer`.
  - Notificações:
    - Parser de notificações passou a usar o nome completo do perfil para diferenciar PIX de terceiros, PIX realizado e transferências entre contas próprias.
    - Descrições automáticas foram encurtadas para textos como `PIX Recebido`, `PIX realizado` e `Transferência` com contraparte quando detectada.
  - Android:
    - Versões antigas `android-companion-min` e `android-notification-forwarder` removidas.
    - Nova base nativa criada em `android-financego`.
    - Novo APK possui login nativo, sincronização com `/api/android/bootstrap`, criação/edição por `/api/android/transactions/save` e listener por `/api/android/notifications/ingest`.
    - Script de build renomeado para `scripts/build-android-financego.ps1`.
  - Validações executadas com sucesso:
    - `npm run build`
    - `powershell -ExecutionPolicy Bypass -File .\scripts\build-android-financego.ps1 -Mode debug`
    - `powershell -ExecutionPolicy Bypass -File .\scripts\build-android-financego.ps1 -Mode test`
    - `powershell -ExecutionPolicy Bypass -File .\scripts\build-android-financego.ps1 -Mode lint`
    - `powershell -ExecutionPolicy Bypass -File .\scripts\build-android-financego.ps1 -Mode release`
  - Artefatos gerados:
    - `android-financego/app/build/outputs/apk/debug/app-debug.apk`
    - `android-financego/app/build/outputs/apk/release/app-release-unsigned.apk`
  - Observação:
    - O APK `debug` foi verificado como assinado.
    - O APK `release` segue unsigned até configuração de keystore de produção.
    - Não havia celular/emulador conectado via ADB, portanto instalação e teste real em aparelho continuam pendentes.

- Data: `2026-05-19`
- Entrega principal: instalação local do Gradle e validação do companion Android do FinanceGO.
- Resultado entregue:
  - Gradle:
    - Gradle `8.7` instalado localmente em `.tools/gradle-8.7`.
    - Cache do Gradle isolado em `.tools/gradle-user-home`.
    - `.tools/` e diretórios de build Android adicionados ao `.gitignore`.
    - Truststore local `.tools/financego-android-cacerts` criada para permitir resolução de dependências em ambiente com inspeção HTTPS do AVG.
  - Android companion:
    - Android Gradle Plugin atualizado para `8.6.1`.
    - `versionCode` atualizado para `4` e `versionName` para `0.1.3`.
    - `MobileWebActivity` ajustada para remover APIs depreciadas (`databaseEnabled` e `onBackPressed` antigo).
    - Estratégia do compilador Kotlin configurada como `in-process` para reduzir instabilidade de daemon no Windows.
  - Automação:
    - Script `scripts/build-android-financego.ps1` criado para compilar e validar o APK com um comando único.
  - Validações executadas com sucesso:
    - `:app:assembleDebug`
    - `:app:assembleRelease`
    - `:app:testDebugUnitTest` (`NO-SOURCE`, sem testes unitários implementados ainda)
    - `:app:lintDebug`
    - `npm run build`
  - Artefatos gerados:
    - `android-companion-min/app/build/outputs/apk/debug/app-debug.apk`
    - `android-companion-min/app/build/outputs/apk/release/app-release-unsigned.apk`
  - Observação:
    - O APK `debug` foi verificado como assinado e apto para instalação de teste.
    - O APK `release` foi gerado sem assinatura de produção; ainda precisa de keystore antes de distribuição.
    - Não havia celular/emulador conectado via ADB no momento da validação, portanto instalação e teste real em aparelho ficaram pendentes.

- Data: `2026-05-19`
- Entrega principal: remocao do painel superior "Central de controle financeiro", remodelagem mobile e preparacao do APK para uso do FinanceGO sem navegador.
- Resultado entregue:
  - Web:
    - Painel "Central de controle financeiro" removido do topo de `dashboard` e `transactions`.
    - Tela `/mobile` redesenhada com hero de saldo projetado, indicadores, insights, atalhos fixos e leitura de pendencias.
    - Textos principais mobile revisados com acentuacao.
    - `npm run build` executado com sucesso.
  - Android companion:
    - Novo botao `Abrir FinanceGO no app` adicionado.
    - Nova tela nativa `MobileWebActivity` criada com WebView interno para abrir `/mobile` dentro do APK.
    - `BootReceiver` adicionado para religar agendamento de sincronizacao apos reinicio do aparelho.
  - Validacao:
    - Build web validado.
    - Build Android nao executado nesta maquina porque nao ha `gradle`/`gradlew.bat` disponivel no ambiente atual.

- Data: `2026-05-17`
- Entrega principal: simulacao local de notificacao PIX no APK companion para validar fluxo automatico.
- Resultado entregue:
  - Android companion:
    - Permissao `POST_NOTIFICATIONS` adicionada no manifest para Android 13+.
    - Novo botao `Simular notificacao PIX (listener)` adicionado na tela principal.
    - Simulacao cria notificacao local com texto estilo Nubank PIX para teste ponta a ponta.
    - Listener agora aceita o proprio pacote `com.financego.companion` para captar a simulacao.
    - Status da UI mostra listener ativo/desativado, permissao de notificacoes e fila offline.
  - Build validado:
    - `gradle assembleDebug` executado com sucesso.
    - `npm run build` executado com sucesso.

## Etapa atual
- Objetivo: instalar o novo APK nativo `android-financego` em aparelho Android real e validar login, sincronização e captura de notificações bancárias.
- Em andamento:
  - [x] Compilar novo APK nativo.
  - [ ] Instalar APK `debug` atualizado no celular.
  - [ ] Fazer login no aplicativo Android nativo.
  - [ ] Habilitar permissão de notificações e confirmar captura automática em segundo plano.
  - [ ] Receber notificações reais de banco/PIX/cartão e validar classificação automática.

## Proximas etapas
- Curto prazo:
  - [x] Gerar APK debug/release da nova versão nativa.
  - [ ] Configurar assinatura de produção para gerar APK release assinado.
  - [ ] Instalar `app-debug.apk` em celular real e validar login nativo, sincronização e listener.
  - [ ] Exibir no app Android o último payload capturado e o último status HTTP de envio.
  - [ ] Adicionar diagnostico visual de "listener conectado agora".
- Medio prazo:
  - [ ] Publicar rotina simplificada de distribuicao de APK (release interna).
  - [ ] Automatizar release assinada por tag de versao.
- Longo prazo:
  - [ ] Evoluir estrategia de distribuicao (assinatura definitiva e canal de release).

## Observacoes importantes
- Regra obrigatoria: **sempre atualizar os arquivos da pasta `/docs` apos qualquer mudanca no sistema**.
- Regra obrigatoria: **sempre realizar commit + push apos alteracoes no sistema para acionar deploy automatico no Vercel**.
- Antes de publicar, validar `npm run build`.
