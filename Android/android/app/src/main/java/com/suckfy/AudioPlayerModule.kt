package com.suckfy

import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.PowerManager
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.IOException

class AudioPlayerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    private val context: ReactApplicationContext = reactContext
    private var mediaPlayer: MediaPlayer? = null
    private var wakeLock: PowerManager.WakeLock? = null
    
    override fun getName(): String {
        return "AudioPlayerModule"
    }
    
    @ReactMethod
    fun initialize(promise: Promise) {
        try {
            // Получаем wake lock для предотвращения засыпания процессора
            val powerManager = context.getSystemService(android.content.Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "SuckFy::AudioPlayerWakeLock"
            )
            
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("INIT_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun loadTrack(path: String, promise: Promise) {
        try {
            android.util.Log.d("AudioPlayer", "🎵 Loading track: $path")
            
            // Освобождаем предыдущий плеер
            releasePlayer()
            
            // Создаем новый MediaPlayer
            mediaPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .build()
                )
                
                // Устанавливаем источник
                setDataSource(path)
                android.util.Log.d("AudioPlayer", "✅ DataSource set, preparing...")
                
                // Подготавливаем асинхронно
                setOnPreparedListener { mp ->
                    android.util.Log.d("AudioPlayer", "✅ Track prepared, duration: ${mp.duration}ms")
                    
                    sendEvent("onTrackLoaded", Arguments.createMap().apply {
                        putDouble("duration", (mp.duration / 1000.0))
                    })
                    
                    // Резолвим promise ЗДЕСЬ, после успешной подготовки
                    promise.resolve(Arguments.createMap().apply {
                        putDouble("duration", (mp.duration / 1000.0))
                    })
                }
                
                // Обработчик завершения трека - КЛЮЧЕВОЙ МОМЕНТ!
                setOnCompletionListener {
                    android.util.Log.d("AudioPlayer", "🎵 Track completed")
                    sendEvent("onTrackCompleted", null)
                }
                
                // Обработчик ошибок
                setOnErrorListener { _, what, extra ->
                    android.util.Log.e("AudioPlayer", "❌ MediaPlayer error: what=$what, extra=$extra")
                    sendEvent("onTrackError", Arguments.createMap().apply {
                        putInt("what", what)
                        putInt("extra", extra)
                    })
                    promise.reject("PLAYBACK_ERROR", "MediaPlayer error: what=$what, extra=$extra")
                    true
                }
                
                prepareAsync()
            }
        } catch (e: IOException) {
            android.util.Log.e("AudioPlayer", "❌ IOException: ${e.message}")
            promise.reject("LOAD_ERROR", "Failed to load track: ${e.message}")
        } catch (e: Exception) {
            android.util.Log.e("AudioPlayer", "❌ Exception: ${e.message}")
            promise.reject("LOAD_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun play(promise: Promise) {
        try {
            mediaPlayer?.let {
                android.util.Log.d("AudioPlayer", "▶️ Play called, isPlaying: ${it.isPlaying}")
                if (!it.isPlaying) {
                    it.start()
                    android.util.Log.d("AudioPlayer", "▶️ Started playing")
                    // Активируем wake lock
                    wakeLock?.acquire(10*60*1000L /*10 minutes*/)
                }
                promise.resolve(null)
            } ?: run {
                android.util.Log.e("AudioPlayer", "❌ Play error: No track loaded")
                promise.reject("PLAY_ERROR", "No track loaded")
            }
        } catch (e: Exception) {
            android.util.Log.e("AudioPlayer", "❌ Play exception: ${e.message}")
            promise.reject("PLAY_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun pause(promise: Promise) {
        try {
            mediaPlayer?.let {
                if (it.isPlaying) {
                    it.pause()
                    // Освобождаем wake lock
                    if (wakeLock?.isHeld == true) {
                        wakeLock?.release()
                    }
                }
                promise.resolve(null)
            } ?: promise.reject("PAUSE_ERROR", "No track loaded")
        } catch (e: Exception) {
            promise.reject("PAUSE_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun stop(promise: Promise) {
        try {
            mediaPlayer?.let {
                it.stop()
                // Освобождаем wake lock
                if (wakeLock?.isHeld == true) {
                    wakeLock?.release()
                }
                promise.resolve(null)
            } ?: promise.reject("STOP_ERROR", "No track loaded")
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun seekTo(position: Double, promise: Promise) {
        try {
            mediaPlayer?.let {
                it.seekTo((position * 1000).toInt())
                promise.resolve(null)
            } ?: promise.reject("SEEK_ERROR", "No track loaded")
        } catch (e: Exception) {
            promise.reject("SEEK_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun getCurrentPosition(promise: Promise) {
        try {
            mediaPlayer?.let {
                promise.resolve(it.currentPosition / 1000.0)
            } ?: promise.resolve(0.0)
        } catch (e: Exception) {
            promise.resolve(0.0)
        }
    }
    
    @ReactMethod
    fun getDuration(promise: Promise) {
        try {
            mediaPlayer?.let {
                promise.resolve((it.duration / 1000.0))
            } ?: promise.resolve(0.0)
        } catch (e: Exception) {
            promise.resolve(0.0)
        }
    }
    
    @ReactMethod
    fun isPlaying(promise: Promise) {
        try {
            promise.resolve(mediaPlayer?.isPlaying ?: false)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }
    
    @ReactMethod
    fun release(promise: Promise) {
        try {
            releasePlayer()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("RELEASE_ERROR", e.message)
        }
    }
    
    private fun releasePlayer() {
        try {
            mediaPlayer?.let {
                if (it.isPlaying) {
                    it.stop()
                }
                it.reset()
                it.release()
            }
            mediaPlayer = null
            
            // Освобождаем wake lock
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (e: Exception) {
            // Игнорируем ошибки при освобождении
        }
    }
    
    private fun sendEvent(eventName: String, params: WritableMap?) {
        context
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(eventName, params)
    }
    
    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        releasePlayer()
    }
}
