// Media Notification Service для Android
import {NativeModules, NativeEventEmitter, Platform, DeviceEventEmitter, PermissionsAndroid} from 'react-native';

const {MediaNotificationModule} = NativeModules;

interface Track {
  id: string;
  title: string;
  artist: string;
  artworkURL?: string;
  duration: number;
}

class MediaNotificationService {
  private isInitialized = false;
  private eventEmitter: any;

  async initialize(): Promise<void> {
    if (this.isInitialized || Platform.OS !== 'android') {
      return;
    }

    try {
      // Запрашиваем разрешение на уведомления для Android 13+
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Media Notification Permission',
            message: 'SuckFy needs permission to show media controls in notifications',
            buttonPositive: 'OK',
          }
        );
        
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('📱 [NOTIFICATION] Permission denied');
          return;
        }
      }
      
      if (MediaNotificationModule) {
        await MediaNotificationModule.initialize();
        
        // Подписываемся на события от нативного модуля (только для логирования)
        DeviceEventEmitter.addListener('onPlay', () => {
          console.log('📱 [NOTIFICATION] Play button pressed');
        });
        
        DeviceEventEmitter.addListener('onPause', () => {
          console.log('📱 [NOTIFICATION] Pause button pressed');
        });
        
        DeviceEventEmitter.addListener('onSkipToNext', () => {
          console.log('📱 [NOTIFICATION] Next button pressed');
        });
        
        DeviceEventEmitter.addListener('onSkipToPrevious', () => {
          console.log('📱 [NOTIFICATION] Previous button pressed');
        });
        
        this.isInitialized = true;
        console.log('📱 [NOTIFICATION] Service initialized with native module');
      } else {
        console.warn('📱 [NOTIFICATION] Native module not available');
      }
    } catch (error) {
      console.error('Failed to initialize MediaNotificationService:', error);
    }
  }

  async showNotification(track: Track, isPlaying: boolean): Promise<void> {
    if (Platform.OS !== 'android' || !MediaNotificationModule) return;

    try {
      console.log('📱 [NOTIFICATION] Showing notification for:', track.title);
      // НЕ передаём artworkURL - это вызывает синхронную загрузку в нативном коде и блокирует UI
      await MediaNotificationModule.showNotification(
        track.title,
        track.artist,
        null, // artworkURL отключен
        isPlaying
      );
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  async updatePlaybackState(isPlaying: boolean): Promise<void> {
    if (Platform.OS !== 'android' || !MediaNotificationModule) return;

    try {
      console.log('📱 [NOTIFICATION] Updating playback state:', isPlaying ? 'Playing' : 'Paused');
      await MediaNotificationModule.updatePlaybackState(isPlaying);
    } catch (error) {
      console.error('Failed to update playback state:', error);
    }
  }

  async updateProgress(position: number, duration: number): Promise<void> {
    if (Platform.OS !== 'android' || !MediaNotificationModule) return;

    try {
      // Конвертируем секунды в миллисекунды для Android
      await MediaNotificationModule.updateProgress(
        Math.floor(position * 1000),
        Math.floor(duration * 1000)
      );
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  }

  async hideNotification(): Promise<void> {
    if (Platform.OS !== 'android' || !MediaNotificationModule) return;

    try {
      console.log('📱 [NOTIFICATION] Hiding notification');
      await MediaNotificationModule.hideNotification();
    } catch (error) {
      console.error('Failed to hide notification:', error);
    }
  }

  async destroy(): Promise<void> {
    if (Platform.OS !== 'android' || !MediaNotificationModule) return;

    try {
      await MediaNotificationModule.destroy();
      DeviceEventEmitter.removeAllListeners('onPlay');
      DeviceEventEmitter.removeAllListeners('onPause');
      DeviceEventEmitter.removeAllListeners('onSkipToNext');
      DeviceEventEmitter.removeAllListeners('onSkipToPrevious');
      this.isInitialized = false;
      console.log('📱 [NOTIFICATION] Service destroyed');
    } catch (error) {
      console.error('Failed to destroy MediaNotificationService:', error);
    }
  }
}

export const mediaNotificationService = new MediaNotificationService();
