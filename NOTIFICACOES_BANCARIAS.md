# Alimentação por notificações bancárias

Nesta versão, o sistema registra transações a partir das notificações recebidas no celular.

## Fluxo

```txt
Banco envia notificação
        ↓
App Android complementar captura
        ↓
POST para /api/notifications/ingest
        ↓
Parser identifica valor, descrição e categoria
        ↓
Transação é gravada no Supabase
```

## Vantagens

- Custo praticamente zero.
- Não depende de Notificações/Importação/Open Finance.
- Registro quase imediato quando o banco envia push.
- Bom para uso pessoal.

## Limitações

- Funciona melhor no Android.
- iPhone não permite que apps comuns leiam notificações de outros apps automaticamente.
- Depende da qualidade do texto da notificação do banco.
- Nem toda transação gera notificação.
- Pode haver duplicidade se o banco reenviar alertas.

## Endpoint

```txt
POST /api/notifications/ingest
Header: x-device-token: SEU_SEGREDO
```

## Payload

```json
{
  "packageName": "com.nu.production",
  "appName": "Nubank",
  "title": "Compra aprovada",
  "text": "Compra de R$ 25,90 em PADARIA CENTRAL",
  "bigText": "Compra de R$ 25,90 em PADARIA CENTRAL no cartão final 1234",
  "postedAt": "2026-05-11T10:00:00.000Z",
  "notificationId": "com.nu.production-100-1234567890"
}
```

## Variável necessária

```env
Use /api/devices/pair para gerar x-device-token
```
