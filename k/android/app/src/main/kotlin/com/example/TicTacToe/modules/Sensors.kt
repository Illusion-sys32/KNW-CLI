package com.example.nativebridge.modules

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log
import android.webkit.JavascriptInterface

class Sensors(private val context: Context) {

    @JavascriptInterface
    fun vibrate(duration: Int) {
        Log.d("Sensors", "vibrate called with duration: $duration")
        val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(duration.toLong(), VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            vibrator.vibrate(duration.toLong())
        }
    }

    // ניתן להוסיף פונקציות נוספות הקשורות לחיישנים כאן
}
