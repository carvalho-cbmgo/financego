# Andamento do Projeto

Documento vivo para registrar o estado do projeto e permitir continuidade em qualquer ambiente.

## Ultima etapa concluida
- Data: `2026-05-17`
- Entrega principal: exclusao de dispositivos pareados em `/mobile/pair` + novo release-signed para teste no Xiaomi.
- Resultado entregue:
  - Pagina `mobile/pair`:
    - Lista de dispositivos pareados agora permite exclusao por item (`Excluir dispositivo`).
    - Fluxo com mensagens de status (sucesso/erro) apos exclusao.
  - API de dispositivos:
    - Nova rota `POST /api/devices/delete` com validacao de ownership por `profile_id`.
    - Exclusao segura apenas de dispositivos do usuario autenticado.
  - APK Android companion:
    - Versao incrementada para facilitar instalacao/atualizacao no celular (`versionCode=2`, `versionName=0.1.1`).
    - Build release gerado e assinado para reteste:
      - `build-artifacts/financego-companion-release-signed-auto-notify-fix.apk`.
  - Build web:
    - `npm run build` executado com sucesso apos os ajustes.

## Etapa atual
- Objetivo: validar em campo o novo release-signed no Xiaomi com exclusao de dispositivo e captura automatica.
- Em andamento:
  - [ ] Instalar `financego-companion-release-signed-auto-notify-fix.apk` no Xiaomi.
  - [ ] Validar exclusao de dispositivo diretamente em `/mobile/pair`.
  - [ ] Confirmar captura imediata da proxima notificacao real do Nubank.

## Proximas etapas
- Curto prazo:
  - [ ] Adicionar acao de desparear dispositivo na tela `/mobile/pair`.
  - [ ] Refinar visual do menu lateral mobile conforme feedback de uso.
- Medio prazo:
  - [ ] Publicar rotina simplificada de distribuicao de APK (release interna).
  - [ ] Criar monitor de saude do companion (fila offline, ultimo envio, erros).
- Longo prazo:
  - [ ] Evoluir estrategia de distribuicao (assinatura definitiva e canal de release).

## Observacoes importantes
- Regra obrigatoria: **sempre atualizar os arquivos da pasta `/docs` apos qualquer mudanca no sistema**.
- Regra obrigatoria: **sempre realizar commit + push apos alteracoes no sistema para acionar deploy automatico no Vercel**.
- Antes de publicar, validar `npm run build`.
