# v11 — Correções progressivas de segurança

## 1. Remover profile_id demo fixo — OK

### Alterações
- Páginas e rotas passam a usar usuário/dispositivo
- Criado auth-server.ts

### Inspeção
```json
{
  "demo_hits_before_full_api_patch": [
    "scripts/test-nubank-csv.ts",
    "scripts/test-refunds-nubank.ts",
    "src/app/api/export/excel/route.ts",
    "src/app/api/export/pdf/route.ts",
    "src/app/api/statements/import/route.ts",
    "src/app/api/notifications/ingest/route.ts",
    "src/app/api/notifications/batch/route.ts",
    "src/app/api/goals/save/route.ts",
    "src/app/api/budgets/save/route.ts",
    "src/app/api/demo/seed/route.ts",
    "src/app/api/backup/export/route.ts",
    "src/app/api/android/daily-summary/route.ts"
  ]
}
```

## 2. Usuário autenticado real — OK

### Alterações
- Login grava cookie httpOnly
- middleware protege páginas

### Inspeção
```json
{
  "middleware": true
}
```

## 4. Remover supabaseAdmin das páginas — OK

### Alterações
- Páginas usam createUserDb com token e RLS

### Inspeção
```json
{
  "page_admin_imports": []
}
```

## 5. Proteger páginas com sessão — OK

### Alterações
- Páginas protegidas chamam requireServerSession/requireServerUser

### Inspeção
```json
{
  "missing": []
}
```

## 3. Ativar RLS — OK

### Alterações
- RLS e policies por auth.uid adicionadas

### Inspeção
```json
{
  "rls_count": 12
}
```


### Alterações

### Inspeção
```json
{
    "README.md",
    "DEPLOY_CHECKLIST.md",
    "NOTIFICACOES_BANCARIAS.md",
    "supabase/schema.sql",
    "scripts/sync-core.ts",
    "src/app/api/statements/import/route.ts",
    "src/app/api/notifications/ingest/route.ts",
    "src/app/api/demo/seed/route.ts"
  ]
}
```

## 7. Pareamento de dispositivo — OK

### Alterações
- x-device-token substitui segredo estático
- SecureTokenStore criado

### Inspeção
```json
{
  "static_secret_hits": [
    "NOTIFICACOES_BANCARIAS.md",
    "android-notification-forwarder/README.md",
    "src/app/api/notifications/batch/route.ts"
  ]
}
```

## 8. Limitar upload — OK

### Alterações
- Limite 5MB e extensões permitidas

### Inspeção
```json
{
  "limit_hits": [
    "src/lib/upload-limits.ts"
  ]
}
```

## 9. Desativar seed em produção — OK

### Alterações
- ALLOW_DEMO_SEED necessário em produção

### Inspeção
```json
{
  "guard": true
}
```

## 10. Auditoria e rate limit — OK

### Alterações
- rate-limit.ts e audit-log.ts criados
- audit_logs no schema
- endpoints críticos receberam rate limit

### Inspeção
```json
{
  "rate_limit_files": [
    "src/lib/rate-limit.ts",
    "src/app/api/export/excel/route.ts",
    "src/app/api/export/pdf/route.ts",
    "src/app/api/statements/import/route.ts",
    "src/app/api/notifications/ingest/route.ts",
    "src/app/api/notifications/batch/route.ts",
    "src/app/api/backup/export/route.ts"
  ],
  "audit_files": [
    "src/lib/audit-log.ts",
    "src/app/api/export/excel/route.ts",
    "src/app/api/export/pdf/route.ts",
    "src/app/api/statements/import/route.ts",
    "src/app/api/notifications/ingest/route.ts",
    "src/app/api/notifications/batch/route.ts",
    "src/app/api/backup/export/route.ts"
  ]
}
```

## Inspeção final

```json
{
  "demo_profile_hits": [
    "scripts/test-nubank-csv.ts",
    "scripts/test-refunds-nubank.ts",
    "src/app/api/demo/seed/route.ts"
  ],
    "README.md",
    "DEPLOY_CHECKLIST.md",
    "NOTIFICACOES_BANCARIAS.md",
    "supabase/schema.sql",
    "scripts/sync-core.ts",
    "src/app/api/statements/import/route.ts",
    "src/app/api/notifications/ingest/route.ts",
    "src/app/api/demo/seed/route.ts"
  ],
  "static_secret_hits": [
    "NOTIFICACOES_BANCARIAS.md",
    "android-notification-forwarder/README.md",
    "src/app/api/notifications/batch/route.ts"
  ],
  "page_supabase_admin_imports": [],
  "rls_count": 13
}
```

## Observações

Esta versão endurece bastante o MVP, mas ainda recomendo testar com:

```bash
npm install
npm run build
```

E executar o `supabase/schema.sql` em um projeto limpo antes de usar dados reais.
