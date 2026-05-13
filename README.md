# Finance MVP v17 — TypeScript Callback Fix

Corrige erros de TypeScript estrito em callbacks com parâmetro implícito `any`, incluindo `daily-summary/route.ts`.

Leia `BUILD_FIX_V17_REPORT.json`.

# Finance MVP v16 — Lazy Supabase Env Fix

Corrige o erro `supabaseUrl is required` durante `npm run build`.

O cliente Supabase agora é inicializado de forma tardia, apenas quando uma rota ou página realmente acessa o banco. Mesmo assim, para rodar o sistema de verdade, crie `.env.local` com as chaves reais do Supabase. Veja `.env.local.example`.

# Finance MVP v15 — Page Auth Build Fix

Corrige páginas que usavam `supabaseAdmin` sem declaração/importação após o hardening de segurança.

Leia `BUILD_FIX_V15_REPORT.json`.

# Finance MVP v14 — Build Fix

Correção do erro de sintaxe em `src/app/api/demo/seed/route.ts` causado pela remoção de campos legados.

Leia `BUILD_FIX_V14_REPORT.json`.

# Finance MVP v13 — Totalmente sem Pluggy

Todos os códigos, referências, rotas, imports e documentação relacionados à Pluggy/Open Finance foram removidos.

Arquitetura final:
- Android Notification Listener
- Importação CSV/OFX/PDF
- Supabase
- Sincronização offline
- Parser bancário local
- Classificação local

Leia `REMOVE_PLUGGY_REPORT.json`.

