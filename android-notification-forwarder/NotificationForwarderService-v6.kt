package com.example.financeforwarder

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

class NotificationForwarderService : NotificationListenerService() {
    private val endpoint = "https://SEU_APP.vercel.app/api/notifications/ingest"
    private fun deviceToken(): String = SecureTokenStore.get(applicationContext)

    private val allowedPackages = setOf(
        "com.nu.production",
        "br.com.bb.android",
        "com.itau",
        "br.com.bradesco",
        "br.com.santander",
        "com.picpay",
        "com.mercadopago.wallet",
        "com.c6bank.app"
    )

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val packageName = sbn.packageName ?: return
        if (!allowedPackages.contains(packageName)) return

        val extras = sbn.notification.extras
        val title = extras.getString(Notification.EXTRA_TITLE) ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ""

        if (!looksLikeTransaction("$title $text $bigText")) return

        val payload = JSONObject().apply {
            put("deviceId", android.os.Build.MODEL)
            put("packageName", packageName)
            put("appName", packageName)
            put("title", title)
            put("text", text)
            put("bigText", bigText)
            put("postedAt", java.time.Instant.ofEpochMilli(sbn.postTime).toString())
            put("notificationId", "${packageName}-${sbn.id}-${sbn.postTime}")
        }

        CoroutineScope(Dispatchers.IO).launch {
            val ok = send(payload)
            if (!ok) OfflineQueue(applicationContext).enqueue(payload)
        }
    }

    private fun looksLikeTransaction(content: String): Boolean {
        val lower = content.lowercase()
        return lower.contains("r$") &&
            (
                lower.contains("compra") ||
                lower.contains("pix") ||
                lower.contains("pagamento") ||
                lower.contains("débito") ||
                lower.contains("debito") ||
                lower.contains("crédito") ||
                lower.contains("credito") ||
                lower.contains("recebido") ||
                lower.contains("cartão") ||
                lower.contains("cartao") ||
                lower.contains("parcela") ||
                lower.contains("/")
            )
    }

    private fun send(payload: JSONObject): Boolean {
        return try {
            val conn = URL(endpoint).openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("x-device-token", deviceToken())
            conn.doOutput = true
            OutputStreamWriter(conn.outputStream).use { it.write(payload.toString()) }
            val code = conn.responseCode
            conn.disconnect()
            code in 200..299
        } catch (e: Exception) {
            false
        }
    }
}
