// Library Context - управление библиотекой треков
import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Track} from '../services/SpotifyService';
import {downloadService} from '../services/DownloadService';

interface LibraryContextType {
  tracks: Track[];
  likedSongs: Track[];
  recentlyPlayed: Track[];
  addTrack: (track: Track) => Promise<void>;
  removeTrack: (trackId: string) => Promise<void>;
  toggleLike: (track: Track) => Promise<void>;
  isLiked: (trackId: string) => boolean;
  isTrackInLibrary: (trackId: string) => boolean;
  addToRecentlyPlayed: (track: Track) => Promise<void>;
  clearAllData: () => Promise<void>;
  syncLikedWithLibrary: () => Promise<void>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

const STORAGE_KEYS = {
  TRACKS: '@suckfy_tracks',
  LIKED: '@suckfy_liked',
  RECENT: '@suckfy_recent',
};

export const LibraryProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [likedSongs, setLikedSongs] = useState<Track[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);

  // Загрузка данных при инициализации
  useEffect(() => {
    loadData();
  }, []);

  // Синхронизация filePath для всех треков после загрузки
  // ОТКЛЮЧЕНО: Эта синхронизация блокирует UI при старте
  // Вместо этого синхронизация происходит по требованию в экранах
  /*
  useEffect(() => {
    if (tracks.length > 0) {
      validateAndSyncFilePaths();
    }
  }, []);

  // Синхронизация liked и recently played после загрузки
  useEffect(() => {
    if (tracks.length > 0) {
      if (likedSongs.length > 0) {
        syncLikedSongs();
      }
      if (recentlyPlayed.length > 0) {
        syncRecentlyPlayed();
      }
    }
  }, [tracks]);
  */

  const loadData = async () => {
    try {
      const [tracksData, likedData, recentData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.TRACKS),
        AsyncStorage.getItem(STORAGE_KEYS.LIKED),
        AsyncStorage.getItem(STORAGE_KEYS.RECENT),
      ]);

      if (tracksData) setTracks(JSON.parse(tracksData));
      if (likedData) setLikedSongs(JSON.parse(likedData));
      if (recentData) setRecentlyPlayed(JSON.parse(recentData));
      
      console.log('✅ [LIBRARY] Data loaded from storage');
    } catch (error) {
      console.error('Failed to load library data:', error);
    }
  };

  // Валидация и синхронизация filePath для всех треков
  // ОТКЛЮЧЕНО: слишком медленно при старте, блокирует UI
  const validateAndSyncFilePaths = async () => {
    // Эта функция теперь не используется автоматически
    // Синхронизация происходит только в конкретных экранах по требованию
    return;
  };

  const syncLikedSongs = async () => {
    // ОТКЛЮЧЕНО: блокирует UI при старте
    // Синхронизация происходит в экранах по требованию
    return;
  };

  const addTrack = async (track: Track) => {
    try {
      // Проверяем наличие filePath
      if (!track.filePath) {
        console.warn('⚠️ [LIBRARY] Adding track without filePath:', track.title);
      } else {
        console.log('✅ [LIBRARY] Adding track with filePath:', track.title, track.filePath);
      }
      
      // Используем функциональное обновление для корректной работы при множественных вызовах
      setTracks(prevTracks => {
        // Проверяем, нет ли уже трека с таким ID
        const existingIndex = prevTracks.findIndex(t => t.id === track.id);
        let newTracks: Track[];
        
        if (existingIndex >= 0) {
          // Обновляем существующий трек (например, если добавили filePath)
          newTracks = [...prevTracks];
          newTracks[existingIndex] = track;
          console.log('🔄 [LIBRARY] Updated existing track:', track.title);
        } else {
          // Добавляем новый трек
          newTracks = [...prevTracks, track];
          console.log('➕ [LIBRARY] Added new track:', track.title);
        }
        
        // Сохраняем в AsyncStorage асинхронно
        AsyncStorage.setItem(STORAGE_KEYS.TRACKS, JSON.stringify(newTracks)).catch(error => {
          console.error('Failed to save track to storage:', error);
        });
        return newTracks;
      });
    } catch (error) {
      console.error('Failed to add track:', error);
    }
  };

  const removeTrack = async (trackId: string) => {
    try {
      const newTracks = tracks.filter(t => t.id !== trackId);
      setTracks(newTracks);
      await AsyncStorage.setItem(STORAGE_KEYS.TRACKS, JSON.stringify(newTracks));
    } catch (error) {
      console.error('Failed to remove track:', error);
    }
  };

  const toggleLike = async (track: Track) => {
    try {
      const isCurrentlyLiked = likedSongs.some(t => t.id === track.id);
      
      let newLiked: Track[];
      if (isCurrentlyLiked) {
        // Убираем из liked
        newLiked = likedSongs.filter(t => t.id !== track.id);
      } else {
        // Добавляем в liked
        // ВАЖНО: Проверяем, есть ли этот трек в library с filePath
        const trackInLibrary = tracks.find(t => t.id === track.id);
        const trackToAdd = trackInLibrary || track;
        
        console.log('💖 [LIBRARY] Adding to liked:', trackToAdd.title);
        console.log('💖 [LIBRARY] File path:', trackToAdd.filePath);
        
        newLiked = [...likedSongs, trackToAdd];
      }
      
      setLikedSongs(newLiked);
      await AsyncStorage.setItem(STORAGE_KEYS.LIKED, JSON.stringify(newLiked));
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const isLiked = (trackId: string): boolean => {
    return likedSongs.some(t => t.id === trackId);
  };

  const isTrackInLibrary = (trackId: string): boolean => {
    return tracks.some(t => t.id === trackId);
  };

  const addToRecentlyPlayed = async (track: Track) => {
    try {
      // Убеждаемся, что трек содержит filePath
      if (!track.filePath) {
        console.warn('⚠️ [LIBRARY] Adding track to recently played without filePath:', track.title);
      }
      
      // Удаляем дубликаты и добавляем в начало
      const filtered = recentlyPlayed.filter(t => t.id !== track.id);
      const newRecent = [track, ...filtered].slice(0, 20); // Храним только последние 20
      
      setRecentlyPlayed(newRecent);
      await AsyncStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(newRecent));
      
      console.log('✅ [LIBRARY] Added to recently played:', track.title, 'filePath:', track.filePath);
    } catch (error) {
      console.error('Failed to add to recently played:', error);
    }
  };

  const clearAllData = async () => {
    try {
      // Очищаем все данные
      setTracks([]);
      setLikedSongs([]);
      setRecentlyPlayed([]);
      
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.TRACKS),
        AsyncStorage.removeItem(STORAGE_KEYS.LIKED),
        AsyncStorage.removeItem(STORAGE_KEYS.RECENT),
      ]);
      
      console.log('✅ [LibraryContext] All data cleared');
    } catch (error) {
      console.error('❌ [LibraryContext] Failed to clear data:', error);
    }
  };

  const syncRecentlyPlayed = async () => {
    // ОТКЛЮЧЕНО: блокирует UI при старте
    // Синхронизация происходит в экранах по требованию
    return;
  };

  const syncLikedWithLibrary = async () => {
    await syncLikedSongs();
  };

  return (
    <LibraryContext.Provider
      value={{
        tracks,
        likedSongs,
        recentlyPlayed,
        addTrack,
        removeTrack,
        toggleLike,
        isLiked,
        isTrackInLibrary,
        addToRecentlyPlayed,
        clearAllData,
        syncLikedWithLibrary,
      }}>
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = (): LibraryContextType => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within LibraryProvider');
  }
  return context;
};
