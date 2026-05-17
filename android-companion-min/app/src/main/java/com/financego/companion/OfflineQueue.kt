package com.financego.companion

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

class OfflineQueue(context: Context) {
  private val queueFile = File(context.filesDir, "financego_offline_notifications.jsonl")

  @Synchronized
  fun enqueue(payload: JSONObject) {
    queueFile.appendText(payload.toString() + "\n")
  }

  @Synchronized
  fun readBatch(limit: Int = 120): JSONArray {
    val jsonArray = JSONArray()
    if (!queueFile.exists()) return jsonArray

    queueFile.readLines()
      .asSequence()
      .map { it.trim() }
      .filter { it.isNotEmpty() }
      .take(limit)
      .forEach { line ->
        runCatching { jsonArray.put(JSONObject(line)) }
      }

    return jsonArray
  }

  @Synchronized
  fun clear() {
    if (queueFile.exists()) queueFile.writeText("")
  }

  @Synchronized
  fun size(): Int {
    if (!queueFile.exists()) return 0
    return queueFile.readLines().count { it.isNotBlank() }
  }
}
