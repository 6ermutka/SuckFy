import React, {memo, useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {colors} from '../theme/colors';
import {MusicIcon, PlayIcon} from '../components/icons';
import {useLibrary} from '../contexts/LibraryContext';
import {usePlayer} from '../contexts/PlayerContext';
import {Track} from '../services/SpotifyService';
import {CachedImage} from '../components/CachedImage';
import AppHeader from '../components/AppHeader';
import {downloadService} from '../services/DownloadService';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Доброе утро';
  if (hour < 17) return 'Добрый день';
  return 'Добрый вечер';
};

// Мемоизированный компонент карточки трека для оптимизации
const TrackCard = memo(({track, onPress}: {track: Track; onPress: () => void}) => (
  <TouchableOpacity style={styles.trackCard} activeOpacity={0.7} onPress={onPress}>
    <View style={styles.trackCardImage}>
      {track.artworkURL ? (
        <CachedImage uri={track.artworkURL} style={styles.artworkImage} />
      ) : (
        <MusicIcon size={40} color={colors.textTertiary} />
      )}
      <View style={styles.playButton}>
        <PlayIcon size={14} color="#000000" />
      </View>
    </View>
    <View style={styles.trackCardInfo}>
      <Text style={styles.trackCardTitle} numberOfLines={1}>{track.title}</Text>
      <Text style={styles.trackCardArtist} numberOfLines={1}>{track.artist}</Text>
    </View>
  </TouchableOpacity>
));

const HomeScreen = memo(() => {
  const {recentlyPlayed, likedSongs} = useLibrary();
  const {playTrack, playTracks} = usePlayer();
  const [validRecentlyPlayed, setValidRecentlyPlayed] = useState<Track[]>([]);
  const [validLikedSongs, setValidLikedSongs] = useState<Track[]>([]);

  // Проверяем и обновляем filePath для треков при загрузке
  useEffect(() => {
    // ПРОСТАЯ ФИЛЬТРАЦИЯ: показываем только треки с filePath
    // Валидация через RNFS.exists() ОТКЛЮЧЕНА - она блокирует UI
    setValidRecentlyPlayed(recentlyPlayed.filter(t => t.filePath));
    setValidLikedSongs(likedSongs.filter(t => t.filePath));
  }, [recentlyPlayed, likedSongs]);

  return (
    <View style={styles.container}>
      <AppHeader />
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.contentContainer}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={6}
      windowSize={5}
    >
      <Text style={styles.greeting}>{getGreeting()}</Text>

      {/* Recently Played Section */}
      {validRecentlyPlayed.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently Played</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.horizontalScroll}
            removeClippedSubviews={true}
            decelerationRate="fast"
          >
            {validRecentlyPlayed.slice(0, 10).map((track, index) => (
              <TrackCard key={`${track.id}-${index}`} track={track} onPress={() => playTracks(validRecentlyPlayed, index)} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Liked Songs Section */}
      {validLikedSongs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Liked Songs</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.horizontalScroll}
            removeClippedSubviews={true}
            decelerationRate="fast"
          >
            {validLikedSongs.slice(0, 10).map((track, index) => (
              <TrackCard key={`liked-${track.id}-${index}`} track={track} onPress={() => playTracks(validLikedSongs, index)} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Empty State */}
      {validRecentlyPlayed.length === 0 && validLikedSongs.length === 0 && (
        <View style={styles.emptyState}>
          <MusicIcon size={80} color={colors.textTertiary} />
          <Text style={styles.emptyStateTitle}>Start discovering music</Text>
          <Text style={styles.emptyStateText}>Search for tracks and add them to your library</Text>
        </View>
      )}
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
  },
  greeting: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  horizontalScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  trackCard: {
    width: 150,
    marginRight: 16,
    padding: 12,
    backgroundColor: colors.bgTertiary,
    borderRadius: colors.radiusLg,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  trackCardImage: {
    width: 126,
    height: 126,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    marginBottom: 10,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 44,
    height: 44,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 8,
  },
  trackCardInfo: {
    gap: 4,
  },
  trackCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  trackCardArtist: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  artworkImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
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

export default HomeScreen;
