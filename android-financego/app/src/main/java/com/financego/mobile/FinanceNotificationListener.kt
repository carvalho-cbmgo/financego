package com.financego.mobile

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONObject
import java.util.concurrent.Executors

class FinanceNotificationListener : NotificationListenerService() {
  private val executor = Executors.newSingleThreadExecutor()

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    val store = SessionStore(applicationContext)
    if (!store.isLoggedIn()) return

    val extras = sbn.notification.extras
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
    val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty()
    val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString().orEmpty()
    val joined = listOf(title, text, bigText).joinToString(" ").lowercase()

    if (!looksFinancial(joined)) return

    val payload = JSONObject()
      .put("packageName", sbn.packageName)
      .put("appName", sbn.packageName)
      .put("title", title)
      .put("text", text)
      .put("bigText", bigText)
      .put("postedAt", java.time.Instant.ofEpochMilli(sbn.postTime).toString())
      .put("notificationId", "${sbn.packageName}:${sbn.id}:${sbn.postTime}")

    executor.execute {
      try {
        FinanceGoApi(store).sendNotification(payload)
      } catch (_: Exception) {
        // A próxima notificação ou abertura do app fará nova tentativa operacional.
      }
    }
  }

  private fun looksFinancial(text: String): Boolean {
    if (!Regex("r\\$|pix|compra|cart[aã]o|d[eé]bito|cr[eé]dito|transfer[eê]ncia|pagamento|recebido").containsMatchIn(text)) {
      return false
    }

    return Regex("nubank|nu bank|itau|itaú|bradesco|santander|caixa|inter|c6|mercado pago|picpay|banco do brasil|bb|porto seguro|btg|pix|cart[aã]o").containsMatchIn(text)
  }
}
