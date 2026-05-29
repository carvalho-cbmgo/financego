package com.financego.mobile

import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.service.notification.NotificationListenerService

class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    val action = intent?.action ?: return
    if (action != Intent.ACTION_BOOT_COMPLETED && action != Intent.ACTION_MY_PACKAGE_REPLACED) return

    val store = SessionStore(context)
    store.notificationListenerStatus = "Reativação solicitada após ${if (action == Intent.ACTION_BOOT_COMPLETED) "reinicialização" else "atualização"}."
    NotificationRetryWorker.enqueue(context)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      NotificationListenerService.requestRebind(ComponentName(context, FinanceNotificationListener::class.java))
    }
  }
}
