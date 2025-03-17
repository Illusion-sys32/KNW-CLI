const fs = require("fs");
const path = require("path");
const readline = require("readline/promises");
const chalk = require("chalk").default;

console.log(chalk.blue("Initializing K.W.N CLI..."));

async function init() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    let AppName = await rl.question(chalk.yellow("Enter the name of your app: "));
    if (!AppName.trim()) {
        console.log(chalk.red("Please enter a valid name."));
        rl.close();
        return;
    }

    let AppPath = await rl.question(chalk.yellow("Enter the path of your app: "));
    if (!AppPath.trim()) {
        console.log(chalk.red("Please enter a valid path."));
        rl.close();
        return;
    }

    if (AppPath === ".") {
        AppPath = process.cwd();
    } else if (AppPath === "..") {
        AppPath = path.join(process.cwd(), "..");
    } else if (!fs.existsSync(AppPath)) {
        console.log(chalk.red("Path does not exist."));
        rl.close();
        return;
    }

    console.log(chalk.green(`App Name: ${AppName}`));
    console.log(chalk.green(`App Path: ${path.join(AppPath, AppName)}`));
    let confirm = await rl.question(chalk.yellow("Is this correct? (y/n): "));
    if (confirm.toLowerCase() !== "y") {
        rl.close();
        console.log(chalk.red("Exiting..."));
        return;
    }

    rl.close();
    console.log(chalk.blue("Creating app..."));
    createWorkSpace(AppName, AppPath);
}

async function createWorkSpace(AppName, AppPath) {
    console.log(chalk.blue("Setting up the project structure..."));
    const appPath = path.join(AppPath, AppName);

    try {
        // Create main project folder and a main.js file (for your CLI, if needed)
        fs.mkdirSync(appPath, { recursive: true });
        const mainFile = path.join(appPath, "main.js");
        fs.writeFileSync(mainFile, "// Main Entry File\nconsole.log('App Initialized');");

        // Create the Android project root inside the "android" folder
        const androidPath = path.join(appPath, "android");
        fs.mkdirSync(androidPath, { recursive: true });
        // ---------------------------
        // Json file
        // ---------------------------
        const projectPackageJson = {
            "name": AppName,
            "version": "1.0.0",
            "description": "My new K.W.N app",
            "scripts": {
              "start": "http-server ./src -p 8081",
              "android": "node ./scripts/launch-avd.js",
              "build": "cd android && gradlew.bat assembleDebug"

            },
            "dependencies": {},
            "devDependencies": {
              "http-server": "^14.1.1"
            }
          };
          
          fs.writeFileSync(
            path.join(appPath, "package.json"),
            JSON.stringify(projectPackageJson, null, 2)
          );
        /////
        // lunch avd script
        /////
        const lunchAvd = fs.readFileSync(path.join(__dirname, "lunch-avd.js"), "utf8");
        console.log(lunchAvd);
        fs.mkdirSync(path.join(appPath, "scripts"), { recursive: true });
        fs.writeFileSync(path.join(appPath, "scripts", "launch-avd.js"), lunchAvd);

        // --------------------------------
        // Project-level Gradle configuration
        // --------------------------------

        // Top-level build.gradle (project build script)
        const projectBuildGradleFile = path.join(androidPath, "build.gradle");
        fs.writeFileSync(
            projectBuildGradleFile,
`buildscript {
    ext.kotlin_version = '1.8.21' // or your desired Kotlin version
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.6.1'
        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version"

    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

`
        );

        // settings.gradle that includes the app module
        const settingsGradleFile = path.join(androidPath, "settings.gradle");
        fs.writeFileSync(settingsGradleFile, "include ':app'");

        // Create gradle.properties (enabling AndroidX)
        const gradlePropertiesFile = path.join(androidPath, "gradle.properties");
        fs.writeFileSync(gradlePropertiesFile,
`android.useAndroidX=true
android.enableJetifier=true
`);

        // Create local.properties file (update sdk.dir if needed)
        const localPropertiesFile = path.join(androidPath, "local.properties");
        fs.writeFileSync(localPropertiesFile,
`sdk.dir=C\\:\\\\Users\\\\USER\\\\AppData\\\\Local\\\\Android\\\\Sdk
`);

        // --------------------------------
        // Gradle Wrapper files (minimal version)
        // --------------------------------

        // Create the gradle/wrapper directory
        const gradleWrapperDir = path.join(androidPath, "gradle", "wrapper");
        fs.mkdirSync(gradleWrapperDir, { recursive: true });

        // gradle-wrapper.properties file
        const gradleWrapperProperties = path.join(gradleWrapperDir, "gradle-wrapper.properties");
        fs.writeFileSync(
            gradleWrapperProperties,
`distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.7-all.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`
        );

        // Create a placeholder for gradle-wrapper.jar (a real binary jar should be generated via "gradle wrapper")
        const gradleWrapperJar = path.join(gradleWrapperDir, "gradle-wrapper.jar");
        fs.copyFileSync(path.join(__dirname, "gradle-wrapper.jar"), gradleWrapperJar);
        // Create the gradlew scripts
        const gradlewUnix = path.join(androidPath, "gradlew");
        const gradlewBat = path.join(androidPath, "gradlew.bat");
        const gradlewUnixContent = `#!/usr/bin/env sh
if [ -z "$JAVA_HOME" ]; then
  echo "JAVA_HOME is not set."
  exit 1
fi
exec "$JAVA_HOME/bin/java" -jar "$(dirname "$0")/gradle/wrapper/gradle-wrapper.jar" "$@"`;
        fs.writeFileSync(gradlewUnix, gradlewUnixContent, { mode: 0o755 });
        const gradlewBatContent = `@echo off
if not defined JAVA_HOME (
  echo JAVA_HOME is not set.
  exit /b 1
)
"%JAVA_HOME%\\bin\\java" -jar "%~dp0\\gradle\\wrapper\\gradle-wrapper.jar" %*`;
        fs.writeFileSync(gradlewBat, gradlewBatContent);

        // --------------------------------
        // App module structure ("app" folder)
        // --------------------------------
        const androidAppPath = path.join(androidPath, "app");
        const androidSrcPath = path.join(androidAppPath, "src");
        const androidMainPath = path.join(androidSrcPath, "main");
        // Create Kotlin package directory using the app name (e.g., com/example/AppName)
        const kotlinPath = path.join(androidMainPath, "kotlin", "com", "example", AppName);
        const resPath = path.join(androidMainPath, "res");
        const layoutPath = path.join(resPath, "layout");
        
        fs.mkdirSync(androidAppPath, { recursive: true });
        fs.mkdirSync(androidSrcPath, { recursive: true });
        fs.mkdirSync(androidMainPath, { recursive: true });
        fs.mkdirSync(kotlinPath, { recursive: true });
        fs.mkdirSync(resPath, { recursive: true });
        fs.mkdirSync(layoutPath, { recursive: true });
        fs.mkdirSync(path.join(androidMainPath, "assets"), { recursive: true });
        // Module-level build.gradle file for the app
        const moduleBuildGradleFile = path.join(androidAppPath, "build.gradle");
        fs.writeFileSync(
            moduleBuildGradleFile,
            `
apply plugin: 'com.android.application'
apply plugin: 'kotlin-android'
android {
    compileSdkVersion 34
    namespace "com.example.${AppName}"
    defaultConfig {
        applicationId "com.example.${AppName}"
        minSdkVersion 21
        targetSdkVersion 34
        versionCode 1
        versionName "1.0"
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).all {
    kotlinOptions {
        jvmTarget = '1.8'
    }
}
dependencies {
    implementation 'androidx.appcompat:appcompat:1.7.0'
    implementation 'androidx.core:core-ktx:1.10.1'
    // Add other dependencies as needed (e.g., material components)
    implementation 'com.google.android.material:material:1.12.0'
    implementation 'org.nanohttpd:nanohttpd:2.3.1'

}
`
        );

        // ProGuard rules file (even if empty)
        const proguardFile = path.join(androidAppPath, "proguard-rules.pro");
        fs.writeFileSync(proguardFile, "# Add your ProGuard rules here");

        // AndroidManifest.xml file
        const manifestFile = path.join(androidMainPath, "AndroidManifest.xml");
        fs.writeFileSync(
            manifestFile,
`<manifest package="com.example.${AppName}"
    xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <application
        android:allowBackup="true"
        android:label="${AppName}"
        android:usesCleartextTraffic="true"
        android:theme="@style/Theme.${AppName}">

        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`
        );

        // activity_main.xml layout
        const activityLayout = path.join(layoutPath, "activity_main.xml");
        fs.writeFileSync(
            activityLayout,
`<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:gravity="center"
    android:orientation="vertical">
    <WebView
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:id="@+id/webView"/>
</LinearLayout>
`
        );

        // MainActivity.kt file
        const mainActivityFile = path.join(kotlinPath, "MainActivity.kt");
        fs.writeFileSync(
            mainActivityFile,
`package com.example.${AppName}

import LocalHttpServer
import android.os.Bundle
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity
import com.example.${AppName}.R
import com.example.nativebridge.NativeBridgeModule
import java.io.IOException

class MainActivity : AppCompatActivity() {
    private var server: LocalHttpServer? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Start the local HTTP server on port 8080
        server = LocalHttpServer(this, 8080)
        try {
            server?.start()
        } catch (e: IOException) {
            e.printStackTrace()
        }

        // Configure and load the WebView with the local server URL
        val webView = findViewById<WebView>(R.id.webView)
        webView.settings.javaScriptEnabled = true
        webView.loadUrl("http://127.0.0.1:8080")
        webView.settings.javaScriptEnabled = true
        webView.addJavascriptInterface(NativeBridgeModule(this), "NativeBridge")

    }

    override fun onDestroy() {
        super.onDestroy()
        // Stop the server when the activity is destroyed
        server?.stop()
    }
}
`
        );
        fs.writeFileSync(path.join(kotlinPath, "LocalHttpServer.kt"),
`
import android.content.Context
import fi.iki.elonen.NanoHTTPD
import java.io.IOException

class LocalHttpServer(private val context: Context, port: Int) : NanoHTTPD(port) {

    override fun serve(session: IHTTPSession): Response {
        // Determine the requested file:
        val uri = session.uri
        // If the uri is "/" serve index.html, otherwise remove the leading '/'
        val fileName = if (uri == "/") "index.html" else uri.substring(1)

        // Determine mime type based on file extension:
        val mimeType = when {
            fileName.endsWith(".html") -> "text/html"
            fileName.endsWith(".css") -> "text/css"
            fileName.endsWith(".js") -> "application/javascript"
            fileName.endsWith(".png") -> "image/png"
            fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") -> "image/jpeg"
            else -> "text/plain"
        }

        return try {
            // Open the file from the assets folder
            val inputStream = context.assets.open(fileName)
            // Get the file size (if available) or just use -1
            val fileLength = try {
                inputStream.available().toLong()
            } catch (e: IOException) {
                -1L
            }
            newFixedLengthResponse(Response.Status.OK, mimeType, inputStream, fileLength)
        } catch (e: IOException) {
            newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "File not found: $fileName")
        }
    }
}

`);
        fs.writeFileSync(path.join(kotlinPath, "NativeBridgeModule.kt"),
        `package com.example.nativebridge

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.BatteryManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log
import android.webkit.JavascriptInterface
import android.widget.Toast

/**
 * מחלקה זו מספקת פונקציות native שיהיו זמינות מתוך JavaScript.
 */
class NativeBridgeModule(private val context: Context) {

    /**
     * buzz(duration: Int)
     * מתיז (מפעיל רטט) את המכשיר למשך הזמן הנתון במילישניות.
     */
    @JavascriptInterface
    fun buzz(duration: Int) {
        val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(duration.toLong(), VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            vibrator.vibrate(duration.toLong())
        }
    }

    /**
     * showToast(message: String, duration: Int)
     * מציג הודעת Toast על המסך.
     */
    @JavascriptInterface
    fun showToast(message: String, duration: Int) {
        val toastDuration = if (duration > 2) Toast.LENGTH_LONG else Toast.LENGTH_SHORT
        Toast.makeText(context, message, toastDuration).show()
    }

    /**
     * logMessage(message: String)
     * כותב הודעה ללוג (Logcat) לצורך דיבוג.
     */
    @JavascriptInterface
    fun logMessage(message: String) {
        Log.d("NativeBridgeModule", message)
    }

    /**
     * getBatteryLevel(): Int
     * מחזיר את רמת הסוללה באחוזים (0-100) או -1 אם לא נתמך.
     */
    @JavascriptInterface
    fun getBatteryLevel(): Int {
        val batteryManager = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        } else {
            -1
        }
    }

    /**
     * openURL(url: String)
     * פותח דפדפן עם כתובת ה-URL הנתונה.
     */
    @JavascriptInterface
    fun openURL(url: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(intent)
        } catch (e: Exception) {
            Log.e("NativeBridgeModule", "Error opening URL: $url", e)
        }
    }
}
`);
        // create res dir files
        fs.mkdirSync(path.join(resPath, "drawable"), { recursive: true });
        fs.mkdirSync(path.join(resPath, "drawable-v24"), { recursive: true });
        fs.mkdirSync(path.join(resPath, "layout"), { recursive: true });
        fs.mkdirSync(path.join(resPath, "mipmap-hdpi"), { recursive: true });
        fs.mkdirSync(path.join(resPath, "mipmap-mdpi"), { recursive: true });
        fs.mkdirSync(path.join(resPath, "mipmap-xhdpi"), { recursive: true });
        fs.mkdirSync(path.join(resPath, "mipmap-xxhdpi"), { recursive: true });
        fs.mkdirSync(path.join(resPath, "mipmap-xxxhdpi"), { recursive: true });
        fs.mkdirSync(path.join(resPath, "mipmap-anydpi-v26"), { recursive: true });
        fs.mkdirSync(path.join(resPath, "values"), { recursive: true });
        fs.mkdirSync(path.join(resPath, "values-night"), { recursive: true });
        fs.mkdirSync(path.join(resPath, "values"), { recursive: true });
        
        // write valuse files
        const valuesStylesFile = path.join(resPath, "values", "styles.xml");
        fs.writeFileSync(
            valuesStylesFile,
            `
<resources>
    <style name="Theme.${AppName}" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="colorPrimary">#fff</item>
        <item name="colorPrimaryDark">#121212</item>
        <item name="colorAccent">#f1f1f1</item>
    </style>
</resources>
            `)

        console.log(chalk.green("Android project setup completed successfully!"));
        console.log(chalk.blue("You can now open the 'android' folder in Android Studio."));
        console.log(chalk.yellow("Note: If you run into issues with the Gradle wrapper, run 'gradle wrapper' in the android directory to generate the proper gradle-wrapper.jar."));
    } catch (error) {
        console.error(chalk.red("Error creating app:"), error.message);
    }
    fs.mkdirSync(path.join(appPath, "ios"), { recursive: true });
    fs.mkdirSync(path.join(appPath, "web"), { recursive: true });
    fs.mkdirSync(path.join(appPath, "src"), { recursive: true });
    fs.mkdirSync(path.join(appPath, "src","assets"), { recursive: true });
    fs.writeFileSync(path.join(appPath, "src","index.html"), `
    <!DOCTYPE html>
    <html>
    <head>
        <title>My App</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="style.css">
    </head>
    <body>
            <h1>Hello, World!</h1>
    </body>
    </html>
    `);
    fs.writeFileSync(path.join(appPath, "src","style.css"), ``);
}

init();
