package com.financego.companion

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

object SecureTokenStore {
  private const val PREFS = "financego_companion_secure"
  private const val KEY_DEVICE_TOKEN = "device_token"

  fun save(context: Context, token: String) {
    prefs(context).edit().putString(KEY_DEVICE_TOKEN, token.trim()).apply()
  }

  fun get(context: Context): String {
    return prefs(context).getString(KEY_DEVICE_TOKEN, "") ?: ""
  }

  private fun prefs(context: Context) =
    EncryptedSharedPreferences.create(
      context,
      PREFS,
      MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
      EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
      EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )
}
