package com.financego.mobile

import android.content.Context

class SessionStore(context: Context) {
  private val prefs = context.getSharedPreferences("financego_session", Context.MODE_PRIVATE)

  var baseUrl: String
    get() = prefs.getString("base_url", BuildConfig.DEFAULT_BASE_URL) ?: BuildConfig.DEFAULT_BASE_URL
    set(value) = prefs.edit().putString("base_url", value.trim().trimEnd('/')).apply()

  var accessToken: String
    get() = prefs.getString("access_token", "") ?: ""
    set(value) = prefs.edit().putString("access_token", value).apply()

  var userEmail: String
    get() = prefs.getString("user_email", "") ?: ""
    set(value) = prefs.edit().putString("user_email", value).apply()

  var fullName: String
    get() = prefs.getString("full_name", "") ?: ""
    set(value) = prefs.edit().putString("full_name", value).apply()

  fun isLoggedIn(): Boolean = accessToken.isNotBlank()

  fun clear() {
    prefs.edit().clear().apply()
  }
}
