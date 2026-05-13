# v7 — Parsers por banco, exportação e importação de faturas

## 1. Parser específico por banco

Arquivo principal:

```txt
src/lib/bank-parsers.ts
```

Bancos suportados inicialmente:

- Nubank
- Itaú
- Bradesco
- Santander
- Banco do Brasil
- Caixa
- C6
- Inter
- Mercado Pago
- PicPay
- Genérico

O sistema detecta o banco por:

- package name do app Android;
- nome do app;
- texto da notificação;
- banco selecionado na importação da fatura.

## 2. Importação de fatura/extrato

Nova tela:

```txt
/statements
```

Novo endpoint:

```txt
POST /api/statements/import
Header: x-statement-import-secret: SEU_SEGREDO
```

Aceita:

- CSV
- TXT
- texto colado manualmente
- OFX simples tratado como texto inicial

Campos esperados em CSV:

```csv
data;descricao;valor
11/05/2026;Compra Padaria Central;-25,90
12/05/2026;Pix recebido João;150,00
```

Também tenta interpretar linhas livres como:

```txt
11/05/2026 Compra R$ 25,90 PADARIA CENTRAL
12/05/2026 PIX recebido R$ 150,00 João
```

## 3. Exportação Excel

Endpoint:

```txt
GET /api/export/excel
Header: x-export-secret: SEU_SEGREDO
```

Gera arquivo `.xlsx` com abas:

- Transações
- Orçamento
- Metas

## 4. Exportação PDF estruturada

Endpoint:

```txt
GET /api/export/pdf
Header: x-export-secret: SEU_SEGREDO
```

Gera relatório HTML pronto para imprimir/salvar como PDF pelo navegador.

## 5. Variáveis novas

```env
EXPORT_SECRET=troque-este-segredo
STATEMENT_IMPORT_SECRET=troque-este-segredo
```

## Observação importante

Para “um banco específico”, o ideal é enviar uma amostra real ou anonimizada da fatura/exportação desse banco.  
Com a amostra, o parser pode ser ajustado com precisão para o layout real da fatura.
