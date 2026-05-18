# Andamento do Projeto

Documento vivo para registrar o estado do projeto e permitir continuidade em qualquer ambiente.

## Ultima etapa concluida
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
- Objetivo: validar em aparelho real o fluxo automatico completo com a simulacao PIX.
- Em andamento:
  - [ ] Instalar APK atualizado no Xiaomi.
  - [ ] Acionar `Simular notificacao PIX (listener)` e confirmar criacao automatica da transacao.
  - [ ] Validar se a transacao aparece na conta correta apos parse da notificacao simulada.

## Proximas etapas
- Curto prazo:
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
