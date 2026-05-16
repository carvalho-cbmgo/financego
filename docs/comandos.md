# Comandos do Projeto

Referencia rapida para setup, execucao, validacao e publicacao.

## Instalacao do projeto
```bash
npm install
```

## Execucao em ambiente de desenvolvimento
```bash
npm run dev
```

## Build
```bash
npm run build
npm run start
```

## Git
```bash
git status -sb
git add -A
git commit -m "mensagem objetiva"
git push origin main
```

## Supabase
> Use se o Supabase CLI estiver instalado e configurado.

```bash
supabase start
supabase db push
supabase migration list
```

## Outros comandos uteis
```bash
# Worker de sincronizacao local
npm run sync:worker

# Buscar termos no projeto
rg "texto-ou-termo"

# Listar arquivos
rg --files

# Ver ultimos commits
git log --oneline -n 12
```

## Rotina recomendada antes de deploy
```bash
git status -sb
npm run build
git add -A
git commit -m "descricao da entrega"
git push origin main
```
