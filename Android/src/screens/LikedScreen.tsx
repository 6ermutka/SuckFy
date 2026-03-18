import React, {memo, useState, useMemo} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput} from 'react-native';
import {colors} from '../theme/colors';
import {HeartIcon, PlayIcon, SearchIcon, MusicIcon, ShuffleIcon} from '../components/icons';
import {useLibrary} from '../contexts/LibraryContext';
import {usePlayer} from '../contexts/PlayerContext';
import {CachedImage} from '../components/CachedImage';
import {Track} from '../services/SpotifyService';
import AppHeader from '../components/AppHeader';

const LikedScreen = memo(() => {
  const {likedSongs, toggleLike} = useLibrary();
  const {playTrack, playTracks, currentTrack} = usePlayer();
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'spotify' | 'soundcloud' | 'local'>('all');

  // Фильтрация и поиск
  const filteredSongs = useMemo(() => {
    let filtered = likedSongs;
    
    // Фильтр по источнику
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(track => track.source === sourceFilter);
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
  }, [likedSongs, sourceFilter, searchQuery]);

  // Воспроизведение всех треков
  const handlePlayAll = () => {
    console.log('🔴 [LIKED] handlePlayAll called!');
    console.log('🔴 [LIKED] Filtered songs:', filteredSongs.length);
    console.log('🔴 [LIKED] playTracks function exists?', typeof playTracks);
    if (filteredSongs.length > 0) {
      playTracks(filteredSongs, 0);
    }
  };

  // Воспроизведение в случайном порядке
  const handleShuffle = () => {
    console.log('🔴 [LIKED] handleShuffle called!');
    console.log('🔴 [LIKED] Filtered songs:', filteredSongs.length);
    console.log('🔴 [LIKED] playTracks function exists?', typeof playTracks);
    if (filteredSongs.length > 0) {
      const shuffled = [...filteredSongs].sort(() => Math.random() - 0.5);
      playTracks(shuffled, 0);
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
      {/* Compact Header with Search */}
      {likedSongs.length > 0 && (
        <>
          <View style={styles.headerCompact}>
            <View style={styles.headerLeft}>
              <HeartIcon size={24} color={colors.accentPrimary} filled />
              <View style={styles.headerInfo}>
                <Text style={styles.headerTitle}>Liked Songs</Text>
                <Text style={styles.headerSubtitle}>{likedSongs.length} tracks</Text>
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
              style={[styles.filterButton, sourceFilter === 'all' && styles.filterButtonActive]}
              onPress={() => setSourceFilter('all')}>
              <Text style={[styles.filterText, sourceFilter === 'all' && styles.filterTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, sourceFilter === 'spotify' && styles.filterButtonActive]}
              onPress={() => setSourceFilter('spotify')}>
              <Text style={[styles.filterText, sourceFilter === 'spotify' && styles.filterTextActive]}>
                Spotify
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, sourceFilter === 'soundcloud' && styles.filterButtonActive]}
              onPress={() => setSourceFilter('soundcloud')}>
              <Text style={[styles.filterText, sourceFilter === 'soundcloud' && styles.filterTextActive]}>
                SC
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, sourceFilter === 'local' && styles.filterButtonActive]}
              onPress={() => setSourceFilter('local')}>
              <Text style={[styles.filterText, sourceFilter === 'local' && styles.filterTextActive]}>
                Local
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Empty Header for empty state */}
      {likedSongs.length === 0 && (
        <View style={styles.header}>
          <HeartIcon size={32} color={colors.accentPrimary} filled />
          <Text style={styles.headerTitle}>Liked Songs</Text>
          <Text style={styles.headerSubtitle}>{likedSongs.length} tracks</Text>
        </View>
      )}

      {/* Liked Songs List */}
      {filteredSongs.length === 0 && likedSongs.length === 0 ? (
        <View style={styles.emptyState}>
          <HeartIcon size={64} color={colors.textTertiary} />
          <Text style={styles.emptyText}>No liked songs yet</Text>
          <Text style={styles.emptySubtext}>
            Tap the heart icon on tracks to add them here
          </Text>
        </View>
      ) : filteredSongs.length === 0 ? (
        <View style={styles.emptyState}>
          <SearchIcon size={64} color={colors.textTertiary} />
          <Text style={styles.emptyText}>No tracks found</Text>
          <Text style={styles.emptySubtext}>
            Try adjusting your search or filters
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.tracksList}>
          {filteredSongs.map((track, index) => {
            const isPlaying = currentTrack?.id === track.id;
            
            return (
              <TouchableOpacity
                key={`${track.id}-${index}`}
                style={[styles.trackItem, isPlaying && styles.trackItemActive]}
                onPress={() => {
                  console.log('🎵 [LIKED] Track clicked:', track.title);
                  console.log('🎵 [LIKED] Index:', index);
                  console.log('🎵 [LIKED] Filtered songs count:', filteredSongs.length);
                  playTracks(filteredSongs, index);
                }}
                activeOpacity={0.7}>
                {/* Artwork */}
                <View style={styles.artworkContainer}>
                  {track.artworkURL ? (
                    <CachedImage
                      uri={track.artworkURL}
                      style={styles.artwork}
                    />
                  ) : (
                    <View style={styles.artworkPlaceholder}>
                      <HeartIcon size={20} color={colors.textTertiary} filled />
                    </View>
                  )}
                  {/* Source Badge */}
                  <View style={[styles.sourceBadge, track.source === 'soundcloud' && styles.soundcloudBadge]}>
                    <Text style={styles.sourceBadgeText}>
                      {track.source === 'soundcloud' ? 'SC' : track.source === 'local' ? 'L' : 'S'}
                    </Text>
                  </View>
                </View>

                {/* Track Info */}
                <View style={styles.trackInfo}>
                  <Text
                    style={[styles.trackTitle, isPlaying && styles.trackTitleActive]}
                    numberOfLines={1}>
                    {track.title}
                  </Text>
                  <Text style={styles.trackArtist} numberOfLines={1}>
                    {track.artist}
                  </Text>
                </View>

                {/* Duration */}
                <Text style={styles.duration}>{formatDuration(track.duration)}</Text>

                {/* Like Button */}
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleLike(track);
                  }}
                  style={styles.likeButton}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                  <HeartIcon size={20} color={colors.accentPrimary} filled />
                </TouchableOpacity>

              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  tracksList: {
    flex: 1,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    backgroundColor: colors.bgSecondary,
    borderRadius: colors.radiusMd,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  trackItemActive: {
    backgroundColor: colors.bgTertiary,
    borderColor: colors.accentPrimary,
  },
  artworkContainer: {
    position: 'relative',
    width: 48,
    height: 48,
  },
  artwork: {
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
  trackInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
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
    fontSize: 13,
    color: colors.textSecondary,
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
  duration: {
    fontSize: 12,
    color: colors.textTertiary,
    marginRight: 12,
  },
  likeButton: {
    padding: 4,
  },
});

export default LikedScreen;
