// PlaybackService - фоновый обработчик событий для react-native-track-player
// Этот модуль запускается в отдельном фоновом потоке Android/iOS
// и обрабатывает события управления медиа даже когда приложение свёрнуто
import TrackPlayer, {Event} from 'react-native-track-player';

module.exports = async function () {
  // Кнопка Play в уведомлении / наушниках
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  // Кнопка Pause
  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  // Кнопка Next
  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    TrackPlayer.skipToNext();
  });

  // Кнопка Previous
  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    TrackPlayer.skipToPrevious();
  });

  // Стоп
  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    TrackPlayer.destroy();
  });

  // Перемотка (если поддерживается)
  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    TrackPlayer.seekTo(event.position);
  });
};
