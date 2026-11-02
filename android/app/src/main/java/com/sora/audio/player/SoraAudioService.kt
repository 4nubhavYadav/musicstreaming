package com.sora.audio.player

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.annotation.OptIn
import androidx.core.app.NotificationCompat
import androidx.media3.common.util.UnstableApi
import androidx.media3.session.DefaultMediaNotificationProvider
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import com.sora.audio.MainActivity

/**
 * Foreground MediaSessionService for persistent background audio playback
 */
class SoraAudioService : MediaSessionService() {

    private var mediaSession: MediaSession? = null
    lateinit var playerManager: SoraPlayerManager
        private set

    companion object {
        const val NOTIFICATION_CHANNEL_ID = "sora_media_playback_channel"
        const val NOTIFICATION_ID = 1001

        @Volatile
        var instance: SoraAudioService? = null
            private set
    }

    @OptIn(UnstableApi::class)
    override fun onCreate() {
        super.onCreate()
        instance = this

        createNotificationChannel()

        playerManager = SoraPlayerManager(applicationContext)

        // PendingIntent to launch main activity when notification is clicked
        val activityIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            activityIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        // Configure MediaSession
        mediaSession = MediaSession.Builder(this, playerManager.player)
            .setSessionActivity(pendingIntent)
            .build()

        // Notification Provider
        val notificationProvider = DefaultMediaNotificationProvider.Builder(applicationContext)
            .setChannelId(NOTIFICATION_CHANNEL_ID)
            .setNotificationId(NOTIFICATION_ID)
            .build()

        setMediaNotificationProvider(notificationProvider)
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
        return mediaSession
    }

    /**
     * Keep playing when activity is swiped away from recents
     */
    override fun onTaskRemoved(rootIntent: Intent?) {
        val player = mediaSession?.player
        if (player == null || !player.playWhenReady || player.mediaItemCount == 0 || player.playbackState == androidx.media3.common.Player.STATE_ENDED || player.playbackState == androidx.media3.common.Player.STATE_IDLE) {
            stopSelf()
        }
    }

    override fun onDestroy() {
        instance = null
        try {
            mediaSession?.run {
                player.release()
                release()
                mediaSession = null
            }
        } catch (e: Exception) {
            // ignore
        }
        try {
            if (::playerManager.isInitialized) {
                playerManager.release()
            }
        } catch (e: Exception) {
            // ignore
        }
        super.onDestroy()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "Sora Audio Playback",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Continuous media playback controls for Sora"
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }
}
