package com.financego.companion

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.time.Instant

class NotificationForwarderService : NotificationListenerService() {
  private val ioScope = CoroutineScope(Dispatchers.IO)

  private val allowedPackages = setOf(
    "com.nu.production",
    "br.com.bb.android",
    "com.itau",
    "br.com.bradesco",
    "br.com.santander.app",
    "br.com.santander",
    "com.picpay",
    "com.mercadopago.wallet",
    "com.c6bank.app",
    "br.com.intermedium",
    "br.com.inter",
  )

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    val packageName = sbn.packageName ?: return
    if (!allowedPackages.contains(packageName)) return

    val config = CompanionPrefs.load(applicationContext)
    val token = SecureTokenStore.get(applicationContext)
    if (config.baseUrl.isBlank() || token.isBlank()) return

    val extras = sbn.notification.extras
    val title = extras.getString(Notification.EXTRA_TITLE) ?: ""
    val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
    val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ""
    val fullText = "$title $text $bigText".trim()
    if (!looksLikeFinancialEvent(fullText)) return

    val payload = JSONObject().apply {
      put("deviceId", android.os.Build.MODEL)
      put("device_public_id", config.devicePublicId)
      put("packageName", packageName)
      put("appName", packageName)
      put("title", title)
      put("text", text)
      put("bigText", bigText)
      put("postedAt", Instant.ofEpochMilli(sbn.postTime).toString())
      put("notificationId", "$packageName-${sbn.id}-${sbn.postTime}")
    }

    ioScope.launch {
      val sent = NotificationApi.sendIngest(config.baseUrl, token, payload)
      if (!sent) {
        OfflineQueue(applicationContext).enqueue(payload)
      }
      AppWorkScheduler.enqueueOneTimeSync(applicationContext)
    }
  }

  private fun looksLikeFinancialEvent(content: String): Boolean {
    val text = content.lowercase()
    if (!text.contains("r$")) return false

    val markers = listOf(
      "compra",
      "pix",
      "pagamento",
      "debito",
      "credito",
      "recebido",
      "cartao",
      "parcela",
      "transferencia",
      "estorno",
    )
    return markers.any { text.contains(it) }
  }
}
