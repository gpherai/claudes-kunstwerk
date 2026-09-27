import * as A from 'astronomy-engine';
import type { Section } from '../core/section';
import type { Frame } from '../core/stage';
import { i18n } from '../core/i18n';
import { fitCanvas, smoothstep, TAU } from '../core/util';
import STARS from '../data/stars.json';

/* ─────────────────────────────────────────────────────────────
   Pañcāṅga — the five limbs of the Hindu almanac, computed live
   with astronomy-engine for this instant, drawn on a sidereal
   wheel of the 27 nakṣatras with 1,300 real stars from the Yale
   Bright Star Catalogue and the nine grahas where they are now.
   ───────────────────────────────────────────────────────────── */

const NAK = [
  ['Aśvinī', 'अश्विनी', 'Aśvins'], ['Bharaṇī', 'भरणी', 'Yama'], ['Kṛttikā', 'कृत्तिका', 'Agni'], ['Rohiṇī', 'रोहिणी', 'Prajāpati'],
  ['Mṛgaśirā', 'मृगशिरा', 'Soma'], ['Ārdrā', 'आर्द्रा', 'Rudra'], ['Punarvasu', 'पुनर्वसु', 'Aditi'], ['Puṣya', 'पुष्य', 'Bṛhaspati'],
  ['Āśleṣā', 'आश्लेषा', 'Nāgas'], ['Maghā', 'मघा', 'Pitṛs'], ['Pūrva Phalgunī', 'पूर्वफाल्गुनी', 'Bhaga'], ['Uttara Phalgunī', 'उत्तरफाल्गुनी', 'Aryaman'],
  ['Hasta', 'हस्त', 'Savitṛ'], ['Citrā', 'चित्रा', 'Tvaṣṭṛ'], ['Svātī', 'स्वाती', 'Vāyu'], ['Viśākhā', 'विशाखा', 'Indra–Agni'],
  ['Anurādhā', 'अनुराधा', 'Mitra'], ['Jyeṣṭhā', 'ज्येष्ठा', 'Indra'], ['Mūla', 'मूल', 'Nirṛti'], ['Pūrva Āṣāḍhā', 'पूर्वाषाढा', 'Āpas'],
  ['Uttara Āṣāḍhā', 'उत्तराषाढा', 'Viśvedevas'], ['Śravaṇa', 'श्रवण', 'Viṣṇu'], ['Dhaniṣṭhā', 'धनिष्ठा', 'Vasus'], ['Śatabhiṣā', 'शतभिषा', 'Varuṇa'],
  ['Pūrva Bhādrapadā', 'पूर्वभाद्रपदा', 'Aja Ekapāda'], ['Uttara Bhādrapadā', 'उत्तरभाद्रपदा', 'Ahirbudhnya'], ['Revatī', 'रेवती', 'Pūṣan'],
];
const RASHI = [
  ['Meṣa', 'मेष'], ['Vṛṣabha', 'वृषभ'], ['Mithuna', 'मिथुन'], ['Karka', 'कर्क'], ['Siṃha', 'सिंह'], ['Kanyā', 'कन्या'],
  ['Tulā', 'तुला'], ['Vṛścika', 'वृश्चिक'], ['Dhanu', 'धनु'], ['Makara', 'मकर'], ['Kumbha', 'कुम्भ'], ['Mīna', 'मीन'],
];
const TITHI = [
  ['Pratipadā', 'प्रतिपदा'], ['Dvitīyā', 'द्वितीया'], ['Tṛtīyā', 'तृतीया'], ['Caturthī', 'चतुर्थी'], ['Pañcamī', 'पञ्चमी'],
  ['Ṣaṣṭhī', 'षष्ठी'], ['Saptamī', 'सप्तमी'], ['Aṣṭamī', 'अष्टमी'], ['Navamī', 'नवमी'], ['Daśamī', 'दशमी'],
  ['Ekādaśī', 'एकादशी'], ['Dvādaśī', 'द्वादशी'], ['Trayodaśī', 'त्रयोदशी'], ['Caturdaśī', 'चतुर्दशी'],
];
const YOGA = [
  ['Viṣkambha', 'विष्कम्भ'], ['Prīti', 'प्रीति'], ['Āyuṣmān', 'आयुष्मान्'], ['Saubhāgya', 'सौभाग्य'], ['Śobhana', 'शोभन'], ['Atigaṇḍa', 'अतिगण्ड'],
  ['Sukarmā', 'सुकर्मा'], ['Dhṛti', 'धृति'], ['Śūla', 'शूल'], ['Gaṇḍa', 'गण्ड'], ['Vṛddhi', 'वृद्धि'], ['Dhruva', 'ध्रुव'], ['Vyāghāta', 'व्याघात'],
  ['Harṣaṇa', 'हर्षण'], ['Vajra', 'वज्र'], ['Siddhi', 'सिद्धि'], ['Vyatīpāta', 'व्यतीपात'], ['Varīyān', 'वरीयान्'], ['Parigha', 'परिघ'], ['Śiva', 'शिव'],
  ['Siddha', 'सिद्ध'], ['Sādhya', 'साध्य'], ['Śubha', 'शुभ'], ['Śukla', 'शुक्ल'], ['Brahma', 'ब्रह्म'], ['Indra', 'इन्द्र'], ['Vaidhṛti', 'वैधृति'],
];
const KARANA_MOV = [['Bava', 'बव'], ['Bālava', 'बालव'], ['Kaulava', 'कौलव'], ['Taitila', 'तैतिल'], ['Garaja', 'गर'], ['Vaṇija', 'वणिज'], ['Viṣṭi', 'विष्टि']];
const VARA = [
  ['Ravivāra', 'रविवार', { en: 'day of the Sun', nl: 'dag van de Zon' }], ['Somavāra', 'सोमवार', { en: 'day of the Moon', nl: 'dag van de Maan' }],
  ['Maṅgalavāra', 'मङ्गलवार', { en: 'day of Mars', nl: 'dag van Mars' }], ['Budhavāra', 'बुधवार', { en: 'day of Mercury', nl: 'dag van Mercurius' }],
  ['Guruvāra', 'गुरुवार', { en: 'day of Jupiter', nl: 'dag van Jupiter' }], ['Śukravāra', 'शुक्रवार', { en: 'day of Venus', nl: 'dag van Venus' }],
  ['Śanivāra', 'शनिवार', { en: 'day of Saturn', nl: 'dag van Saturnus' }],
] as const;

type Graha = { key: string; deva: string; col: string; lon: number };

function ayanamsa(date: Date) {
  const y = 2000 + (date.getTime() - Date.UTC(2000, 0, 1, 12)) / (365.2422 * 86400000);
  return 23.8532 + (y - 2000) * 0.0139688;
}
const norm = (x: number) => ((x % 360) + 360) % 360;

export class NakshatraSection implements Section {
  chapter = 'nakshatra';
  private canvas!: HTMLCanvasElement;
  private g!: CanvasRenderingContext2D;
  private cards!: HTMLElement;
  private grahas: Graha[] = [];
  private sun = 0;
  private moon = 0;
  private elong = 0;
  private lastCalc = 0;
  private stars = STARS as number[][];
  private rot = 0;

  init() {
    const root = document.getElementById('nakshatra')!;
    this.canvas = root.querySelector('.sky__canvas')!;
    this.g = this.canvas.getContext('2d')!;
    this.cards = root.querySelector('[data-panchang]')!;
    this.compute();
    i18n.onChange(() => this.compute());
  }

  private compute() {
    const now = new Date();
    const time = A.MakeTime(now);
    const ay = ayanamsa(now);
    const sunT = A.SunPosition(time).elon;
    const moonT = A.EclipticGeoMoon(time).lon;
    const sid = (x: number) => norm(x - ay);
    this.sun = sid(sunT);
    this.moon = sid(moonT);
    this.elong = norm(moonT - sunT);
    const T = (time.tt) / 36525;
    const rahu = sid(125.04452 - 1934.136261 * T + 0.0020708 * T * T);
    const pl = (b: A.Body) => sid(A.Ecliptic(A.GeoVector(b, time, true)).elon);
    this.grahas = [
      { key: 'Sūrya', deva: 'सू', col: '#ffb347', lon: this.sun },
      { key: 'Candra', deva: 'चं', col: '#f3ead8', lon: this.moon },
      { key: 'Maṅgala', deva: 'मं', col: '#ff6a4d', lon: pl(A.Body.Mars) },
      { key: 'Budha', deva: 'बु', col: '#8fd18a', lon: pl(A.Body.Mercury) },
      { key: 'Guru', deva: 'गु', col: '#f6d98b', lon: pl(A.Body.Jupiter) },
      { key: 'Śukra', deva: 'शु', col: '#ffe9f2', lon: pl(A.Body.Venus) },
      { key: 'Śani', deva: 'श', col: '#8fa7ff', lon: pl(A.Body.Saturn) },
      { key: 'Rāhu', deva: 'रा', col: '#b39ddb', lon: rahu },
      { key: 'Ketu', deva: 'के', col: '#b39ddb', lon: norm(rahu + 180) },
    ];

    const L = i18n.lang;
    const t = (en: string, nl: string) => (L === 'nl' ? nl : en);
    const tIdx = Math.floor(this.elong / 12);
    const tFrac = (this.elong % 12) / 12;
    const shukla = tIdx < 15;
    const tn = tIdx === 14 ? ['Pūrṇimā', 'पूर्णिमा'] : tIdx === 29 ? ['Amāvasyā', 'अमावस्या'] : TITHI[tIdx % 15];
    const nIdx = Math.floor(this.moon / (360 / 27));
    const nFrac = (this.moon % (360 / 27)) / (360 / 27);
    const pada = Math.floor(nFrac * 4) + 1;
    const ySum = norm(this.sun + this.moon);
    const yIdx = Math.floor(ySum / (360 / 27));
    const kIdx = Math.floor(this.elong / 6);
    const kar = kIdx === 0 ? ['Kiṃstughna', 'किंस्तुघ्न'] : kIdx >= 57 ? [['Śakuni', 'शकुनि'], ['Catuṣpāda', 'चतुष्पाद'], ['Nāga', 'नाग']][kIdx - 57] : KARANA_MOV[(kIdx - 1) % 7];
    const v = VARA[now.getDay()];
    const sR = Math.floor(this.sun / 30), mR = Math.floor(this.moon / 30);
    const illum = Math.round(((1 - Math.cos((this.elong * Math.PI) / 180)) / 2) * 100);
    let nextFull = '', nextNew = '';
    try {
      const df = new Intl.DateTimeFormat(L === 'nl' ? 'nl-NL' : 'en-GB', { day: 'numeric', month: 'long' });
      nextFull = df.format(A.SearchMoonPhase(180, time, 40)!.date);
      nextNew = df.format(A.SearchMoonPhase(0, time, 40)!.date);
    } catch { /* ignore */ }
    const card = (k: string, v: string, d: string, s: string, frac = 0) =>
      `<div class="pc" style="--frac:${frac.toFixed(3)}"><span class="pc__k">${k}</span><span class="pc__v">${v}</span><span class="pc__d" lang="sa">${d}</span><span class="pc__s">${s}</span></div>`;
    this.cards.innerHTML = [
      card(t('Vāra · weekday', 'Vāra · weekdag'), v[0], v[1], i18n.pick(v[2])),
      card(t('Tithi · lunar day', 'Tithi · maandag'), tn[0], tn[1], `${shukla ? t('Śukla · waxing', 'Śukla · wassend') : t('Kṛṣṇa · waning', 'Kṛṣṇa · afnemend')} · ${tIdx + 1}/30`, tFrac),
      card(t('Nakṣatra · lunar mansion', 'Nakṣatra · maanhuis'), NAK[nIdx][0], NAK[nIdx][1], `pāda ${pada} · ${t('deity', 'godheid')}: ${NAK[nIdx][2]}`, nFrac),
      card('Yoga', YOGA[yIdx][0], YOGA[yIdx][1], `${yIdx + 1}/27`, (ySum % (360 / 27)) / (360 / 27)),
      card('Karaṇa', kar[0], kar[1], t('half of a tithi', 'halve tithi'), (this.elong % 6) / 6),
      card(t('Moon', 'Maan'), `${RASHI[mR][0]}`, RASHI[mR][1], `${illum}% ${t('lit', 'verlicht')} · ${t('full', 'vol')} ${nextFull}`, illum / 100),
      card(t('Sun', 'Zon'), `${RASHI[sR][0]}`, RASHI[sR][1], `${(this.sun % 30).toFixed(1)}° · ${t('new moon', 'nieuwe maan')} ${nextNew}`, (this.sun % 30) / 30),
      card('Ayanāṃśa', `${ay.toFixed(2)}°`, 'लाहिरी', t('precession since 285 CE', 'precessie sinds 285 n.Chr.'), 0),
    ].join('');
    this.lastCalc = performance.now();
  }

  update(f: Frame) {
    if (performance.now() - this.lastCalc > 30000) this.compute();
    fitCanvas(this.canvas, 2);
    const g = this.g;
    const W = this.canvas.width, H = this.canvas.height;
    const dpr = W / Math.max(1, this.canvas.clientWidth);
    g.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.48;
    const reveal = smoothstep(0, 0.5, f.chapters.coverage('nakshatra'));
    this.rot += f.dt * 0.004;
    const rot = this.rot;
    // angle for a sidereal longitude: 0° Meṣa at the top, counter-clockwise like the sky seen from the north
    const ang = (lon: number) => -Math.PI / 2 - (lon * Math.PI) / 180 - rot;
    g.save();
    g.globalAlpha = reveal;

    // nakṣatra ring
    const r1 = R, r2 = R * 0.9, r3 = R * 0.82;
    const nIdx = Math.floor(this.moon / (360 / 27));
    for (let i = 0; i < 27; i++) {
      const a0 = ang(i * (360 / 27)), a1 = ang((i + 1) * (360 / 27));
      g.beginPath();
      g.arc(cx, cy, r1, a0, a1, true);
      g.arc(cx, cy, r2, a1, a0, false);
      g.closePath();
      g.fillStyle = i === nIdx ? 'rgba(233,185,73,0.28)' : i % 2 ? 'rgba(233,185,73,0.05)' : 'rgba(233,185,73,0.1)';
      g.fill();
      const m = (a0 + a1) / 2;
      g.save();
      g.translate(cx + Math.cos(m) * (r1 + r2) / 2, cy + Math.sin(m) * (r1 + r2) / 2);
      g.rotate(m + Math.PI / 2);
      g.fillStyle = i === nIdx ? '#fff1c4' : 'rgba(246,217,139,0.75)';
      g.font = `${Math.max(9, R * 0.032)}px "Tiro Devanagari Sanskrit"`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(NAK[i][1], 0, 0);
      g.restore();
    }
    // rāśi ring
    for (let i = 0; i < 12; i++) {
      const a0 = ang(i * 30);
      g.strokeStyle = 'rgba(233,185,73,0.35)';
      g.lineWidth = dpr * 0.8;
      g.beginPath(); g.moveTo(cx + Math.cos(a0) * r2, cy + Math.sin(a0) * r2); g.lineTo(cx + Math.cos(a0) * r3, cy + Math.sin(a0) * r3); g.stroke();
      const m = ang(i * 30 + 15);
      g.save();
      g.translate(cx + Math.cos(m) * (r2 + r3) / 2, cy + Math.sin(m) * (r2 + r3) / 2);
      g.rotate(m + Math.PI / 2);
      g.fillStyle = 'rgba(243,234,216,0.6)';
      g.font = `${Math.max(8, R * 0.026)}px "JetBrains Mono"`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(RASHI[i][0].toUpperCase(), 0, 0);
      g.restore();
    }
    g.strokeStyle = 'rgba(233,185,73,0.5)';
    g.lineWidth = dpr;
    for (const r of [r1, r2, r3]) { g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke(); }

    // stars: polar projection of the ecliptic band
    const rE = R * 0.62, band = R * 0.19;
    for (const s of this.stars) {
      const [lon, lat, mag, k, yi] = s;
      const rr = rE + Math.max(-1.2, Math.min(1.2, lat / 30)) * band;
      const a = ang(lon);
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      const size = Math.max(0.35, (5.6 - mag) * 0.42) * dpr * (R / 380 / dpr + 0.4);
      const tw = 0.75 + 0.25 * Math.sin(f.t * (1 + (lon % 3)) + lat);
      const col = k < 4.5 ? '255,190,140' : k < 6 ? '255,236,210' : k < 8 ? '235,240,255' : '190,210,255';
      g.fillStyle = `rgba(${col},${Math.min(1, 0.35 + (5.5 - mag) * 0.18) * tw})`;
      g.beginPath(); g.arc(x, y, size, 0, TAU); g.fill();
      if (yi >= 0) {
        const hl = yi === nIdx;
        g.strokeStyle = hl ? 'rgba(255,241,196,0.9)' : 'rgba(233,185,73,0.45)';
        g.lineWidth = dpr * (hl ? 1.2 : 0.7);
        g.beginPath(); g.arc(x, y, size + 4 * dpr, 0, TAU); g.stroke();
      }
    }
    // ecliptic
    g.setLineDash([3 * dpr, 5 * dpr]);
    g.strokeStyle = 'rgba(233,185,73,0.3)';
    g.beginPath(); g.arc(cx, cy, rE, 0, TAU); g.stroke();
    g.setLineDash([]);

    // Sun → Moon: the elongation, cut into 12° tithis
    const as = ang(this.sun), am = ang(this.moon);
    const rT = R * 0.4;
    g.lineWidth = 3 * dpr;
    for (let i = 0; i < Math.ceil(this.elong / 12); i++) {
      const s0 = ang(this.sun + i * 12), s1 = ang(this.sun + Math.min(this.elong, (i + 1) * 12));
      g.strokeStyle = i % 2 ? 'rgba(255,170,80,0.75)' : 'rgba(255,210,140,0.75)';
      g.beginPath(); g.arc(cx, cy, rT, s0 - 0.004, s1 + 0.004, true); g.stroke();
    }
    g.strokeStyle = 'rgba(233,185,73,0.15)';
    g.lineWidth = dpr;
    g.beginPath(); g.arc(cx, cy, rT, 0, TAU); g.stroke();
    for (const a of [as, am]) {
      g.beginPath(); g.moveTo(cx + Math.cos(a) * rT * 0.55, cy + Math.sin(a) * rT * 0.55); g.lineTo(cx + Math.cos(a) * rE, cy + Math.sin(a) * rE);
      g.strokeStyle = 'rgba(246,217,139,0.25)'; g.stroke();
    }

    // grahas on the ecliptic
    const placed: number[] = [];
    const sorted = [...this.grahas].sort((a, b) => a.lon - b.lon);
    for (const gr of sorted) {
      let lane = 0;
      while (placed.some((p) => Math.abs(p - (gr.lon + lane * 1000)) < 7)) lane++;
      placed.push(gr.lon + lane * 1000);
      const a = ang(gr.lon);
      const rr = rE - lane * R * 0.07;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      const rad = R * 0.036;
      const glow = g.createRadialGradient(x, y, 0, x, y, rad * 2.6);
      glow.addColorStop(0, gr.col + 'cc');
      glow.addColorStop(1, gr.col + '00');
      g.fillStyle = glow;
      g.beginPath(); g.arc(x, y, rad * 2.6, 0, TAU); g.fill();
      g.fillStyle = 'rgba(8,6,14,0.85)';
      g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
      g.strokeStyle = gr.col;
      g.lineWidth = dpr;
      g.stroke();
      g.fillStyle = gr.col;
      g.font = `${rad * 1.05}px "Tiro Devanagari Sanskrit"`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(gr.deva, x, y + rad * 0.08);
    }

    // the Moon, as she looks tonight
    const mr = R * 0.2;
    const e = (this.elong * Math.PI) / 180;
    g.save();
    g.translate(cx, cy);
    const halo = g.createRadialGradient(0, 0, mr * 0.8, 0, 0, mr * 2.2);
    halo.addColorStop(0, `rgba(246,230,190,${0.12 + 0.18 * (1 - Math.cos(e)) / 2})`);
    halo.addColorStop(1, 'rgba(246,230,190,0)');
    g.fillStyle = halo;
    g.beginPath(); g.arc(0, 0, mr * 2.2, 0, TAU); g.fill();
    g.fillStyle = '#16131f';
    g.beginPath(); g.arc(0, 0, mr, 0, TAU); g.fill();
    const lit = g.createRadialGradient(-mr * 0.3, -mr * 0.3, 0, 0, 0, mr);
    lit.addColorStop(0, '#fff6dc');
    lit.addColorStop(1, '#d9c9a0');
    g.fillStyle = lit;
    const waxing = this.elong < 180;
    const cosE = Math.cos(e);
    g.beginPath();
    // bright limb semicircle, then terminator (ellipse of half-width |cos e|·r)
    if (waxing) {
      g.arc(0, 0, mr, -Math.PI / 2, Math.PI / 2, false);
      g.ellipse(0, 0, Math.abs(cosE) * mr, mr, 0, Math.PI / 2, -Math.PI / 2, cosE > 0);
    } else {
      g.arc(0, 0, mr, Math.PI / 2, -Math.PI / 2, false);
      g.ellipse(0, 0, Math.abs(cosE) * mr, mr, 0, -Math.PI / 2, Math.PI / 2, cosE > 0);
    }
    g.fill();
    // maria hint
    g.globalAlpha = reveal * 0.12;
    g.fillStyle = '#6d6250';
    for (const [x, y, r] of [[-0.25, -0.2, 0.22], [0.2, -0.35, 0.16], [0.1, 0.15, 0.25], [-0.3, 0.35, 0.12]]) { g.beginPath(); g.arc(x * mr, y * mr, r * mr, 0, TAU); g.fill(); }
    g.restore();
    g.restore();
  }
}
