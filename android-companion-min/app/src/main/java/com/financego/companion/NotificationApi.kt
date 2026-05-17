package com.financego.companion

import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

object NotificationApi {
  fun sendIngest(baseUrl: String, deviceToken: String, payload: JSONObject): Boolean {
    if (baseUrl.isBlank() || deviceToken.isBlank()) return false
    return postJson(
      url = "$baseUrl/api/notifications/ingest",
      deviceToken = deviceToken,
      payload = payload,
    )
  }

  fun sendBatch(baseUrl: String, deviceToken: String, devicePublicId: String, items: JSONArray): Boolean {
    if (baseUrl.isBlank() || deviceToken.isBlank()) return false
    if (items.length() == 0) return true

    val payload = JSONObject().apply {
      put("deviceId", android.os.Build.MODEL)
      put("device_public_id", devicePublicId)
      put("items", items)
    }

    return postJson(
      url = "$baseUrl/api/notifications/batch",
      deviceToken = deviceToken,
      payload = payload,
    )
  }

  private fun postJson(url: String, deviceToken: String, payload: JSONObject): Boolean {
    val connection = URL(url).openConnection() as HttpURLConnection
    return try {
      connection.requestMethod = "POST"
      connection.connectTimeout = 12_000
      connection.readTimeout = 12_000
      connection.setRequestProperty("Content-Type", "application/json")
      connection.setRequestProperty("x-device-token", deviceToken)
      connection.doOutput = true

      OutputStreamWriter(connection.outputStream).use { writer ->
        writer.write(payload.toString())
      }

      val responseCode = connection.responseCode
      responseCode in 200..299
    } catch (_: Exception) {
      false
    } finally {
      connection.disconnect()
    }
  }
}
