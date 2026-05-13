# v10 — Reconhecimento de transações estornadas

Esta versão implementa reconhecimento de estornos tanto por notificações quanto por CSV/fatura.

## 1. Campos adicionados em `transactions`

```sql
is_refund boolean
refund_status text
refund_of_transaction_id uuid
refund_match_key text
refund_detected_at timestamptz
```

## 2. Status possíveis

- `none`: transação comum;
- `refund`: crédito de estorno/reembolso;
- `refunded`: compra original foi totalmente estornada;
- `partial_refund`: compra original recebeu estorno parcial.

## 3. Detecção por texto

O sistema reconhece termos como:

- estorno
- estornado
- reembolso
- devolução
- chargeback
- crédito de compra
- cancelamento de compra
- compra cancelada

## 4. Caso Nubank CSV

Exemplo real detectado:

```csv
2026-05-08,"Estorno de ""PG *CONFECCOES KACYUMA"" (Pg *Confeccoes Kacyuma)",-2.27
```

Regra aplicada:

- no CSV do Nubank, `amount < 0` continua sendo crédito;
- se o título contém `Estorno`, o sistema marca:
  - `is_refund = true`
  - `refund_status = refund`
  - categoria `Estornos`
  - subcategoria `Crédito de estorno`

## 5. Vínculo com compra original

O sistema cria uma `refund_match_key` a partir do nome do estabelecimento normalizado.

Na importação da fatura, após inserir as transações, ele tenta encontrar uma compra anterior com:

- mesma `refund_match_key`;
- valor igual ou próximo;
- valor negativo;
- mesmo perfil.

Se encontrar:
- o estorno recebe `refund_of_transaction_id`;
- a compra original recebe `refund_status = refunded` ou `partial_refund`.

## 6. Nova tela

```txt
/refunds
```

Mostra:
- créditos de estorno detectados;
- compras marcadas como estornadas.

## 7. Teste local

```bash
npx tsx scripts/test-refunds-nubank.ts Nubank_2026-06-08.csv
```
