package com.financego.companion

import android.content.Context

data class CompanionConfig(
  val baseUrl: String,
  val devicePublicId: String,
  val deviceName: String,
)

object CompanionPrefs {
  private const val PREFS = "financego_companion_prefs"
  private const val KEY_BASE_URL = "base_url"
  private const val KEY_DEVICE_PUBLIC_ID = "device_public_id"
  private const val KEY_DEVICE_NAME = "device_name"

  fun load(context: Context): CompanionConfig {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    return CompanionConfig(
      baseUrl = prefs.getString(KEY_BASE_URL, "") ?: "",
      devicePublicId = prefs.getString(KEY_DEVICE_PUBLIC_ID, "") ?: "",
      deviceName = prefs.getString(KEY_DEVICE_NAME, android.os.Build.MODEL) ?: android.os.Build.MODEL,
    )
  }

  fun save(context: Context, config: CompanionConfig) {
    val normalizedBaseUrl = normalizeBaseUrl(config.baseUrl)
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY_BASE_URL, normalizedBaseUrl)
      .putString(KEY_DEVICE_PUBLIC_ID, config.devicePublicId.trim())
      .putString(KEY_DEVICE_NAME, config.deviceName.trim())
      .apply()
  }

  private fun normalizeBaseUrl(input: String): String {
    var value = input.trim()
    if (value.endsWith("/")) value = value.dropLast(1)
    return value
  }
}
