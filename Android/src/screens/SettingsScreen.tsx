import React, {memo, useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, PermissionsAndroid, Platform, ActivityIndicator} from 'react-native';
import {colors} from '../theme/colors';
import {soundCloudAuthService} from '../services/SoundCloudAuthService';
import {storageService} from '../services/StorageService';
import {imageCacheService} from '../services/ImageCacheService';
import RNFS from 'react-native-fs';
import {openDocumentTree, listFiles, copyFile} from 'react-native-saf-x';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useLibrary} from '../contexts/LibraryContext';
import AppHeader from '../components/AppHeader';

const SettingsScreen = memo(() => {
  const [oauthToken, setOauthToken] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [storageInfo, setStorageInfo] = useState({
    cacheSize: 0,
    musicSize: 0,
    totalSize: 0,
  });
  const [importProgress, setImportProgress] = useState<{current: number; total: number} | null>(null);
  const [exportProgress, setExportProgress] = useState<{current: number; total: number} | null>(null);
  const {addTrack, clearAllData, syncLikedWithLibrary} = useLibrary();

  // Загружаем токен и информацию о хранилище при монтировании
  useEffect(() => {
    loadToken();
    loadStorageInfo();
  }, []);

  const loadToken = async () => {
    const token = await soundCloudAuthService.loadToken();
    if (token) {
      setOauthToken(token);
      setHasToken(true);
    }
  };

  const loadStorageInfo = async () => {
    try {
      console.log('📊 [SETTINGS] Loading storage info...');
      const musicPath = storageService.getMusicFolderPath();
      console.log('📊 [SETTINGS] Music path:', musicPath);

      const musicSize = await getFolderSize(musicPath);
      console.log('📊 [SETTINGS] Music size:', musicSize);
      
      const cacheSize = await imageCacheService.getCacheSize();
      console.log('📊 [SETTINGS] Cache size:', cacheSize);

      setStorageInfo({
        musicSize,
        cacheSize,
        totalSize: musicSize + cacheSize,
      });
      
      console.log('✅ [SETTINGS] Storage info loaded:', {musicSize, cacheSize, total: musicSize + cacheSize});
    } catch (error) {
      console.error('❌ [SETTINGS] Failed to load storage info:', error);
    }
  };

  const getFolderSize = async (path: string): Promise<number> => {
    try {
      const exists = await RNFS.exists(path);
      if (!exists) return 0;

      const files = await RNFS.readDir(path);
      let totalSize = 0;

      for (const file of files) {
        if (file.isFile()) {
          totalSize += file.size;
        } else if (file.isDirectory()) {
          totalSize += await getFolderSize(file.path);
        }
      }

      return totalSize;
    } catch (error) {
      return 0;
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleSyncLiked = async () => {
    try {
      console.log('🔄 [SETTINGS] Syncing liked songs...');
      await syncLikedWithLibrary();
      Alert.alert('Success', 'Liked songs synced with library!');
    } catch (error) {
      console.error('❌ [SETTINGS] Failed to sync:', error);
      Alert.alert('Error', 'Failed to sync liked songs');
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure? This will clear all cached images.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ [SETTINGS] Clearing cache...');
              await imageCacheService.clearCache();
              console.log('✅ [SETTINGS] Cache cleared');
              await loadStorageInfo();
              Alert.alert('Success', 'Cache cleared successfully!');
            } catch (error) {
              console.error('❌ [SETTINGS] Failed to clear cache:', error);
              Alert.alert('Error', 'Failed to clear cache');
            }
          },
        },
      ]
    );
  };

  const handleClearMusic = async () => {
    Alert.alert(
      'Clear All Music',
      'Are you sure? This will delete all downloaded music files. This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ [SETTINGS] Clearing music...');
              const musicPath = storageService.getMusicFolderPath();
              const exists = await RNFS.exists(musicPath);
              if (exists) {
                await RNFS.unlink(musicPath);
                await RNFS.mkdir(musicPath);
              }
              
              // Очищаем библиотеку через контекст
              await clearAllData();
              
              console.log('✅ [SETTINGS] Music and library data cleared');
              await loadStorageInfo();
              Alert.alert('Success', 'All music deleted successfully!');
            } catch (error) {
              console.error('❌ [SETTINGS] Failed to clear music:', error);
              Alert.alert('Error', 'Failed to delete music files');
            }
          },
        },
      ]
    );
  };

  const handleExportMusic = async () => {
    try {
      console.log('📤 [SETTINGS] Starting export with folder picker...');
      
      const musicPath = storageService.getMusicFolderPath();
      const files = await RNFS.readDir(musicPath);
      const musicFiles = files.filter(f => f.name.endsWith('.mp3') || f.name.endsWith('.m4a') || f.name.endsWith('.mp4'));

      if (musicFiles.length === 0) {
        Alert.alert('No Music', 'No music files to export');
        return;
      }

      // Открываем выбор папки для экспорта
      const result = await openDocumentTree(true);
      
      if (!result) {
        console.log('📤 [SETTINGS] Export cancelled');
        return;
      }
      
      console.log('📤 [SETTINGS] Export to:', result.uri);
      
      setExportProgress({current: 0, total: musicFiles.length});
      
      let exported = 0;
      for (let i = 0; i < musicFiles.length; i++) {
        const file = musicFiles[i];
        try {
          // Копируем каждый файл в выбранную папку
          const destUri = `${result.uri}/${file.name}`;
          await copyFile(file.path, destUri);
          exported++;
          console.log(`✅ [SETTINGS] Exported (${exported}/${musicFiles.length}):`, file.name);
        } catch (error) {
          console.error('❌ [SETTINGS] Failed to export:', file.name, error);
        }
        
        setExportProgress({current: i + 1, total: musicFiles.length});
      }

      setExportProgress(null);
      Alert.alert('Success', `Exported ${exported} of ${musicFiles.length} files`);
      console.log('✅ [SETTINGS] Export complete');
    } catch (error) {
      console.error('❌ [SETTINGS] Export failed:', error);
      setExportProgress(null);
      Alert.alert('Error', 'Failed to export music files');
    }
  };

  const handleImportMusic = async () => {
    try {
      console.log('📥 [SETTINGS] Starting import with folder picker...');
      
      // Открываем выбор папки
      const result = await openDocumentTree(true);
      
      if (!result) {
        console.log('📥 [SETTINGS] Folder selection cancelled');
        return;
      }
      
      console.log('📥 [SETTINGS] Selected folder:', result.uri);
      
      // Получаем список файлов в выбранной папке
      const files = await listFiles(result.uri);
      const musicFiles = files.filter((f: any) => 
        f.name?.endsWith('.mp3') || 
        f.name?.endsWith('.m4a') || 
        f.name?.endsWith('.mp4')
      );
      
      if (musicFiles.length === 0) {
        Alert.alert('No Music Files', 'No audio files found in selected folder');
        return;
      }
      
      const musicPath = storageService.getMusicFolderPath();
      let imported = 0;
      let skipped = 0;

      setImportProgress({current: 0, total: musicFiles.length});

      for (let i = 0; i < musicFiles.length; i++) {
        const file = musicFiles[i];
        try {
          const destPath = `${musicPath}/${file.name}`;
          
          // Проверяем, существует ли уже файл
          const exists = await RNFS.exists(destPath);
          if (!exists) {
            // Файл не существует - копируем
            await copyFile(file.uri, destPath);
            console.log('📁 [SETTINGS] File copied:', file.name);
          } else {
            console.log('📁 [SETTINGS] File already exists, re-adding to library:', file.name);
            skipped++;
          }
          
          // Добавляем трек в библиотеку в любом случае (файл может существовать, но не быть в библиотеке)
          // Используем уникальный ID на основе имени файла и timestamp
          const uniqueId = `local_${file.name}_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`;
          const track = {
            id: uniqueId,
            title: file.name.replace(/\.(mp3|m4a|mp4)$/i, ''),
            artist: 'Unknown Artist',
            album: 'Imported',
            duration: 0,
            filePath: destPath,
            source: 'local' as const,
          };
          await addTrack(track);
          imported++;
          console.log('✅ [SETTINGS] Added to library:', file.name);
          
          setImportProgress({current: i + 1, total: musicFiles.length});
        } catch (error) {
          console.error('❌ [SETTINGS] Failed to import:', file.name, error);
        }
      }

      setImportProgress(null);
      await loadStorageInfo();
      
      const message = skipped > 0 
        ? `Added ${imported} tracks to library\n${skipped} files already existed on disk`
        : `Imported ${imported} new tracks`;
      Alert.alert('Success', message);
    } catch (error) {
      console.error('❌ [SETTINGS] Import failed:', error);
      setImportProgress(null);
      Alert.alert('Error', 'Failed to import music files');
    }
  };

  const handleImportSingleFile = async () => {
    try {
      console.log('📥 [SETTINGS] Starting single file import...');
      
      // Открываем выбор файла (используем openDocumentTree с allowMultiple = false)
      const result = await openDocumentTree(false);
      
      if (!result || !result.uri) {
        console.log('📥 [SETTINGS] File selection cancelled');
        return;
      }
      
      console.log('📥 [SETTINGS] Selected file:', result.uri);
      
      // Получаем имя файла из URI
      const fileName = result.uri.split('/').pop() || 'imported_track.mp3';
      const musicPath = storageService.getMusicFolderPath();
      const destPath = `${musicPath}/${fileName}`;
      
      // Проверяем дубликат
      const exists = await RNFS.exists(destPath);
      if (exists) {
        Alert.alert('Duplicate', 'This file already exists in your library');
        return;
      }
      
      await copyFile(result.uri, destPath);
      
      // Добавляем трек в библиотеку
      // Используем уникальный ID на основе имени файла и timestamp
      const uniqueId = `local_${fileName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const track = {
        id: uniqueId,
        title: fileName.replace(/\.(mp3|m4a|mp4)$/i, ''),
        artist: 'Unknown Artist',
        album: 'Imported',
        duration: 0,
        filePath: destPath,
        source: 'local' as const,
      };
      await addTrack(track);
      
      await loadStorageInfo();
      
      Alert.alert('Success', `Imported: ${fileName}`);
      console.log('✅ [SETTINGS] File imported and added to library:', fileName);
    } catch (error) {
      console.error('❌ [SETTINGS] Single file import failed:', error);
      Alert.alert('Error', 'Failed to import file');
    }
  };

  const handleSaveToken = async () => {
    if (!oauthToken || oauthToken.trim().length === 0) {
      Alert.alert('Ошибка', 'Введите OAuth токен');
      return;
    }

    setIsValidating(true);
    
    // Валидируем токен
    const isValid = await soundCloudAuthService.validateToken(oauthToken);
    
    if (isValid) {
      // Сохраняем токен
      const saved = await soundCloudAuthService.saveToken(oauthToken);
      if (saved) {
        setHasToken(true);
        Alert.alert('Успешно', 'OAuth токен сохранен и валиден!');
      }
    } else {
      Alert.alert('Ошибка', 'OAuth токен недействителен. Проверьте правильность токена.');
    }
    
    setIsValidating(false);
  };

  const handleClearToken = async () => {
    Alert.alert(
      'Удалить токен?',
      'Вы уверены, что хотите удалить OAuth токен?',
      [
        {text: 'Отмена', style: 'cancel'},
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            await soundCloudAuthService.clearToken();
            setOauthToken('');
            setHasToken(false);
            Alert.alert('Успешно', 'OAuth токен удален');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>

      {/* SoundCloud OAuth Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SoundCloud OAuth</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Вставьте OAuth токен здесь..."
          placeholderTextColor={colors.textSecondary}
          value={oauthToken}
          onChangeText={setOauthToken}
          autoCapitalize="none"
          autoCorrect={false}
          multiline={false}
        />
        
        <View style={styles.tokenButtons}>
          <TouchableOpacity 
            style={[styles.button, styles.buttonPrimary]} 
            onPress={handleSaveToken}
            disabled={isValidating}
          >
            <Text style={styles.buttonTextPrimary}>
              {isValidating ? 'Проверка...' : hasToken ? 'Обновить токен' : 'Сохранить токен'}
            </Text>
          </TouchableOpacity>
          
          {hasToken && (
            <TouchableOpacity 
              style={[styles.button, styles.buttonDanger]} 
              onPress={handleClearToken}
            >
              <Text style={styles.buttonTextDanger}>Удалить токен</Text>
            </TouchableOpacity>
          )}
        </View>

        {hasToken && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>✅ Токен активен</Text>
          </View>
        )}
      </View>


      {/* Storage Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storage</Text>
        
        <View style={styles.storageRow}>
          <Text style={styles.storageLabel}>Music Files</Text>
          <Text style={styles.storageValue}>{formatBytes(storageInfo.musicSize)}</Text>
        </View>
        
        <View style={styles.storageRow}>
          <Text style={styles.storageLabel}>Image Cache</Text>
          <Text style={styles.storageValue}>{formatBytes(storageInfo.cacheSize)}</Text>
        </View>
        
        <View style={styles.storageRow}>
          <Text style={styles.storageLabel}>Total Used</Text>
          <Text style={[styles.storageValue, {color: colors.accentPrimary}]}>
            {formatBytes(storageInfo.totalSize)}
          </Text>
        </View>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.button, styles.buttonPrimary, styles.buttonHalf]} onPress={handleClearCache}>
            <Text style={styles.buttonTextPrimary}>Clear Cache</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.button, styles.buttonDanger, styles.buttonHalf]} onPress={handleClearMusic}>
            <Text style={styles.buttonTextPrimary}>Delete Music</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Data Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>
        
        <TouchableOpacity 
          style={styles.buttonSecondary} 
          onPress={handleSyncLiked}
        >
          <Text style={styles.buttonSecondaryText}>🔄 Sync Liked Songs</Text>
          <Text style={styles.buttonDescription}>Update liked songs with downloaded files</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.buttonSecondary} 
          onPress={handleImportMusic}
          disabled={importProgress !== null || exportProgress !== null}
        >
          <Text style={styles.buttonSecondaryText}>Import Music</Text>
          <Text style={styles.buttonDescription}>Choose folder with MP3/M4A files</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.buttonSecondary} 
          onPress={handleExportMusic}
          disabled={importProgress !== null || exportProgress !== null}
        >
          <Text style={styles.buttonSecondaryText}>Export All Music</Text>
          <Text style={styles.buttonDescription}>Choose destination folder</Text>
        </TouchableOpacity>

        {/* Import Progress Bar */}
        {importProgress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>📥 Importing...</Text>
              <Text style={styles.progressText}>
                {importProgress.current} / {importProgress.total}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  {width: `${(importProgress.current / importProgress.total) * 100}%`}
                ]} 
              />
            </View>
            <Text style={styles.progressPercentage}>
              {Math.round((importProgress.current / importProgress.total) * 100)}%
            </Text>
          </View>
        )}

        {/* Export Progress Bar */}
        {exportProgress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>📤 Exporting...</Text>
              <Text style={styles.progressText}>
                {exportProgress.current} / {exportProgress.total}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  {width: `${(exportProgress.current / exportProgress.total) * 100}%`}
                ]} 
              />
            </View>
            <Text style={styles.progressPercentage}>
              {Math.round((exportProgress.current / exportProgress.total) * 100)}%
            </Text>
          </View>
        )}
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.storageRow}>
          <Text style={styles.storageLabel}>Version</Text>
          <Text style={styles.storageValue}>1.0.0</Text>
        </View>
      </View>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  languageButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: colors.radiusMd,
    backgroundColor: colors.bgTertiary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  languageButtonActive: {
    backgroundColor: colors.accentPrimary,
    borderColor: colors.accentPrimary,
  },
  languageText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  languageTextActive: {
    color: '#ffffff',
  },
  storageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.bgTertiary,
    borderRadius: colors.radiusMd,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  storageLabel: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  storageValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: colors.radiusMd,
    backgroundColor: colors.bgTertiary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sectionDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 16,
  },
  input: {
    backgroundColor: colors.bgTertiary,
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: colors.radiusMd,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  tokenButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonHalf: {
    flex: 1,
  },
  buttonPrimary: {
    backgroundColor: colors.accentPrimary,
  },
  buttonDanger: {
    flex: 1,
    backgroundColor: '#ff4444',
    borderColor: '#ff4444',
  },
  buttonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonTextDanger: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  statusBadge: {
    backgroundColor: '#22c55e20',
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: colors.radiusMd,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22c55e',
  },
  buttonSecondary: {
    backgroundColor: colors.bgSecondary,
    borderRadius: colors.radiusMd,
    borderWidth: 1,
    borderColor: colors.borderColor,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  buttonSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  buttonDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  progressContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.bgTertiary,
    borderRadius: colors.radiusMd,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  progressText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.bgSecondary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accentPrimary,
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default SettingsScreen;
