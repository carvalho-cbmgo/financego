package com.financego.mobile

import android.content.Context

class SessionStore(context: Context) {
  private val prefs = context.getSharedPreferences("financego_session", Context.MODE_PRIVATE)

  var baseUrl: String
    get() = normalizeBaseUrl(prefs.getString("base_url", BuildConfig.DEFAULT_BASE_URL))
    set(value) = prefs.edit().putString("base_url", normalizeBaseUrl(value)).apply()

  var accessToken: String
    get() = prefs.getString("access_token", "") ?: ""
    set(value) = prefs.edit().putString("access_token", value).apply()

  var userEmail: String
    get() = prefs.getString("user_email", "") ?: ""
    set(value) = prefs.edit().putString("user_email", value).apply()

  var fullName: String
    get() = prefs.getString("full_name", "") ?: ""
    set(value) = prefs.edit().putString("full_name", value).apply()

  var lastNotificationCapturedAt: String
    get() = prefs.getString("last_notification_captured_at", "") ?: ""
    set(value) = prefs.edit().putString("last_notification_captured_at", value).apply()

  var lastNotificationCapturedSummary: String
    get() = prefs.getString("last_notification_captured_summary", "") ?: ""
    set(value) = prefs.edit().putString("last_notification_captured_summary", value).apply()

  var lastNotificationSendAt: String
    get() = prefs.getString("last_notification_send_at", "") ?: ""
    set(value) = prefs.edit().putString("last_notification_send_at", value).apply()

  var lastNotificationSendStatus: String
    get() = prefs.getString("last_notification_send_status", "") ?: ""
    set(value) = prefs.edit().putString("last_notification_send_status", value).apply()

  var lastNotificationError: String
    get() = prefs.getString("last_notification_error", "") ?: ""
    set(value) = prefs.edit().putString("last_notification_error", value).apply()

  fun isLoggedIn(): Boolean = accessToken.isNotBlank()

  fun migrateLegacyBaseUrl() {
    val current = prefs.getString("base_url", null)
    val normalized = normalizeBaseUrl(current)
    if (current == null || current.trim().trimEnd('/') != normalized) {
      prefs.edit().putString("base_url", normalized).apply()
    }
  }

  fun clear() {
    prefs.edit().clear().apply()
  }

  private fun normalizeBaseUrl(value: String?): String {
    val raw = value.orEmpty().trim().trimEnd('/')
    val withScheme = when {
      raw.isBlank() -> BuildConfig.DEFAULT_BASE_URL
      raw.startsWith("http://", ignoreCase = true) || raw.startsWith("https://", ignoreCase = true) -> raw
      else -> "https://$raw"
    }.trimEnd('/')

    return when (withScheme.lowercase()) {
      "https://app-financego.vercel.app",
      "http://app-financego.vercel.app" -> BuildConfig.DEFAULT_BASE_URL
      else -> withScheme
    }
  }
}
