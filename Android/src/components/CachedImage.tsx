// Cached Image Component - компонент с автокэшированием
import React, {useState, useEffect} from 'react';
import {Image, ImageProps, View} from 'react-native';
import {imageCacheService} from '../services/ImageCacheService';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
}

export const CachedImage: React.FC<CachedImageProps> = ({uri, style, ...props}) => {
  const [cachedUri, setCachedUri] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    
    const loadCachedImage = async () => {
      if (!uri) {
        setLoading(false);
        setError(true);
        return;
      }

      // Если это локальный файл, используем напрямую
      if (uri.startsWith('file://')) {
        if (isMounted) {
          setCachedUri(uri);
          setLoading(false);
        }
        return;
      }

      // Для HTTP URL пробуем закэшировать
      if (uri.startsWith('http')) {
        try {
          // Используем Promise.race с таймаутом для дополнительной защиты
          const timeoutPromise = new Promise<string>((resolve) => {
            setTimeout(() => resolve(''), 3000); // 3 секунды максимум
          });
          
          const cachePromise = imageCacheService.getCachedImage(uri);
          const cached = await Promise.race([cachePromise, timeoutPromise]);
          
          if (isMounted) {
            if (cached) {
              setCachedUri(cached);
              setError(false);
            } else {
              setError(true);
            }
            setLoading(false);
          }
        } catch (err) {
          if (isMounted) {
            setError(true);
            setLoading(false);
          }
        }
      } else {
        // Другие URI (например, локальные ресурсы)
        if (isMounted) {
          setCachedUri(uri);
          setLoading(false);
        }
      }
    };

    loadCachedImage();

    return () => {
      isMounted = false;
    };
  }, [uri]);

  // Если загрузка или ошибка, показываем пустой View с тем же стилем
  if (loading || error || !cachedUri) {
    return <View style={style} />;
  }

  return (
    <Image 
      {...props} 
      style={style}
      source={{uri: cachedUri}} 
      onError={() => setError(true)}
    />
  );
};
