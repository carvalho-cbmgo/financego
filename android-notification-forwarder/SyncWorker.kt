package com.example.financeforwarder

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class SyncWorker(appContext: Context, workerParams: WorkerParameters) : Worker(appContext, workerParams) {
    private val endpoint = "https://SEU_APP.vercel.app/api/notifications/batch"
    private fun deviceToken(): String = SecureTokenStore.get(applicationContext)

    override fun doWork(): Result {
        val queue = OfflineQueue(applicationContext)
        val items = queue.readBatch(100)

        if (items.length() == 0) return Result.success()

        val payload = JSONObject().apply {
            put("deviceId", android.os.Build.MODEL)
            put("items", items)
        }

        return try {
            val conn = URL(endpoint).openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("x-device-token", deviceToken())
            conn.doOutput = true

            OutputStreamWriter(conn.outputStream).use { it.write(payload.toString()) }

            val code = conn.responseCode
            conn.disconnect()

            if (code in 200..299) {
                queue.clear()
                Result.success()
            } else {
                Result.retry()
            }
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
