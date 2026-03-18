import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {colors} from '../theme/colors';
import {PlayIcon, PauseIcon, SkipBackIcon, SkipForwardIcon, HeartIcon, MusicIcon, RepeatIcon} from './icons';
import {usePlayer} from '../contexts/PlayerContext';
import {useLibrary} from '../contexts/LibraryContext';
import {CachedImage} from './CachedImage';

const Player: React.FC = () => {
  const {currentTrack, isPlaying, position, duration, togglePlayback, skipToNext, skipToPrevious, seekTo, queue, currentIndex, isRepeat, setIsRepeat} = usePlayer();
  const {isLiked, toggleLike} = useLibrary();

  // Не показываем плеер если нет текущего трека
  if (!currentTrack) {
    return null;
  }

  const liked = isLiked(currentTrack.id);
  const progress = duration > 0 ? (position / duration) * 100 : 0;
  
  // Проверяем доступность кнопок навигации
  const hasNext = currentIndex < queue.length - 1;
  const hasPrevious = currentIndex > 0;
  
  console.log('🎵 [PLAYER UI] Queue length:', queue.length);
  console.log('🎵 [PLAYER UI] Current index:', currentIndex);
  console.log('🎵 [PLAYER UI] Has next:', hasNext, 'Has previous:', hasPrevious);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.playerContainer}>
      <View style={styles.player}>
        {/* Track Info */}
        <View style={styles.trackInfo}>
          <View style={styles.artwork}>
            {currentTrack.artworkURL ? (
              <CachedImage uri={currentTrack.artworkURL} style={styles.artworkImage} />
            ) : (
              <MusicIcon size={20} color={colors.textTertiary} />
            )}
          </View>
          <View style={styles.trackDetails}>
            <Text style={styles.trackName} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text style={styles.artistName} numberOfLines={1}>
              {currentTrack.artist}
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {/* Repeat - крайняя левая */}
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => {
              console.log('🔁 [PLAYER] Repeat toggled:', !isRepeat);
              setIsRepeat(!isRepeat);
            }}>
            <RepeatIcon size={18} color={isRepeat ? colors.accentPrimary : colors.textSecondary} />
          </TouchableOpacity>

          {/* Skip Previous - слева от Play */}
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => {
              console.log('⏮️ [PLAYER] Skip to previous clicked');
              console.log('⏮️ [PLAYER] Has previous:', hasPrevious);
              console.log('⏮️ [PLAYER] Current index:', currentIndex);
              skipToPrevious();
            }}
            disabled={!hasPrevious}>
            <SkipBackIcon size={20} color={hasPrevious ? colors.textSecondary : colors.textTertiary} />
          </TouchableOpacity>

          {/* Play/Pause - центр */}
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => {
              console.log('🎵 Play/Pause clicked, current state:', isPlaying);
              togglePlayback();
            }}>
            {isPlaying ? (
              <PauseIcon size={18} color="#ffffff" />
            ) : (
              <PlayIcon size={18} color="#ffffff" />
            )}
          </TouchableOpacity>

          {/* Skip Next - справа от Play */}
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => {
              console.log('⏭️ [PLAYER] Skip to next clicked');
              console.log('⏭️ [PLAYER] Has next:', hasNext);
              console.log('⏭️ [PLAYER] Current index:', currentIndex);
              console.log('⏭️ [PLAYER] Queue length:', queue.length);
              skipToNext();
            }}
            disabled={!hasNext}>
            <SkipForwardIcon size={20} color={hasNext ? colors.textSecondary : colors.textTertiary} />
          </TouchableOpacity>

          {/* Like - крайняя правая */}
          <TouchableOpacity 
            style={styles.heartButton}
            onPress={() => toggleLike(currentTrack)}>
            <HeartIcon size={20} color={liked ? colors.accentPrimary : colors.textSecondary} filled={liked} />
          </TouchableOpacity>
        </View>
        
        {/* Progress Bar - Full Width */}
        <View style={styles.progressSection}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <TouchableOpacity 
            style={styles.progressBarContainer}
            activeOpacity={0.8}
            onPress={(e) => {
              // Используем более точный способ вычисления ширины
              e.currentTarget.measure((x, y, width, height) => {
                const {locationX} = e.nativeEvent;
                const percent = locationX / width;
                const newPosition = duration * percent;
                seekTo(Math.max(0, Math.min(duration, newPosition)));
              });
            }}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, {width: `${progress}%`}]} />
            </View>
          </TouchableOpacity>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  playerContainer: {
    position: 'absolute',
    bottom: 70,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  player: {
    flexDirection: 'column',
    backgroundColor: colors.bgTertiary,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderColorStrong,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.bgSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.borderColor,
    overflow: 'hidden',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  trackDetails: {
    flex: 1,
    minWidth: 0,
  },
  trackName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  artistName: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  progressBarContainer: {
    flex: 1,
    paddingVertical: 10, // Увеличиваем зону нажатия
  },
  progressBar: {
    height: 6, // Увеличиваем высоту полоски с 4px до 6px
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accentPrimary,
  },
  timeText: {
    fontSize: 11,
    color: colors.textSecondary,
    width: 40,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    marginBottom: 4,
    width: '100%',
  },
  controlButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accentPrimary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
});

export default Player;
