import Sound from 'react-native-sound';

Sound.setCategory('Playback');

class PlayerService {
  private currentSound: Sound | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;
  }

  async loadTrack(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.currentSound) {
        this.currentSound.stop();
        this.currentSound.release();
        this.currentSound = null;
      }
      const sound = new Sound(url, '', (error) => {
        if (error) { reject(error); return; }
        this.currentSound = sound;
        resolve();
      });
    });
  }

  async play(onFinished?: () => void): Promise<void> {
    if (!this.currentSound) return;
    return new Promise((resolve, reject) => {
      this.currentSound!.play((success) => {
        if (success) {
          if (onFinished) onFinished();
          resolve();
        } else {
          reject(new Error('Playback failed'));
        }
      });
    });
  }

  async pause(): Promise<void> { this.currentSound?.pause(); }
  async stop(): Promise<void> { this.currentSound?.stop(); }
  isPlaying(): boolean { return this.currentSound?.isPlaying() || false; }
  getDuration(): number { return this.currentSound?.getDuration() || 0; }
  getCurrentTime(callback: (seconds: number) => void): void { this.currentSound?.getCurrentTime(callback); }
  setCurrentTime(seconds: number): void { this.currentSound?.setCurrentTime(seconds); }
  release(): void {
    this.currentSound?.stop();
    this.currentSound?.release();
    this.currentSound = null;
  }
}

export const playerService = new PlayerService();