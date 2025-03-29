package com.example.k

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.os.Bundle
import android.content.IntentFilter
import com.example.TicTacToe.Events.BatteryChangeReceiver
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.annotation.RequiresApi
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import com.example.k.R
import com.example.LocalHttpServer.LocalHttpServer
import com.example.k.modules.WorldIntegration
import com.example.nativebridge.modules.Sensors
import com.example.nativebridge.modules.Sys
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.IOException

class MainActivity : AppCompatActivity() {

	private var server: LocalHttpServer? = null
	private val LOCATION_PERMISSION_REQUEST_CODE = 1001
	// Using hot reload in development mode (configure if needed)
	private val useHotReload: Boolean = true

	// WebView will be initialized after setContentView is called
	private lateinit var webView: WebView
	// Global variable for camera logic
	private lateinit var sysInstance: Sys
	// ViewModel to hold the WebView state across configuration changes
	private lateinit var viewModel: WebViewViewModel

	@RequiresApi(Build.VERSION_CODES.TIRAMISU)
	@SuppressLint("SetJavaScriptEnabled", "UnspecifiedRegisterReceiverFlag")
	override fun onCreate(savedInstanceState: Bundle?) {
		super.onCreate(savedInstanceState)
		setContentView(R.layout.activity_main)

		// Initialize ViewModel
		viewModel = ViewModelProvider(this).get(WebViewViewModel::class.java)

		// Initialize WebView
		webView = findViewById(R.id.webView)
		webView.settings.javaScriptEnabled = true
		webView.settings.cacheMode = WebSettings.LOAD_NO_CACHE
		webView.clearCache(true)

		// Setup WebChromeClient for logging console messages
		webView.webChromeClient = object : WebChromeClient() {
			override fun onConsoleMessage(message: ConsoleMessage): Boolean {
				Log.d("MainActivity", "${message.message()} -- From line ${message.lineNumber()} of ${message.sourceId()}")
				return true
			}
		}
		// Setup WebViewClient to handle loading errors
		webView.webViewClient = object : WebViewClient() {
			override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
				Log.e("WebView", "Error loading page: ${error?.description}")
				super.onReceivedError(view, request, error)
			}
		}

		// Add native JavaScript interfaces
		defNativeModules(webView)

		// Start local HTTP server
		server = LocalHttpServer(this, 8080)
		try {
			server?.start()
			Log.d("MainActivity", "Server started on port 8080")
		} catch (e: IOException) {
			Log.e("MainActivity", "Server failed to start", e)
			e.printStackTrace()
		}

		// Restore WebView state from the ViewModel if available; otherwise load the initial URL
		if (viewModel.webViewState != null) {
			webView.restoreState(viewModel.webViewState!!)
			Log.d("MainActivity", "Restored WebView state from ViewModel")
		} else {
			webView.post {
				webView.loadUrl("http://127.0.0.1:8080/index.html?t=" + System.currentTimeMillis())
			}
			Log.d("MainActivity", "Loaded initial URL")
		}

		// Uncomment and configure hot reload if needed
		/*
        if (useHotReload) {
            registerReceiver(reloadReceiver, IntentFilter("com.example.HOT_RELOAD"))
            // Additional hot reload setup (e.g. file observer) can be added here
        }
        */
	}

	override fun onPause() {
		super.onPause()
		// Save the current state of the WebView into the ViewModel
		val bundle = Bundle()
		webView.saveState(bundle)
		viewModel.webViewState = bundle
	}

	override fun onSaveInstanceState(outState: Bundle) {
		super.onSaveInstanceState(outState)
		webView.saveState(outState)
	}

	override fun onRestoreInstanceState(savedInstanceState: Bundle) {
		super.onRestoreInstanceState(savedInstanceState)
		webView.restoreState(savedInstanceState)
	}

	override fun onConfigurationChanged(newConfig: Configuration) {
		super.onConfigurationChanged(newConfig)
		// Adjust the WebView layout based on orientation without reloading the content
		webView.layoutParams = webView.layoutParams.apply {
			width = resources.displayMetrics.widthPixels
			height = resources.displayMetrics.heightPixels
		}
		webView.requestLayout()
	}

	/**
	 * Initialize and add native modules as JavaScript interfaces.
	 */
	private fun defNativeModules(webView: WebView?) {
		if (webView == null){ Log.e("MainActivity", "WebView is null"); return }
		sysInstance = Sys(this, this)
		webView.addJavascriptInterface(sysInstance, "sys")
		webView.addJavascriptInterface(Sensors(this), "sensors")
		webView.addJavascriptInterface(WorldIntegration(this), "WorldIntegration")
		Log.d("MainActivity", "Native modules initialized and added to WebView")

	}
	/////////////////////////
	// Events Logic Below //
	/////////////////////////
	private fun defEvents(webView: WebView?) {
		/////////////////////
		// Battery Change //
		///////////////////
		if (webView == null){ Log.e("MainActivity", "WebView is null"); return }
		val batteryChangeReceiver = BatteryChangeReceiver(webView)
		val intentFilter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
		registerReceiver(batteryChangeReceiver, intentFilter)

	}

	/////////////////////////////////
	// CAMERA LOGIC BELOW           //
	/////////////////////////////////
	override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
		super.onActivityResult(requestCode, resultCode, data)
		if (requestCode == Sys.CAMERA_INTENT_REQUEST_CODE && resultCode == Activity.RESULT_OK) {
			var imageBase64: String? = null

			// Case: Image saved to file
			if (sysInstance.currentPhotoPath != null) {
				val file = File(sysInstance.currentPhotoPath)
				if (file.exists()) {
					val bitmap = BitmapFactory.decodeFile(sysInstance.currentPhotoPath)
					imageBase64 = convertBitmapToBase64(bitmap)
				}
			} else {
				// Case: Image returned as a thumbnail in extras
				val extras = data?.extras
				val bitmap = extras?.get("data") as? Bitmap
				if (bitmap != null) {
					imageBase64 = convertBitmapToBase64(bitmap)
				}
			}

			imageBase64?.let {
				val dataUri = "data:image/jpeg;base64,$it"
				webView.evaluateJavascript("updateCameraPreview('$dataUri')", null)
			}
		}
	}

	// Helper function to convert a Bitmap to a Base64 string.
	private fun convertBitmapToBase64(bitmap: Bitmap): String {
		val outputStream = ByteArrayOutputStream()
		bitmap.compress(Bitmap.CompressFormat.JPEG, 100, outputStream)
		val byteArray = outputStream.toByteArray()
		return Base64.encodeToString(byteArray, Base64.NO_WRAP)
	}

	override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
		super.onRequestPermissionsResult(requestCode, permissions, grantResults)
		if (requestCode == LOCATION_PERMISSION_REQUEST_CODE) {
			if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
				// Location permission granted, proceed with functionality
			} else {
				Toast.makeText(this, "Location permission denied. In order to use this functionality, please grant it.", Toast.LENGTH_LONG).show()
			}
		}
	}

	override fun onDestroy() {
		server?.stop()
		super.onDestroy()
	}
}
