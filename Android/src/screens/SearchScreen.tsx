import React, {useState, memo} from 'react';
import {View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert} from 'react-native';
import {colors} from '../theme/colors';
import {SearchIcon, MusicIcon, PlayIcon, HeartIcon} from '../components/icons';
import {spotifyService, Track} from '../services/SpotifyService';
import {soundCloudService} from '../services/SoundCloudService';
import {useLibrary} from '../contexts/LibraryContext';
import {useDownload} from '../contexts/DownloadContext';
import {usePlayer} from '../contexts/PlayerContext';
import {CachedImage} from '../components/CachedImage';
import AppHeader from '../components/AppHeader';

const SearchScreen = memo(() => {
  const [activeTab, setActiveTab] = useState<'spotify' | 'soundcloud'>('spotify');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLinkMode, setIsLinkMode] = useState(false);
  
  const {toggleLike, isLiked, isTrackInLibrary} = useLibrary();
  const {downloadTrack, isDownloading, isDownloaded, downloads, getDownloadStatus} = useDownload();
  const {playTrack} = usePlayer();

  const handleDownload = async (track: Track) => {
    try {
      await downloadTrack(track);
      // Убираем Alert - уведомление не нужно
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Проверяем, является ли запрос ссылкой
      const isUrl = searchQuery.includes('http://') || searchQuery.includes('https://');
      
      if (isUrl) {
        // Режим ссылки - получаем один трек
        let track: Track;
        
        if (searchQuery.includes('soundcloud.com')) {
          track = await soundCloudService.resolveTrack(searchQuery);
        } else if (searchQuery.includes('spotify.com') || searchQuery.includes('open.spotify.com')) {
          track = await spotifyService.resolveTrack(searchQuery);
        } else {
          throw new Error('Unsupported URL');
        }
        
        setSearchResults([track]);
        setIsLinkMode(true);
      } else {
        // Обычный поиск
        setIsLinkMode(false);
        
        if (activeTab === 'spotify') {
          const results = await spotifyService.search(searchQuery);
          setSearchResults(results);
        } else {
          const results = await soundCloudService.search(searchQuery);
          setSearchResults(results);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      
      // Определяем тип ошибки и показываем понятное сообщение
      let errorMessage = 'Could not complete search';
      
      if (error instanceof Error) {
        const errorStr = error.message.toLowerCase();
        
        if (errorStr.includes('network') || errorStr.includes('fetch') || errorStr.includes('timeout')) {
          errorMessage = activeTab === 'soundcloud' 
            ? 'SoundCloud is blocked in your region. Please use VPN or try Spotify search.'
            : 'Network error. Please check your connection.';
        } else if (errorStr.includes('401') || errorStr.includes('403')) {
          errorMessage = activeTab === 'soundcloud'
            ? 'SoundCloud API is blocked. Please enable VPN to search SoundCloud.'
            : 'Access denied. Please try again.';
        } else if (errorStr.includes('unsupported')) {
          errorMessage = 'Please paste a valid Spotify or SoundCloud link';
        } else {
          errorMessage = `Search failed: ${error.message}`;
        }
      }
      
      Alert.alert('Search Error', errorMessage, [
        {text: 'OK', style: 'cancel'},
        activeTab === 'soundcloud' && {
          text: 'Switch to Spotify',
          onPress: () => setActiveTab('spotify')
        }
      ].filter(Boolean) as any);
      
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <AppHeader />
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'spotify' && styles.tabActive]}
          onPress={() => setActiveTab('spotify')}>
          <Text style={[styles.tabText, activeTab === 'spotify' && styles.tabTextActive]}>
            Spotify
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'soundcloud' && styles.tabActive]}
          onPress={() => setActiveTab('soundcloud')}>
          <Text style={[styles.tabText, activeTab === 'soundcloud' && styles.tabTextActive]}>
            SoundCloud
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <SearchIcon size={18} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder={isLinkMode ? 'Paste Spotify or SoundCloud link...' : (activeTab === 'spotify' ? 'Search or paste link...' : 'Search or paste link...')}
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && !isSearching && (
          <TouchableOpacity 
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
        {isSearching && <ActivityIndicator size="small" color={colors.accentPrimary} />}
      </View>

      {/* SoundCloud VPN Notice */}
      {activeTab === 'soundcloud' && (
        <View style={styles.noticeContainer}>
          <Text style={styles.noticeText}>⚠️ SoundCloud may require VPN in some regions</Text>
        </View>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <ScrollView style={styles.resultsList} removeClippedSubviews={true}>
          {searchResults.map((track) => {
            const downloading = isDownloading(track.id);
            const downloaded = isDownloaded(track.id) || isTrackInLibrary(track.id);
            const downloadStatus = getDownloadStatus(track.id);

            return (
              <View key={track.id} style={styles.resultItem}>
                <TouchableOpacity 
                  style={styles.resultContent}
                  activeOpacity={0.7}
                  onPress={async () => {
                    if (downloaded) {
                      // Трек уже скачан - воспроизводим
                      const {downloadService} = await import('../services/DownloadService');
                      const filePath = await downloadService.getDownloadedTrackPath(track);
                      if (filePath) {
                        console.log('✅ [SEARCH] Playing downloaded track from:', filePath);
                        playTrack({...track, filePath});
                      } else {
                        console.log('⚠️ [SEARCH] File not found, re-downloading...');
                        await handleDownload(track);
                      }
                    } else if (downloading) {
                      // Уже скачивается - просим подождать (без Alert)
                      console.log('⏳ [SEARCH] Track is already downloading...');
                    } else {
                      // Трек не скачан - скачиваем автоматически
                      console.log('📥 [SEARCH] Auto-downloading track...');
                      try {
                        await handleDownload(track);
                        // После скачивания найдём файл и воспроизведём
                        const {downloadService} = await import('../services/DownloadService');
                        const filePath = await downloadService.getDownloadedTrackPath(track);
                        if (filePath) {
                          console.log('✅ [SEARCH] Auto-download complete, playing:', filePath);
                          playTrack({...track, filePath});
                        }
                      } catch (error) {
                        console.error('❌ [SEARCH] Auto-download failed:', error);
                        // Убираем Alert - уведомление не нужно
                      }
                    }
                  }}>
                  <CachedImage
                    uri={track.artworkURL || 'https://via.placeholder.com/60'}
                    style={styles.resultArtwork}
                  />
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultTitle} numberOfLines={1}>
                      {track.title}
                    </Text>
                    <Text style={styles.resultArtist} numberOfLines={1}>
                      {track.artist}
                    </Text>
                    {downloading && downloadStatus && (
                      <Text style={styles.progressText}>
                        {downloadStatus.message}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
                
                {/* Status Indicator (только показываем статус, не кнопка) */}
                {downloading && (
                  <ActivityIndicator size="small" color={colors.accentPrimary} style={styles.statusIndicator} />
                )}
                {downloaded && !downloading && (
                  <Text style={styles.downloadedText}>✓</Text>
                )}

                <TouchableOpacity 
                  style={styles.likeButton}
                  onPress={() => toggleLike(track)}>
                  <HeartIcon 
                    size={20} 
                    color={isLiked(track.id) ? colors.accentPrimary : colors.textSecondary} 
                    filled={isLiked(track.id)} 
                  />
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Empty State */}
      {!isSearching && searchResults.length === 0 && (
        <View style={styles.emptyState}>
          {activeTab === 'spotify' ? (
            <SearchIcon size={80} color={colors.textTertiary} />
          ) : (
            <MusicIcon size={80} color={colors.textTertiary} />
          )}
          <Text style={styles.emptyStateTitle}>Find your music</Text>
          <Text style={styles.emptyStateText}>
            {activeTab === 'spotify'
              ? 'Search by name — or paste a Spotify link above'
              : 'Search for tracks — full downloads available'}
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: colors.radiusMd,
    backgroundColor: colors.bgTertiary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  tabActive: {
    backgroundColor: colors.accentPrimary,
    borderColor: colors.accentPrimary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bgTertiary,
    borderRadius: colors.radiusMd,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    marginLeft: 12,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 18,
    color: colors.textTertiary,
    fontWeight: '300',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 24,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  resultArtwork: {
    width: 60,
    height: 60,
    borderRadius: colors.radiusSm,
    marginRight: 12,
    backgroundColor: colors.bgTertiary,
  },
  resultInfo: {
    flex: 1,
    marginRight: 12,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  resultArtist: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  resultDuration: {
    fontSize: 13,
    color: colors.textSecondary,
    marginRight: 12,
  },
  statusIndicator: {
    marginRight: 8,
  },
  downloadedText: {
    fontSize: 20,
    color: colors.accentPrimary,
    fontWeight: 'bold',
  },
  progressText: {
    fontSize: 11,
    color: colors.accentPrimary,
    marginTop: 2,
  },
  likeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noticeContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 153, 0, 0.1)',
    borderRadius: colors.radiusSm,
    borderLeftWidth: 3,
    borderLeftColor: '#ff9900',
  },
  noticeText: {
    fontSize: 12,
    color: '#ff9900',
    fontWeight: '500',
  },
});

export default SearchScreen;
