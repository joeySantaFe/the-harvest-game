// Music track identifiers
export type MusicTrack = 'menu' | 'act1' | 'act2' | 'act3' | null;

// Map track names to file paths (use Vite's BASE_URL for GitHub Pages compatibility)
const base = import.meta.env.BASE_URL;
const MUSIC_TRACKS: Record<Exclude<MusicTrack, null>, string> = {
  menu: `${base}music/Deep_Space_Flow.mp3`,
  act1: `${base}music/Pixelated_Cosmos.mp3`,
  act2: `${base}music/Deep_Space_Flow.mp3`,
  act3: `${base}music/Pixelated_Cosmos.mp3`,
};

// Sound effect paths
const SFX_PATHS = {
  fueling: `${base}sfx/fueling.mp3`,
  backgroundHum: `${base}sfx/background-hum.mp3`,
  landing: `${base}sfx/landing.mp3`,
};

class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private thrusterGain: GainNode | null = null;
  private thrusterSource: AudioBufferSourceNode | null = null;
  private isMuted: boolean = false;
  private isThrusting: boolean = false;

  // Music playback
  private currentMusic: HTMLAudioElement | null = null;
  private currentTrack: MusicTrack = null;
  private musicVolume: number = 0.4;
  private fadeInterval: number | null = null;
  private musicStarted: boolean = false; // Track if music actually started
  private musicPaused: boolean = false; // Track if music is paused by user

  // Sound effects (looping)
  private backgroundHum: HTMLAudioElement | null = null;
  private fuelingSound: HTMLAudioElement | null = null;
  private sfxVolume: number = 0.5;

  init() {
    if (this.ctx) return;

    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.ctx.destination);

    // Initialize Thruster Loop
    this.createThrusterLoop();
  }

  // Create a continuous noise loop that runs forever but starts silent
  private createThrusterLoop() {
    if (!this.ctx || !this.masterGain) return;

    // Create a 2-second buffer of "Brownian" noise (Low frequency rumble)
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      // Brown noise integration: (last + random) / leak
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + (0.02 * white)) / 1.02;
      data[i] = lastOut * 3.5; // Compensate gain
      // Fade edges to prevent clicking on loop
      if (i < 500) data[i] *= i / 500;
      if (i > bufferSize - 500) data[i] *= (bufferSize - i) / 500;
    }

    this.thrusterSource = this.ctx.createBufferSource();
    this.thrusterSource.buffer = buffer;
    this.thrusterSource.loop = true;

    // Dedicated gain node for thrust to control volume smoothly
    this.thrusterGain = this.ctx.createGain();
    this.thrusterGain.gain.value = 0; // Start silent

    // Lowpass filter to make it sound like a rocket
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;

    this.thrusterSource.connect(filter);
    filter.connect(this.thrusterGain);
    this.thrusterGain.connect(this.masterGain);

    this.thrusterSource.start();
  }

  setThrust(active: boolean) {
    if (!this.ctx || !this.thrusterGain || this.isMuted) return;

    // Avoid redundant calls
    if (this.isThrusting === active) return;
    this.isThrusting = active;

    // Handle suspended context (browser autoplay policy)
    if (this.ctx.state === 'suspended') {
      // Resume is async - schedule the gain change after context resumes
      this.ctx.resume().then(() => {
        this.applyThrustGain(active);
      });
    } else {
      this.applyThrustGain(active);
    }
  }

  private applyThrustGain(active: boolean) {
    if (!this.ctx || !this.thrusterGain) return;

    const currentTime = this.ctx.currentTime;
    // Cancel any scheduled changes to take immediate control
    this.thrusterGain.gain.cancelScheduledValues(currentTime);

    if (active) {
      // Ramp UP: Quick attack (0.1s)
      // setTargetAtTime is the Web Audio equivalent of the "approach" math in your snippet
      this.thrusterGain.gain.setTargetAtTime(0.5, currentTime, 0.05);
    } else {
      // Ramp DOWN: Slower decay (0.2s) for engine wind-down
      this.thrusterGain.gain.setTargetAtTime(0, currentTime, 0.15);
    }
  }

  stopAll() {
    this.setThrust(false);
  }

  playTone(freq: number, type: OscillatorType, duration: number, vol = 0.2) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, this.ctx.currentTime);
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    o.connect(g);
    g.connect(this.masterGain);
    o.start();
    o.stop(this.ctx.currentTime + duration + 0.1);
  }

  playCountdown() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    // High pitch blip for timer
    this.playTone(1200, 'sine', 0.08, 0.1);
  }

  playExplosion() {
    this.setThrust(false); // Cut engines on death
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    
    // Noise Burst
    const duration = 0.8;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + duration);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.8, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    noise.start();
  }

  playSuccess() {
    this.setThrust(false);
    this.playTone(440, 'square', 0.1);
    setTimeout(() => this.playTone(554, 'square', 0.1), 100);
    setTimeout(() => this.playTone(659, 'square', 0.4), 200);
  }
  
  playDataProcessing() {
      if (!this.ctx || !this.masterGain || this.isMuted) return;
      const now = this.ctx.currentTime;
      // Quick chirps
      for(let i=0; i<5; i++) {
          this.playTone(2000 + Math.random()*1000, 'sine', 0.05, 0.05);
      }
  }

  playTypewriter() {
      if (!this.ctx || !this.masterGain || this.isMuted) return;
      // Very short, high pitch click
      this.playTone(800, 'square', 0.03, 0.05);
  }

  // --- RipOff Game Sounds ---

  playLaser() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    o.type = 'sawtooth';
    o.frequency.setValueAtTime(800, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.15);

    g.gain.setValueAtTime(0.3, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    o.connect(g);
    g.connect(this.masterGain);
    o.start();
    o.stop(this.ctx.currentTime + 0.2);
  }

  playEnemyLaser() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    o.type = 'square';
    o.frequency.setValueAtTime(200, this.ctx.currentTime);
    o.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.2);

    g.gain.setValueAtTime(0.2, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    o.connect(g);
    g.connect(this.masterGain);
    o.start();
    o.stop(this.ctx.currentTime + 0.2);
  }

  playShieldActivate() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    // Rising arpeggio
    this.playTone(880, 'sine', 0.1, 0.2);
    setTimeout(() => this.playTone(1760, 'sine', 0.3, 0.2), 100);
  }

  playExtraLife() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    // Victory jingle
    this.playTone(440, 'square', 0.1, 0.2);
    setTimeout(() => this.playTone(880, 'square', 0.3, 0.2), 150);
  }

  playTracking() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    // Menacing targeting lock-on sound - two quick high beeps
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    o.type = 'square';
    o.frequency.setValueAtTime(1200, this.ctx.currentTime);
    o.frequency.setValueAtTime(1400, this.ctx.currentTime + 0.08);

    g.gain.setValueAtTime(0.15, this.ctx.currentTime);
    g.gain.setValueAtTime(0.01, this.ctx.currentTime + 0.07);
    g.gain.setValueAtTime(0.15, this.ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.01, this.ctx.currentTime + 0.15);

    o.connect(g);
    g.connect(this.masterGain);
    o.start();
    o.stop(this.ctx.currentTime + 0.2);
  }

  // --- Music Playback ---

  playMusic(track: MusicTrack, fadeIn: boolean = true) {
    // If same track and already started, don't restart
    if (track === this.currentTrack && this.musicStarted) return;

    // Clear any ongoing fade
    if (this.fadeInterval !== null) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }

    // Stop current music with fade out
    if (this.currentMusic && this.currentTrack !== track) {
      const oldMusic = this.currentMusic;
      this.fadeOut(oldMusic, 500, () => {
        oldMusic.pause();
        oldMusic.src = '';
      });
      this.currentMusic = null;
    }

    this.currentTrack = track;
    this.musicStarted = false;
    this.musicPaused = false;

    if (!track) {
      this.currentMusic = null;
      return;
    }

    // Create new audio element if needed
    if (!this.currentMusic || this.currentMusic.src !== MUSIC_TRACKS[track]) {
      const audio = new Audio(MUSIC_TRACKS[track]);
      audio.loop = true;
      audio.volume = fadeIn ? 0 : (this.isMuted ? 0 : this.musicVolume);
      this.currentMusic = audio;
    }

    this.currentMusic.play().then(() => {
      this.musicStarted = true;
      if (fadeIn && !this.isMuted) {
        this.fadeIn(this.currentMusic!, 1000);
      }
    }).catch(err => {
      // Autoplay blocked - will retry on user interaction
      console.log('Music autoplay blocked, waiting for user interaction');
      this.musicStarted = false;
    });
  }

  private fadeIn(audio: HTMLAudioElement, duration: number) {
    const targetVolume = this.musicVolume;
    const steps = 20;
    const stepTime = duration / steps;
    const volumeStep = targetVolume / steps;
    let currentStep = 0;

    this.fadeInterval = window.setInterval(() => {
      currentStep++;
      audio.volume = Math.min(volumeStep * currentStep, targetVolume);

      if (currentStep >= steps) {
        if (this.fadeInterval !== null) {
          clearInterval(this.fadeInterval);
          this.fadeInterval = null;
        }
      }
    }, stepTime);
  }

  private fadeOut(audio: HTMLAudioElement, duration: number, onComplete?: () => void) {
    const startVolume = audio.volume;
    const steps = 20;
    const stepTime = duration / steps;
    const volumeStep = startVolume / steps;
    let currentStep = 0;

    const fadeId = window.setInterval(() => {
      currentStep++;
      audio.volume = Math.max(startVolume - (volumeStep * currentStep), 0);

      if (currentStep >= steps) {
        clearInterval(fadeId);
        onComplete?.();
      }
    }, stepTime);
  }

  stopMusic(fadeOut: boolean = true) {
    if (!this.currentMusic) return;

    if (fadeOut) {
      const music = this.currentMusic;
      this.fadeOut(music, 500, () => {
        music.pause();
        music.src = '';
      });
    } else {
      this.currentMusic.pause();
      this.currentMusic.src = '';
    }

    this.currentMusic = null;
    this.currentTrack = null;
  }

  setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.currentMusic && !this.isMuted) {
      this.currentMusic.volume = this.musicVolume;
    }
  }

  getMusicVolume(): number {
    return this.musicVolume;
  }

  getCurrentTrack(): MusicTrack {
    return this.currentTrack;
  }

  // Update mute to also affect music
  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.currentMusic) {
      this.currentMusic.volume = muted ? 0 : this.musicVolume;
    }
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  // Pause music (for game pause)
  pauseMusic() {
    if (this.currentMusic && !this.currentMusic.paused) {
      this.currentMusic.pause();
      this.musicPaused = true;
    }
  }

  // Resume music on user interaction (for autoplay policy) or after pause
  resumeMusic() {
    if (!this.currentMusic || !this.currentTrack) return;

    // If music was paused by user or blocked by autoplay
    if (this.currentMusic.paused) {
      this.currentMusic.play().then(() => {
        this.musicStarted = true;
        this.musicPaused = false;
        // If volume is 0, fade in
        if (this.currentMusic && this.currentMusic.volume === 0 && !this.isMuted) {
          this.fadeIn(this.currentMusic, 500);
        }
      }).catch(() => {
        // Still blocked
      });
    }
  }

  // Check if music needs to be started (for user interaction trigger)
  tryStartMusic() {
    if (this.currentTrack && !this.musicStarted && this.currentMusic) {
      this.currentMusic.play().then(() => {
        this.musicStarted = true;
        if (!this.isMuted) {
          this.fadeIn(this.currentMusic!, 1000);
        }
      }).catch(() => {});
    }
  }

  isMusicPlaying(): boolean {
    return this.musicStarted && !this.musicPaused && this.currentMusic !== null && !this.currentMusic.paused;
  }

  // --- Sound Effects (Act 1) ---

  // Background hum - loops while ship is flying (not on pad)
  startBackgroundHum() {
    if (this.isMuted) return;
    if (this.backgroundHum && !this.backgroundHum.paused) return; // Already playing

    if (!this.backgroundHum) {
      this.backgroundHum = new Audio(SFX_PATHS.backgroundHum);
      this.backgroundHum.loop = true;
      this.backgroundHum.volume = 0;
    }

    this.backgroundHum.play().then(() => {
      // Fade in
      if (this.backgroundHum) {
        this.backgroundHum.volume = 0;
        const fadeIn = setInterval(() => {
          if (this.backgroundHum && this.backgroundHum.volume < this.sfxVolume * 0.6) {
            this.backgroundHum.volume = Math.min(this.backgroundHum.volume + 0.05, this.sfxVolume * 0.6);
          } else {
            clearInterval(fadeIn);
          }
        }, 50);
      }
    }).catch(() => {});
  }

  stopBackgroundHum() {
    if (!this.backgroundHum) return;

    // Fade out
    const fadeOut = setInterval(() => {
      if (this.backgroundHum && this.backgroundHum.volume > 0.05) {
        this.backgroundHum.volume = Math.max(this.backgroundHum.volume - 0.05, 0);
      } else {
        clearInterval(fadeOut);
        if (this.backgroundHum) {
          this.backgroundHum.pause();
          this.backgroundHum.currentTime = 0;
        }
      }
    }, 50);
  }

  // Fueling sound - loops while refueling
  startFueling() {
    if (this.isMuted) return;
    if (this.fuelingSound && !this.fuelingSound.paused) return; // Already playing

    if (!this.fuelingSound) {
      this.fuelingSound = new Audio(SFX_PATHS.fueling);
      this.fuelingSound.loop = true;
      this.fuelingSound.volume = this.sfxVolume * 0.7;
    }

    this.fuelingSound.play().catch(() => {});
  }

  stopFueling() {
    if (!this.fuelingSound) return;
    this.fuelingSound.pause();
    this.fuelingSound.currentTime = 0;
  }

  // Landing sound - one-shot when landing on pad
  playLanding() {
    if (this.isMuted) return;

    const sound = new Audio(SFX_PATHS.landing);
    sound.volume = this.sfxVolume;
    sound.play().catch(() => {});
  }

  // Stop all Act 1 SFX (for cleanup)
  stopAct1Sfx() {
    this.stopBackgroundHum();
    this.stopFueling();
  }
}

export const audioService = new AudioService();