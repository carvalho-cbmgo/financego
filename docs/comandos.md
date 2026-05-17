# Comandos do Projeto

Referencia rapida para setup, execucao, validacao e publicacao.

## Instalacao do projeto web
```bash
npm install
```

## Execucao web em desenvolvimento
```bash
npm run dev
```

## Build web
```bash
npm run build
npm run start
```

## Ajuste de ambiente local (Windows)
```powershell
# Se houver erro TLS no npm (UNABLE_TO_VERIFY_LEAF_SIGNATURE),
# configure o Node para usar certificados do sistema:
setx NODE_OPTIONS "--use-system-ca"

# Em novas sessoes do PowerShell:
npm ping
npm ci
npm run build
```

```powershell
# Se o PowerShell bloquear npm.ps1:
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned -Force
```

## Fluxo mobile + pareamento
```txt
1) Acessar /login no celular
2) Redirecionamento automatico para /mobile
3) Menu lateral (icone tres barras)
4) Configuracoes -> /mobile/pair
5) Gerar Device Public ID + Device Token
```

## Companion Android minimo
```bash
# Abrir projeto Android no Android Studio
android-companion-min/

# Compilar e instalar no aparelho
# Configurar URL base + Device Public ID + Device Token
# Habilitar permissao de notificacoes
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

## Rotina obrigatoria apos mudancas no sistema
```bash
# 1) Atualizar documentacao do estado do projeto
# docs/andamento.md
# docs/pendencias.md
# docs/decisoes.md
# docs/prompts-importantes.md

# 2) Validar build
npm run build

# 3) Versionar e publicar
git add -A
git commit -m "descricao da entrega"
git push origin main
# (push em main aciona deploy automatico no Vercel)
```
