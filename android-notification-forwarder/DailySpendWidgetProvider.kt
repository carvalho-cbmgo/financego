package com.example.financeforwarder

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews

class DailySpendWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            val prefs = context.getSharedPreferences("finance_widget", Context.MODE_PRIVATE)
            val spentToday = prefs.getString("spent_today", "R$ 0,00")
            val pending = OfflineQueue(context).size()

            val views = RemoteViews(context.packageName, R.layout.daily_spend_widget).apply {
                setTextViewText(R.id.widget_title, "Gastos de hoje")
                setTextViewText(R.id.widget_amount, spentToday)
                setTextViewText(R.id.widget_pending, "Pendentes offline: $pending")
            }

            manager.updateAppWidget(appWidgetId, views)
        }
    }
}
