// Player Context - управление плеером через нативный AudioPlayerModule
import React, {createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback} from 'react';
import {Platform} from 'react-native';
import {audioPlayerService} from '../services/AudioPlayerService';
import {playerService} from '../services/PlayerService';
import {mediaNotificationService} from '../services/MediaNotificationService';
import {Track} from '../services/SpotifyService';
import {useLibrary} from './LibraryContext';

interface PlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  queue: Track[];
  currentIndex: number;
  isRepeat: boolean;
  setIsRepeat: (value: boolean) => void;
  playTrack: (track: Track) => Promise<void>;
  playTracks: (tracks: Track[], startIndex?: number) => Promise<void>;
  togglePlayback: () => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRepeat, setIsRepeat] = useState(false);
  const {addToRecentlyPlayed} = useLibrary();

  // Refs для актуальных значений внутри callbacks (решает stale closure)
  const queueRef = useRef<Track[]>([]);
  const currentIndexRef = useRef<number>(0);
  const isRepeatRef = useRef<boolean>(false);

  // Синхронизируем refs со state
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { isRepeatRef.current = isRepeat; }, [isRepeat]);
  
  // Ref для сохранения последней позиции при паузе
  const lastPositionRef = useRef<number>(0);

  // Ref для playTrackInternal чтобы избежать stale closure
  const playTrackInternalRef = useRef<((track: Track, skipQueueUpdate: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    const init = async () => {
      // Инициализируем сервисы
      if (Platform.OS === 'android') {
        await audioPlayerService.initialize();
      } else {
        await playerService.initialize();
      }
      await mediaNotificationService.initialize();
      
      const {DeviceEventEmitter} = require('react-native');
      
      // Подписываемся на события уведомлений
      DeviceEventEmitter.addListener('onPlay', togglePlayback);
      DeviceEventEmitter.addListener('onPause', togglePlayback);
      DeviceEventEmitter.addListener('onSkipToNext', skipToNext);
      DeviceEventEmitter.addListener('onSkipToPrevious', skipToPrevious);
      
      DeviceEventEmitter.addListener('onSeek', (data: {position: number}) => {
        seekTo(data.position);
      });
      
      // КЛЮЧЕВОЕ: подписываемся на завершение трека из нативного модуля
      if (Platform.OS === 'android') {
        audioPlayerService.addEventListener('onTrackCompleted', handleTrackCompletion);
      }
    };
    init().catch(console.error);

    const interval = setInterval(async () => {
      if (Platform.OS === 'android') {
        const playing = await audioPlayerService.isPlaying();
        
        // Обновляем состояние воспроизведения
        setIsPlaying(playing);
        
        // Обновляем позицию ТОЛЬКО если трек играет
        if (playing) {
          const pos = await audioPlayerService.getCurrentPosition();
          const dur = await audioPlayerService.getDuration();
          
          // Сохраняем позицию в ref для использования при паузе
          lastPositionRef.current = pos;
          
          setPosition(pos);
          setDuration(dur);
          
          // Обновляем прогресс в уведомлении
          mediaNotificationService.updateProgress(pos, dur).catch(err => {
            console.error('Failed to update notification progress:', err);
          });
        }
        // При паузе НЕ вызываем getCurrentPosition() и НЕ обновляем position
        // Позиция остаётся на том значении, где была при паузе
      } else {
        const actuallyPlaying = playerService.isPlaying();
        setIsPlaying(actuallyPlaying);
        
        if (actuallyPlaying) {
          playerService.getCurrentTime((seconds) => {
            setPosition(seconds);
          });
        }
      }
    }, 500);

    return () => {
      clearInterval(interval);
      
      if (Platform.OS === 'android') {
        audioPlayerService.destroy();
      } else {
        playerService.release();
      }
      mediaNotificationService.destroy();
      
      const {DeviceEventEmitter} = require('react-native');
      DeviceEventEmitter.removeAllListeners('onPlay');
      DeviceEventEmitter.removeAllListeners('onPause');
      DeviceEventEmitter.removeAllListeners('onSkipToNext');
      DeviceEventEmitter.removeAllListeners('onSkipToPrevious');
      DeviceEventEmitter.removeAllListeners('onSeek');
    };
  }, []);

  const playTrackInternal = useCallback(async (track: Track, skipQueueUpdate: boolean = false) => {
    const startTime = Date.now();
    console.log('⏰ [PLAYER INTERNAL] START playTrackInternal', track.title);
    
    try {
      const url = track.filePath;
      if (!url) {
        console.error('❌ [PLAYER] Cannot play track: No file path');
        console.error('❌ [PLAYER] Track:', track.title);
        console.error('❌ [PLAYER] Track ID:', track.id);
        alert(`Cannot play ${track.title}: Track not downloaded or file not found. Please download it first.`);
        return;
      }
      console.log('⏰ [PLAYER INTERNAL] Has filePath, elapsed:', Date.now() - startTime, 'ms');

      // ПРОВЕРКА СУЩЕСТВОВАНИЯ ФАЙЛА ОТКЛЮЧЕНА!!!
      // RNFS.exists() БЛОКИРУЕТ UI НА 1-2 СЕКУНДЫ!!!
      // Если файл не существует - MediaPlayer сам выдаст ошибку
      
      console.log('✅ [PLAYER] Playing track:', track.title);
      console.log('✅ [PLAYER] File path:', url);

      console.log('⏰ [PLAYER INTERNAL] Setting current track...');
      setCurrentTrack(track);
      
      if (!skipQueueUpdate) {
        console.log('⏰ [PLAYER INTERNAL] Updating queue...');
        setQueue([track]);
        queueRef.current = [track];
        setCurrentIndex(0);
        currentIndexRef.current = 0;
      }
      
      setPosition(0);
      lastPositionRef.current = 0;
      console.log('⏰ [PLAYER INTERNAL] State updated, elapsed:', Date.now() - startTime, 'ms');
      
      if (Platform.OS === 'android') {
        console.log('⏰ [PLAYER INTERNAL] Loading track in AudioPlayerService...');
        const loadStart = Date.now();
        const {duration} = await audioPlayerService.loadTrack(url);
        console.log('⏰ [PLAYER INTERNAL] Track loaded in:', Date.now() - loadStart, 'ms');
        setDuration(duration);
        
        console.log('⏰ [PLAYER INTERNAL] Starting playback...');
        const playStart = Date.now();
        await audioPlayerService.play();
        console.log('⏰ [PLAYER INTERNAL] Playback started in:', Date.now() - playStart, 'ms');
        setIsPlaying(true);
        
        console.log('⏰ [PLAYER INTERNAL] Showing notification...');
        const notifStart = Date.now();
        await mediaNotificationService.showNotification(track, true);
        await mediaNotificationService.updateProgress(0, duration);
        console.log('⏰ [PLAYER INTERNAL] Notification shown in:', Date.now() - notifStart, 'ms');
      } else {
        await playerService.loadTrack(url);
        setDuration(playerService.getDuration());
        
        await playerService.play(handleTrackCompletion);
        setIsPlaying(true);
        
        await mediaNotificationService.showNotification(track, true);
      }
      
      console.log('⏰ [PLAYER INTERNAL] Adding to recently played...');
      await addToRecentlyPlayed(track);
      console.log('⏰ [PLAYER INTERNAL] TOTAL TIME:', Date.now() - startTime, 'ms');
    } catch (error) {
      console.error('❌ [PLAYER] Failed to play track:', error);
      console.log('⏰ [PLAYER INTERNAL] Error after:', Date.now() - startTime, 'ms');
      setIsPlaying(false);
      alert(`Error playing ${track?.title || 'track'}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [addToRecentlyPlayed, handleTrackCompletion]);
  
  // Обновляем ref при каждом изменении функции
  useEffect(() => {
    playTrackInternalRef.current = playTrackInternal;
  }, [playTrackInternal]);

  // Обработчик завершения трека - вызывается из нативного модуля
  const handleTrackCompletion = useCallback(() => {
    setIsPlaying(false);

    const repeat = isRepeatRef.current;
    const q = queueRef.current;
    const idx = currentIndexRef.current;

    if (repeat && q[idx]) {
      if (playTrackInternalRef.current) {
        playTrackInternalRef.current(q[idx], true).catch(console.error);
      }
    } else if (idx < q.length - 1) {
      const nextIndex = idx + 1;
      const nextTrack = q[nextIndex];
      setCurrentIndex(nextIndex);
      currentIndexRef.current = nextIndex;
      
      if (playTrackInternalRef.current) {
        playTrackInternalRef.current(nextTrack, true).catch(console.error);
      }
    }
  }, []);

  const playTrack = useCallback(async (track: Track) => {
    await playTrackInternal(track, false);
  }, [playTrackInternal]);

  const playTracks = useCallback(async (tracks: Track[], startIndex: number = 0) => {
    try {
      // Фильтруем треки с валидными filePath
      const validTracks = tracks.filter(t => t.filePath);
      
      console.log('🎵 [PLAYER] playTracks called');
      console.log('🎵 [PLAYER] Total tracks:', tracks.length);
      console.log('🎵 [PLAYER] Valid tracks (with filePath):', validTracks.length);
      console.log('🎵 [PLAYER] Start index:', startIndex);
      
      if (validTracks.length === 0) {
        console.error('❌ [PLAYER] No valid tracks to play - all tracks missing filePath');
        alert('No downloaded tracks available. Please download tracks first to play offline.');
        return;
      }

      if (startIndex >= validTracks.length) {
        console.error('❌ [PLAYER] Start index out of bounds');
        return;
      }

      setQueue(validTracks);
      queueRef.current = validTracks;
      setCurrentIndex(startIndex);
      currentIndexRef.current = startIndex;
      
      console.log('✅ [PLAYER] Queue set with', validTracks.length, 'tracks');
      await playTrackInternal(validTracks[startIndex], true);
    } catch (error) {
      console.error('❌ [PLAYER] Failed to play tracks:', error);
    }
  }, [playTrackInternal]);

  const togglePlayback = useCallback(async () => {
    try {
      if (Platform.OS === 'android') {
        const actuallyPlaying = await audioPlayerService.isPlaying();
        
        if (actuallyPlaying) {
          // Получаем текущую позицию перед паузой
          const currentPos = await audioPlayerService.getCurrentPosition();
          
          await audioPlayerService.pause();
          
          // Сохраняем позицию в ref И state
          lastPositionRef.current = currentPos;
          setPosition(currentPos);
          setIsPlaying(false);
          
          // Обновляем уведомление с позицией паузы
          const dur = await audioPlayerService.getDuration();
          await mediaNotificationService.updatePlaybackState(false);
          await mediaNotificationService.updateProgress(currentPos, dur);
        } else {
          await audioPlayerService.play();
          setIsPlaying(true);
          await mediaNotificationService.updatePlaybackState(true);
        }
      } else {
        const actuallyPlaying = playerService.isPlaying();
        
        if (actuallyPlaying) {
          await playerService.pause();
          setIsPlaying(false);
          await mediaNotificationService.updatePlaybackState(false);
        } else {
          await playerService.play(() => {
            console.log('🎵 [PLAYER] Playback finished during resume (iOS)');
            handleTrackCompletion();
          });
          setIsPlaying(true);
          await mediaNotificationService.updatePlaybackState(true);
        }
      }
    } catch (error) {
      console.error('Failed to toggle playback:', error);
    }
  }, [handleTrackCompletion]);

  const skipToNext = useCallback(async () => {
    try {
      const q = queueRef.current;
      const idx = currentIndexRef.current;
      
      if (idx < q.length - 1) {
        const nextIndex = idx + 1;
        setCurrentIndex(nextIndex);
        currentIndexRef.current = nextIndex;
        await playTrackInternal(q[nextIndex], true);
      }
    } catch (error) {
      console.error('Failed to skip to next:', error);
    }
  }, [playTrackInternal]);

  const skipToPrevious = useCallback(async () => {
    try {
      const q = queueRef.current;
      const idx = currentIndexRef.current;
      
      if (idx > 0) {
        const prevIndex = idx - 1;
        setCurrentIndex(prevIndex);
        currentIndexRef.current = prevIndex;
        await playTrackInternal(q[prevIndex], true);
      }
    } catch (error) {
      console.error('Failed to skip to previous:', error);
    }
  }, [playTrackInternal]);

  const seekTo = useCallback(async (newPosition: number) => {
    try {
      if (Platform.OS === 'android') {
        await audioPlayerService.seekTo(newPosition);
        setPosition(newPosition);
        
        // Получаем текущее состояние и обновляем прогресс в уведомлении
        const dur = await audioPlayerService.getDuration();
        await mediaNotificationService.updateProgress(newPosition, dur);
      } else {
        playerService.setCurrentTime(newPosition);
        setPosition(newPosition);
      }
    } catch (error) {
      console.error('Failed to seek:', error);
    }
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        position,
        duration,
        queue,
        currentIndex,
        isRepeat,
        setIsRepeat,
        playTrack,
        playTracks,
        togglePlayback,
        skipToNext,
        skipToPrevious,
        seekTo,
      }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = (): PlayerContextType => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within PlayerProvider');
  }
  return context;
};
