package com.financego.mobile

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant

class NotificationOutbox(context: Context) {
  data class FlushResult(val sent: Int, val failed: Int, val remaining: Int, val lastError: String = "")

  private val prefs = context.applicationContext.getSharedPreferences("financego_notification_outbox", Context.MODE_PRIVATE)

  fun count(): Int = readArray().length()

  fun enqueue(payload: JSONObject) {
    val current = readList().toMutableList()
    val notificationId = payload.optString("notificationId")
    if (notificationId.isNotBlank() && current.any { it.optString("notificationId") == notificationId }) return

    current.add(JSONObject(payload.toString()).apply {
      if (!has("queuedAt")) put("queuedAt", Instant.now().toString())
    })

    saveList(current.takeLast(MAX_PENDING_NOTIFICATIONS))
  }

  fun flush(api: FinanceGoApi, store: SessionStore): FlushResult {
    if (!store.isLoggedIn()) return FlushResult(sent = 0, failed = 0, remaining = count())

    val pending = readList()
    if (pending.isEmpty()) return FlushResult(sent = 0, failed = 0, remaining = 0)

    var sent = 0
    var failed = 0
    var lastError = ""
    val remaining = mutableListOf<JSONObject>()

    for (payload in pending) {
      try {
        val response = api.sendNotification(payload)
        sent++
        store.lastNotificationSendAt = Instant.now().toString()
        store.lastNotificationSendStatus = if (response.optBoolean("parsed", false)) {
          "Pendente reenviada e transformada em transação: ${response.optString("description", "sem descrição")}"
        } else {
          "Pendente reenviada, mas não gerou transação automática."
        }
        store.lastNotificationError = ""
      } catch (error: Exception) {
        failed++
        lastError = error.message ?: "Erro desconhecido no reenvio da notificação."
        remaining.add(payload)
      }
    }

    saveList(remaining)
    if (failed > 0) {
      store.lastNotificationError = lastError
      store.lastNotificationSendStatus = "Há $failed notificação(ões) pendente(s) para reenviar."
      store.lastNotificationSendAt = Instant.now().toString()
    }

    return FlushResult(sent = sent, failed = failed, remaining = remaining.size, lastError = lastError)
  }

  private fun readArray(): JSONArray {
    val raw = prefs.getString(KEY_PENDING, "[]") ?: "[]"
    return try {
      JSONArray(raw)
    } catch (_: Exception) {
      JSONArray()
    }
  }

  private fun readList(): List<JSONObject> {
    val arr = readArray()
    return (0 until arr.length()).mapNotNull { index -> arr.optJSONObject(index) }
  }

  private fun saveList(items: List<JSONObject>) {
    val arr = JSONArray()
    items.forEach { arr.put(it) }
    prefs.edit().putString(KEY_PENDING, arr.toString()).apply()
  }

  companion object {
    private const val KEY_PENDING = "pending_notifications"
    private const val MAX_PENDING_NOTIFICATIONS = 100
  }
}
