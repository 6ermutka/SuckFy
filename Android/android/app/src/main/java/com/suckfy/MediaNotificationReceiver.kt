package com.suckfy

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule

class MediaNotificationReceiver : BroadcastReceiver() {
    
    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return
        
        val action = intent.action ?: return
        
        // Получаем ReactContext
        val reactContext = getReactContext(context)
        
        // Отправляем события в JavaScript
        when (action) {
            "PLAY" -> sendEvent(reactContext, "onMediaPlay")
            "PAUSE" -> sendEvent(reactContext, "onMediaPause")
            "NEXT" -> sendEvent(reactContext, "onMediaNext")
            "PREVIOUS" -> sendEvent(reactContext, "onMediaPrevious")
        }
    }
    
    private fun getReactContext(context: Context): ReactContext? {
        return try {
            val application = context.applicationContext as ReactApplication
            application.reactNativeHost.reactInstanceManager.currentReactContext
        } catch (e: Exception) {
            null
        }
    }
    
    private fun sendEvent(reactContext: ReactContext?, eventName: String) {
        reactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(eventName, null)
    }
}
