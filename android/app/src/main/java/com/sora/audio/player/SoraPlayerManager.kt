package com.sora.audio.player

import android.content.Context
import android.os.Handler
import android.os.Looper
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Core ExoPlayer and Queue Manager
 */
class SoraPlayerManager(private val context: Context) : Player.Listener {

    val player: ExoPlayer
    private val scope = CoroutineScope(Dispatchers.Main + Job())
    private val mainHandler = Handler(Looper.getMainLooper())

    val queue = CopyOnWriteArrayList<QueueItem>()
    var currentIndex: Int = -1
        private set

    // Bridge Event Callbacks
    var onStateChanged: ((state: String, isPlaying: Boolean) -> Unit)? = null
    var onPositionUpdate: ((positionMs: Long, durationMs: Long) -> Unit)? = null
    var onTrackChanged: ((item: QueueItem, index: Int, total: Int) -> Unit)? = null
    var onQueueEnded: (() -> Unit)? = null
    var onNeedMoreTracks: ((remaining: Int) -> Unit)? = null
    var onError: ((message: String) -> Unit)? = null

    private var positionTimerJob: Job? = null
    private var lastEmittedPositionMs = 0L
    private var consecutiveErrors = 0

    init {
        val httpDataSourceFactory = StreamUrlManager.createHttpDataSourceFactory(context)
        val mediaSourceFactory = DefaultMediaSourceFactory(httpDataSourceFactory)

        player = ExoPlayer.Builder(context)
            .setMediaSourceFactory(mediaSourceFactory)
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                    .setUsage(C.USAGE_MEDIA)
                    .build(),
                /* handleAudioFocus = */ true
            )
            .setHandleAudioBecomingNoisy(true)
            .setWakeMode(C.WAKE_MODE_LOCAL)
            .build()

        player.addListener(this)

        StreamUrlManager.onNeedUrlListener = { videoId ->
            // Triggered when an item needs URL resolution from web
        }
    }

    /**
     * Replace active queue and start playback at startIndex
     */
    fun setQueue(items: List<QueueItem>, startIndex: Int = 0) {
        queue.clear()
        queue.addAll(items)
        currentIndex = if (startIndex in 0 until items.size) startIndex else 0

        player.clearMediaItems()
        val mediaItems = items.map { it.toMediaItem() }
        player.setMediaItems(mediaItems, currentIndex, 0L)
        player.prepare()
        player.play()

        checkRemainingQueue()
    }

    /**
     * Append new tracks to the end of the existing queue
     */
    fun appendToQueue(newItems: List<QueueItem>) {
        if (newItems.isEmpty()) return
        queue.addAll(newItems)
        val mediaItems = newItems.map { it.toMediaItem() }
        player.addMediaItems(mediaItems)
    }

    fun play() {
        if (player.playbackState == Player.STATE_ENDED) {
            player.seekTo(0, 0L)
        }
        player.play()
    }

    fun pause() {
        player.pause()
    }

    fun seekTo(positionMs: Long) {
        player.seekTo(positionMs)
    }

    fun next() {
        if (player.hasNextMediaItem()) {
            player.seekToNextMediaItem()
        } else {
            onQueueEnded?.invoke()
        }
    }

    fun previous() {
        if (player.currentPosition > 3000L) {
            player.seekTo(0L)
        } else if (player.hasPreviousMediaItem()) {
            player.seekToPreviousMediaItem()
        }
    }

    fun getCurrentQueueItem(): QueueItem? {
        val idx = player.currentMediaItemIndex
        return if (idx in 0 until queue.size) queue[idx] else null
    }

    private fun checkRemainingQueue() {
        val total = queue.size
        val current = player.currentMediaItemIndex
        val remaining = total - (current + 1)
        if (remaining <= 3) {
            onNeedMoreTracks?.invoke(remaining)
        }
    }

    // --- Player.Listener Callbacks ---

    override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
        val newIndex = player.currentMediaItemIndex
        currentIndex = newIndex
        val currentItem = getCurrentQueueItem()

        if (currentItem != null) {
            onTrackChanged?.invoke(currentItem, newIndex, queue.size)

            // Phase 4: Proactively check if upcoming item needs a fresh URL
            scope.launch {
                StreamUrlManager.ensureValidStreamUrl(currentItem)
            }
        }

        checkRemainingQueue()
    }

    override fun onPlaybackStateChanged(playbackState: Int) {
        when (playbackState) {
            Player.STATE_BUFFERING -> {
                onStateChanged?.invoke("buffering", player.isPlaying)
                stopPositionTimer()
            }
            Player.STATE_READY -> {
                val stateStr = if (player.isPlaying) "playing" else "paused"
                onStateChanged?.invoke(stateStr, player.isPlaying)
                if (player.isPlaying) startPositionTimer() else stopPositionTimer()
            }
            Player.STATE_ENDED -> {
                onStateChanged?.invoke("ended", false)
                stopPositionTimer()
                onQueueEnded?.invoke()
            }
            Player.STATE_IDLE -> {
                onStateChanged?.invoke("idle", false)
                stopPositionTimer()
            }
        }
    }

    override fun onIsPlayingChanged(isPlaying: Boolean) {
        val stateStr = when (player.playbackState) {
            Player.STATE_BUFFERING -> "buffering"
            Player.STATE_READY -> if (isPlaying) "playing" else "paused"
            Player.STATE_ENDED -> "ended"
            else -> "idle"
        }
        onStateChanged?.invoke(stateStr, isPlaying)

        if (isPlaying) {
            consecutiveErrors = 0
            startPositionTimer()
        } else {
            stopPositionTimer()
        }
    }

    override fun onPlayerError(error: PlaybackException) {
        val msg = error.message ?: "Playback error"
        onError?.invoke(msg)

        consecutiveErrors++
        // Skip once on error to try recovering, but do not loop endlessly through queue
        if (consecutiveErrors <= 1 && player.hasNextMediaItem()) {
            mainHandler.postDelayed({
                try {
                    player.seekToNextMediaItem()
                } catch (e: Exception) {
                    // ignore
                }
            }, 1000L)
        } else {
            try {
                player.pause()
            } catch (e: Exception) {
                // ignore
            }
        }
    }

    // --- Position update throttled to ~1/sec ---

    private fun startPositionTimer() {
        stopPositionTimer()
        positionTimerJob = scope.launch {
            while (isActive) {
                val pos = player.currentPosition
                val dur = player.duration
                if (dur > 0 && Math.abs(pos - lastEmittedPositionMs) >= 800L) {
                    lastEmittedPositionMs = pos
                    onPositionUpdate?.invoke(pos, dur)
                }
                delay(1000L)
            }
        }
    }

    private fun stopPositionTimer() {
        positionTimerJob?.cancel()
        positionTimerJob = null
    }

    fun release() {
        stopPositionTimer()
        player.removeListener(this)
        player.release()
    }
}
