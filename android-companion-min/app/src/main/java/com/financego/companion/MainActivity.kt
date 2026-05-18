package com.financego.companion

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.time.Instant

class MainActivity : AppCompatActivity() {
  private companion object {
    const val NOTIFICATION_PERMISSION_REQUEST = 4101
    const val TEST_NOTIFICATION_CHANNEL_ID = "financego_companion_test_channel"
  }

  private lateinit var baseUrlInput: EditText
  private lateinit var devicePublicIdInput: EditText
  private lateinit var deviceTokenInput: EditText
  private lateinit var deviceNameInput: EditText
  private lateinit var statusText: TextView

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_main)

    baseUrlInput = findViewById(R.id.baseUrlInput)
    devicePublicIdInput = findViewById(R.id.devicePublicIdInput)
    deviceTokenInput = findViewById(R.id.deviceTokenInput)
    deviceNameInput = findViewById(R.id.deviceNameInput)
    statusText = findViewById(R.id.statusText)

    val saveButton = findViewById<Button>(R.id.saveButton)
    val openPermissionButton = findViewById<Button>(R.id.openPermissionButton)
    val testButton = findViewById<Button>(R.id.testButton)
    val simulatePixNotificationButton = findViewById<Button>(R.id.simulatePixNotificationButton)

    val config = CompanionPrefs.load(this)
    baseUrlInput.setText(config.baseUrl)
    devicePublicIdInput.setText(config.devicePublicId)
    deviceNameInput.setText(config.deviceName)
    deviceTokenInput.setText(SecureTokenStore.get(this))

    saveButton.setOnClickListener { saveConfig() }
    openPermissionButton.setOnClickListener { openNotificationAccess() }
    testButton.setOnClickListener { sendTestEvent() }
    simulatePixNotificationButton.setOnClickListener { simulatePixNotification() }

    AppWorkScheduler.ensurePeriodicSync(this)
    ensurePostNotificationsPermissionIfNeeded()
    updateStatus("Pronto. Configure os campos, habilite o listener e rode a simulacao PIX.")
    handlePairIntent(intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    handlePairIntent(intent)
  }

  private fun saveConfig() {
    val rawBaseUrl = baseUrlInput.text.toString().trim()
    val normalizedBaseUrl = normalizeBaseUrl(rawBaseUrl)
    val devicePublicId = devicePublicIdInput.text.toString().trim()
    val deviceToken = deviceTokenInput.text.toString().trim()

    if (normalizedBaseUrl.isBlank()) {
      baseUrlInput.error = "Informe a URL base"
      toast("Preencha a URL base do FinanceGO.")
      updateStatus("Configuracao incompleta: URL base vazia.")
      return
    }

    if (!normalizedBaseUrl.startsWith("https://") && !normalizedBaseUrl.startsWith("http://")) {
      baseUrlInput.error = "URL invalida"
      toast("A URL deve comecar com http:// ou https://")
      updateStatus("Configuracao invalida: URL base mal formatada.")
      return
    }

    if (devicePublicId.isBlank()) {
      devicePublicIdInput.error = "Informe o Device Public ID"
      toast("Preencha o Device Public ID.")
      updateStatus("Configuracao incompleta: Device Public ID vazio.")
      return
    }

    if (deviceToken.isBlank()) {
      deviceTokenInput.error = "Informe o Device Token"
      toast("Preencha o Device Token.")
      updateStatus("Configuracao incompleta: Device Token vazio.")
      return
    }

    baseUrlInput.setText(normalizedBaseUrl)

    val config = CompanionConfig(
      baseUrl = normalizedBaseUrl,
      devicePublicId = devicePublicId,
      deviceName = deviceNameInput.text.toString().ifBlank { android.os.Build.MODEL },
    )
    CompanionPrefs.save(this, config)
    SecureTokenStore.save(this, deviceToken)

    AppWorkScheduler.ensurePeriodicSync(this)
    AppWorkScheduler.enqueueOneTimeSync(this)

    toast("Configuracao salva com sucesso.")
    updateStatus("Configuracao salva. Testando conectividade...")
    sendConnectivityTestAfterSave(config, deviceToken)
  }

  private fun openNotificationAccess() {
    runCatching {
      startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
    }.onFailure {
      updateStatus("Nao foi possivel abrir a tela de permissoes automaticamente.")
    }
  }

  private fun sendTestEvent() {
    val config = CompanionPrefs.load(this)
    val token = SecureTokenStore.get(this).trim()
    if (config.baseUrl.isBlank() || token.isBlank() || config.devicePublicId.isBlank()) {
      updateStatus("Informe URL base, Device Public ID e token antes de testar.")
      toast("Preencha URL, Device Public ID e token antes do teste.")
      return
    }

    updateStatus("Enviando evento de teste direto para a API...")
    lifecycleScope.launch {
      val result = withContext(Dispatchers.IO) {
        NotificationApi.sendIngest(
          baseUrl = config.baseUrl,
          deviceToken = token,
          payload = buildTestPayload(config.devicePublicId),
        )
      }

      if (result) {
        updateStatus("Evento de teste enviado com sucesso.")
        toast("Teste enviado com sucesso.")
      } else {
        updateStatus("Falha no envio. Evento foi colocado na fila offline.")
        OfflineQueue(applicationContext).enqueue(buildTestPayload(config.devicePublicId))
        AppWorkScheduler.enqueueOneTimeSync(applicationContext)
        toast("Falha no envio agora. Evento ficou na fila offline.")
      }
    }
  }

  private fun simulatePixNotification() {
    val config = CompanionPrefs.load(this)
    val token = SecureTokenStore.get(this).trim()
    if (config.baseUrl.isBlank() || token.isBlank() || config.devicePublicId.isBlank()) {
      updateStatus("Salve URL base, Device Public ID e token antes da simulacao.")
      toast("Preencha e salve a configuracao antes da simulacao.")
      return
    }

    if (!isNotificationListenerEnabled()) {
      updateStatus("Listener de notificacoes desativado. Abra permissoes e habilite o FinanceGO Companion.")
      toast("Ative o listener de notificacoes primeiro.")
      openNotificationAccess()
      return
    }

    if (!hasPostNotificationsPermission()) {
      ensurePostNotificationsPermissionIfNeeded()
      updateStatus("Permissao de notificacoes pendente. Autorize para gerar simulacao local.")
      toast("Permita notificacoes e toque novamente em simular.")
      return
    }

    postLocalPixNotification()
    updateStatus("Notificacao PIX simulada enviada. Aguarde alguns segundos para o registro automatico.")
    toast("Notificacao PIX simulada enviada.")
  }

  private fun postLocalPixNotification() {
    val manager = getSystemService(NotificationManager::class.java) ?: return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        TEST_NOTIFICATION_CHANNEL_ID,
        "FinanceGO Companion Tests",
        NotificationManager.IMPORTANCE_DEFAULT,
      ).apply {
        description = "Canal de testes para simular notificacoes financeiras locais."
      }
      manager.createNotificationChannel(channel)
    }

    val now = Instant.now()
    val body = "Nubank: Pix enviado de R$ 27,90 para Mercado Central em ${now.toString().take(19).replace('T', ' ')}"
    val notification = NotificationCompat.Builder(this, TEST_NOTIFICATION_CHANNEL_ID)
      .setSmallIcon(android.R.drawable.stat_notify_more)
      .setContentTitle("Nubank | Pix enviado")
      .setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setAutoCancel(true)
      .setPriority(NotificationCompat.PRIORITY_DEFAULT)
      .build()

    val notificationId = (System.currentTimeMillis() % Int.MAX_VALUE).toInt()
    manager.notify(notificationId, notification)
  }

  private fun hasPostNotificationsPermission(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
    return ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
  }

  private fun ensurePostNotificationsPermissionIfNeeded() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !hasPostNotificationsPermission()) {
      ActivityCompat.requestPermissions(
        this,
        arrayOf(Manifest.permission.POST_NOTIFICATIONS),
        NOTIFICATION_PERMISSION_REQUEST,
      )
    }
  }

  private fun isNotificationListenerEnabled(): Boolean {
    val componentName = ComponentName(this, NotificationForwarderService::class.java)
    val enabled = Settings.Secure.getString(contentResolver, "enabled_notification_listeners") ?: return false
    return enabled.split(":").any { flattened ->
      flattened.equals(componentName.flattenToString(), ignoreCase = true)
        || flattened.equals(componentName.flattenToShortString(), ignoreCase = true)
    }
  }

  override fun onRequestPermissionsResult(
    requestCode: Int,
    permissions: Array<out String>,
    grantResults: IntArray,
  ) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults)
    if (requestCode == NOTIFICATION_PERMISSION_REQUEST) {
      if (hasPostNotificationsPermission()) {
        updateStatus("Permissao de notificacoes concedida. Simulacao PIX pronta para uso.")
      } else {
        updateStatus("Permissao de notificacoes negada. A simulacao local nao podera ser exibida.")
      }
    }
  }

  private fun buildTestPayload(devicePublicId: String): JSONObject {
    return JSONObject().apply {
      put("deviceId", android.os.Build.MODEL)
      put("device_public_id", devicePublicId)
      put("packageName", "com.financego.companion")
      put("appName", "FinanceGO Companion")
      put("title", "Evento de teste")
      put("text", "Compra de R$ 12,34 em TESTE COMPANION")
      put("bigText", "Compra de R$ 12,34 em TESTE COMPANION no cartao final 0001")
      put("postedAt", Instant.now().toString())
      put("notificationId", "test-${System.currentTimeMillis()}")
    }
  }

  private fun updateStatus(text: String) {
    val queueSize = OfflineQueue(applicationContext).size()
    val listener = if (isNotificationListenerEnabled()) "ATIVO" else "DESATIVADO"
    val notifications = if (hasPostNotificationsPermission()) "OK" else "PENDENTE"
    statusText.text = "$text\nListener: $listener | Notificacoes: $notifications\nFila offline: $queueSize"
  }

  private fun sendConnectivityTestAfterSave(config: CompanionConfig, token: String) {
    lifecycleScope.launch {
      val result = withContext(Dispatchers.IO) {
        NotificationApi.sendIngest(
          baseUrl = config.baseUrl,
          deviceToken = token,
          payload = buildTestPayload(config.devicePublicId),
        )
      }

      if (result) {
        updateStatus("Configuracao salva e conectividade validada com sucesso.")
        toast("Conexao validada. Pode habilitar notificacoes.")
      } else {
        updateStatus("Configuracao salva, mas teste falhou. Verifique URL/token ou rede.")
        toast("Nao foi possivel validar conexao agora.")
      }
    }
  }

  private fun normalizeBaseUrl(input: String): String {
    var value = input.trim()
    if (value.isBlank()) return ""
    if (!value.startsWith("http://") && !value.startsWith("https://")) {
      value = "https://$value"
    }
    if (value.endsWith("/")) value = value.dropLast(1)
    return value
  }

  private fun toast(text: String) {
    Toast.makeText(this, text, Toast.LENGTH_SHORT).show()
  }

  private fun handlePairIntent(intent: Intent?) {
    val data = intent?.data ?: return
    if (data.scheme != "financego-companion" || data.host != "pair") return

    val baseUrl = normalizeBaseUrl(data.getQueryParameter("base_url") ?: "")
    val devicePublicId = (data.getQueryParameter("device_public_id") ?: "").trim()
    val deviceToken = (data.getQueryParameter("device_token") ?: "").trim()
    val deepLinkDeviceName = (data.getQueryParameter("device_name") ?: "").trim()

    if (baseUrl.isBlank() || devicePublicId.isBlank() || deviceToken.isBlank()) {
      updateStatus("Link de pareamento incompleto. Gere um novo pareamento no FinanceGO.")
      toast("Link de pareamento invalido.")
      return
    }

    baseUrlInput.setText(baseUrl)
    devicePublicIdInput.setText(devicePublicId)
    deviceTokenInput.setText(deviceToken)
    if (deepLinkDeviceName.isNotBlank()) {
      deviceNameInput.setText(deepLinkDeviceName)
    }

    val config = CompanionConfig(
      baseUrl = baseUrl,
      devicePublicId = devicePublicId,
      deviceName = deviceNameInput.text.toString().ifBlank { android.os.Build.MODEL },
    )
    CompanionPrefs.save(this, config)
    SecureTokenStore.save(this, deviceToken)
    AppWorkScheduler.ensurePeriodicSync(this)
    AppWorkScheduler.enqueueOneTimeSync(this)

    updateStatus("Pareamento automatico concluido. Validando conectividade...")
    toast("Pareamento automatico concluido.")
    sendConnectivityTestAfterSave(config, deviceToken)
  }
}
