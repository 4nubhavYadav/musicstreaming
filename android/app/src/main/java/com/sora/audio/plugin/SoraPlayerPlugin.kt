package com.sora.audio.plugin

import android.Manifest
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.Build
import android.os.IBinder
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.google.common.util.concurrent.MoreExecutors
import com.sora.audio.player.QueueItem
import com.sora.audio.player.SoraAudioService
import com.sora.audio.player.SoraPlayerManager
import com.sora.audio.player.StreamUrlManager

@CapacitorPlugin(
    name = "SoraPlayer",
    permissions = [
        Permission(
            strings = [Manifest.permission.POST_NOTIFICATIONS],
            alias = "notifications"
        )
    ]
)
class SoraPlayerPlugin : Plugin() {

    private val BRIDGE_VERSION = 1

    private var playerManager: SoraPlayerManager? = null

    override fun load() {
        super.load()

        // Request notification permissions on Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (!hasPermission("notifications")) {
                requestPermissionForAlias("notifications", null, "notificationPermsCallback")
            }
        }

        startAndBindService()
    }

    private fun startAndBindService() {
        val context = activity?.applicationContext ?: context
        val intent = Intent(context, SoraAudioService::class.java)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }

        // Connect to SoraAudioService instance
        val sessionToken = SessionToken(context, ComponentName(context, SoraAudioService::class.java))
        val controllerFuture = MediaController.Builder(context, sessionToken).buildAsync()
        controllerFuture.addListener({
            try {
                attachToService()
            } catch (e: Exception) {
                // ignore
            }
        }, MoreExecutors.directExecutor())
    }

    private fun attachToService() {
        val service = SoraAudioService.instance
        if (service != null) {
            playerManager = service.playerManager
            setupEventListeners(service.playerManager)
        }
    }

    private fun ensureServiceReady(): Boolean {
        if (playerManager == null) {
            attachToService()
        }
        return playerManager != null
    }

    private fun setupEventListeners(manager: SoraPlayerManager) {
        manager.onStateChanged = { state, isPlaying ->
            val data = JSObject().apply {
                put("state", state)
                put("isPlaying", isPlaying)
            }
            notifyListeners("stateChanged", data)
        }

        manager.onPositionUpdate = { posMs, durMs ->
            val data = JSObject().apply {
                put("positionMs", posMs)
                put("durationMs", durMs)
            }
            notifyListeners("positionUpdate", data)
        }

        manager.onTrackChanged = { item, index, total ->
            val data = JSObject().apply {
                put("videoId", item.videoId)
                put("title", item.title)
                put("artist", item.artist)
                put("artworkUrl", item.artworkUrl)
                put("index", index)
                put("total", total)
            }
            notifyListeners("trackChanged", data)
        }

        manager.onQueueEnded = {
            notifyListeners("queueEnded", JSObject())
        }

        manager.onNeedMoreTracks = { remaining ->
            val data = JSObject().apply {
                put("remaining", remaining)
            }
            notifyListeners("needMoreTracks", data)
        }

        manager.onError = { message ->
            val data = JSObject().apply {
                put("message", message)
            }
            notifyListeners("error", data)
        }

        StreamUrlManager.onNeedUrlListener = { videoId ->
            val data = JSObject().apply {
                put("videoId", videoId)
            }
            notifyListeners("needUrl", data)
        }
    }

    @PluginMethod
    fun getBridgeVersion(call: PluginCall) {
        val res = JSObject().apply {
            put("version", BRIDGE_VERSION)
        }
        call.resolve(res)
    }

    @PluginMethod
    fun setQueue(call: PluginCall) {
        if (!ensureServiceReady()) {
            call.reject("Audio service not ready")
            return
        }

        val rawItems = call.getArray("items", JSArray()) ?: JSArray()
        val startIndex = call.getInt("startIndex", 0) ?: 0

        val parsedList = mutableListOf<QueueItem>()
        for (i in 0 until rawItems.length()) {
            val obj = rawItems.getJSONObject(i)
            parsedList.add(
                QueueItem(
                    videoId = obj.optString("videoId", ""),
                    title = obj.optString("title", "Unknown Title"),
                    artist = obj.optString("artist", "Unknown Artist"),
                    artworkUrl = obj.optString("artworkUrl", ""),
                    streamUrl = obj.optString("streamUrl", ""),
                    expiry = obj.optLong("expiry", 0L)
                )
            )
        }

        activity?.runOnUiThread {
            playerManager?.setQueue(parsedList, startIndex)
            call.resolve()
        }
    }

    @PluginMethod
    fun appendToQueue(call: PluginCall) {
        if (!ensureServiceReady()) {
            call.reject("Audio service not ready")
            return
        }

        val rawItems = call.getArray("items", JSArray()) ?: JSArray()
        val parsedList = mutableListOf<QueueItem>()
        for (i in 0 until rawItems.length()) {
            val obj = rawItems.getJSONObject(i)
            parsedList.add(
                QueueItem(
                    videoId = obj.optString("videoId", ""),
                    title = obj.optString("title", "Unknown Title"),
                    artist = obj.optString("artist", "Unknown Artist"),
                    artworkUrl = obj.optString("artworkUrl", ""),
                    streamUrl = obj.optString("streamUrl", ""),
                    expiry = obj.optLong("expiry", 0L)
                )
            )
        }

        activity?.runOnUiThread {
            playerManager?.appendToQueue(parsedList)
            call.resolve()
        }
    }

    @PluginMethod
    fun play(call: PluginCall) {
        if (!ensureServiceReady()) {
            call.reject("Audio service not ready")
            return
        }
        activity?.runOnUiThread {
            playerManager?.play()
            call.resolve()
        }
    }

    @PluginMethod
    fun pause(call: PluginCall) {
        if (!ensureServiceReady()) {
            call.reject("Audio service not ready")
            return
        }
        activity?.runOnUiThread {
            playerManager?.pause()
            call.resolve()
        }
    }

    @PluginMethod
    fun seekTo(call: PluginCall) {
        if (!ensureServiceReady()) {
            call.reject("Audio service not ready")
            return
        }
        val ms = call.getLong("ms") ?: (call.getDouble("ms")?.toLong() ?: 0L)
        activity?.runOnUiThread {
            playerManager?.seekTo(ms)
            call.resolve()
        }
    }

    @PluginMethod
    fun next(call: PluginCall) {
        if (!ensureServiceReady()) {
            call.reject("Audio service not ready")
            return
        }
        activity?.runOnUiThread {
            playerManager?.next()
            call.resolve()
        }
    }

    @PluginMethod
    fun previous(call: PluginCall) {
        if (!ensureServiceReady()) {
            call.reject("Audio service not ready")
            return
        }
        activity?.runOnUiThread {
            playerManager?.previous()
            call.resolve()
        }
    }

    @PluginMethod
    fun getState(call: PluginCall) {
        val manager = playerManager
        if (manager == null) {
            val empty = JSObject().apply {
                put("isPlaying", false)
                put("currentPosition", 0L)
                put("duration", 0L)
                put("currentIndex", -1)
            }
            call.resolve(empty)
            return
        }

        val currentItem = manager.getCurrentQueueItem()
        val trackObj = if (currentItem != null) {
            JSObject().apply {
                put("videoId", currentItem.videoId)
                put("title", currentItem.title)
                put("artist", currentItem.artist)
                put("artworkUrl", currentItem.artworkUrl)
            }
        } else null

        val res = JSObject().apply {
            put("isPlaying", manager.player.isPlaying)
            put("currentPosition", manager.player.currentPosition)
            put("duration", manager.player.duration)
            put("currentIndex", manager.player.currentMediaItemIndex)
            put("currentTrack", trackObj)
        }
        call.resolve(res)
    }

    @PluginMethod
    fun provideUrl(call: PluginCall) {
        val videoId = call.getString("videoId") ?: ""
        val url = call.getString("url") ?: ""
        val expiry = call.getLong("expiry") ?: 0L

        StreamUrlManager.onUrlProvided(videoId, url, expiry)
        call.resolve()
    }
}
