package com.financego.companion

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

object AppWorkScheduler {
  private const val PERIODIC_WORK_NAME = "financego_companion_periodic_sync"
  private const val ONE_TIME_WORK_NAME = "financego_companion_one_time_sync"

  fun ensurePeriodicSync(context: Context) {
    val constraints = Constraints.Builder()
      .setRequiredNetworkType(NetworkType.CONNECTED)
      .build()

    val periodicWork = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
      .setConstraints(constraints)
      .build()

    WorkManager.getInstance(context).enqueueUniquePeriodicWork(
      PERIODIC_WORK_NAME,
      ExistingPeriodicWorkPolicy.UPDATE,
      periodicWork,
    )
  }

  fun enqueueOneTimeSync(context: Context) {
    val constraints = Constraints.Builder()
      .setRequiredNetworkType(NetworkType.CONNECTED)
      .build()

    val request = OneTimeWorkRequestBuilder<SyncWorker>()
      .setConstraints(constraints)
      .build()

    WorkManager.getInstance(context).enqueueUniqueWork(
      ONE_TIME_WORK_NAME,
      ExistingWorkPolicy.KEEP,
      request,
    )
  }
}
