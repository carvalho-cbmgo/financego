# Andamento do Projeto

Documento vivo para registrar o estado do projeto e permitir continuidade em qualquer ambiente.

## Ultima etapa concluida
- Data: `2026-05-17`
- Entrega principal: correcao do fluxo automatico de captura de notificacoes do Nubank no APK companion.
- Resultado entregue:
  - APK Android companion:
    - Listener de notificacoes ficou mais resiliente para bancos:
      - ampliado filtro de pacotes (match por prefixo/variantes);
      - leitura de mais campos do payload de notificacao (`textLines`, `subText`, `infoText`, `tickerText`);
      - reducao de bloqueios por heuristica para nao perder eventos validos.
    - Adicionado rebind automatico do `NotificationListenerService` ao desconectar.
    - Sincronizacao de fallback ajustada para `REPLACE` em fila one-shot, evitando atraso por trabalho antigo pendente.
  - Backend parser:
    - `parseMoneyBR` ampliado para aceitar formatos monetarios mais variados (virgula e ponto), reduzindo casos de `parsed=false`.
  - Build Android:
    - `assembleDebug` validado com sucesso.
    - Novo APK de teste gerado: `build-artifacts/financego-companion-debug-auto-notify-fix.apk`.
  - Build web:
    - `npm run build` executado com sucesso apos os ajustes.

## Etapa atual
- Objetivo: validar ingestao automatica imediata de notificacoes reais apos o fix.
- Em andamento:
  - [ ] Instalar o APK com fix (`auto-notify-fix`) no dispositivo.
  - [ ] Confirmar captura imediata de notificacao do Nubank com transacao criada no FinanceGO.
  - [ ] Confirmar se eventos parseados permanecem em `NUBANK` e nao em conta `GENERICO`.

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
