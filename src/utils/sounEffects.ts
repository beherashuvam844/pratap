// Web Audio API Card Collision Synthesizer
let audioCtx: AudioContext | null = null;
let soundEnabled = true;
let lastSoundTime = 0;

export function isSoundEnabled(): boolean {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('pratap_sound_fx');
    if (saved !== null) {
      soundEnabled = saved === 'true';
    }
  }
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  if (typeof window !== 'undefined') {
    localStorage.setItem('pratap_sound_fx', String(enabled));
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Synthesizes a realistic card tap / card collision sound
 * pitchVariation: slight frequency shift for card deck variety
 */
export function playCardCollideSound(pitchVariation = 1.0): void {
  if (!isSoundEnabled()) return;
  
  // Throttle to avoid audio clipping if many cards enter simultaneously
  const now = Date.now();
  if (now - lastSoundTime < 40) return;
  lastSoundTime = now;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    // 1. Wood/Cardboard Thump Body (Sine frequency drop)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = 'sine';
    const baseFreq = (180 + Math.random() * 40) * pitchVariation;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.05);

    oscGain.gain.setValueAtTime(0.18, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.06);

    // 2. High-frequency Card Snap Noise (Paper/Plastic Flick)
    const bufferSize = ctx.sampleRate * 0.03; // 30ms noise burst
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Bandpass filter for card stock sound resonance
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200 * pitchVariation, t);
    filter.Q.setValueAtTime(2.5, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.22, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(t);
    noise.stop(t + 0.04);
  } catch (err) {
    // Ignore audio contexts blocked by browser autoplay policies
  }
}

/**
 * Play a light hover card slide sound
 */
export function playCardSlideSound(): void {
  if (!isSoundEnabled()) return;
  const now = Date.now();
  if (now - lastSoundTime < 60) return;
  lastSoundTime = now;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(350, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.04);

    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  } catch (e) {
    // silence
  }
}
