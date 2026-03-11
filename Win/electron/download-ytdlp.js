const https = require('https');
const fs = require('fs');
const path = require('path');

const YTDLP_VERSION = '2024.12.23';
const YTDLP_URL = `https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp.exe`;
const YTDLP_PATH = path.join(__dirname, 'yt-dlp.exe');

console.log('[SuckFy] Downloading yt-dlp.exe...');

const file = fs.createWriteStream(YTDLP_PATH);

https.get(YTDLP_URL, {
  headers: {
    'User-Agent': 'Mozilla/5.0'
  }
}, (response) => {
  if (response.statusCode === 302 || response.statusCode === 301) {
    // Follow redirect
    https.get(response.headers.location, (redirectResponse) => {
      redirectResponse.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('[SuckFy] yt-dlp.exe downloaded successfully!');
        console.log('[SuckFy] Path:', YTDLP_PATH);
      });
    });
  } else {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('[SuckFy] yt-dlp.exe downloaded successfully!');
      console.log('[SuckFy] Path:', YTDLP_PATH);
    });
  }
}).on('error', (err) => {
  fs.unlink(YTDLP_PATH, () => {});
  console.error('[SuckFy] Error downloading yt-dlp:', err.message);
  process.exit(1);
});
