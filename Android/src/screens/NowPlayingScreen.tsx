import React, {memo, useState, useRef} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, Animated, PanResponder, Dimensions} from 'react-native';
import {colors} from '../theme/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
import {usePlayer} from '../contexts/PlayerContext';
import {useLibrary} from '../contexts/LibraryContext';
import {PlayIcon, PauseIcon, SkipBackIcon, SkipForwardIcon, HeartIcon, RepeatIcon, MusicIcon} from '../components/icons';
import {CachedImage} from '../components/CachedImage';

const NowPlayingScreen = memo(() => {
  const {currentTrack, isPlaying, position, duration, togglePlayback, skipToNext, skipToPrevious, seekTo, queue, currentIndex, isRepeat, setIsRepeat} = usePlayer();
  const {isLiked, toggleLike} = useLibrary();
  const [showQueue, setShowQueue] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;

  const liked = currentTrack ? isLiked(currentTrack.id) : false;
  const progress = duration > 0 ? (position / duration) * 100 : 0;
  
  const hasNext = currentIndex < queue.length - 1;
  const hasPrevious = currentIndex > 0;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // PanResponder для свайпа влево
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Активируем только при свайпе влево
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        // Только свайп влево (отрицательный dx)
        if (gestureState.dx < 0 && !showQueue) {
          translateX.setValue(gestureState.dx);
        }
        // Свайп вправо когда очередь открыта
        if (gestureState.dx > 0 && showQueue) {
          const newValue = -SCREEN_WIDTH + gestureState.dx;
          translateX.setValue(newValue);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        
        if (!showQueue) {
          // Если свайпнули влево больше чем на 100px, показываем очередь
          if (gestureState.dx < -100) {
            setShowQueue(true);
            Animated.spring(translateX, {
              toValue: -SCREEN_WIDTH,
              useNativeDriver: true,
            }).start();
          } else {
            // Возвращаем обратно
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        } else {
          // Если очередь открыта и свайпнули вправо, закрываем
          if (gestureState.dx > 100) {
            setShowQueue(false);
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          } else {
            // Возвращаем в открытое состояние
            Animated.spring(translateX, {
              toValue: -SCREEN_WIDTH,
              useNativeDriver: true,
            }).start();
          }
        }
      },
    })
  ).current;

  if (!currentTrack) {
    return (
      <View style={styles.emptyContainer}>
        <MusicIcon size={80} color={colors.textTertiary} />
        <Text style={styles.emptyText}>No track playing</Text>
        <Text style={styles.emptySubtext}>Play a track to see it here</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Wrapper для обеих страниц */}
      <Animated.View 
        style={[styles.pagesWrapper, {transform: [{translateX}]}]}
        {...panResponder.panHandlers}>
        {/* Левая страница - Main Content */}
        <View style={[styles.page, styles.mainContent]}>
          <View style={styles.content}>
          {/* Album Art - Full Screen */}
          <View style={styles.artworkContainer}>
            {currentTrack.artworkURL ? (
              <CachedImage uri={currentTrack.artworkURL} style={styles.artwork} />
            ) : (
              <View style={styles.artworkPlaceholder}>
                <MusicIcon size={120} color={colors.textTertiary} />
              </View>
            )}
          </View>

          {/* Track Info */}
          <View style={styles.trackInfo}>
            <Text style={styles.trackTitle} numberOfLines={2}>
              {currentTrack.title}
            </Text>
            <Text style={styles.trackArtist} numberOfLines={1}>
              {currentTrack.artist}
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <TouchableOpacity 
              style={styles.progressBarContainer}
              activeOpacity={0.8}
              onPress={(e) => {
                e.currentTarget.measure((x, y, width, height) => {
                  const {locationX} = e.nativeEvent;
                  const percent = locationX / width;
                  const newPosition = duration * percent;
                  seekTo(Math.max(0, Math.min(duration, newPosition)));
                });
              }}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, {width: `${progress}%`}]} />
                <View style={[styles.progressThumb, {left: `${progress}%`}]} />
              </View>
            </TouchableOpacity>
            
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(position)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>

          {/* Swipe indicator */}
          <View style={styles.swipeIndicator}>
            <Text style={styles.swipeText}>← Swipe left to view queue</Text>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            {/* Repeat */}
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => setIsRepeat(!isRepeat)}>
              <RepeatIcon size={28} color={isRepeat ? colors.accentPrimary : colors.textSecondary} />
            </TouchableOpacity>

            {/* Skip Previous */}
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={skipToPrevious}
              disabled={!hasPrevious}>
              <SkipBackIcon size={36} color={hasPrevious ? colors.textPrimary : colors.textTertiary} />
            </TouchableOpacity>

            {/* Play/Pause */}
            <TouchableOpacity
              style={styles.playButton}
              onPress={togglePlayback}>
              {isPlaying ? (
                <PauseIcon size={32} color="#ffffff" />
              ) : (
                <PlayIcon size={32} color="#ffffff" />
              )}
            </TouchableOpacity>

            {/* Skip Next */}
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={skipToNext}
              disabled={!hasNext}>
              <SkipForwardIcon size={36} color={hasNext ? colors.textPrimary : colors.textTertiary} />
            </TouchableOpacity>

            {/* Like */}
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => toggleLike(currentTrack)}>
              <HeartIcon size={28} color={liked ? colors.accentPrimary : colors.textSecondary} filled={liked} />
            </TouchableOpacity>
          </View>
          </View>
        </View>

        {/* Правая страница - Queue Panel */}
        <View style={[styles.page, styles.queuePanel]}>
        <View style={styles.queueHeader}>
          <Text style={styles.queueTitle}>Queue ({queue.length})</Text>
        </View>
        
        <ScrollView style={styles.queueList}>
          {queue.map((track, index) => (
            <View 
              key={`${track.id}-${index}`}
              style={[
                styles.queueItem,
                index === currentIndex && styles.queueItemActive
              ]}>
              <View style={styles.queueArtwork}>
                {track.artworkURL ? (
                  <CachedImage uri={track.artworkURL} style={styles.queueArtworkImage} />
                ) : (
                  <MusicIcon size={16} color={colors.textTertiary} />
                )}
              </View>
              <View style={styles.queueTrackInfo}>
                <Text 
                  style={[
                    styles.queueTrackTitle,
                    index === currentIndex && styles.queueTrackTitleActive
                  ]}
                  numberOfLines={1}>
                  {track.title}
                </Text>
                <Text style={styles.queueTrackArtist} numberOfLines={1}>
                  {track.artist}
                </Text>
              </View>
              {index === currentIndex && (
                <Text style={styles.nowPlayingBadge}>Playing</Text>
              )}
            </View>
          ))}
        </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    overflow: 'hidden',
  },
  pagesWrapper: {
    flexDirection: 'row',
    width: SCREEN_WIDTH * 2, // Две страницы рядом
    height: '100%',
  },
  page: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  mainContent: {
    backgroundColor: colors.bgPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 100, // Увеличиваем отступ снизу, чтобы не накладывались на меню
    justifyContent: 'flex-start',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgPrimary,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  artworkContainer: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 350,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.bgSecondary,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  artworkPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    marginBottom: 20,
    alignItems: 'center',
  },
  trackTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  trackArtist: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressBarContainer: {
    paddingVertical: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accentPrimary,
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accentPrimary,
    marginLeft: -6,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  controlButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accentPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: colors.accentPrimary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  swipeIndicator: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  swipeText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  queuePanel: {
    backgroundColor: colors.bgPrimary,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
  },
  queueTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  queueClose: {
    fontSize: 28,
    color: colors.textSecondary,
    paddingHorizontal: 8,
  },
  queueList: {
    flex: 1,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
  },
  queueItemActive: {
    backgroundColor: colors.bgSecondary,
  },
  queueArtwork: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.bgTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  queueArtworkImage: {
    width: '100%',
    height: '100%',
  },
  queueTrackInfo: {
    flex: 1,
    marginRight: 12,
  },
  queueTrackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  queueTrackTitleActive: {
    color: colors.accentPrimary,
  },
  queueTrackArtist: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  nowPlayingBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accentPrimary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(30, 215, 96, 0.1)',
    borderRadius: 4,
  },
});

export default NowPlayingScreen;
