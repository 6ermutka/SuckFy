// Download Context - управление скачиваниями
import React, {createContext, useContext, useState, ReactNode} from 'react';
import {downloadService, DownloadProgress} from '../services/DownloadService';
import {Track} from '../services/SpotifyService';
import {useLibrary} from './LibraryContext';

export interface DownloadStatus {
  progress: number;
  status: 'connecting' | 'getting_tidal' | 'downloading' | 'processing' | 'complete';
  message: string;
}

interface DownloadContextType {
  downloads: Map<string, DownloadProgress>;
  downloadStatuses: Map<string, DownloadStatus>;
  downloadTrack: (track: Track) => Promise<void>;
  cancelDownload: (trackId: string) => void;
  isDownloading: (trackId: string) => boolean;
  isDownloaded: (trackId: string) => boolean;
  downloadedTracks: Set<string>;
  getDownloadStatus: (trackId: string) => DownloadStatus | undefined;
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

export const DownloadProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [downloads, setDownloads] = useState<Map<string, DownloadProgress>>(new Map());
  const [downloadStatuses, setDownloadStatuses] = useState<Map<string, DownloadStatus>>(new Map());
  const [downloadedTracks, setDownloadedTracks] = useState<Set<string>>(new Set());
  const {addTrack} = useLibrary();

  const setDownloadStatus = (trackId: string, status: DownloadStatus) => {
    setDownloadStatuses(prev => {
      const newMap = new Map(prev);
      newMap.set(trackId, status);
      return newMap;
    });
  };

  const downloadTrack = async (track: Track) => {
    try {
      // Проверяем, не скачивается ли уже
      if (downloads.has(track.id)) {
        console.log('Track is already downloading:', track.id);
        return;
      }

      // Проверяем, не скачан ли уже
      const isAlreadyDownloaded = await downloadService.isTrackDownloaded(track);
      if (isAlreadyDownloaded) {
        console.log('Track already downloaded:', track.id);
        setDownloadedTracks(prev => new Set(prev).add(track.id));
        return;
      }

      console.log('Starting download for:', track.title);

      // Статус: Подключение
      setDownloadStatus(track.id, {
        progress: 0,
        status: 'connecting',
        message: 'Connecting...',
      });

      // Начинаем скачивание
      const filePath = await downloadService.downloadTrack(track, (progressPercent: number) => {
        // Обновляем статус в зависимости от прогресса
        let status: DownloadStatus['status'] = 'downloading';
        let message = `Downloading ${Math.round(progressPercent)}%`;
        
        if (track.source === 'soundcloud') {
          // Для SoundCloud: Connecting -> Downloading -> Processing
          if (progressPercent < 10) {
            status = 'connecting';
            message = 'Connecting to SoundCloud...';
          } else if (progressPercent >= 90) {
            status = 'processing';
            message = 'Processing...';
          } else {
            status = 'downloading';
            message = `Downloading ${Math.round(progressPercent)}%`;
          }
        } else {
          // Для Spotify/Tidal: Connecting -> Getting Tidal -> Downloading
          if (progressPercent < 10) {
            status = 'connecting';
            message = 'Getting song.link...';
          } else if (progressPercent < 20) {
            status = 'getting_tidal';
            message = 'Getting Tidal URL...';
          } else {
            status = 'downloading';
            message = `Downloading ${Math.round(progressPercent)}%`;
          }
        }

        setDownloadStatus(track.id, {
          progress: Math.round(progressPercent),
          status,
          message,
        });

        // Также обновляем старый формат для совместимости
        setDownloads(prev => {
          const newMap = new Map(prev);
          newMap.set(track.id, {
            trackId: track.id,
            progress: Math.round(progressPercent),
            bytesWritten: 0,
            contentLength: 0,
          });
          return newMap;
        });
      });

      // Скачивание завершено
      console.log('✅ [DOWNLOAD] Completed:', filePath);
      
      setDownloadStatus(track.id, {
        progress: 100,
        status: 'complete',
        message: 'Complete!',
      });
      
      // Обновляем трек с путем к файлу
      const updatedTrack: Track = {...track, filePath};
      console.log('💾 [DOWNLOAD] Updated track with filePath:', updatedTrack.filePath);
      console.log('💾 [DOWNLOAD] Full updated track:', JSON.stringify(updatedTrack, null, 2));
      
      // Добавляем в библиотеку
      await addTrack(updatedTrack);

      // Убираем из активных скачиваний через 2 секунды
      setTimeout(() => {
        setDownloads(prev => {
          const newMap = new Map(prev);
          newMap.delete(track.id);
          return newMap;
        });
        setDownloadStatuses(prev => {
          const newMap = new Map(prev);
          newMap.delete(track.id);
          return newMap;
        });
      }, 2000);

      // Добавляем в скачанные
      setDownloadedTracks(prev => new Set(prev).add(track.id));
    } catch (error) {
      console.error('Failed to download track:', error);
      
      // Показываем ошибку
      setDownloadStatus(track.id, {
        progress: 0,
        status: 'connecting',
        message: 'Failed!',
      });
      
      // Убираем из активных скачиваний при ошибке через 3 сек
      setTimeout(() => {
        setDownloads(prev => {
          const newMap = new Map(prev);
          newMap.delete(track.id);
          return newMap;
        });
        setDownloadStatuses(prev => {
          const newMap = new Map(prev);
          newMap.delete(track.id);
          return newMap;
        });
      }, 3000);
      
      throw error;
    }
  };

  const cancelDownload = (trackId: string) => {
    downloadService.cancelDownload(trackId);
    setDownloads(prev => {
      const newMap = new Map(prev);
      newMap.delete(trackId);
      return newMap;
    });
  };

  const isDownloading = (trackId: string): boolean => {
    return downloads.has(trackId);
  };

  const isDownloaded = (trackId: string): boolean => {
    return downloadedTracks.has(trackId);
  };

  const getDownloadStatus = (trackId: string): DownloadStatus | undefined => {
    return downloadStatuses.get(trackId);
  };

  return (
    <DownloadContext.Provider
      value={{
        downloads,
        downloadStatuses,
        downloadTrack,
        cancelDownload,
        isDownloading,
        isDownloaded,
        downloadedTracks,
        getDownloadStatus,
      }}>
      {children}
    </DownloadContext.Provider>
  );
};

export const useDownload = (): DownloadContextType => {
  const context = useContext(DownloadContext);
  if (!context) {
    throw new Error('useDownload must be used within DownloadProvider');
  }
  return context;
};
