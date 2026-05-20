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

## Build do FinanceGO Android (APK)
> Recomendado: usar o script do repositório. Ele configura Java do Android Studio, Android SDK, Gradle local e truststore automaticamente.

URL de producao usada pelo APK: `https://financego-eight.vercel.app`.

Observacao: o script limpa atributos `ReadOnly` das pastas de build Android antes de chamar o Gradle, evitando falhas locais como `AccessDeniedException` em `app/build/generated`.

```powershell
# Validacao completa: teste, lint, debug e release
powershell -ExecutionPolicy Bypass -File .\scripts\build-android-financego.ps1 -Mode validate

# Gerar apenas APK debug instalavel para teste
powershell -ExecutionPolicy Bypass -File .\scripts\build-android-financego.ps1 -Mode debug

# Gerar apenas APK release unsigned
powershell -ExecutionPolicy Bypass -File .\scripts\build-android-financego.ps1 -Mode release

# Rodar apenas lint Android
powershell -ExecutionPolicy Bypass -File .\scripts\build-android-financego.ps1 -Mode lint

# Rodar apenas testes unitarios Android
powershell -ExecutionPolicy Bypass -File .\scripts\build-android-financego.ps1 -Mode test
```

## Instalar Gradle local novamente
```powershell
# Use quando a pasta .tools/gradle-8.7 nao existir no computador atual
powershell -ExecutionPolicy Bypass -File .\scripts\build-android-financego.ps1 -Mode debug -InstallGradleIfMissing
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

cd android-financego
..\.tools\gradle-8.7\bin\gradle.bat --no-daemon --console=plain :app:assembleDebug
..\.tools\gradle-8.7\bin\gradle.bat --no-daemon --console=plain :app:assembleRelease
```

## Artefatos Android atuais
```txt
android-financego/app/build/outputs/apk/debug/app-debug.apk
android-financego/app/build/outputs/apk/release/app-release-unsigned.apk
```

## Validar assinatura do APK
```powershell
$apksigner = "$env:LOCALAPPDATA\Android\Sdk\build-tools\35.0.1\apksigner.bat"
& $apksigner verify --verbose .\android-financego\app\build\outputs\apk\debug\app-debug.apk
& $apksigner verify --verbose .\android-financego\app\build\outputs\apk\release\app-release-unsigned.apk
```

Observação: o `app-debug.apk` é assinado automaticamente e serve para teste local. O `app-release-unsigned.apk` precisa de keystore de produção antes de distribuição.

## Instalar APK debug via ADB
```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb devices -l
& $adb install -r .\android-financego\app\build\outputs\apk\debug\app-debug.apk
```

## Reinstalar APK debug apos hotfix Android
```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb devices -l

# Use quando o app ja estiver instalado no celular.
& $adb install -r .\android-financego\app\build\outputs\apk\debug\app-debug.apk

# Se o Android continuar abrindo a versao antiga, desinstale e instale novamente.
& $adb uninstall com.financego.mobile
& $adb install .\android-financego\app\build\outputs\apk\debug\app-debug.apk
```

## Validação do APK nativo
```txt
1) Instalar `android-financego/app/build/outputs/apk/debug/app-debug.apk`.
2) Abrir o app Finance GO.
3) Fazer login com e-mail e senha do usuário.
4) Se a tela de configuração abrir, permitir acesso às notificações.
5) Tocar em "Testar configuração".
6) Validar resumo, contas, últimas transações e criação/edição de transação.
7) Receber notificação bancária real para validar registro automático em segundo plano.
```

## Artefatos de APK da validação atual
```txt
android-financego/app/build/outputs/apk/debug/app-debug.apk
android-financego/app/build/outputs/apk/release/app-release-unsigned.apk
```

## Fluxo Android nativo
```txt
1) Abrir o APK nativo Finance GO
2) Informar e-mail e senha
3) O app chama `/api/android/login`
4) O app sincroniza perfil, contas e transações por `/api/android/bootstrap`
5) O listener envia notificações para `/api/android/notifications/ingest`
6) A criação/edição nativa usa `/api/android/transactions/save`
```

## Testar login Android no Vercel
```powershell
$url = "https://financego-eight.vercel.app/api/android/login"
$body = @{ email = "maykocarvalho@gmail.com"; password = "123456" } | ConvertTo-Json -Compress
$response = Invoke-RestMethod -Uri $url -Method Post -ContentType "application/json; charset=utf-8" -Body $body
$response.ok
$response.user.email
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

## Teste de notificações no APK nativo
```txt
1) Abrir Finance GO Android
2) Fazer login
3) Habilitar acesso de notificações para o app
4) Receber uma notificação real de banco/PIX/cartão
5) Verificar se a transação aparece no FinanceGO web e no app após atualizar
6) Conferir se PIX para o próprio nome foi classificado como transferência
```
