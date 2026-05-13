package com.example.financeforwarder

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

class OfflineQueue(private val context: Context) {
    private val file = File(context.filesDir, "offline_notifications.jsonl")

    fun enqueue(payload: JSONObject) {
        file.appendText(payload.toString() + "\n")
    }

    fun readBatch(limit: Int = 100): JSONArray {
        val array = JSONArray()
        if (!file.exists()) return array

        file.readLines().take(limit).forEach { line ->
            if (line.isNotBlank()) array.put(JSONObject(line))
        }

        return array
    }

    fun clear() {
        if (file.exists()) file.writeText("")
    }

    fun size(): Int {
        if (!file.exists()) return 0
        return file.readLines().count { it.isNotBlank() }
    }
}
