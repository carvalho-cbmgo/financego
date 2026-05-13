# v8 — Importação de fatura/extrato em PDF

Esta versão adiciona leitura de arquivos PDF na importação de faturas/extratos.

## O que foi implementado

### 1. Extração de texto de PDF

Novo arquivo:

```txt
src/lib/pdf-extractor.ts
```

Usa `pdf-parse` para extrair texto do arquivo PDF enviado.

### 2. Importação por endpoint

Endpoint existente atualizado:

```txt
POST /api/statements/import
Header: x-statement-import-secret: SEU_SEGREDO
Content-Type: multipart/form-data
```

Campos:

```txt
bank_key=nubank|itau|bradesco|santander|banco_do_brasil|caixa|c6|inter|mercado_pago|picpay|generic
source_type=pdf
file=<arquivo.pdf>
```

### 3. Importação pela tela

Tela:

```txt
/statements
```

Agora aceita:

- `.pdf`
- `.csv`
- `.txt`
- `.ofx`

### 4. Pré-processamento de texto de PDF

O parser tenta reorganizar linhas extraídas do PDF usando datas como referência, por exemplo:

```txt
11/05/2026 Compra R$ 25,90 PADARIA CENTRAL
12/05/2026 PIX recebido R$ 150,00 João
```

## Limitação importante

Este recurso lê PDFs que possuem **texto selecionável**.

Se a fatura for um PDF escaneado/imagem, será necessário OCR.  
Nesse caso, o sistema registrará aviso em `raw_json.warnings`.

## Dependências adicionadas

```json
"pdf-parse": "^1.1.1",
"@types/pdf-parse": "^1.1.5"
```

## Exemplo via curl

```bash
curl -X POST "https://seu-app.vercel.app/api/statements/import" \
  -H "x-statement-import-secret: SEU_SEGREDO" \
  -F "bank_key=nubank" \
  -F "source_type=pdf" \
  -F "file=@fatura.pdf"
```

## Próximo ajuste recomendado

Para leitura perfeita de um banco específico, envie uma fatura real anonimizada.  
Com ela, o parser pode ser ajustado ao layout exato da fatura desse banco.
