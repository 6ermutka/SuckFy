// AudioPlayerService - обертка для нативного AudioPlayerModule с поддержкой фонового воспроизведения
import { NativeModules, NativeEventEmitter, DeviceEventEmitter, Platform } from 'react-native';

const { AudioPlayerModule } = NativeModules;

type AudioPlayerEventType = 'onTrackLoaded' | 'onTrackCompleted' | 'onTrackError';
type AudioPlayerCallback = (data?: any) => void;

class AudioPlayerService {
  private isInitialized = false;
  private eventListeners: Map<AudioPlayerEventType, AudioPlayerCallback[]> = new Map();

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (Platform.OS === 'android' && AudioPlayerModule) {
        await AudioPlayerModule.initialize();
        
        // Подписываемся на нативные события
        DeviceEventEmitter.addListener('onTrackLoaded', (data) => {
          this.emit('onTrackLoaded', data);
        });
        
        DeviceEventEmitter.addListener('onTrackCompleted', () => {
          console.log('🎵 [AUDIO PLAYER] Track completed event received');
          this.emit('onTrackCompleted');
        });
        
        DeviceEventEmitter.addListener('onTrackError', (data) => {
          console.error('❌ [AUDIO PLAYER] Track error:', data);
          this.emit('onTrackError', data);
        });
        
        this.isInitialized = true;
        console.log('✅ [AUDIO PLAYER] Service initialized');
      } else {
        console.warn('⚠️ [AUDIO PLAYER] Native module not available (iOS or module missing)');
      }
    } catch (error) {
      console.error('Failed to initialize AudioPlayerService:', error);
      throw error;
    }
  }

  async loadTrack(path: string): Promise<{ duration: number }> {
    if (Platform.OS !== 'android' || !AudioPlayerModule) {
      throw new Error('AudioPlayerModule not available');
    }

    console.log('🎵 [AUDIO PLAYER] Loading track:', path);
    return new Promise((resolve, reject) => {
      // Подписываемся на событие загрузки один раз
      const listener = (data: { duration: number }) => {
        this.removeListener('onTrackLoaded', listener);
        resolve(data);
      };
      this.addEventListener('onTrackLoaded', listener);
      
      // Загружаем трек
      AudioPlayerModule.loadTrack(path).catch((error: Error) => {
        this.removeListener('onTrackLoaded', listener);
        reject(error);
      });
    });
  }

  async play(): Promise<void> {
    if (Platform.OS !== 'android' || !AudioPlayerModule) return;
    return AudioPlayerModule.play();
  }

  async pause(): Promise<void> {
    if (Platform.OS !== 'android' || !AudioPlayerModule) return;
    return AudioPlayerModule.pause();
  }

  async stop(): Promise<void> {
    if (Platform.OS !== 'android' || !AudioPlayerModule) return;
    return AudioPlayerModule.stop();
  }

  async seekTo(position: number): Promise<void> {
    if (Platform.OS !== 'android' || !AudioPlayerModule) return;
    return AudioPlayerModule.seekTo(position);
  }

  async getCurrentPosition(): Promise<number> {
    if (Platform.OS !== 'android' || !AudioPlayerModule) return 0;
    return AudioPlayerModule.getCurrentPosition();
  }

  async getDuration(): Promise<number> {
    if (Platform.OS !== 'android' || !AudioPlayerModule) return 0;
    return AudioPlayerModule.getDuration();
  }

  async isPlaying(): Promise<boolean> {
    if (Platform.OS !== 'android' || !AudioPlayerModule) return false;
    return AudioPlayerModule.isPlaying();
  }

  async release(): Promise<void> {
    if (Platform.OS !== 'android' || !AudioPlayerModule) return;
    return AudioPlayerModule.release();
  }

  // Event management
  addEventListener(event: AudioPlayerEventType, callback: AudioPlayerCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  removeListener(event: AudioPlayerEventType, callback: AudioPlayerCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  removeAllListeners(event?: AudioPlayerEventType): void {
    if (event) {
      this.eventListeners.delete(event);
    } else {
      this.eventListeners.clear();
    }
  }

  private emit(event: AudioPlayerEventType, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  destroy(): void {
    this.release().catch(console.error);
    this.removeAllListeners();
    
    DeviceEventEmitter.removeAllListeners('onTrackLoaded');
    DeviceEventEmitter.removeAllListeners('onTrackCompleted');
    DeviceEventEmitter.removeAllListeners('onTrackError');
    
    this.isInitialized = false;
    console.log('🗑️ [AUDIO PLAYER] Service destroyed');
  }
}

export const audioPlayerService = new AudioPlayerService();
