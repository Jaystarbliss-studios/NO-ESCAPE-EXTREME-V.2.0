import { GameSettings } from './types';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private ambientGain: GainNode | null = null;
  private ambientOsc1: OscillatorNode | null = null;
  private ambientOsc2: OscillatorNode | null = null;
  private isRunningAmbient = false;
  private currentNightMode = false;
  private settings: GameSettings = {
    musicVolume: 65,
    sfxVolume: 80,
    muted: false,
    dayDuration: 90,
    nightDuration: 45,
    transitionDuration: 3,
    nightVisionRadius: 3.2,
    controlSensitivity: 1,
    touchLayout: 'joystick',
    graphicsQuality: 'high',
    reducedMotion: false,
    screenShake: true,
  };
  private lastFootstepTime = 0;

  public configure(settings: GameSettings): void {
    this.settings = settings;
    this.updateAmbientTone(this.currentNightMode);
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getSfxVolume(scale = 1): number {
    if (this.settings.muted) return 0;
    return (this.settings.sfxVolume / 100) * 0.25 * scale;
  }

  private getMusicVolume(): number {
    if (this.settings.muted) return 0;
    return (this.settings.musicVolume / 100) * 0.08;
  }

  public startAmbient(isNight: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.currentNightMode = isNight;

    if (!this.isRunningAmbient) {
      try {
        this.ambientGain = ctx.createGain();
        this.ambientGain.gain.value = this.getMusicVolume();
        this.ambientGain.connect(ctx.destination);

        this.ambientOsc1 = ctx.createOscillator();
        this.ambientOsc2 = ctx.createOscillator();
        this.ambientOsc1.type = 'sine';
        this.ambientOsc2.type = 'triangle';

        this.ambientOsc1.frequency.value = isNight ? 55 : 110;
        this.ambientOsc2.frequency.value = isNight ? 82.4 : 164.8;

        this.ambientOsc1.connect(this.ambientGain);
        this.ambientOsc2.connect(this.ambientGain);

        this.ambientOsc1.start();
        this.ambientOsc2.start();
        this.isRunningAmbient = true;
      } catch {
        // Ignore browser autoplay restrictions until user gesture
      }
    } else {
      this.updateAmbientTone(isNight);
    }
  }

  public updateAmbientTone(isNight: boolean): void {
    this.currentNightMode = isNight;
    if (!this.ctx || !this.ambientGain || !this.ambientOsc1 || !this.ambientOsc2) return;
    const now = this.ctx.currentTime;
    const vol = this.getMusicVolume();
    this.ambientGain.gain.setTargetAtTime(vol, now, 0.25);
    this.ambientOsc1.frequency.setTargetAtTime(isNight ? 52 : 98, now, 0.6);
    this.ambientOsc2.frequency.setTargetAtTime(isNight ? 78 : 147, now, 0.6);
  }

  public stopAmbient(): void {
    if (!this.ctx || !this.ambientGain) return;
    this.ambientGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
  }

  public playFootstep(isSprint = false): void {
    const nowMs = performance.now();
    const minInterval = isSprint ? 190 : 280;
    if (nowMs - this.lastFootstepTime < minInterval) return;
    this.lastFootstepTime = nowMs;

    const vol = this.getSfxVolume(0.32);
    if (vol <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const pitchJitter = 0.92 + Math.random() * 0.16;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime((isSprint ? 135 : 95) * pitchJitter, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.045);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playCoinPickup(isRare = false): void {
    const vol = this.getSfxVolume(0.8);
    if (vol <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const base = isRare ? 740 : 587.33;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.setValueAtTime(base * 1.5, now + 0.06);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  public playPowerUpPickup(): void {
    const vol = this.getSfxVolume(0.9);
    if (vol <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.045);
      gain.gain.setValueAtTime(vol * 0.8, now + i * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.045 + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.045);
      osc.stop(now + i * 0.045 + 0.15);
    });
  }

  public playKeyAndDoor(isDoorUnlock = false): void {
    const vol = this.getSfxVolume(0.95);
    if (vol <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isDoorUnlock ? 'sawtooth' : 'sine';
    if (isDoorUnlock) {
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.25);
    } else {
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.setValueAtTime(987.77, now + 0.08);
    }
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playPortalWarp(isGolden = false): void {
    const vol = this.getSfxVolume(0.95);
    if (vol <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isGolden ? 330 : 240, now);
    osc.frequency.exponentialRampToValueAtTime(isGolden ? 1320 : 880, now + 0.26);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playEnemyAlert(): void {
    const vol = this.getSfxVolume(0.85);
    if (vol <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.linearRampToValueAtTime(360, now + 0.14);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playPlayerHurt(shieldBlocked = false): void {
    const vol = this.getSfxVolume(1.1);
    if (vol <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = shieldBlocked ? 'triangle' : 'sawtooth';
    osc.frequency.setValueAtTime(shieldBlocked ? 420 : 150, now);
    osc.frequency.exponentialRampToValueAtTime(shieldBlocked ? 180 : 45, now + 0.25);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playNightTransition(enteringNight: boolean): void {
    const vol = this.getSfxVolume(0.9);
    if (vol <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(enteringNight ? 280 : 220, now);
    osc.frequency.exponentialRampToValueAtTime(enteringNight ? 95 : 440, now + 0.55);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.62);
  }

  public playLevelComplete(): void {
    const vol = this.getSfxVolume(1.0);
    if (vol <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(vol, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.36);
    });
  }

  public playGameOver(): void {
    const vol = this.getSfxVolume(1.0);
    if (vol <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [311.13, 277.18, 246.94, 185.0];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      gain.gain.setValueAtTime(vol * 0.85, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.34);
    });
  }
}

export const audioManager = new SoundEngine();
