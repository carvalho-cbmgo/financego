package com.financego.mobile

import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class FinanceGoApi(private val store: SessionStore) {
  fun login(email: String, password: String): JSONObject {
    val body = JSONObject()
      .put("email", email)
      .put("password", password)
    val response = request("POST", "/api/android/login", body, authenticated = false)
    val user = response.optJSONObject("user")
    store.accessToken = response.optString("access_token")
    store.userEmail = user?.optString("email") ?: email
    store.fullName = user?.optString("full_name") ?: ""
    return response
  }

  fun bootstrap(): JSONObject = request("GET", "/api/android/bootstrap", null, authenticated = true)

  fun saveTransaction(payload: JSONObject): JSONObject =
    request("POST", "/api/android/transactions/save", payload, authenticated = true)

  fun sendNotification(payload: JSONObject): JSONObject =
    request("POST", "/api/android/notifications/ingest", payload, authenticated = true)

  private fun request(method: String, path: String, body: JSONObject?, authenticated: Boolean): JSONObject {
    val base = store.baseUrl.trim().trimEnd('/')
    val conn = (URL(base + path).openConnection() as HttpURLConnection).apply {
      requestMethod = method
      connectTimeout = 15_000
      readTimeout = 20_000
      setRequestProperty("Accept", "application/json")
      if (authenticated) setRequestProperty("Authorization", "Bearer ${store.accessToken}")
      if (body != null) {
        doOutput = true
        setRequestProperty("Content-Type", "application/json; charset=utf-8")
      }
    }

    if (body != null) {
      OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { it.write(body.toString()) }
    }

    val code = conn.responseCode
    val stream = if (code in 200..299) conn.inputStream else conn.errorStream
    val text = stream?.let {
      BufferedReader(InputStreamReader(it, Charsets.UTF_8)).use { reader -> reader.readText() }
    }.orEmpty()

    val json = if (text.isNotBlank()) JSONObject(text) else JSONObject()
    if (code !in 200..299) {
      throw IllegalStateException(json.optString("error", "Erro HTTP $code"))
    }

    return json
  }
}
