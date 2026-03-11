const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Download ffmpeg essentials build for Windows
const FFMPEG_VERSION = '7.1';
const FFMPEG_URL = `https://github.com/GyanD/codexffmpeg/releases/download/${FFMPEG_VERSION}/ffmpeg-${FFMPEG_VERSION}-essentials_build.zip`;
const DOWNLOAD_PATH = path.join(__dirname, 'ffmpeg.zip');
const EXTRACT_DIR = path.join(__dirname, 'ffmpeg-temp');
const FFMPEG_FINAL_PATH = path.join(__dirname, 'ffmpeg.exe');

console.log('[SuckFy] Downloading ffmpeg...');

function downloadFile(url, dest, callback) {
  // Clean up any leftover zip from previous failed attempt
  if (fs.existsSync(dest)) {
    fs.unlinkSync(dest);
  }

  const file = fs.createWriteStream(dest);

  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
    if (response.statusCode === 301 || response.statusCode === 302) {
      file.close(() => {
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        downloadFile(response.headers.location, dest, callback);
      });
      response.resume();
      return;
    }

    if (response.statusCode !== 200) {
      file.close(() => {
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        callback(new Error(`HTTP ${response.statusCode}`));
      });
      response.resume();
      return;
    }

    response.pipe(file);

    file.on('finish', () => {
      // Wait for the file handle to be fully released before proceeding
      file.close((err) => {
        if (err) {
          callback(err);
        } else {
          callback(null);
        }
      });
    });
  }).on('error', (err) => {
    file.close(() => {
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      callback(err);
    });
  });
}

downloadFile(FFMPEG_URL, DOWNLOAD_PATH, (err) => {
  if (err) {
    console.error('[SuckFy] Error downloading ffmpeg:', err.message);
    process.exit(1);
  }
  console.log('[SuckFy] ffmpeg downloaded successfully!');
  extractFFmpeg();
});

function extractFFmpeg() {
  try {
    console.log('[SuckFy] Extracting ffmpeg...');

    // Clean up leftover temp dir from previous failed attempt
    if (fs.existsSync(EXTRACT_DIR)) {
      fs.rmSync(EXTRACT_DIR, { recursive: true, force: true });
    }

    // Use PowerShell to extract zip on Windows
    const command = `powershell -command "Expand-Archive -Path '${DOWNLOAD_PATH}' -DestinationPath '${EXTRACT_DIR}' -Force"`;
    execSync(command, { stdio: 'inherit' });

    // Find ffmpeg.exe in extracted files (it's usually in a versioned subfolder under bin/)
    const entries = fs.readdirSync(EXTRACT_DIR);
    if (entries.length === 0) {
      throw new Error('Extracted archive is empty — extraction may have failed');
    }
    const extractedDir = entries[0];
    const ffmpegSource = path.join(EXTRACT_DIR, extractedDir, 'bin', 'ffmpeg.exe');

    if (!fs.existsSync(ffmpegSource)) {
      throw new Error(`ffmpeg.exe not found at expected path: ${ffmpegSource}`);
    }

    // Copy to electron directory
    fs.copyFileSync(ffmpegSource, FFMPEG_FINAL_PATH);

    // Cleanup
    fs.unlinkSync(DOWNLOAD_PATH);
    fs.rmSync(EXTRACT_DIR, { recursive: true, force: true });

    console.log('[SuckFy] ffmpeg.exe extracted successfully!');
    console.log('[SuckFy] Path:', FFMPEG_FINAL_PATH);
  } catch (err) {
    console.error('[SuckFy] Error extracting ffmpeg:', err.message);
    process.exit(1);
  }
}
