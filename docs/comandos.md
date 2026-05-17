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

## Build do companion Android (APK)
```powershell
# Definir Java do Android Studio na sessao atual
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:PATH="$env:JAVA_HOME\bin;$env:PATH"
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT="$env:LOCALAPPDATA\Android\Sdk"

# Entrar na pasta do companion
cd android-companion-min

# Exemplo usando Gradle local (quando gradle nao esta no PATH)
C:\Users\Myk\Desktop\financego\.tools\gradle-8.7\bin\gradle.bat assembleDebug
C:\Users\Myk\Desktop\financego\.tools\gradle-8.7\bin\gradle.bat assembleRelease
```

## Artefatos de APK gerados nesta etapa
```txt
build-artifacts/financego-companion-debug.apk
build-artifacts/financego-companion-release-signed.apk
build-artifacts/financego-companion-release-unsigned.apk
build-artifacts/financego-companion-v2-release-signed.apk
build-artifacts/financego-companion-compat-v2-signed.apk
```

## Fluxo mobile + pareamento
```txt
1) Acessar /login no celular
2) Redirecionamento automatico para /mobile
3) Menu lateral (icone tres barras)
4) Configuracoes -> /mobile/pair
5) Gerar Device Public ID + Device Token
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
