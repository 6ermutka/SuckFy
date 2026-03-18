package com.suckfy

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL

class MediaNotificationModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    private val context: ReactApplicationContext = reactContext
    private var mediaSession: MediaSessionCompat? = null
    private val CHANNEL_ID = "media_playback_channel"
    private val NOTIFICATION_ID = 1
    
    override fun getName(): String {
        return "MediaNotificationModule"
    }
    
    @ReactMethod
    fun initialize(promise: Promise) {
        try {
            createNotificationChannel()
            
            // Создаем MediaSession
            mediaSession = MediaSessionCompat(context, "SuckFyMediaSession").apply {
                setFlags(MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS or MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS)
                
                // Устанавливаем callback для кнопок
                setCallback(object : MediaSessionCompat.Callback() {
                    override fun onPlay() {
                        sendEvent("onPlay", null)
                    }
                    
                    override fun onPause() {
                        sendEvent("onPause", null)
                    }
                    
                    override fun onSkipToNext() {
                        sendEvent("onSkipToNext", null)
                    }
                    
                    override fun onSkipToPrevious() {
                        sendEvent("onSkipToPrevious", null)
                    }
                    
                    override fun onSeekTo(pos: Long) {
                        val params = Arguments.createMap()
                        params.putDouble("position", pos / 1000.0)
                        sendEvent("onSeek", params)
                    }
                })
                
                isActive = true
            }
            
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("INIT_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun showNotification(title: String, artist: String, artworkUrl: String?, isPlaying: Boolean, promise: Promise) {
        try {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            // Загружаем artwork если есть URL
            val artwork: Bitmap? = artworkUrl?.let { loadBitmapFromUrl(it) }
            
            // Создаем PendingIntent для открытия приложения
            val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            val pendingIntent = PendingIntent.getActivity(
                context, 
                0, 
                intent, 
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            // Создаем notification
            val notification = NotificationCompat.Builder(context, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(artist)
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setLargeIcon(artwork)
                .setContentIntent(pendingIntent)
                .setOnlyAlertOnce(true)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                
                // Добавляем кнопки управления
                .addAction(android.R.drawable.ic_media_previous, "Previous", createPendingIntent("PREVIOUS"))
                .apply {
                    if (isPlaying) {
                        addAction(android.R.drawable.ic_media_pause, "Pause", createPendingIntent("PAUSE"))
                    } else {
                        addAction(android.R.drawable.ic_media_play, "Play", createPendingIntent("PLAY"))
                    }
                }
                .addAction(android.R.drawable.ic_media_next, "Next", createPendingIntent("NEXT"))
                
                // Стиль медиа
                .setStyle(androidx.media.app.NotificationCompat.MediaStyle()
                    .setShowActionsInCompactView(0, 1, 2)
                    .setMediaSession(mediaSession?.sessionToken))
                
                .build()
            
            // Устанавливаем metadata (обязательно для отображения прогресса!)
            val metadata = android.support.v4.media.MediaMetadataCompat.Builder()
                .putString(android.support.v4.media.MediaMetadataCompat.METADATA_KEY_TITLE, title)
                .putString(android.support.v4.media.MediaMetadataCompat.METADATA_KEY_ARTIST, artist)
                .putLong(android.support.v4.media.MediaMetadataCompat.METADATA_KEY_DURATION, -1) // Будет обновлено в updateProgress
                .build()
            mediaSession?.setMetadata(metadata)
            
            // Обновляем PlaybackState с начальной позицией 0
            val state = if (isPlaying) PlaybackStateCompat.STATE_PLAYING else PlaybackStateCompat.STATE_PAUSED
            mediaSession?.setPlaybackState(
                PlaybackStateCompat.Builder()
                    .setState(state, 0L, 1.0f)
                    .setActions(
                        PlaybackStateCompat.ACTION_PLAY or
                        PlaybackStateCompat.ACTION_PAUSE or
                        PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                        PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
                        PlaybackStateCompat.ACTION_SEEK_TO
                    )
                    .build()
            )
            
            notificationManager.notify(NOTIFICATION_ID, notification)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("SHOW_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun updatePlaybackState(isPlaying: Boolean, promise: Promise) {
        try {
            val state = if (isPlaying) PlaybackStateCompat.STATE_PLAYING else PlaybackStateCompat.STATE_PAUSED
            mediaSession?.setPlaybackState(
                PlaybackStateCompat.Builder()
                    .setState(state, PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 1.0f)
                    .setActions(
                        PlaybackStateCompat.ACTION_PLAY or
                        PlaybackStateCompat.ACTION_PAUSE or
                        PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                        PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
                        PlaybackStateCompat.ACTION_SEEK_TO
                    )
                    .build()
            )
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("UPDATE_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun updateProgress(position: Double, duration: Double, promise: Promise) {
        try {
            val state = if (mediaSession?.controller?.playbackState?.state == PlaybackStateCompat.STATE_PLAYING) {
                PlaybackStateCompat.STATE_PLAYING
            } else {
                PlaybackStateCompat.STATE_PAUSED
            }
            
            // Обновляем metadata с длительностью (важно для прогресс-бара!)
            val currentMetadata = mediaSession?.controller?.metadata
            if (currentMetadata != null && duration > 0) {
                val updatedMetadata = android.support.v4.media.MediaMetadataCompat.Builder(currentMetadata)
                    .putLong(android.support.v4.media.MediaMetadataCompat.METADATA_KEY_DURATION, duration.toLong())
                    .build()
                mediaSession?.setMetadata(updatedMetadata)
            }
            
            // Обновляем позицию воспроизведения
            mediaSession?.setPlaybackState(
                PlaybackStateCompat.Builder()
                    .setState(state, position.toLong(), 1.0f)
                    .setActions(
                        PlaybackStateCompat.ACTION_PLAY or
                        PlaybackStateCompat.ACTION_PAUSE or
                        PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                        PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
                        PlaybackStateCompat.ACTION_SEEK_TO
                    )
                    .build()
            )
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("PROGRESS_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun hideNotification(promise: Promise) {
        try {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancel(NOTIFICATION_ID)
            mediaSession?.isActive = false
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("HIDE_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun destroy(promise: Promise) {
        try {
            hideNotification(promise)
            mediaSession?.release()
            mediaSession = null
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("DESTROY_ERROR", e.message)
        }
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Media Playback",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Media playback controls"
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    private fun createPendingIntent(action: String): PendingIntent {
        val intent = Intent(context, MediaNotificationReceiver::class.java).apply {
            this.action = action
        }
        return PendingIntent.getBroadcast(
            context,
            action.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
    
    private fun loadBitmapFromUrl(url: String): Bitmap? {
        return try {
            val connection = URL(url).openConnection() as HttpURLConnection
            connection.doInput = true
            connection.connect()
            val input: InputStream = connection.inputStream
            BitmapFactory.decodeStream(input)
        } catch (e: Exception) {
            null
        }
    }
    
    private fun sendEvent(eventName: String, params: WritableMap?) {
        context
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
