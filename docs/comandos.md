# Comandos do Projeto

Referência rápida para setup, execução e manutenção.

## Instalação do projeto
```bash
npm install
```

## Execução em ambiente de desenvolvimento
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
> Use estes comandos se o Supabase CLI estiver instalado e configurado no ambiente.

```bash
supabase start
supabase db push
supabase migration list
```

## Outros comandos úteis
```bash
# Worker de sincronização local
npm run sync:worker

# Buscar texto no projeto
rg "texto-ou-termo"

# Listar arquivos rapidamente
rg --files
```
