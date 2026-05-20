package com.financego.mobile

import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.service.notification.NotificationListenerService

class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    if (intent?.action != Intent.ACTION_BOOT_COMPLETED) return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      NotificationListenerService.requestRebind(ComponentName(context, FinanceNotificationListener::class.java))
    }
  }
}
