# FinanceGO Android Companion (Minimo)

Projeto Android Studio minimo para capturar notificacoes bancarias e enviar automaticamente para o FinanceGO.

## Funcionalidades
- Leitura de notificacoes bancarias via `NotificationListenerService`.
- Envio imediato para `POST /api/notifications/ingest`.
- Fila offline local quando nao houver internet.
- Reenvio em lote com `WorkManager` para `POST /api/notifications/batch`.
- Token salvo com `EncryptedSharedPreferences`.

## Requisitos
- Android Studio recente (AGP 8+).
- Android 8.0+ (API 26).
- URL publica do FinanceGO (ex.: `https://seu-projeto.vercel.app`).
- `Device Public ID` e `Device Token` gerados na tela `mobile/pair`.

## Como usar
1. Abra esta pasta no Android Studio (`android-companion-min/`).
2. Compile e instale no aparelho Android.
3. Abra o app "FinanceGO Companion".
4. Informe:
   - URL base do FinanceGO
   - Device Public ID
   - Device Token
5. Toque em `Salvar configuracao`.
6. Toque em `Abrir permissao de notificacoes` e habilite o app.
7. Opcional: toque em `Enviar evento de teste`.
8. Desative otimizacao de bateria para o app no Android.

## Observacoes
- O app processa somente pacotes bancarios conhecidos no servico.
- O backend do FinanceGO realiza deduplicacao com `dedupe_hash`.
- O companion nao exige login do usuario no app Android; usa `x-device-token`.
