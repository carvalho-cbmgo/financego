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
> Recomendado: usar o script do repositório. Ele configura Java do Android Studio, Android SDK, Gradle local e truststore automaticamente.

```powershell
# Validacao completa: teste, lint, debug e release
powershell -ExecutionPolicy Bypass -File .\scripts\build-android-companion.ps1 -Mode validate

# Gerar apenas APK debug instalavel para teste
powershell -ExecutionPolicy Bypass -File .\scripts\build-android-companion.ps1 -Mode debug

# Gerar apenas APK release unsigned
powershell -ExecutionPolicy Bypass -File .\scripts\build-android-companion.ps1 -Mode release

# Rodar apenas lint Android
powershell -ExecutionPolicy Bypass -File .\scripts\build-android-companion.ps1 -Mode lint

# Rodar apenas testes unitarios Android
powershell -ExecutionPolicy Bypass -File .\scripts\build-android-companion.ps1 -Mode test
```

## Instalar Gradle local novamente
```powershell
# Use quando a pasta .tools/gradle-8.7 nao existir no computador atual
powershell -ExecutionPolicy Bypass -File .\scripts\build-android-companion.ps1 -Mode debug -InstallGradleIfMissing
```

## Build Android manual com Gradle local
```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:PATH="$env:JAVA_HOME\bin;$env:PATH"
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT="$env:LOCALAPPDATA\Android\Sdk"
$env:GRADLE_USER_HOME=(Join-Path (Get-Location) '.tools\gradle-user-home')

# Necessario nesta maquina por causa da inspecao HTTPS do AVG
$env:GRADLE_OPTS="-Djavax.net.ssl.trustStore=$(Join-Path (Get-Location) '.tools\financego-android-cacerts') -Djavax.net.ssl.trustStorePassword=changeit -Dcom.sun.net.ssl.checkRevocation=false"

cd android-companion-min
..\.tools\gradle-8.7\bin\gradle.bat --no-daemon --console=plain :app:assembleDebug
..\.tools\gradle-8.7\bin\gradle.bat --no-daemon --console=plain :app:assembleRelease
```

## Artefatos Android atuais
```txt
android-companion-min/app/build/outputs/apk/debug/app-debug.apk
android-companion-min/app/build/outputs/apk/release/app-release-unsigned.apk
```

## Validar assinatura do APK
```powershell
$apksigner = "$env:LOCALAPPDATA\Android\Sdk\build-tools\35.0.1\apksigner.bat"
& $apksigner verify --verbose .\android-companion-min\app\build\outputs\apk\debug\app-debug.apk
& $apksigner verify --verbose .\android-companion-min\app\build\outputs\apk\release\app-release-unsigned.apk
```

Observação: o `app-debug.apk` é assinado automaticamente e serve para teste local. O `app-release-unsigned.apk` precisa de keystore de produção antes de distribuição.

## Instalar APK debug via ADB
```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb devices -l
& $adb install -r .\android-companion-min\app\build\outputs\apk\debug\app-debug.apk
```

## Validacao do APK com WebView interno
```txt
1) Instalar APK gerado.
2) Abrir FinanceGO Companion.
3) Salvar URL base, Device Public ID e Device Token.
4) Tocar em "Abrir FinanceGO no app".
5) Fazer login dentro do WebView do APK.
6) Voltar ao companion, tocar em "Abrir permissao de notificacoes" e habilitar o listener.
7) Testar com "Simular notificacao PIX (listener)".
```

## Artefatos de APK da validação atual
```txt
android-companion-min/app/build/outputs/apk/debug/app-debug.apk
android-companion-min/app/build/outputs/apk/release/app-release-unsigned.apk
```

## Fluxo mobile + pareamento
```txt
1) Acessar /login no celular
2) Redirecionamento automatico para /mobile
3) Menu lateral (icone tres barras)
4) Configuracoes -> /mobile/pair
5) Tocar em "Conectar app automaticamente"
6) APK abre e recebe configuracao via deep link
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

## Teste rapido das ultimas correcoes
```bash
# Build de validacao geral
npm run build

# Conferir arquivos alterados antes de versionar
git status --short
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

## Teste de simulacao PIX no APK
```txt
1) Abrir FinanceGO Companion
2) Salvar configuracao (URL + Device Public ID + Device Token)
3) Habilitar acesso de notificacoes para o app
4) Tocar em "Simular notificacao PIX (listener)"
5) Conferir no status do app: listener ATIVO e fila offline
6) Verificar no FinanceGO se a transacao foi criada automaticamente
```
