# Andamento do Projeto

Documento vivo para registrar o estado do projeto e permitir continuidade em qualquer ambiente.

## Ultima etapa concluida
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
- Objetivo: gerar novo APK em ambiente Android/Gradle e validar o uso do FinanceGO dentro do proprio app.
- Em andamento:
  - [ ] Compilar novo APK com `MobileWebActivity`.
  - [ ] Instalar APK atualizado no celular.
  - [ ] Abrir `FinanceGO no app`, fazer login e validar navegacao sem navegador externo.
  - [ ] Habilitar permissao de notificacoes e confirmar captura automatica em segundo plano.

## Proximas etapas
- Curto prazo:
  - [ ] Gerar APK debug/release com as alteracoes de WebView e BootReceiver.
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
