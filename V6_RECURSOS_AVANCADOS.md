# v6 — Recursos avançados implementados

## 1. Anti-duplicidade inteligente

Foi adicionado `dedupe_hash` nas transações.

A deduplicação considera:
- usuário;
- valor;
- data aproximada;
- descrição/estabelecimento normalizado;
- pacote do app bancário.

Isso evita duplicar a mesma compra quando o banco manda mais de uma notificação.

## 2. Reconhecimento automático de parcelas

O parser identifica padrões como:

- `1/10`
- `parcela 1 de 10`
- `parcelado em 10x`
- `10x sem juros`

Campos criados:
- `installment_current`
- `installment_total`
- `installment_group_key`

## 3. Classificação por IA local

Foi implementado um classificador local baseado em regras ponderadas, sem custo de API.

Ele atribui:
- categoria;
- subcategoria;
- nível de confiança (`confidence_score`).

Isso é uma “IA local leve”: não usa OpenAI, não usa nuvem externa e roda no próprio backend.

## 4. Widget Android de gastos do dia

Incluído exemplo de `DailySpendWidgetProvider.kt` e layout `daily_spend_widget.xml`.

O app Android pode consultar `/api/android/daily-summary` e atualizar o widget.

## 5. Gráficos financeiros

Nova tela:

```txt
/charts
```

Mostra gastos por categoria do mês atual.

## 6. Backup automático

Endpoint:

```txt
GET /api/backup/export
Header: x-backup-secret: SEU_SEGREDO
```

Retorna JSON com:
- contas;
- transações;
- orçamentos;
- metas;
- notificações.

## 7. Sincronização offline/local

O app Android agora possui:
- `OfflineQueue.kt`;
- `SyncWorker.kt`;
- endpoint `/api/notifications/batch`.

Se ficar sem internet:
1. a notificação é salva localmente;
2. quando a internet voltar, o Worker envia em lote;
3. o backend processa e evita duplicidade.

## Variáveis novas

```env
BACKUP_EXPORT_SECRET=troque-este-segredo
Use /api/devices/pair para gerar x-device-token
```
