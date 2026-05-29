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
# Use quando a pasta .tools/gradle-8.14.3 nao existir no computador atual
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
..\.tools\gradle-8.14.3\bin\gradle.bat --no-daemon --console=plain :app:assembleDebug
..\.tools\gradle-8.14.3\bin\gradle.bat --no-daemon --console=plain :app:assembleRelease
```

## Build Android manual usado em `2026-05-25`
```powershell
$env:JAVA_TOOL_OPTIONS='-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT'
$env:ANDROID_HOME='C:\Users\mayko\AppData\Local\Android\Sdk'
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME

cd android-financego
& 'C:\Users\mayko\.gradle\wrapper\dists\gradle-8.14.3-all\10utluxaxniiv4wxiphsi49nj\gradle-8.14.3\bin\gradle.bat' `
  --gradle-user-home 'C:\Users\mayko\.gradle' assembleDebug
```

Observacao: esse comando foi necessario porque o ambiente local nao possui `gradle` no `PATH` nem `gradlew.bat` dentro de `android-financego`.

Se ocorrer `java.nio.file.AccessDeniedException` em `android-financego/app/build/generated`, limpar somente os artefatos de build Android antes de recompilar:

```powershell
$target = Resolve-Path -LiteralPath 'android-financego\app\build' -ErrorAction SilentlyContinue
$workspace = (Resolve-Path -LiteralPath '.').Path
if ($target -and $target.Path.StartsWith($workspace, [System.StringComparison]::OrdinalIgnoreCase)) {
  Remove-Item -LiteralPath $target.Path -Recurse -Force
}
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

## Validar APK nativo atual
```powershell
# Build completo web + Android
npm run build
powershell -ExecutionPolicy Bypass -File .\scripts\build-android-financego.ps1 -Mode validate

# Conferir APKs gerados
Get-ChildItem -Path android-financego\app\build\outputs\apk -Recurse -Filter *.apk |
  ForEach-Object { "{0} | {1:N0} bytes | {2}" -f $_.FullName, $_.Length, $_.LastWriteTime }

# Verificar assinatura do APK debug
$apksigner = Join-Path $env:LOCALAPPDATA "Android\Sdk\build-tools\35.0.0\apksigner.bat"
& $apksigner verify --verbose android-financego\app\build\outputs\apk\debug\app-debug.apk

# Conferir aparelhos conectados
$adb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
& $adb devices -l
```

## Instalar APK debug em aparelho conectado
```powershell
$adb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
& $adb install -r android-financego\app\build\outputs\apk\debug\app-debug.apk
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

## Fluxo de teste do APK nativo `1.0.11`
```txt
1) Instalar `android-financego/app/build/outputs/apk/debug/app-debug.apk`.
2) Abrir Finance GO.
3) Confirmar que a tela de login nao exibe URL tecnica.
4) Tocar em ENTRAR e verificar overlay `Carregando...`.
5) Conferir seletor de periodo acima do seletor de mes.
6) Alternar entre `Inicio do mes ate hoje`, `Amanha ate o final do mes` e `Mes completo`.
7) Conferir saldo anterior, entradas, saidas, saldo atual e saldos por conta em cada periodo.
8) Desmarcar `Incluir saldo anterior` e verificar recalculo.
9) Abrir uma conta e conferir transacoes filtradas por conta.
10) Criar transacao sem repeticao, parcelada e avancada.
11) Confirmar que parcelamento mensal cria parcelas mes a mes com selo azul e legenda `Parcela X de Y`.
12) Editar parcela nao consolidada e testar `Alterar apenas esta`, `Alterar a partir desta` e `Alterar a partir da primeira`.
13) Conferir cards de transacao com data/descricao, categoria, parcela/recorrencia, conta/tipo e valor alinhado.
14) Editar uma transacao e testar o botao vermelho `Excluir`.
15) Conferir que o titulo `Transacoes` aparece destacado no topo da tela principal.
16) Conferir que o topo da tela principal tem menu de 3 pontos e `Sair`, sem icones soltos de atualizar/perfil.
17) Abrir o menu de 3 pontos da tela principal e testar `Adicionar Conta`, `Atualizar` e `Perfil`.
18) Confirmar que o menu de 3 pontos da tela principal mostra `Bancos` acima de `Adicionar Conta`.
19) Abrir `Bancos`, criar um banco de teste, editar nome/codigo e excluir se nao houver contas vinculadas.
20) Criar uma conta de teste pelo menu `Adicionar Conta` e conferir se ela aparece apos sincronizar.
21) Tocar no icone de `Graficos` no topo da tela principal.
22) Conferir periodo de calculo, seletor de mes e checkbox `Incluir saldo anterior` na tela `Graficos`.
23) Filtrar por todas as contas e por uma ou mais contas especificas.
24) Conferir grafico pizza por categoria, percentuais e toque na fatia para ver valor em reais.
25) Conferir lista de categorias com percentual e valor em reais.
26) Abrir uma conta e conferir se o texto `Banco - Nome da conta` aparece destacado.
27) Abrir uma conta e conferir menu de 3 pontos com `Edicao de Conta`, `Atualizar` e `Perfil`.
28) Tocar em `Edicao de Conta` e testar a janela de conta.
29) Editar banco, nome, tipo e saldo base da conta; salvar e conferir atualizacao.
30) Conferir se o saldo base editado entra no `Saldo anterior` da tela principal.
31) Conferir se o saldo base editado entra no `Saldo inicial` e `Saldo final` da tela da conta.
32) Conferir se transacoes nao consolidadas ficam em negrito.
33) Conferir se transacoes consolidadas ficam com texto normal.
34) Testar o botao vermelho `Excluir` usando uma conta de teste.
35) Na tela da conta, tocar no `+` e confirmar que `Conta Origem` ja vem selecionada com aquela conta.
36) Abrir Perfil e testar atualizacao de nome completo.
37) Conferir icone de sair e nova transacao.
38) Conferir se categorias aparecem com recuo no seletor.
39) Conferir se saldos por conta batem com saldo base + transacoes normalizadas.
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

## Diagnostico de notificacoes bancarias no APK
```bash
# Validar TypeScript/API
npx tsc --noEmit

# Validar build web para Vercel
npm run build

# Gerar APK debug atualizado
powershell -ExecutionPolicy Bypass -File .\scripts\build-android-financego.ps1 -Mode debug

# Conferir APK gerado
Get-ChildItem -Path "android-financego/app/build/outputs/apk/debug/app-debug.apk" | Select-Object Name,Length,LastWriteTime,FullName | Format-List

# Conferir metadados de versao do APK
Get-Content "android-financego/app/build/outputs/apk/debug/output-metadata.json"
```
