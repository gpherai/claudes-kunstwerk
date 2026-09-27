/* ─────────────────────────────────────────────────────────────
   Audio — everything synthesized, nothing sampled.
   · Tanpura: four strings rendered offline by additive synthesis,
     with a travelling "jawari" formant that gives the drone its
     shimmering buzz. Tuned Pa – Sa – Sa – low Sa.
   · Om: a small choir of glottal-pulse voices through a morphing
     formant filter bank, sung A → U → M → silence by the scroll.
   · Ghaṇṭā (temple bell), ḍamaru (drum), chimes and clicks by
     modal synthesis.
   ───────────────────────────────────────────────────────────── */

const SA = 138.59; // C#3
const PA_LOW = SA * 0.75; // G#2
const SA_LOW = SA / 2;

type Vowel = { f: number[]; bw: number[]; g: number[] };
const VOWELS: Vowel[] = [
  { f: [730, 1090, 2440, 3400], bw: [90, 110, 170, 250], g: [1, 0.55, 0.28, 0.12] }, // a
  { f: [300, 870, 2240, 3300], bw: [60, 90, 170, 250], g: [1, 0.22, 0.06, 0.03] }, // u
  { f: [260, 1000, 2200, 3300], bw: [60, 200, 250, 300], g: [1, 0.035, 0.012, 0.005] }, // m
];

class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  private comp!: DynamicsCompressorNode;
  private reverb!: ConvolverNode;
  private reverbSend!: GainNode;
  private droneBus!: GainNode;
  private droneFilter!: BiquadFilterNode;
  private voiceBus!: GainNode;
  analyser!: AnalyserNode;
  private strings: AudioBuffer[] = [];
  private prepared: Promise<void> | null = null;
  private droneTimer = 0;
  private nextPluck = 0;
  private pluckIdx = 0;
  private voiceFilters: BiquadFilterNode[] = [];
  private voiceGains: GainNode[] = [];
  private voiceLP!: BiquadFilterNode;
  private voiceOscs: OscillatorNode[] = [];
  private noise!: AudioBuffer;
  enabled = false;
  started = false;
  private listeners: ((on: boolean) => void)[] = [];
  private vowelState = -1;
  private damaruTimer = 0;
  private freqData: Uint8Array<ArrayBuffer> | null = null;

  onChange(fn: (on: boolean) => void) { this.listeners.push(fn); }

  /** Renders the tanpura strings offline. Safe to call before any user gesture. */
  prepare(onProgress?: (p: number) => void) {
    if (this.prepared) return this.prepared;
    this.prepared = (async () => {
      const sr = 44100;
      const notes = [PA_LOW, SA, SA * 1.0006, SA_LOW];
      let n = 0;
      this.strings = await Promise.all(notes.map(async (f, i) => {
        const b = await renderTanpuraString(f, sr, i);
        onProgress?.(++n / notes.length);
        return b;
      }));
    })();
    return this.prepared;
  }

  private build() {
    const ctx = new AudioContext({ latencyHint: 'playback' });
    this.ctx = ctx;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -16;
    this.comp.ratio.value = 3;
    this.comp.attack.value = 0.02;
    this.comp.release.value = 0.4;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.85;
    this.master.connect(this.comp).connect(ctx.destination);
    this.comp.connect(this.analyser);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = makeImpulse(ctx, 5.5);
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.55;
    this.reverbSend.connect(this.reverb).connect(this.master);

    this.droneBus = ctx.createGain();
    this.droneBus.gain.value = 0.0;
    this.droneFilter = ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 5200;
    this.droneFilter.Q.value = 0.4;
    this.droneBus.connect(this.droneFilter);
    this.droneFilter.connect(this.master);
    this.droneFilter.connect(this.reverbSend);

    // noise buffer (breath, strikes)
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    this.buildVoice();
  }

  private buildVoice() {
    const ctx = this.ctx!;
    this.voiceBus = ctx.createGain();
    this.voiceBus.gain.value = 0;
    const sum = ctx.createGain();
    sum.gain.value = 0.9;
    this.voiceLP = ctx.createBiquadFilter();
    this.voiceLP.type = 'lowpass';
    this.voiceLP.frequency.value = 6000;
    this.voiceLP.Q.value = 0.5;

    // glottal-ish periodic wave
    const N = 64;
    const real = new Float32Array(N), imag = new Float32Array(N);
    for (let k = 1; k < N; k++) imag[k] = 1 / Math.pow(k, 1.15);
    const wave = ctx.createPeriodicWave(real, imag);

    const src = ctx.createGain();
    src.gain.value = 0.5;
    const vib = ctx.createOscillator();
    vib.frequency.value = 4.8;
    const vibDepth = ctx.createGain();
    vibDepth.gain.value = 7;
    vib.connect(vibDepth);
    const drift = ctx.createOscillator();
    drift.frequency.value = 0.11;
    const driftDepth = ctx.createGain();
    driftDepth.gain.value = 5;
    drift.connect(driftDepth);
    const voices: [number, number, number][] = [
      [SA, 0, 0.55], [SA, 9, 0.45], [SA, -8, 0.4], [SA_LOW, 3, 0.5], [SA * 2, -4, 0.08],
    ];
    for (const [f, det, g] of voices) {
      const o = ctx.createOscillator();
      o.setPeriodicWave(wave);
      o.frequency.value = f;
      o.detune.value = det;
      vibDepth.connect(o.detune);
      driftDepth.connect(o.detune);
      const vg = ctx.createGain();
      vg.gain.value = g;
      o.connect(vg).connect(src);
      o.start();
      this.voiceOscs.push(o);
    }
    vib.start(); drift.start();

    // breath
    const br = ctx.createBufferSource();
    br.buffer = this.noise; br.loop = true;
    const brF = ctx.createBiquadFilter(); brF.type = 'bandpass'; brF.frequency.value = 1400; brF.Q.value = 0.7;
    const brG = ctx.createGain(); brG.gain.value = 0.012;
    br.connect(brF).connect(brG).connect(src);
    br.start();

    for (let i = 0; i < 4; i++) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      const g = ctx.createGain();
      src.connect(bp).connect(g).connect(sum);
      this.voiceFilters.push(bp);
      this.voiceGains.push(g);
    }
    sum.connect(this.voiceLP).connect(this.voiceBus);
    this.voiceBus.connect(this.master);
    this.voiceBus.connect(this.reverbSend);
    this.setVowel(0, true);
  }

  /** v: 0 = A, 1 = U, 2 = M (fractional morphs). */
  setVowel(v: number, immediate = false) {
    if (!this.ctx || Math.abs(v - this.vowelState) < 0.004) return;
    this.vowelState = v;
    const i = Math.max(0, Math.min(1.999, v));
    const a = VOWELS[Math.floor(i)], b = VOWELS[Math.floor(i) + 1];
    const t = i - Math.floor(i);
    const now = this.ctx.currentTime;
    const tc = immediate ? 0.001 : 0.12;
    for (let k = 0; k < 4; k++) {
      const f = a.f[k] + (b.f[k] - a.f[k]) * t;
      const bw = a.bw[k] + (b.bw[k] - a.bw[k]) * t;
      const g = Math.exp(Math.log(a.g[k]) + (Math.log(b.g[k]) - Math.log(a.g[k])) * t);
      this.voiceFilters[k].frequency.setTargetAtTime(f, now, tc);
      this.voiceFilters[k].Q.setTargetAtTime(f / bw, now, tc);
      this.voiceGains[k].gain.setTargetAtTime(g * (k === 0 ? 2.2 : 3.2), now, tc);
    }
    const lp = v < 1.4 ? 6000 : 6000 - (Math.min(v, 2) - 1.4) / 0.6 * 5400;
    this.voiceLP.frequency.setTargetAtTime(lp, now, tc);
  }

  /** Voice loudness 0..1 */
  setVoice(level: number) {
    if (!this.ctx) return;
    this.voiceBus.gain.setTargetAtTime(level * 0.42, this.ctx.currentTime, level > 0.01 ? 0.35 : 0.8);
  }

  /** Per-chapter colouring of the drone. */
  setMood(chapter: string) {
    if (!this.ctx) return;
    const moods: Record<string, [number, number]> = {
      om: [0.9, 5200], nada: [0.55, 2600], nasadiya: [0.7, 1800], kala: [0.85, 4200], nakshatra: [0.7, 3200],
      nataraja: [0.95, 5600], yantra: [0.85, 4800], kolam: [0.8, 6500], mandira: [0.9, 4200], ekam: [0.85, 5200],
      gita: [0.85, 4600], purnam: [1.0, 7000], pralaya: [0.4, 1200],
    };
    const [g, f] = moods[chapter] ?? [0.8, 4000];
    const now = this.ctx.currentTime;
    this.droneBus.gain.setTargetAtTime(g * 0.8, now, 1.4);
    this.droneFilter.frequency.setTargetAtTime(f, now, 1.6);
    if (chapter === 'nataraja') this.startDamaru(); else this.stopDamaru();
  }

  async enable() {
    await this.prepare();
    if (!this.ctx) this.build();
    const ctx = this.ctx!;
    if (ctx.state !== 'running') await ctx.resume();
    this.enabled = true;
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.8);
    if (!this.droneTimer) {
      this.started = true;
      this.droneBus.gain.setTargetAtTime(0.7, ctx.currentTime + 1.2, 2.5);
      this.nextPluck = ctx.currentTime + 0.9;
      this.droneTimer = window.setInterval(() => this.schedule(), 120);
    }
    this.listeners.forEach((fn) => fn(true));
  }

  disable() {
    this.enabled = false;
    if (this.ctx) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.35);
    this.listeners.forEach((fn) => fn(false));
  }

  toggle() { return this.enabled ? (this.disable(), false) : (this.enable(), true); }

  private schedule() {
    const ctx = this.ctx!;
    if (!this.strings.length) return;
    // classic pattern: Pa . Sa Sa . Sa(low) .
    const pattern = [0, 1, 2, 3];
    const gaps = [1.45, 0.95, 1.45, 2.05];
    while (this.nextPluck < ctx.currentTime + 0.5) {
      const i = pattern[this.pluckIdx % 4];
      const src = ctx.createBufferSource();
      src.buffer = this.strings[i];
      src.playbackRate.value = 1 + (Math.random() - 0.5) * 0.0008;
      const g = ctx.createGain();
      g.gain.value = (i === 3 ? 0.95 : 0.8) * (0.9 + Math.random() * 0.15);
      const p = ctx.createStereoPanner();
      p.pan.value = [-0.35, 0.15, 0.35, -0.1][i];
      src.connect(g).connect(p).connect(this.droneBus);
      src.start(this.nextPluck + (Math.random() - 0.5) * 0.03);
      this.nextPluck += gaps[this.pluckIdx % 4] * (1 + (Math.random() - 0.5) * 0.04);
      this.pluckIdx++;
    }
  }

  /** Brass temple bell (ghaṇṭā). */
  bell(base = 392, gain = 0.35, when = 0) {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + when;
    const partials: [number, number, number][] = [
      [0.5, 0.35, 9], [1, 1, 7], [1.004, 0.6, 6.5], [1.52, 0.35, 4.2], [2.0, 0.45, 4], [2.74, 0.3, 2.8], [3.76, 0.22, 2.1], [5.4, 0.12, 1.3], [6.9, 0.07, 0.9],
    ];
    const out = ctx.createGain();
    out.gain.value = gain;
    const pan = ctx.createStereoPanner();
    pan.pan.value = (Math.random() - 0.5) * 0.6;
    out.connect(pan);
    pan.connect(this.master);
    pan.connect(this.reverbSend);
    for (const [r, a, d] of partials) {
      const o = ctx.createOscillator();
      o.frequency.value = base * r;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(a * 0.25, t0 + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      o.connect(g).connect(out);
      o.start(t0);
      o.stop(t0 + d + 0.1);
    }
    this.strike(t0, 3200, 0.05, out);
  }

  /** Small high chime for UI moments. */
  chime(freq = 1568, gain = 0.08) {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    for (const [r, a, d] of [[1, 1, 1.6], [2.76, 0.3, 0.8], [5.4, 0.12, 0.4]] as const) {
      const o = ctx.createOscillator();
      o.frequency.value = freq * r;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain * a, t0 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      o.connect(g);
      g.connect(this.master);
      g.connect(this.reverbSend);
      o.start(t0);
      o.stop(t0 + d);
    }
  }

  /** A soft wooden click (wheel ticks). */
  tick(gain = 0.05) {
    if (!this.ctx || !this.enabled) return;
    this.strike(this.ctx.currentTime, 1800 + Math.random() * 400, gain, this.master, 0.03);
  }

  private strike(t0: number, freq: number, gain: number, dest: AudioNode, dur = 0.06) {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(dest);
    s.start(t0, Math.random());
    s.stop(t0 + dur + 0.02);
  }

  /** Ḍamaru — the hourglass drum of Śiva. */
  damaru(t0: number, accent = 1) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(210, t0);
    o.frequency.exponentialRampToValueAtTime(118, t0 + 0.14);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.32 * accent, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
    o.connect(g);
    g.connect(this.master);
    g.connect(this.reverbSend);
    o.start(t0); o.stop(t0 + 0.3);
    this.strike(t0, 2400, 0.06 * accent, this.master, 0.04);
  }

  private startDamaru() {
    if (this.damaruTimer || !this.ctx) return;
    let next = this.ctx.currentTime + 0.3;
    let i = 0;
    // taka-taka taka-dhim …
    const pat = [0.18, 0.18, 0.18, 0.46, 0.18, 0.18, 0.64];
    const acc = [1, 0.55, 0.8, 0.6, 1, 0.55, 0.9];
    this.damaruTimer = window.setInterval(() => {
      const ctx = this.ctx!;
      while (next < ctx.currentTime + 0.4) {
        if (this.enabled) this.damaru(next, acc[i % pat.length] * 0.7);
        next += pat[i % pat.length];
        i++;
      }
    }, 100);
  }

  private stopDamaru() {
    if (this.damaruTimer) { clearInterval(this.damaruTimer); this.damaruTimer = 0; }
  }

  /** 0..1 low-frequency energy (for audio-reactive visuals). */
  level() {
    if (!this.ctx || !this.enabled) return 0;
    if (!this.freqData) this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(this.freqData);
    let s = 0;
    for (let i = 1; i < 24; i++) s += this.freqData[i];
    return s / (23 * 255);
  }
}

async function renderTanpuraString(f0: number, sr: number, seed: number): Promise<AudioBuffer> {
  const dur = 6.5;
  const oc = new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
  const out = oc.createGain();
  out.gain.value = 1;
  out.connect(oc.destination);
  const K = Math.min(56, Math.floor(7500 / f0));
  const N = 400;
  for (let k = 1; k <= K; k++) {
    const o = oc.createOscillator();
    o.frequency.value = f0 * k * (1 + 0.00009 * k * k);
    const g = oc.createGain();
    g.gain.value = 0;
    const curve = new Float32Array(N);
    const ph = (seed * 0.37 + k * 0.618) % 1;
    for (let i = 0; i < N; i++) {
      const t = (i / (N - 1)) * dur;
      const attack = 1 - Math.exp(-t * 220);
      const decay = Math.exp(-t * (0.3 + 0.03 * k));
      // jawari: a resonance that travels up the harmonic series and breathes
      const c = 3 + 24 * (1 - Math.exp(-t * 0.6)) + Math.sin(t * 2.1 + ph * 6.28) * 1.5;
      const w = 3 + 3.5 * (t / dur);
      const jaw = Math.exp(-Math.pow((k - c) / w, 2)) * Math.exp(-t * 0.22);
      const base = 1 / Math.pow(k, 1.1);
      curve[i] = (base + (jaw * 0.55) / Math.sqrt(k)) * attack * decay * 0.16;
    }
    g.gain.setValueCurveAtTime(curve, 0, dur);
    const p = oc.createStereoPanner();
    p.pan.value = (((k * 0.618 + seed * 0.21) % 1) - 0.5) * 0.7;
    o.connect(g).connect(p).connect(out);
    o.start(0);
    o.stop(dur);
  }
  // pluck transient
  const nb = oc.createBuffer(1, Math.floor(sr * 0.05), sr);
  const d = nb.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * 0.008));
  const ns = oc.createBufferSource();
  ns.buffer = nb;
  const nf = oc.createBiquadFilter();
  nf.type = 'bandpass'; nf.frequency.value = f0 * 12; nf.Q.value = 2;
  const ng = oc.createGain(); ng.gain.value = 0.05;
  ns.connect(nf).connect(ng).connect(out);
  ns.start(0);
  const buf = await oc.startRendering();
  // normalise
  let peak = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < ch.length; i++) peak = Math.max(peak, Math.abs(ch[i]));
  }
  const s = 0.5 / Math.max(peak, 1e-4);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < ch.length; i++) ch[i] *= s;
  }
  return buf;
}

function makeImpulse(ctx: BaseAudioContext, seconds: number) {
  const sr = ctx.sampleRate;
  const len = Math.floor(seconds * sr);
  const buf = ctx.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const n = Math.random() * 2 - 1;
      const a = 0.08 + 0.85 * Math.exp(-t * 1.1); // air absorption: darker tail
      lp += a * (n - lp);
      const env = Math.pow(1 - i / len, 2.2) * (t < 0.012 ? t / 0.012 : 1);
      d[i] = lp * env * (1.4 - a);
    }
  }
  return buf;
}

export const audio = new AudioEngine();
