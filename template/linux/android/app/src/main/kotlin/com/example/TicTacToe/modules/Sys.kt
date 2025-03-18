package com.example.nativebridge.modules

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.net.Uri
import android.os.BatteryManager
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Log
import android.webkit.JavascriptInterface
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import java.io.File
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class Sys(private val context: Context ,private val activity: Activity) {

    @JavascriptInterface
    fun getBatteryLevel(): Int {
        val batteryManager = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        } else {
            -1
        }
    }

    // Camera Logic
    companion object {
        const val CAMERA_PERMISSION_REQUEST_CODE = 2001
        const val CAMERA_INTENT_REQUEST_CODE = 2002
    }
    var currentPhotoPath: String? = null
    /**
     * Opens the device camera.
     * @param saveImage A boolean indicating whether to save the captured image to the phone.
     * If true, the image will be saved; if false, the image is not saved.
     *
     * This method checks for CAMERA permission and requests it from the user if not already granted.
     */
    @JavascriptInterface
    fun openCamera(saveImage: Boolean) {
        Log.d("Sys", "openCamera: saveImage parameter = $saveImage")

        // Check for CAMERA permission
        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                activity,
                arrayOf(Manifest.permission.CAMERA),
                CAMERA_PERMISSION_REQUEST_CODE
            )
            Log.d("Sys", "Camera permission requested")
            return
        }

        val cameraIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        if (cameraIntent.resolveActivity(activity.packageManager) != null) {
            if (saveImage) {
                // Create a file to save the image
                val photoFile: File? = try {
                    createImageFile()
                } catch (ex: IOException) {
                    Log.e("Sys", "Error occurred while creating the File", ex)
                    null
                }
                // Continue only if the File was successfully created
                photoFile?.also {
                    val photoURI: Uri = FileProvider.getUriForFile(
                        activity,
                        "${activity.applicationContext.packageName}.fileprovider",
                        it
                    )
                    cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, photoURI)
                }
            }
            activity.startActivityForResult(cameraIntent, CAMERA_INTENT_REQUEST_CODE)
        } else {
            Log.e("Sys", "No camera application available")
        }
    }

    @Throws(IOException::class)
    private fun createImageFile(): File {
        // Create an image file name with timestamp
        val timeStamp: String = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        val storageDir: File? = activity.getExternalFilesDir(Environment.DIRECTORY_PICTURES)
        return File.createTempFile(
            "JPEG_${timeStamp}_", /* prefix */
            ".jpg",              /* suffix */
            storageDir           /* directory */
        ).apply {
            // Save a file path for later use if needed
            currentPhotoPath = absolutePath
        }
    }

    @JavascriptInterface
    fun getDarkTheme(): Boolean {
        val currentNightMode = context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
        return currentNightMode == Configuration.UI_MODE_NIGHT_YES
    }
}
