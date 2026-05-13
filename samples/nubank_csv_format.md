# Formato real identificado — CSV Nubank

Arquivo analisado:

```csv
date,title,amount
2026-05-11,Delicias do Parque,10.00
2026-05-08,"Estorno de ""PG *CONFECCOES KACYUMA"" (Pg *Confeccoes Kacyuma)",-2.27
2026-05-06,Pagamento recebido,-6867.24
2026-05-04,Loja Melissa - Parcela 1/6,26.22
```

## Regra específica do Nubank

Na fatura CSV do Nubank:

- `amount > 0` = compra/despesa na fatura → gravar como valor negativo no app.
- `amount < 0` = pagamento, estorno, crédito/desconto → gravar como valor positivo no app.
- `title` é a descrição principal.
- `date` já vem em ISO `YYYY-MM-DD`.
- Parcelas aparecem em `- Parcela X/Y`.
