package com.example.LocalHttpServer

import android.content.Context
import fi.iki.elonen.NanoHTTPD
import java.io.File
import java.io.IOException

class LocalHttpServer(
    private val context: Context,
    port: Int,
    // אם baseDir קיים – אנחנו במצב hot reload (development)
    // אחרת נטעין ישירות מה-assets (production)
    private val baseDir: File? = null
) : NanoHTTPD(port) {

    override fun serve(session: IHTTPSession): Response {
        val uri = session.uri
        val fileName = if (uri == "/") "index.html" else uri.substring(1)

        val mimeType = when {
            fileName.endsWith(".html") -> "text/html"
            fileName.endsWith(".css") -> "text/css"
            fileName.endsWith(".js") -> "application/javascript"
            fileName.endsWith(".png") -> "image/png"
            fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") -> "image/jpeg"
            else -> "text/plain"
        }

        val response: Response = if (baseDir != null) {
            val file = File(baseDir, fileName)
            if (file.exists()) {
                try {
                    val inputStream = file.inputStream()
                    newFixedLengthResponse(Response.Status.OK, mimeType, inputStream, file.length())
                } catch (e: IOException) {
                    newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "text/plain", "Error reading file: $fileName")
                }
            } else {
                newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "File not found: $fileName")
            }
        } else {
            try {
                val assetManager = context.assets
                val inputStream = assetManager.open("app/$fileName")
                newFixedLengthResponse(Response.Status.OK, mimeType, inputStream, inputStream.available().toLong())
            } catch (e: IOException) {
                newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Asset not found: $fileName")
            }
        }

        // הוספת כותרות למניעת קאש
        response.addHeader("Cache-Control", "no-cache, no-store, must-revalidate")
        response.addHeader("Pragma", "no-cache")
        response.addHeader("Expires", "0")
        response.addHeader("Connection", "close")
        return response
    }
}
