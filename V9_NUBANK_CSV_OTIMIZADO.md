# v9 — Parser otimizado para CSV real do Nubank

Foi analisado o CSV real enviado da fatura Nubank, com estrutura:

```csv
date,title,amount
2026-05-11,Delicias do Parque,10.00
2026-05-08,"Estorno de ""PG *CONFECCOES KACYUMA"" (Pg *Confeccoes Kacyuma)",-2.27
2026-05-06,Pagamento recebido,-6867.24
2026-05-04,Loja Melissa - Parcela 1/6,26.22
```

## Ajustes implementados

### 1. Colunas reconhecidas

O parser agora reconhece diretamente:

- `date`
- `title`
- `amount`

### 2. Conversão correta de sinal

Na fatura CSV do Nubank:

- `amount > 0` significa compra/despesa na fatura;
- `amount < 0` significa pagamento, estorno, desconto ou crédito.

No app, a convenção adotada é:

- despesas = valor negativo;
- créditos/receitas/estornos = valor positivo.

Portanto:

```txt
Nubank CSV +10.00  -> app -10.00
Nubank CSV -10.00  -> app +10.00
```

### 3. Parcelas

O parser reconhece automaticamente títulos como:

```txt
Loja Melissa - Parcela 1/6
74tramo*Lojaoficial - Parcela 2/10
```

E preenche:

- `installment_current`
- `installment_total`
- `installment_group_key`

### 4. Duplicidade

As transações importadas continuam usando `dedupe_hash`, evitando duplicação na reimportação da mesma fatura.

### 5. CSV com aspas

Foi implementado parser CSV próprio com suporte a campos entre aspas, como:

```csv
2026-05-08,"Estorno de ""PG *CONFECCOES KACYUMA"" (Pg *Confeccoes Kacyuma)",-2.27
```

## Como testar localmente

```bash
npx tsx scripts/test-nubank-csv.ts Nubank_2026-06-08.csv
```

## Resultado esperado com o arquivo analisado

- 73 transações detectadas
- 24 transações parceladas detectadas
- compras positivas no CSV convertidas para despesas negativas no app
- pagamentos/estornos negativos no CSV convertidos para créditos positivos no app
