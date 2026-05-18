package com.financego.companion

import android.content.ComponentName
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
    "com.financego.companion",
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

  private val allowedPackagePrefixes = listOf(
    "com.financego.companion",
    "com.nu.production",
    "com.itau",
    "br.com.santander",
    "br.com.inter",
    "com.c6bank",
    "com.mercadopago",
  )

  override fun onListenerConnected() {
    super.onListenerConnected()
    AppWorkScheduler.enqueueOneTimeSync(applicationContext)
  }

  override fun onListenerDisconnected() {
    super.onListenerDisconnected()
    requestRebind(ComponentName(applicationContext, NotificationForwarderService::class.java))
  }

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    val packageName = sbn.packageName ?: return
    if (!isAllowedPackage(packageName)) return

    val config = CompanionPrefs.load(applicationContext)
    val token = SecureTokenStore.get(applicationContext)
    if (config.baseUrl.isBlank() || token.isBlank()) return

    val extras = sbn.notification.extras
    val title = extras.getString(Notification.EXTRA_TITLE) ?: ""
    val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
    val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ""
    val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString() ?: ""
    val infoText = extras.getCharSequence(Notification.EXTRA_INFO_TEXT)?.toString() ?: ""
    val textLines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
      ?.joinToString(" ") { it?.toString().orEmpty() }
      ?: ""
    val tickerText = sbn.notification.tickerText?.toString() ?: ""
    val fullText = listOf(title, text, bigText, subText, infoText, textLines, tickerText)
      .joinToString(" ")
      .replace("\\s+".toRegex(), " ")
      .trim()

    if (fullText.isBlank()) return
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

  private fun isAllowedPackage(packageName: String): Boolean {
    if (allowedPackages.contains(packageName)) return true

    val normalized = packageName.lowercase()
    if (allowedPackagePrefixes.any { normalized.startsWith(it) }) return true

    return normalized.contains("nubank")
      || normalized.contains("itau")
      || normalized.contains("bradesco")
      || normalized.contains("santander")
      || normalized.contains("inter")
      || normalized.contains("c6bank")
      || normalized.contains("mercadopago")
      || normalized.contains("picpay")
      || normalized.contains("bb.android")
      || normalized.contains("caixa")
      || normalized.contains("financego.companion")
  }

  private fun looksLikeFinancialEvent(content: String): Boolean {
    val text = content.lowercase()
    if (text.contains("codigo de acesso")
      || text.contains("codigo de seguranca")
      || text.contains("token de acesso")
      || text.contains("senha de uso unico")
      || text.contains("one time password")
      || text.contains("otp")
    ) {
      return false
    }

    val hasMoneyPattern = Regex("""(?:r\$|rs\$?)?\s*-?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})""").containsMatchIn(text)
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
    val hasMarker = markers.any { text.contains(it) }

    // Permite enviar notificacoes com valor monetario mesmo sem palavra-chave clara.
    return hasMoneyPattern || hasMarker
  }
}
