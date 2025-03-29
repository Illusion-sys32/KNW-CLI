// BatteryChangeReceiver.kt
package com.example.TicTacToe.Events

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.BatteryManager
import android.util.Log
import android.webkit.WebView

class BatteryChangeReceiver(private val webView: WebView) : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        val level = intent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = intent?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        if (level != -1 && scale != -1 && scale != 0) {
            val batteryPct = (level * 100) / scale
            Log.d("BatteryChangeReceiver", "Battery level changed: $batteryPct%")
            // Dispatch a custom event in the WebView
            webView.post {
                webView.evaluateJavascript(
                    "document.dispatchEvent(new CustomEvent('batteryChange', { detail: { battery: $batteryPct } }));",
                    null
                )
            }
        }
    }
}
