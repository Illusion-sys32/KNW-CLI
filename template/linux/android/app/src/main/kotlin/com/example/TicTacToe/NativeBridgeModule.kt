//package com.example.nativebridge
//
//import android.content.Context
//import android.util.Log
//import android.webkit.JavascriptInterface
//import com.example.nativebridge.modules.Sensors
//import com.example.nativebridge.modules.Sys
//
///**
// * NativeBridgeModule מרכז את הגישה לפונקציונליות השונות (מודולים)
// * ומנתב קריאות מ־JavaScript לפונקציות המתאימות.
// */
//class NativeBridgeModule(private val context: Context) {
//
//    /**
//     * קריאה דינמית למודולים:
//     * @param moduleName שם המודול (למשל, "sensors" או "sys")
//     * @param functionName שם הפונקציה במודול
//     * @param args רשימת פרמטרים (כמחרוזות)
//     * @return מחרוזת המכילה את התוצאה או הודעת שגיאה
//     *
//     * דוגמה לשימוש ב־JavaScript:
//     * NativeBridge.callFunction("sensors", "buzz", "1000");
//     * NativeBridge.callFunction("sys", "getBatteryLevel");
//     */
//    @JavascriptInterface
//    fun callFunction(moduleName: String, functionName: String, vararg args: String): String {
//        try {
//            return when (moduleName.lowercase()) {
//                "sensors" -> {
//                    when (functionName.lowercase()) {
//                        "buzz" -> {
//                            val duration = args.firstOrNull()?.toIntOrNull()
//                                ?: return "Parameter 'duration' is missing or invalid"
//                            Sensors.buzz(context, duration)
//                            "buzz executed"
//                        }
//                        // ניתן להוסיף פונקציות נוספות למודול sensors כאן
//                        else -> "Unknown function '$functionName' in sensors module"
//                    }
//                }
//                "sys" -> {
//                    when (functionName.lowercase()) {
//                        "getbatterylevel" -> {
//                            val level = Sys.getBatteryLevel(context)
//                            level.toString()
//                        }
//                        // ניתן להוסיף פונקציות נוספות למודול sys כאן
//                        else -> "Unknown function '$functionName' in sys module"
//                    }
//                }
//                else -> "Unknown module '$moduleName'"
//            }
//        } catch (e: Exception) {
//            Log.e("NativeBridgeModule", "Error in callFunction", e)
//            return "Error: ${e.message}"
//        }
//    }
//}
