package com.financego.companion

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.time.Instant

class MainActivity : AppCompatActivity() {
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

    val config = CompanionPrefs.load(this)
    baseUrlInput.setText(config.baseUrl)
    devicePublicIdInput.setText(config.devicePublicId)
    deviceNameInput.setText(config.deviceName)
    deviceTokenInput.setText(SecureTokenStore.get(this))

    saveButton.setOnClickListener { saveConfig() }
    openPermissionButton.setOnClickListener { openNotificationAccess() }
    testButton.setOnClickListener { sendTestEvent() }

    AppWorkScheduler.ensurePeriodicSync(this)
    updateStatus("Pronto. Configure os campos e habilite permissao de notificacoes.")
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

    updateStatus("Enviando evento de teste...")
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
    statusText.text = "$text\nFila offline: $queueSize"
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
}
