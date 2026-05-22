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

  fun deleteTransaction(id: String, repeatScope: String): JSONObject {
    val body = JSONObject()
      .put("id", id)
      .put("repeat_scope", repeatScope)
    return request("POST", "/api/android/transactions/delete", body, authenticated = true)
  }

  fun saveAccount(payload: JSONObject): JSONObject =
    request("POST", "/api/android/accounts/save", payload, authenticated = true)

  fun deleteAccount(id: String): JSONObject {
    val body = JSONObject().put("id", id)
    return request("POST", "/api/android/accounts/delete", body, authenticated = true)
  }

  fun saveBank(payload: JSONObject): JSONObject =
    request("POST", "/api/android/banks/save", payload, authenticated = true)

  fun deleteBank(id: String): JSONObject {
    val body = JSONObject().put("id", id)
    return request("POST", "/api/android/banks/delete", body, authenticated = true)
  }

  fun sendNotification(payload: JSONObject): JSONObject =
    request("POST", "/api/android/notifications/ingest", payload, authenticated = true)

  fun updateProfile(fullName: String): JSONObject {
    val body = JSONObject().put("full_name", fullName)
    val response = request("POST", "/api/profile/update", body, authenticated = true)
    store.fullName = response.optString("full_name", fullName)
    return response
  }

  private fun request(method: String, path: String, body: JSONObject?, authenticated: Boolean): JSONObject {
    val base = store.baseUrl.trim().trimEnd('/')
    val conn = try {
      URL(base + path).openConnection() as HttpURLConnection
    } catch (error: Exception) {
      throw IllegalStateException("URL do Finance GO inválida: $base")
    }.apply {
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

    val code = try {
      conn.responseCode
    } catch (error: Exception) {
      throw IllegalStateException("Não foi possível conectar ao Finance GO em $base. Verifique a internet e a URL do Vercel.")
    }
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
