# Android Notification Forwarder

App Android complementar para capturar notificações bancárias e enviar ao backend.

## Fluxo

1. Instale o app Android.
2. Dê permissão de acesso às notificações.
3. O serviço captura notificações de bancos/cartões.
4. O app envia um POST para `/api/notifications/ingest`.

## Endpoint

```txt
POST https://seu-app.vercel.app/api/notifications/ingest
Header: x-device-token: SEU_SEGREDO
```

## Observação

Este diretório contém um exemplo de código Kotlin. Para uso real, crie um projeto Android Studio e adicione o serviço.
