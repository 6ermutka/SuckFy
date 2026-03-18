import React, {useState, memo, useMemo, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput} from 'react-native';
import {colors} from '../theme/colors';
import {MusicIcon, PlayIcon, SearchIcon, ShuffleIcon, HeartIcon, TrashIcon} from '../components/icons';
import {useLibrary} from '../contexts/LibraryContext';
import {usePlayer} from '../contexts/PlayerContext';
import {CachedImage} from '../components/CachedImage';
import AppHeader from '../components/AppHeader';
import {Alert} from 'react-native';
import {downloadService} from '../services/DownloadService';
import {Track} from '../services/SpotifyService';

const LibraryScreen = memo(() => {
  const [filter, setFilter] = useState<'all' | 'spotify' | 'soundcloud' | 'local' | 'liked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const {tracks, likedSongs, isLiked, removeTrack} = useLibrary();
  const {playTrack, playTracks, currentTrack} = usePlayer();
  const [validatedTracks, setValidatedTracks] = useState<Track[]>([]);

  // Валидация треков - проверяем наличие filePath
  useEffect(() => {
    // ПРОСТАЯ ФИЛЬТРАЦИЯ: показываем только треки с filePath
    // Валидация через downloadService.getDownloadedTrackPath() ОТКЛЮЧЕНА - она блокирует UI
    setValidatedTracks(tracks.filter(t => t.filePath));
  }, [tracks]);

  // Фильтрация и поиск треков
  const filteredTracks = useMemo(() => {
    let filtered = validatedTracks;
    
    // Фильтр по источнику или liked
    if (filter === 'liked') {
      // Показываем только лайкнутые треки из library
      filtered = validatedTracks.filter(track => isLiked(track.id));
    } else if (filter !== 'all') {
      filtered = filtered.filter(track => track.source === filter);
    }
    
    // Поиск
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(track =>
        track.title.toLowerCase().includes(query) ||
        track.artist.toLowerCase().includes(query) ||
        track.album.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [validatedTracks, filter, searchQuery, isLiked]);

  // Воспроизведение всех треков
  const handlePlayAll = () => {
    console.log('▶️ [LIBRARY SCREEN] Play All clicked');
    console.log('▶️ [LIBRARY SCREEN] Filtered tracks:', filteredTracks.length);
    console.log('▶️ [LIBRARY SCREEN] First 3 tracks:', filteredTracks.slice(0, 3).map(t => ({title: t.title, hasPath: !!t.filePath})));
    
    if (filteredTracks.length > 0) {
      console.log('▶️ [LIBRARY SCREEN] Calling playTracks...');
      const startTime = Date.now();
      playTracks(filteredTracks, 0);
      console.log('▶️ [LIBRARY SCREEN] playTracks returned in', Date.now() - startTime, 'ms');
    } else {
      console.warn('⚠️ [LIBRARY SCREEN] No tracks to play');
    }
  };

  // Воспроизведение в случайном порядке
  const handleShuffle = () => {
    console.log('🔀 [LIBRARY SCREEN] Shuffle clicked');
    console.log('🔀 [LIBRARY SCREEN] Filtered tracks:', filteredTracks.length);
    
    if (filteredTracks.length > 0) {
      console.log('🔀 [LIBRARY SCREEN] Shuffling tracks...');
      const startTime = Date.now();
      const shuffled = [...filteredTracks].sort(() => Math.random() - 0.5);
      console.log('🔀 [LIBRARY SCREEN] Shuffled in', Date.now() - startTime, 'ms');
      console.log('🔀 [LIBRARY SCREEN] Calling playTracks...');
      const playStartTime = Date.now();
      playTracks(shuffled, 0);
      console.log('🔀 [LIBRARY SCREEN] playTracks returned in', Date.now() - playStartTime, 'ms');
    } else {
      console.warn('⚠️ [LIBRARY SCREEN] No tracks to shuffle');
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDeleteTrack = (track: any) => {
    Alert.alert(
      'Delete Track',
      `Are you sure you want to delete "${track.title}"? This will remove the file from your device.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeTrack(track.id);
              console.log('✅ [LIBRARY] Track deleted:', track.title);
            } catch (error) {
              console.error('❌ [LIBRARY] Failed to delete track:', error);
              Alert.alert('Error', 'Failed to delete track');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader />
      {/* Compact Header */}
      {tracks.length > 0 && (
        <>
          <View style={styles.headerCompact}>
            <View style={styles.headerLeft}>
              <MusicIcon size={24} color={colors.accentPrimary} />
              <View style={styles.headerInfo}>
                <Text style={styles.title}>Library</Text>
                <Text style={styles.stats}>{tracks.length} tracks</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.playButton} onPress={handlePlayAll}>
                <PlayIcon size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.shuffleButton} onPress={handleShuffle}>
                <ShuffleIcon size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <SearchIcon size={16} color={colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearButton}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filtersContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}>
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'liked' && styles.filterButtonActive]}
            onPress={() => setFilter('liked')}>
            <Text style={[styles.filterText, filter === 'liked' && styles.filterTextActive]}>Liked</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'spotify' && styles.filterButtonActive]}
            onPress={() => setFilter('spotify')}>
            <Text style={[styles.filterText, filter === 'spotify' && styles.filterTextActive]}>Spotify</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'soundcloud' && styles.filterButtonActive]}
            onPress={() => setFilter('soundcloud')}>
            <Text style={[styles.filterText, filter === 'soundcloud' && styles.filterTextActive]}>SC</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'local' && styles.filterButtonActive]}
            onPress={() => setFilter('local')}>
            <Text style={[styles.filterText, filter === 'local' && styles.filterTextActive]}>Local</Text>
          </TouchableOpacity>
        </View>
        </>
      )}

      {/* Empty Header */}
      {tracks.length === 0 && (
        <View style={styles.header}>
          <MusicIcon size={32} color={colors.accentPrimary} />
          <Text style={styles.title}>Library</Text>
          <Text style={styles.stats}>{tracks.length} tracks</Text>
        </View>
      )}

      {/* Track List */}
      {filteredTracks.length > 0 ? (
        <ScrollView style={styles.trackList} removeClippedSubviews={true}>
          {filteredTracks.map((track, index) => (
            <TouchableOpacity 
              key={`${track.id}-${index}`} 
              style={[styles.trackItem, currentTrack?.id === track.id && styles.trackItemActive]} 
              activeOpacity={0.7}
              onPress={() => {
                console.log('🎵 [LIBRARY] Track clicked:', track.title);
                console.log('🎵 [LIBRARY] Index:', index);
                console.log('🎵 [LIBRARY] Filtered tracks count:', filteredTracks.length);
                playTracks(filteredTracks, index);
              }}>
              <View style={styles.trackArtwork}>
                {track.artworkURL ? (
                  <CachedImage uri={track.artworkURL} style={styles.artworkImage} />
                ) : (
                  <View style={styles.artworkPlaceholder}>
                    <MusicIcon size={24} color={colors.textTertiary} />
                  </View>
                )}
                {/* Source Badge */}
                <View style={[styles.sourceBadge, track.source === 'soundcloud' && styles.soundcloudBadge]}>
                  <Text style={styles.sourceBadgeText}>
                    {track.source === 'soundcloud' ? 'SC' : track.source === 'local' ? 'L' : 'S'}
                  </Text>
                </View>
              </View>
              <View style={styles.trackInfo}>
                <Text 
                  style={[styles.trackTitle, currentTrack?.id === track.id && styles.trackTitleActive]} 
                  numberOfLines={1}>
                  {track.title}
                </Text>
                <Text style={styles.trackArtist} numberOfLines={1}>{track.artist}</Text>
              </View>
              <View style={styles.trackMeta}>
                {isLiked(track.id) && (
                  <HeartIcon size={16} color={colors.accentPrimary} filled />
                )}
                <Text style={styles.trackDuration}>{formatDuration(track.duration)}</Text>
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteTrack(track);
                  }}>
                  <TrashIcon size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : tracks.length === 0 ? (
        <View style={styles.emptyState}>
          <MusicIcon size={80} color={colors.textTertiary} />
          <Text style={styles.emptyStateTitle}>No tracks yet</Text>
          <Text style={styles.emptyStateText}>Search and download tracks to see them here</Text>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <SearchIcon size={64} color={colors.textTertiary} />
          <Text style={styles.emptyStateTitle}>No tracks found</Text>
          <Text style={styles.emptyStateText}>Try adjusting your search or filters</Text>
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
  header: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
  },
  headerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerInfo: {
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stats: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shuffleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.borderColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.bgSecondary,
    borderRadius: colors.radiusMd,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    marginLeft: 8,
  },
  clearButton: {
    fontSize: 18,
    color: colors.textTertiary,
    paddingHorizontal: 8,
  },
  filtersContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 6,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: colors.bgSecondary,
    borderRadius: colors.radiusSm,
    borderWidth: 1,
    borderColor: colors.borderColor,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.accentPrimary,
    borderColor: colors.accentPrimary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: '#ffffff',
  },
  trackList: {
    flex: 1,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: colors.radiusMd,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  trackItemActive: {
    backgroundColor: colors.bgTertiary,
    borderColor: colors.accentPrimary,
  },
  trackArtwork: {
    position: 'relative',
    width: 48,
    height: 48,
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  trackTitleActive: {
    color: colors.accentPrimary,
  },
  trackArtist: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  trackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackDuration: {
    fontSize: 13,
    color: colors.textSecondary,
    marginRight: 8,
  },
  deleteButton: {
    padding: 4,
  },
  artworkImage: {
    width: 48,
    height: 48,
    borderRadius: colors.radiusSm,
  },
  artworkPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: colors.radiusSm,
    backgroundColor: colors.bgTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sourceBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.accentPrimary,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.bgPrimary,
  },
  soundcloudBadge: {
    backgroundColor: '#ff5500',
  },
  sourceBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    gap: 24,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default LibraryScreen;
