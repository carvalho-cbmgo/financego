# Andamento do Projeto

Documento vivo para registrar o estado do projeto e permitir continuidade em qualquer ambiente.

## Ultima etapa concluida
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
    - Script `scripts/build-android-companion.ps1` criado para compilar e validar o APK com um comando único.
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
- Objetivo: instalar o APK atualizado em aparelho Android real e validar o uso do FinanceGO dentro do próprio app.
- Em andamento:
  - [x] Compilar novo APK com `MobileWebActivity`.
  - [ ] Instalar APK `debug` atualizado no celular.
  - [ ] Abrir `FinanceGO no app`, fazer login e validar navegacao sem navegador externo.
  - [ ] Habilitar permissao de notificacoes e confirmar captura automatica em segundo plano.

## Proximas etapas
- Curto prazo:
  - [x] Gerar APK debug/release com as alterações de WebView e BootReceiver.
  - [ ] Configurar assinatura de produção para gerar APK release assinado.
  - [ ] Instalar `app-debug.apk` em celular real e validar WebView, login, pareamento e listener.
  - [ ] Exibir no companion o ultimo payload capturado e o ultimo status HTTP de envio.
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
