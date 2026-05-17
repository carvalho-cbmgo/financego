package com.financego.companion

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
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
    val config = CompanionConfig(
      baseUrl = baseUrlInput.text.toString(),
      devicePublicId = devicePublicIdInput.text.toString(),
      deviceName = deviceNameInput.text.toString().ifBlank { android.os.Build.MODEL },
    )
    CompanionPrefs.save(this, config)
    SecureTokenStore.save(this, deviceTokenInput.text.toString())

    AppWorkScheduler.ensurePeriodicSync(this)
    AppWorkScheduler.enqueueOneTimeSync(this)
    updateStatus("Configuracao salva. Agora habilite a permissao de notificacoes.")
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
    val token = SecureTokenStore.get(this)
    if (config.baseUrl.isBlank() || token.isBlank()) {
      updateStatus("Informe URL base e token antes de testar.")
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
      } else {
        updateStatus("Falha no envio. Evento foi colocado na fila offline.")
        OfflineQueue(applicationContext).enqueue(buildTestPayload(config.devicePublicId))
        AppWorkScheduler.enqueueOneTimeSync(applicationContext)
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
}
