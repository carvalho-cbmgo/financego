package com.financego.companion

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters

class SyncWorker(appContext: Context, workerParams: WorkerParameters) : Worker(appContext, workerParams) {
  override fun doWork(): Result {
    val config = CompanionPrefs.load(applicationContext)
    val token = SecureTokenStore.get(applicationContext)
    val queue = OfflineQueue(applicationContext)

    if (config.baseUrl.isBlank() || token.isBlank()) return Result.success()

    val items = queue.readBatch(120)
    if (items.length() == 0) return Result.success()

    val sent = NotificationApi.sendBatch(
      baseUrl = config.baseUrl,
      deviceToken = token,
      devicePublicId = config.devicePublicId,
      items = items,
    )

    return if (sent) {
      queue.clear()
      Result.success()
    } else {
      Result.retry()
    }
  }
}
