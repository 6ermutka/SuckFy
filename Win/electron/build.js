const { execSync } = require('child_process');

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', shell: true });
}

run('node electron/download-ytdlp.js');
run('node electron/download-ffmpeg.js');
run('vite build');
run('electron-builder');
