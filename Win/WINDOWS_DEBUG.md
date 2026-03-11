# 🐛 Отладка приложения на Windows

## Как открыть консоль разработчика (DevTools)

### В собранном приложении:

После установки и запуска `SuckFy.exe`:

1. **Нажмите F12** или **Ctrl+Shift+I**
2. Откроется панель разработчика
3. Перейдите на вкладку **Console**

### В режиме разработки:

DevTools открывается автоматически при запуске:
```powershell
npm run electron:dev
```

## Отладка yt-dlp

### Где смотреть логи:

1. **Откройте DevTools** (F12)
2. **Вкладка Console** - увидите:
   ```
   [SuckFy] ========== YT-DLP DEBUG ==========
   [SuckFy] Platform: win32
   [SuckFy] Is packaged: true
   [SuckFy] Resources path: C:\...\resources
   [SuckFy] Looking for yt-dlp at: C:\...\resources\yt-dlp.exe
   [SuckFy] File exists: true/false
   [SuckFy] Final YTDLP_PATH: ...
   ```

### Проверка вручную:

После сборки проверьте что файл есть:

```powershell
# Зайдите в папку где установлено приложение
cd "C:\Program Files\SuckFy"

# Проверьте наличие yt-dlp.exe
dir resources\yt-dlp.exe

# Или в распакованной версии
cd C:\Users\1\Desktop\testingsuckk-main\dist\win-unpacked
dir resources\yt-dlp.exe
```

### Если yt-dlp.exe не найден:

1. **Скопируйте вручную:**
   ```powershell
   copy electron\yt-dlp.exe dist\win-unpacked\resources\yt-dlp.exe
   ```

2. **Или используйте системный yt-dlp:**
   ```powershell
   # Установите yt-dlp глобально
   pip install yt-dlp
   
   # Или скачайте exe и добавьте в PATH
   ```

## Типичные ошибки

### ❌ "spawn yt-dlp ENOENT"
**Причина:** Файл yt-dlp.exe не найден

**Решение:**
1. Проверьте логи в Console (F12)
2. Убедитесь что файл есть в `resources\yt-dlp.exe`
3. Пересоберите с `npm run electron:build`

### ❌ Ошибки при загрузке с SoundCloud
**Решение:**
1. Откройте Console (F12)
2. Попробуйте скачать трек
3. Скопируйте все логи начинающиеся с `[SuckFy]`
4. Отправьте разработчику

## Полезные команды

### Просмотр логов в PowerShell:

```powershell
# Запустить приложение и увидеть логи
.\SuckFy.exe 2>&1 | Tee-Object -FilePath log.txt

# Логи сохранятся в log.txt
```

### Очистка кэша для тестирования:

```powershell
# Удалить все данные приложения
Remove-Item -Recurse -Force "$env:USERPROFILE\Documents\SuckFy"

# Удалить кэш electron-builder
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron-builder"
```
