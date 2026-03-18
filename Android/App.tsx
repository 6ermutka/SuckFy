import React, {useEffect, useRef, useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StatusBar, View, StyleSheet} from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import Player from './src/components/Player';
import {colors} from './src/theme/colors';
import {LibraryProvider} from './src/contexts/LibraryContext';
import {DownloadProvider} from './src/contexts/DownloadContext';
import {PlayerProvider} from './src/contexts/PlayerContext';
import {storageService} from './src/services/StorageService';
import {soundCloudAuthService} from './src/services/SoundCloudAuthService';

function App() {
  // Хуки должны быть в одном порядке при каждом рендере
  const navigationRef = useRef<any>(null);
  const [currentRoute, setCurrentRoute] = useState<string>('Home');
  
  // Инициализация хранилища при запуске
  useEffect(() => {
    const initServices = async () => {
      console.log('🚀 [APP] Initializing services...');
      
      await storageService.initialize();
      console.log('✅ [APP] Storage service initialized');
      
      // Инициализируем кэш изображений
      const {imageCacheService} = await import('./src/services/ImageCacheService');
      await imageCacheService.initialize();
      console.log('✅ [APP] Image cache service initialized');

      // Загружаем сохраненный OAuth токен SoundCloud
      await soundCloudAuthService.loadToken();
      console.log('✅ [APP] SoundCloud auth service initialized');
      
      console.log('🎉 [APP] All services initialized successfully!');
    };
    
    initServices();
  }, []);

  return (
    <SafeAreaProvider>
      <LibraryProvider>
        <DownloadProvider>
          <PlayerProvider>
            <NavigationContainer
              ref={navigationRef}
              onStateChange={() => {
                const route = navigationRef.current?.getCurrentRoute();
                if (route?.name) {
                  setCurrentRoute(route.name);
                }
              }}>
              <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />
              <View style={styles.container}>
                <AppNavigator />
                {/* Плеер скрывается на экране NowPlaying */}
                {currentRoute !== 'NowPlaying' && <Player />}
              </View>
            </NavigationContainer>
          </PlayerProvider>
        </DownloadProvider>
      </LibraryProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
});

export default App;
