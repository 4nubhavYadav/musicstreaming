package com.sora.audio.player

import android.content.Context
import androidx.media3.datasource.DefaultHttpDataSource
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.withTimeoutOrNull
import java.util.concurrent.ConcurrentHashMap

/**
 * Manages stream URL expiration and web-layer bridge resolution
 */
object StreamUrlManager {
    private const val RESOLUTION_TIMEOUT_MS = 6000L
    private const val EXPIRY_THRESHOLD_MS = 60_000L // 60 seconds

    // Pending URL requests waiting for provideUrl from web
    private val pendingRequests = ConcurrentHashMap<String, CompletableDeferred<Pair<String, Long>>>()

    // Callback invoked when the native player needs a fresh URL from JS
    var onNeedUrlListener: ((videoId: String) -> Unit)? = null

    /**
     * Create an ExoPlayer DefaultHttpDataSource.Factory configured with headers matching InnerTube expectations
     */
    fun createHttpDataSourceFactory(context: Context): DefaultHttpDataSource.Factory {
        val userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        return DefaultHttpDataSource.Factory()
            .setUserAgent(userAgent)
            .setAllowCrossProtocolRedirects(true)
            .setConnectTimeoutMs(10000)
            .setReadTimeoutMs(20000)
    }

    /**
     * Called by SoraPlayerPlugin when web layer provides a resolved URL
     */
    fun onUrlProvided(videoId: String, url: String, expiryMs: Long) {
        val deferred = pendingRequests.remove(videoId)
        deferred?.complete(Pair(url, expiryMs))
    }

    /**
     * Check if item needs URL refresh and request it from web if needed
     */
    suspend fun ensureValidStreamUrl(item: QueueItem): Boolean {
        if (item.streamUrl.isNotBlank() && !item.isExpiredOrExpiringSoon(EXPIRY_THRESHOLD_MS)) {
            return true
        }

        // Needs fresh URL from web
        val deferred = CompletableDeferred<Pair<String, Long>>()
        pendingRequests[item.videoId] = deferred

        // Notify JS layer
        onNeedUrlListener?.invoke(item.videoId)

        // Wait with timeout
        val result = withTimeoutOrNull(RESOLUTION_TIMEOUT_MS) {
            deferred.await()
        }

        pendingRequests.remove(item.videoId)

        return if (result != null && result.first.isNotBlank()) {
            item.streamUrl = result.first
            item.expiry = result.second
            true
        } else {
            item.streamUrl = "https://yt.chocolatemoo53.com/latest_version?id=${item.videoId}&itag=140&local=true"
            item.expiry = System.currentTimeMillis() + 6 * 3600 * 1000L
            true
        }
    }
}
