package com.sora.audio.player

import android.net.Uri
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata

data class QueueItem(
    val videoId: String,
    val title: String,
    val artist: String,
    val artworkUrl: String,
    var streamUrl: String,
    var expiry: Long // Unix epoch timestamp in milliseconds
) {
    fun isExpiredOrExpiringSoon(thresholdMs: Long = 60_000L): Boolean {
        if (expiry <= 0) return false
        val now = System.currentTimeMillis()
        return now >= (expiry - thresholdMs)
    }

    fun toMediaItem(): MediaItem {
        val effectiveUrl = if (streamUrl.isNotBlank()) {
            streamUrl
        } else {
            "https://yt.chocolatemoo53.com/latest_version?id=${videoId}&itag=140&local=true"
        }

        val metadata = MediaMetadata.Builder()
            .setTitle(title)
            .setArtist(artist)
            .setArtworkUri(if (artworkUrl.isNotBlank()) Uri.parse(artworkUrl) else null)
            .build()

        return MediaItem.Builder()
            .setMediaId(videoId)
            .setUri(Uri.parse(effectiveUrl))
            .setMediaMetadata(metadata)
            .build()
    }
}
