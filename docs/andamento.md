# Andamento do Projeto

Documento vivo para registrar o estado do projeto e permitir continuidade em qualquer ambiente.

## Ultima etapa concluida
- Data: `2026-05-17`
- Entrega principal: navegacao lateral mobile + pareamento Android + companion minimo.
- Resultado entregue:
  - Menu lateral mobile na tela inicial apos login (`/mobile`):
    - Clique no icone de tres barras abre painel lateral.
    - Opcoes implementadas no painel: `Visao geral`, `Saldo das contas`, `Extrato mensal`, `Grafico mensal`.
    - `Metas` e `Sonhos` nao foram implementados no painel, conforme solicitado.
    - Rodape do painel com `Configuracoes` apontando para pareamento Android.
  - Tela de pareamento no FinanceGO:
    - Nova rota: `src/app/mobile/pair/page.tsx`.
    - Gera `Device Public ID` + `Device Token` consumindo `POST /api/devices/pair`.
    - Exibe historico de dispositivos pareados (`sync_devices`).
  - Companion Android minimo operacional:
    - Novo projeto em `android-companion-min/` (Android Studio).
    - Captura notificacoes bancarias via `NotificationListenerService`.
    - Envio imediato para `/api/notifications/ingest`.
    - Fila offline + reenvio em lote via WorkManager para `/api/notifications/batch`.
    - Token salvo com `EncryptedSharedPreferences`.
  - Mobile geral:
    - Secoes com ids para navegacao do painel (`saldo-das-contas`, `extrato-mensal`, `grafico-mensal`).
    - `Extrato mensal` integrado na propria tela mobile.
  - Validacao tecnica:
    - `npm run build` executado com sucesso apos alteracoes.

## Etapa atual
- Objetivo: validacao real no celular com o companion Android instalado.
- Em andamento:
  - [ ] Instalar `android-companion-min` em aparelho Android principal.
  - [ ] Gerar token em `/mobile/pair` e validar primeiro envio real por notificacao de banco.
  - [ ] Confirmar consistencia dos valores mobile x dashboard no mesmo `month_ref`.

## Proximas etapas
- Curto prazo:
  - [ ] Refinar visual do painel lateral para ficar ainda mais proximo da referencia.
  - [ ] Adicionar opcao de `Desparear` dispositivo na tela `/mobile/pair`.
- Medio prazo:
  - [ ] Adicionar monitor de saude do companion (ultimo envio, fila pendente, taxa de sucesso).
  - [ ] Cobrir fluxo com testes E2E (login mobile -> menu -> pareamento -> ingestao).
- Longo prazo:
  - [ ] Evoluir companion para distribuicao por release APK assinada.

## Observacoes importantes
- Regra obrigatoria: **sempre atualizar os arquivos da pasta `/docs` apos qualquer mudanca no sistema**.
- Regra obrigatoria: **sempre realizar commit + push apos alteracoes no sistema para acionar deploy automatico no Vercel**.
- Antes de publicar, validar `npm run build`.
