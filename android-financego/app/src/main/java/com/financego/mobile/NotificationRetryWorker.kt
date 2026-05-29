package com.financego.mobile

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.time.Instant
import java.util.concurrent.TimeUnit

class NotificationRetryWorker(
  context: Context,
  params: WorkerParameters,
) : Worker(context, params) {
  override fun doWork(): Result {
    val appContext = applicationContext
    val store = SessionStore(appContext)
    if (!store.isLoggedIn()) return Result.success()

    return try {
      val result = NotificationOutbox(appContext).flush(FinanceGoApi(store), store)
      store.lastNotificationRetryAt = Instant.now().toString()
      store.lastNotificationPendingCount = result.remaining

      if (result.remaining > 0 && result.failed > 0) Result.retry() else Result.success()
    } catch (error: Exception) {
      store.lastNotificationRetryAt = Instant.now().toString()
      store.lastNotificationError = error.message ?: "Erro desconhecido no worker de notificações."
      Result.retry()
    }
  }

  companion object {
    private const val UNIQUE_WORK_NAME = "financego_notification_retry"

    fun enqueue(context: Context) {
      val constraints = Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .build()

      val request = OneTimeWorkRequestBuilder<NotificationRetryWorker>()
        .setConstraints(constraints)
        .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
        .build()

      WorkManager
        .getInstance(context.applicationContext)
        .enqueueUniqueWork(UNIQUE_WORK_NAME, ExistingWorkPolicy.REPLACE, request)
    }
  }
}
