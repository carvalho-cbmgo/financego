# Checklist de Deploy (GitHub -> Vercel)

## Repositório oficial atual
- `https://github.com/carvalho-cbmgo/financego`

## 1. GitHub
- [ ] Confirmar que o remoto local aponta para o novo repo:
  - `git remote -v`
  - esperado: `https://github.com/carvalho-cbmgo/financego.git`
- [ ] Enviar código:
  - `git push -u origin main`
- [ ] Confirmar workflow de build em `.github/workflows/check.yml`

## 2. Supabase
- [ ] Criar projeto no Supabase
- [ ] Executar `supabase/schema.sql`
- [ ] Habilitar Auth (e-mail/senha)
- [ ] Copiar as chaves:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

## 3. Vercel (conectar ao novo GitHub)
- [ ] Em **Project > Settings > Git**, desconectar o repositório antigo (se houver)
- [ ] Garantir que a integração GitHub da Vercel tenha acesso ao owner `carvalho-cbmgo` e ao repo `financego`
- [ ] Criar novo projeto (ou reconectar o projeto existente) importando:
  - `carvalho-cbmgo/financego`
- [ ] Verificar configurações de build:
  - Framework: `Next.js`
  - Install Command: `npm install`
  - Build Command: `npm run build`
- [ ] Configurar variáveis de ambiente no Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ALLOW_DEMO_SEED=false`
  - `SYNC_ENDPOINT_SECRET=<segredo-forte>`
  - `APP_URL=https://<seu-dominio-vercel>`
- [ ] Fazer deploy da branch `main`

## 4. Pós-deploy (testes)
- [ ] Abrir `/login` e validar autenticação
- [ ] Testar `POST /api/demo/seed` (somente se `ALLOW_DEMO_SEED=true` no ambiente usado)
- [ ] Testar importação em `/statements`
- [ ] Testar exportações em `/exports`
- [ ] Testar pareamento Android em `POST /api/devices/pair`

## 5. Sync agendado
- [ ] Configurar cron externo para `POST /api/sync/run`
- [ ] Enviar header: `x-sync-endpoint-secret: <SYNC_ENDPOINT_SECRET>`
