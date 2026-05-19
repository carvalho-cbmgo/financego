param(
  [ValidateSet("debug", "release", "test", "lint", "validate")]
  [string]$Mode = "validate",

  [switch]$InstallGradleIfMissing
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$AndroidDir = Join-Path $RepoRoot "android-companion-min"
$ToolsDir = Join-Path $RepoRoot ".tools"
$GradleVersion = "8.7"
$GradleDir = Join-Path $ToolsDir "gradle-$GradleVersion"
$GradleBat = Join-Path $GradleDir "bin\gradle.bat"

function Install-LocalGradle {
  New-Item -ItemType Directory -Force -Path $ToolsDir | Out-Null

  $ZipPath = Join-Path $ToolsDir "gradle-$GradleVersion-bin.zip"
  $GradleUrl = "https://services.gradle.org/distributions/gradle-$GradleVersion-bin.zip"

  Write-Host "Baixando Gradle $GradleVersion em $ZipPath..."
  & curl.exe --ssl-no-revoke -L --fail --retry 3 -o $ZipPath $GradleUrl
  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao baixar Gradle $GradleVersion."
  }

  Write-Host "Extraindo Gradle $GradleVersion..."
  Expand-Archive -LiteralPath $ZipPath -DestinationPath $ToolsDir -Force
}

if (-not (Test-Path $GradleBat)) {
  if ($InstallGradleIfMissing) {
    Install-LocalGradle
  } else {
    throw "Gradle local nao encontrado em '$GradleBat'. Execute novamente com -InstallGradleIfMissing."
  }
}

$DefaultJavaHome = "C:\Program Files\Android\Android Studio\jbr"
if (-not $env:JAVA_HOME -or -not (Test-Path (Join-Path $env:JAVA_HOME "bin\java.exe"))) {
  if (Test-Path (Join-Path $DefaultJavaHome "bin\java.exe")) {
    $env:JAVA_HOME = $DefaultJavaHome
  } else {
    throw "Java do Android Studio nao encontrado em '$DefaultJavaHome'."
  }
}

$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

if (-not $env:ANDROID_HOME) {
  $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA "Android\Sdk"
}

if (-not (Test-Path $env:ANDROID_HOME)) {
  throw "Android SDK nao encontrado em '$env:ANDROID_HOME'."
}

$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:GRADLE_USER_HOME = Join-Path $ToolsDir "gradle-user-home"

$TrustStore = Join-Path $ToolsDir "financego-android-cacerts"
if (Test-Path $TrustStore) {
  $env:GRADLE_OPTS = "-Djavax.net.ssl.trustStore=$TrustStore -Djavax.net.ssl.trustStorePassword=changeit -Dcom.sun.net.ssl.checkRevocation=false"
}

$TaskGroups = @{
  debug = @(":app:assembleDebug")
  release = @(":app:assembleRelease")
  test = @(":app:testDebugUnitTest")
  lint = @(":app:lintDebug")
  validate = @(":app:testDebugUnitTest", ":app:lintDebug", ":app:assembleDebug", ":app:assembleRelease")
}

Push-Location $AndroidDir
try {
  foreach ($Task in $TaskGroups[$Mode]) {
    Write-Host ""
    Write-Host "Executando Gradle task: $Task"
    & $GradleBat --no-daemon --console=plain $Task
    if ($LASTEXITCODE -ne 0) {
      throw "Gradle task falhou: $Task"
    }
  }
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "APKs gerados:"
Get-ChildItem -Path (Join-Path $AndroidDir "app\build\outputs\apk") -Recurse -Filter *.apk -ErrorAction SilentlyContinue |
  Select-Object FullName, Length, LastWriteTime |
  Format-Table -AutoSize
