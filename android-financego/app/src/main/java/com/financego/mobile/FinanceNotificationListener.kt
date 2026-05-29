package com.financego.mobile

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONObject
import java.time.Instant
import java.util.concurrent.Executors

class FinanceNotificationListener : NotificationListenerService() {
  private val executor = Executors.newSingleThreadExecutor()

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    val store = SessionStore(applicationContext)
    if (!store.isLoggedIn()) return

    val extras = sbn.notification.extras
    val appName = resolveAppName(sbn.packageName)
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
      try {
        val response = FinanceGoApi(store).sendNotification(payload)
        store.lastNotificationSendAt = Instant.now().toString()
        store.lastNotificationSendStatus = if (response.optBoolean("parsed", false)) {
          "Enviado e transformado em transação: ${response.optString("description", "sem descrição")}"
        } else {
          "Enviado, mas não gerou transação automática."
        }
        store.lastNotificationError = ""
      } catch (error: Exception) {
        store.lastNotificationSendAt = Instant.now().toString()
        store.lastNotificationSendStatus = "Falha ao enviar para o Finance GO."
        store.lastNotificationError = error.message ?: "Erro desconhecido no envio da notificação."
      }
    }
  }

  private fun looksFinancial(packageName: String, appName: String, text: String): Boolean {
    val source = "$packageName $appName $text".lowercase()
    val knownBank = Regex(
      "nu\\.production|nubank|nu bank|\\bnu\\b|caixa|caixatem|caixa tem|br\\.com\\.gabba|gov\\.caixa|btg|btgpactual|btg pactual|pactual|itau|itaú|bradesco|santander|bancointer|inter|c6bank|c6 bank|mercado pago|mercadopago|picpay|banco do brasil|bb"
    ).containsMatchIn(source)
    val hasFinancialAction = Regex(
      "r\\$|brl|pix|compra|cart[aã]o|d[eé]bito|cr[eé]dito|transfer[eê]ncia|pagamento|recebido|recebida|enviado|enviada|aprovad|estorno|reembolso|fatura|boleto|saque|ted|doc|deposito|dep[oó]sito"
    ).containsMatchIn(source)

    if (!knownBank && !hasFinancialAction) {
      return false
    }

    return knownBank || Regex("pix|cart[aã]o|r\\$|brl|compra|transfer[eê]ncia|pagamento|estorno|reembolso").containsMatchIn(source)
  }

  private fun resolveAppName(packageName: String): String =
    try {
      val info = applicationContext.packageManager.getApplicationInfo(packageName, 0)
      applicationContext.packageManager.getApplicationLabel(info).toString()
    } catch (_: Exception) {
      packageName
    }
}
