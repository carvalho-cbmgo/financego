# Alimentacao por notificacoes bancarias

Nesta versao, o sistema registra transacoes a partir das notificacoes recebidas no celular Android.

## Fluxo

```txt
Banco envia notificacao
        ->
App Android companion captura
        ->
POST para /api/notifications/ingest
        ->
Parser identifica valor, descricao e categoria
        ->
Transacao gravada no Supabase
```

## Onboarding recomendado

1. No celular, acesse `mobile/pair` no FinanceGO.
2. Gere `Device Public ID` e `Device Token`.
3. No companion Android (`android-companion-min/`), informe:
   - URL base do FinanceGO
   - Device Public ID
   - Device Token
4. Habilite permissao de notificacoes para o companion.
5. Desative otimizacao de bateria do app.

## Vantagens

- Custo praticamente zero.
- Registro quase imediato quando o banco envia push.
- Nao depende de Open Finance para o fluxo diario.

## Limitacoes

- Funciona melhor no Android.
- iPhone nao permite leitura automatica ampla de notificacoes de outros apps.
- Depende da qualidade do texto das notificacoes bancarias.
- Nem toda transacao gera notificacao.

## Endpoints

```txt
POST /api/notifications/ingest
POST /api/notifications/batch
Header: x-device-token: SEU_SEGREDO
```

## Payload base

```json
{
  "packageName": "com.nu.production",
  "appName": "Nubank",
  "title": "Compra aprovada",
  "text": "Compra de R$ 25,90 em PADARIA CENTRAL",
  "bigText": "Compra de R$ 25,90 em PADARIA CENTRAL no cartao final 1234",
  "postedAt": "2026-05-11T10:00:00.000Z",
  "notificationId": "com.nu.production-100-1234567890"
}
```
