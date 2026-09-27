import type { Section } from '../core/section';
import type { Frame } from '../core/stage';
import { i18n } from '../core/i18n';
import { clamp, damp, fitCanvas, smoothstep, TAU } from '../core/util';

/* ─────────────────────────────────────────────────────────────
   Kāla — a living cosmic clock. Every ring is a unit of time from
   the Viṣṇu Purāṇa, and every hand shows where we stand *now* in
   that cycle: the current muhūrta, the Moon's month, our place in
   Kali Yuga, in this day of Brahmā, in Brahmā's own life.
   Scrolling zooms logarithmically outward through the scales.
   ───────────────────────────────────────────────────────────── */

const DAY = 86400;
const YEAR = 365.2422 * DAY;
const KALI_START_MS = (588465.5 - 2440587.5) * 86400000; // 18 Feb 3102 BCE (Julian), midnight
const SYNODIC = 29.530588853;
const NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14);

interface Ring {
  deva: string;
  name: string;
  ticks: number;
  major?: number;
  segments?: { w: number; c: string; label?: string }[];
  dur: { en: string; nl: string };
  phase: (now: number, kaliYears: number) => number;
}

const fmt = (n: number, lang: string) => n.toLocaleString(lang === 'nl' ? 'nl-NL' : 'en-US');
const yrs = (n: number) => ({ en: `${fmt(n, 'en')} years`, nl: `${fmt(n, 'nl')} jaar` });

const RINGS: Ring[] = [
  { deva: 'निमेष', name: 'Nimeṣa', ticks: 15, dur: { en: '≈ 0.21 seconds', nl: '≈ 0,21 seconde' }, phase: (t) => (t / 1000 / 0.21333) % 1 },
  { deva: 'काष्ठा', name: 'Kāṣṭhā', ticks: 30, major: 5, dur: { en: '3.2 seconds', nl: '3,2 seconden' }, phase: (t) => (t / 1000 / 3.2) % 1 },
  { deva: 'कला', name: 'Kalā', ticks: 30, major: 5, dur: { en: '1 minute 36 seconds', nl: '1 minuut 36 seconden' }, phase: (t) => (t / 1000 / 96) % 1 },
  { deva: 'मुहूर्त', name: 'Muhūrta', ticks: 30, major: 5, dur: { en: '48 minutes', nl: '48 minuten' }, phase: (t) => (localSeconds(t) / 2880) % 1 },
  { deva: 'अहोरात्र', name: 'Ahorātra', ticks: 30, major: 15, dur: { en: 'a day and a night', nl: 'een dag en een nacht' }, phase: (t) => localSeconds(t) / DAY },
  { deva: 'मास', name: 'Māsa', ticks: 30, major: 15, dur: { en: '≈ 29.5 days · one lunar month', nl: '≈ 29,5 dagen · één maanmaand' }, phase: (t) => ((((t - NEW_MOON_MS) / 86400000) % SYNODIC) + SYNODIC) % SYNODIC / SYNODIC },
  { deva: 'वर्ष', name: 'Varṣa', ticks: 12, dur: { en: 'one year · a day of the gods', nl: 'één jaar · een dag van de goden' }, phase: (t) => { const d = new Date(t); const s = Date.UTC(d.getUTCFullYear(), 3, 14); const f = (t - s) / (YEAR * 1000); return ((f % 1) + 1) % 1; } },
  { deva: 'दिव्य वर्ष', name: 'Divya varṣa', ticks: 36, major: 3, dur: yrs(360), phase: (_t, k) => (k % 360) / 360 },
  { deva: 'कलियुग', name: 'Kali Yuga', ticks: 120, major: 10, dur: yrs(432000), phase: (_t, k) => k / 432000 },
  {
    deva: 'महायुग', name: 'Mahāyuga', ticks: 10, dur: yrs(4320000), phase: (_t, k) => (3888000 + k) / 4320000,
    segments: [{ w: 4, c: '#f6d98b', label: 'Satya' }, { w: 3, c: '#e9b949', label: 'Tretā' }, { w: 2, c: '#d0782e', label: 'Dvāpara' }, { w: 1, c: '#e2412b', label: 'Kali' }],
  },
  { deva: 'मन्वन्तर', name: 'Manvantara', ticks: 71, major: 71, dur: yrs(306720000), phase: (_t, k) => (27 * 4320000 + 3888000 + k) / (71 * 4320000) },
  { deva: 'कल्प', name: 'Kalpa', ticks: 14, dur: yrs(4320000000), phase: (_t, k) => (1972944000 + k) / 4320000000 },
  { deva: 'ब्रह्म वर्ष', name: 'Brahma varṣa', ticks: 360, major: 30, dur: yrs(3110400000000), phase: (_t, k) => (1972944000 + k) / (720 * 4320000000) },
  { deva: 'महाकल्प', name: 'Mahākalpa', ticks: 100, major: 10, dur: yrs(311040000000000), phase: (_t, k) => (50 * 720 * 4320000000 + 1972944000 + k) / (100 * 720 * 4320000000) },
  { deva: 'अनन्त', name: 'Ananta', ticks: 0, dur: { en: 'without end', nl: 'zonder einde' }, phase: () => 0 },
];
// step → ring in focus
const STEP_FOCUS = [0, 3, 7, 9, 10, 11, 13, 14];

function localSeconds(t: number) {
  const d = new Date(t);
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000;
}

export class KalaSection implements Section {
  chapter = 'kala';
  private canvas!: HTMLCanvasElement;
  private g!: CanvasRenderingContext2D;
  private focus = 0;
  private uName!: HTMLElement;
  private uDeva!: HTMLElement;
  private uVal!: HTMLElement;
  private shown = -1;
  private yearEl!: HTMLElement;
  private clockEl!: HTMLElement;
  private leftEl!: HTMLElement;
  private quote!: HTMLElement;
  private lastSec = -1;
  private stars: [number, number, number][] = [];

  init() {
    const root = document.getElementById('kala')!;
    this.canvas = root.querySelector('.kala__canvas')!;
    this.g = this.canvas.getContext('2d')!;
    this.uDeva = root.querySelector('.kala__unit')!;
    this.uName = root.querySelector('.kala__name')!;
    this.uVal = root.querySelector('.kala__value')!;
    this.yearEl = root.querySelector('[data-kali-year]')!;
    this.clockEl = root.querySelector('[data-kali-clock]')!;
    this.leftEl = root.querySelector('[data-kali-left]')!;
    this.quote = root.querySelector('.kala__quote')!;
    for (let i = 0; i < 220; i++) this.stars.push([Math.random() * TAU, Math.random(), Math.random()]);
    i18n.onChange(() => { this.shown = -1; this.lastSec = -1; });
  }

  update(f: Frame) {
    const ch = f.chapters;
    const pos = ch.stepPos('kala');
    const n = STEP_FOCUS.length;
    const sp = clamp(pos, 0, n - 1);
    const i0 = Math.floor(sp), fr = sp - i0;
    const target = STEP_FOCUS[i0] + (STEP_FOCUS[Math.min(n - 1, i0 + 1)] - STEP_FOCUS[i0]) * smoothstep(0.55, 1, fr);
    this.focus = damp(this.focus, target, 3, f.dt);
    const now = Date.now();
    const kaliYears = (now - KALI_START_MS) / (YEAR * 1000);

    this.quote.classList.toggle('is-on', ch.progress('kala') > 0.93);
    const fi = Math.round(this.focus);
    if (fi !== this.shown) {
      this.shown = fi;
      const r = RINGS[fi];
      this.uDeva.textContent = r.deva;
      this.uName.textContent = r.name;
      this.uVal.textContent = i18n.pick(r.dur);
    }
    const sec = Math.floor(now / 1000);
    if (sec !== this.lastSec) {
      this.lastSec = sec;
      const lang = i18n.lang;
      const whole = Math.floor(kaliYears);
      this.yearEl.textContent = fmt(whole + 1, lang);
      let rest = (kaliYears - whole) * YEAR;
      const d = Math.floor(rest / DAY); rest -= d * DAY;
      const h = Math.floor(rest / 3600); rest -= h * 3600;
      const m = Math.floor(rest / 60); const s = Math.floor(rest - m * 60);
      const p2 = (x: number) => String(x).padStart(2, '0');
      this.clockEl.textContent = lang === 'nl'
        ? `${fmt(whole, lang)} j · ${d} d · ${p2(h)}:${p2(m)}:${p2(s)} sinds het begin`
        : `${fmt(whole, lang)} y · ${d} d · ${p2(h)}:${p2(m)}:${p2(s)} since it began`;
      this.leftEl.textContent = fmt(Math.floor(432000 - kaliYears), lang);
    }
    this.draw(f, now, kaliYears);
  }

  private draw(f: Frame, now: number, kaliYears: number) {
    fitCanvas(this.canvas, 2);
    const g = this.g;
    const W = this.canvas.width, H = this.canvas.height;
    const dpr = W / this.canvas.clientWidth;
    g.clearRect(0, 0, W, H);
    const mobile = this.canvas.clientWidth < 900;
    const cx = W * (mobile ? 0.5 : 0.56) + f.pointer.x * 8 * dpr;
    const cy = H * (mobile ? 0.44 : 0.5) - f.pointer.y * 8 * dpr;
    const R0 = Math.min(W, H) * (mobile ? 0.26 : 0.36);
    const k = 0.34;
    const enter = smoothstep(0, 0.12, f.chapters.progress('kala')) * 0.7 + 0.3 * f.chapters.coverage('kala');

    // faint dust of "countless universes" appears at the far end
    const ananta = smoothstep(12.8, 14, this.focus);
    if (ananta > 0.01) {
      for (const [a, r, s] of this.stars) {
        const rr = R0 * (0.25 + r * 1.6);
        const x = cx + Math.cos(a + f.t * 0.01 * (1 - r)) * rr, y = cy + Math.sin(a + f.t * 0.01 * (1 - r)) * rr;
        g.fillStyle = `rgba(246,217,139,${0.5 * ananta * s})`;
        g.beginPath(); g.arc(x, y, (0.6 + s * 1.8) * dpr, 0, TAU); g.fill();
        if (s > 0.8) { g.strokeStyle = `rgba(246,217,139,${0.25 * ananta})`; g.lineWidth = 0.5 * dpr; g.beginPath(); g.arc(x, y, (3 + s * 5) * dpr, 0, TAU); g.stroke(); }
      }
    }

    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let i = 0; i < RINGS.length; i++) {
      const ring = RINGS[i];
      const r = R0 * Math.exp((i - this.focus) * k);
      if (r < 28 * dpr || r > Math.hypot(W, H)) continue;
      const dist = Math.abs(i - this.focus);
      const inner = smoothstep(28 * dpr, 90 * dpr, r);
      const a = (0.16 + 0.84 * Math.exp(-dist * dist * 0.6)) * inner * enter;
      const isF = dist < 0.5;
      if (ring.ticks === 0) {
        g.strokeStyle = `rgba(246,217,139,${a * 0.5})`;
        g.setLineDash([2 * dpr, 6 * dpr]);
        g.lineWidth = dpr;
        g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke();
        g.setLineDash([]);
        continue;
      }
      // ring
      g.lineWidth = (isF ? 1.4 : 0.8) * dpr;
      g.strokeStyle = `rgba(233,185,73,${a * 0.8})`;
      g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke();
      // segments (yugas)
      if (ring.segments) {
        const tot = ring.segments.reduce((s, x) => s + x.w, 0);
        let s0 = -Math.PI / 2;
        for (const seg of ring.segments) {
          const s1 = s0 + (seg.w / tot) * TAU;
          g.strokeStyle = seg.c;
          g.globalAlpha = a;
          g.lineWidth = (isF ? 7 : 4) * dpr;
          g.beginPath(); g.arc(cx, cy, r, s0 + 0.01, s1 - 0.01); g.stroke();
          if (seg.label && a > 0.35) {
            const m = (s0 + s1) / 2;
            g.save();
            g.translate(cx + Math.cos(m) * (r + 16 * dpr), cy + Math.sin(m) * (r + 16 * dpr));
            g.rotate(m + Math.PI / 2);
            g.fillStyle = seg.c;
            g.font = `${11 * dpr}px "JetBrains Mono"`;
            g.fillText(seg.label.toUpperCase(), 0, 0);
            g.restore();
          }
          s0 = s1;
        }
        g.globalAlpha = 1;
      }
      // ticks
      const nT = ring.ticks;
      g.beginPath();
      for (let t = 0; t < nT; t++) {
        const ang = -Math.PI / 2 + (t / nT) * TAU;
        const maj = ring.major ? t % ring.major === 0 : true;
        const len = (maj ? 7 : 3.5) * dpr * (isF ? 1.3 : 1);
        const c = Math.cos(ang), s = Math.sin(ang);
        g.moveTo(cx + c * r, cy + s * r);
        g.lineTo(cx + c * (r - len), cy + s * (r - len));
      }
      g.strokeStyle = `rgba(246,217,139,${a * 0.7})`;
      g.lineWidth = 0.8 * dpr;
      g.stroke();
      // progress arc + hand: where are we now?
      const ph = ring.phase(now, kaliYears);
      const a0 = -Math.PI / 2, a1 = a0 + ph * TAU;
      const grad = g.createConicGradient(a0, cx, cy);
      grad.addColorStop(0, 'rgba(255,138,42,0)');
      grad.addColorStop(Math.max(0.0001, ph), `rgba(255,170,80,${a * 0.9})`);
      grad.addColorStop(Math.min(1, ph + 0.0001), 'rgba(0,0,0,0)');
      g.strokeStyle = grad;
      g.lineWidth = (isF ? 3 : 2) * dpr;
      g.beginPath(); g.arc(cx, cy, r + 5 * dpr, a0, a1); g.stroke();
      const hx = cx + Math.cos(a1) * (r + 5 * dpr), hy = cy + Math.sin(a1) * (r + 5 * dpr);
      const rad = g.createRadialGradient(hx, hy, 0, hx, hy, 12 * dpr);
      rad.addColorStop(0, `rgba(255,236,190,${a})`);
      rad.addColorStop(0.3, `rgba(255,150,60,${a * 0.6})`);
      rad.addColorStop(1, 'rgba(255,120,40,0)');
      g.fillStyle = rad;
      g.beginPath(); g.arc(hx, hy, 12 * dpr, 0, TAU); g.fill();
      // label on the ring
      if (a > 0.2) {
        g.save();
        g.translate(cx, cy);
        const la = -Math.PI / 2 - 0.02 - (12 * dpr) / r;
        g.rotate(la + Math.PI / 2);
        g.fillStyle = `rgba(243,234,216,${a * (isF ? 1 : 0.7)})`;
        g.font = `${(isF ? 12 : 10) * dpr}px "JetBrains Mono"`;
        g.textAlign = 'right';
        g.fillText(ring.name.toUpperCase(), 0, -r - 14 * dpr);
        g.restore();
        g.textAlign = 'center';
      }
    }
    // dark core behind the readout
    const core = g.createRadialGradient(cx, cy, 0, cx, cy, R0 * 0.55);
    core.addColorStop(0, 'rgba(5,4,10,0.9)');
    core.addColorStop(0.6, 'rgba(5,4,10,0.6)');
    core.addColorStop(1, 'rgba(5,4,10,0)');
    g.fillStyle = core;
    g.beginPath(); g.arc(cx, cy, R0 * 0.55, 0, TAU); g.fill();
    // keep the readout on the canvas centre
    const ro = document.querySelector<HTMLElement>('.kala__readout');
    if (ro) { ro.style.left = `${cx / dpr}px`; ro.style.top = `${cy / dpr}px`; }
  }
}
