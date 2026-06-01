package com.financego.mobile

import android.app.Notification
import android.content.ComponentName
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONObject
import java.time.Instant
import java.util.concurrent.Executors

class FinanceNotificationListener : NotificationListenerService() {
  private val executor = Executors.newSingleThreadExecutor()

  override fun onListenerConnected() {
    val store = SessionStore(applicationContext)
    store.notificationListenerConnectedAt = Instant.now().toString()
    store.notificationListenerStatus = "Conectado e monitorando notificações."
    store.lastNotificationPendingCount = NotificationOutbox(applicationContext).count()
    NotificationRetryWorker.enqueue(applicationContext)
  }

  override fun onListenerDisconnected() {
    val store = SessionStore(applicationContext)
    store.notificationListenerDisconnectedAt = Instant.now().toString()
    store.notificationListenerStatus = "Desconectado pelo Android. Reativação solicitada automaticamente."

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      requestRebind(ComponentName(applicationContext, FinanceNotificationListener::class.java))
    }
  }

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    val store = SessionStore(applicationContext)
    if (!store.isLoggedIn()) return

    val extras = sbn.notification.extras
    val appName = resolveAppName(sbn.packageName)
    if (isIgnoredNotificationSource(sbn.packageName, appName)) return

    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
    val titleBig = extras.getCharSequence(Notification.EXTRA_TITLE_BIG)?.toString().orEmpty()
    val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty()
    val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString().orEmpty()
    val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString().orEmpty()
    val summaryText = extras.getCharSequence(Notification.EXTRA_SUMMARY_TEXT)?.toString().orEmpty()
    val infoText = extras.getCharSequence(Notification.EXTRA_INFO_TEXT)?.toString().orEmpty()
    val textLines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
      ?.mapNotNull { it?.toString()?.takeIf(String::isNotBlank) }
      ?: emptyList()
    val extraText = extras.keySet()
      .asSequence()
      .mapNotNull { key -> extras.get(key)?.toString()?.takeIf { it.isNotBlank() } }
      .joinToString(" | ")
      .take(900)
    val joined = listOf(appName, title, titleBig, text, bigText, subText, summaryText, infoText, textLines.joinToString(" "), extraText)
      .filter { it.isNotBlank() }
      .joinToString(" ")
      .lowercase()

    if (!looksFinancial(sbn.packageName, appName, joined)) return

    val capturedAt = Instant.now().toString()
    store.lastNotificationCapturedAt = capturedAt
    store.lastNotificationCapturedSummary = buildString {
      append(appName.ifBlank { sbn.packageName })
      if (title.isNotBlank()) append(" | ").append(title)
      if (titleBig.isNotBlank() && titleBig != title) append(" | ").append(titleBig)
      if (text.isNotBlank()) append(" | ").append(text)
      if (bigText.isNotBlank() && bigText != text) append(" | ").append(bigText)
      if (subText.isNotBlank()) append(" | ").append(subText)
      if (summaryText.isNotBlank()) append(" | ").append(summaryText)
      if (infoText.isNotBlank()) append(" | ").append(infoText)
      if (textLines.isNotEmpty()) append(" | ").append(textLines.joinToString(" | "))
    }.take(320)

    val payload = JSONObject()
      .put("packageName", sbn.packageName)
      .put("appName", appName.ifBlank { sbn.packageName })
      .put("title", title.ifBlank { titleBig })
      .put("text", text)
      .put("bigText", bigText)
      .put("subText", subText)
      .put("summaryText", summaryText)
      .put("infoText", infoText)
      .put("textLines", org.json.JSONArray(textLines))
      .put("extraText", extraText)
      .put("postedAt", java.time.Instant.ofEpochMilli(sbn.postTime).toString())
      .put("notificationId", "${sbn.packageName}:${sbn.id}:${sbn.postTime}")

    executor.execute {
      val outbox = NotificationOutbox(applicationContext)
      try {
        val response = FinanceGoApi(store).sendNotification(payload)
        store.lastNotificationSendAt = Instant.now().toString()
        store.lastNotificationSendStatus = if (response.optBoolean("parsed", false)) {
          "Enviado e transformado em transação: ${response.optString("description", "sem descrição")}"
        } else {
          "Enviado, mas não gerou transação automática."
        }
        store.lastNotificationPendingCount = outbox.count()
        store.lastNotificationError = ""
        NotificationRetryWorker.enqueue(applicationContext)
      } catch (error: Exception) {
        outbox.enqueue(payload)
        store.lastNotificationSendAt = Instant.now().toString()
        store.lastNotificationPendingCount = outbox.count()
        store.lastNotificationSendStatus = "Falha ao enviar para o Finance GO. Notificação salva para reenvio automático."
        store.lastNotificationError = error.message ?: "Erro desconhecido no envio da notificação."
        NotificationRetryWorker.enqueue(applicationContext)
      }
    }
  }

  private fun looksFinancial(packageName: String, appName: String, text: String): Boolean {
    val source = "$packageName $appName".lowercase()
    if (!isTrustedBankNotificationSource(source)) return false

    val content = "$source $text".lowercase()
    val hasFinancialAction = Regex(
      "r\\$|brl|\\d+[,.]\\d{2}|pix|compr|cart[aã]o|d[eé]bito|cr[eé]dito|transfer[eê]ncia|pagamento|recebido|recebida|enviado|enviada|aprovad|autorizad|estorno|reembolso|fatura|boleto|saque|ted|doc|deposito|dep[oó]sito|valor"
    ).containsMatchIn(content)

    return hasFinancialAction
  }

  private fun isTrustedBankNotificationSource(source: String): Boolean {
    return Regex(
      "nu\\.production|nubank|nu bank|\\bnu\\b|caixa|caixatem|caixa tem|br\\.com\\.gabba|gov\\.caixa|btg|btgpactual|btg pactual|pactual|portobank|porto bank|porto seguro bank|porto seguro cart[oõ]es?|porto cart[oõ]es?|itau|itaú|bradesco|santander|bancointer|banco inter|c6bank|c6 bank|mercado pago|mercadopago|picpay|banco do brasil|bb"
    ).containsMatchIn(source)
  }

  private fun isIgnoredNotificationSource(packageName: String, appName: String): Boolean {
    val source = "$packageName $appName".lowercase()
    return Regex("(^|\\s|\\.)com\\.whatsapp(\\.|\\s|$)|whatsapp|whats app").containsMatchIn(source)
  }

  private fun resolveAppName(packageName: String): String =
    try {
      val info = applicationContext.packageManager.getApplicationInfo(packageName, 0)
      applicationContext.packageManager.getApplicationLabel(info).toString()
    } catch (_: Exception) {
      packageName
    }
}
