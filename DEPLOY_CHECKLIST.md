# Checklist de Deploy

## GitHub
- [ ] Criar repositório
- [ ] Enviar código com `git push`
- [ ] Confirmar execução do GitHub Actions

## Supabase
- [ ] Criar projeto
- [ ] Executar `supabase/schema.sql`
- [ ] Habilitar Auth por e-mail/senha
- [ ] Copiar URL, anon key e service role key

## Notificações/Importação
- [ ] Criar credenciais
- [ ] Copiar Client ID e Client Secret
- [ ] Configurar webhook para `/api/notificacoes/webhook`

## Vercel
- [ ] Importar repositório do GitHub
- [ ] Adicionar variáveis de ambiente
- [ ] Publicar
- [ ] Testar login
- [ ] Testar `/api/demo/seed`
- [ ] Testar PWA no celular

## Sync
- [ ] Configurar cron externo para chamar `/api/sync/run`
- [ ] Usar header `x-sync-endpoint-secret`
