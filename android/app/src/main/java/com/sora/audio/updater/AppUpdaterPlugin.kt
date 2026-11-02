package com.sora.audio.updater

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

@CapacitorPlugin(name = "AppUpdater")
class AppUpdaterPlugin : Plugin() {

    private val scope = CoroutineScope(Dispatchers.IO + Job())

    @PluginMethod
    fun getInstalledVersion(call: PluginCall) {
        val context = context ?: return call.reject("No context available")
        try {
            val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            val versionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                packageInfo.longVersionCode
            } else {
                @Suppress("DEPRECATION")
                packageInfo.versionCode.toLong()
            }

            val res = JSObject().apply {
                put("versionCode", versionCode)
                put("versionName", packageInfo.versionName ?: "1.0")
                put("packageName", context.packageName)
            }
            call.resolve(res)
        } catch (e: Exception) {
            call.reject("Could not get version info: ${e.message}")
        }
    }

    @PluginMethod
    fun canRequestPackageInstalls(call: PluginCall) {
        val context = context ?: return call.reject("No context available")
        val canInstall = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.packageManager.canRequestPackageInstalls()
        } else {
            true
        }
        val res = JSObject().apply {
            put("canInstall", canInstall)
        }
        call.resolve(res)
    }

    @PluginMethod
    fun openInstallPermissionSettings(call: PluginCall) {
        val context = activity ?: context ?: return call.reject("No context available")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val intent = Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:${context.packageName}")
            )
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        }
        call.resolve()
    }

    @PluginMethod
    fun downloadAndInstallApk(call: PluginCall) {
        val apkUrl = call.getString("apkUrl")
        if (apkUrl.isNullOrBlank()) {
            call.reject("apkUrl is required")
            return
        }

        val context = context ?: return call.reject("No context available")

        scope.launch {
            try {
                val updatesDir = File(context.cacheDir, "updates")
                if (!updatesDir.exists()) updatesDir.mkdirs()

                val destinationFile = File(updatesDir, "sora-update.apk")
                if (destinationFile.exists()) destinationFile.delete()

                val url = URL(apkUrl)
                val connection = url.openConnection() as HttpURLConnection
                connection.connectTimeout = 15000
                connection.readTimeout = 30000
                connection.instanceFollowRedirects = true
                connection.connect()

                val fileLength = connection.contentLength
                val input = connection.inputStream
                val output = FileOutputStream(destinationFile)

                val data = ByteArray(8192)
                var total: Long = 0
                var count: Int
                var lastProgressPercent = -1

                while (input.read(data).also { count = it } != -1) {
                    total += count.toLong()
                    output.write(data, 0, count)

                    if (fileLength > 0) {
                        val progress = ((total * 100) / fileLength).toInt()
                        if (progress != lastProgressPercent) {
                            lastProgressPercent = progress
                            withContext(Dispatchers.Main) {
                                val progressObj = JSObject().apply {
                                    put("percent", progress)
                                    put("downloadedBytes", total)
                                    put("totalBytes", fileLength)
                                }
                                notifyListeners("downloadProgress", progressObj)
                            }
                        }
                    }
                }

                output.flush()
                output.close()
                input.close()
                connection.disconnect()

                withContext(Dispatchers.Main) {
                    notifyListeners("downloadComplete", JSObject())
                    launchSystemInstaller(context, destinationFile)
                    call.resolve()
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    call.reject("Download or installation failed: ${e.message}")
                }
            }
        }
    }

    private fun launchSystemInstaller(context: Context, apkFile: File) {
        val contentUri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            apkFile
        )

        val installIntent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(contentUri, "application/vnd.android.package-archive")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
        }

        context.startActivity(installIntent)
    }
}
