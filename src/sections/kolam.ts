import type { Section } from '../core/section';
import type { Frame } from '../core/stage';
import { audio } from '../core/audio';
import { i18n } from '../core/i18n';
import { rng, svgEl } from '../core/util';

/* ─────────────────────────────────────────────────────────────
   Kolam as mirror curves (P. Gerdes, S. Jablan). Dots sit in the
   cells of an n×n grid; a ray runs diagonally between edge
   midpoints and bounces off the border and off two-sided mirrors
   placed on inner edges. Mirrors are chosen with the full D4
   symmetry of the square, then extra mirrors are placed where two
   different loops cross until — if asked — a single unbroken line
   (a sikku kolam) remains.
   ───────────────────────────────────────────────────────────── */

type State = 0 | 1 | 2; // 0 none (strands cross), 1 mirror along the edge, 2 mirror across it
const key = (x2: number, y2: number) => `${x2},${y2}`; // doubled coordinates of an edge midpoint

interface Kolam { n: number; paths: string[]; lengths: number[]; components: number; crossings: number; mirrors: number; symmetry: string }

function generateOnce(n: number, seed: number, wantOne: boolean, pMirror: number): Kolam {
  const R = rng(seed);
  // inner edges in doubled coordinates: vertical edge midpoint (2a, 2j+1), horizontal (2i+1, 2b)
  const edges: [number, number][] = [];
  for (let a = 1; a < n; a++) for (let j = 0; j < n; j++) edges.push([2 * a, 2 * j + 1]);
  for (let b = 1; b < n; b++) for (let i = 0; i < n; i++) edges.push([2 * i + 1, 2 * b]);
  const N2 = 2 * n;
  const sym = (x: number, y: number) => {
    const out: [number, number][] = [];
    for (const [a, b] of [[x, y], [N2 - x, y], [x, N2 - y], [N2 - x, N2 - y], [y, x], [N2 - y, x], [y, N2 - x], [N2 - y, N2 - x]]) out.push([a, b]);
    return out;
  };
  const state = new Map<string, State>();
  const orbitOf = new Map<string, string[]>();
  for (const [x, y] of edges) {
    const k = key(x, y);
    if (orbitOf.has(k)) continue;
    const orb = Array.from(new Set(sym(x, y).map(([a, b]) => key(a, b))));
    for (const o of orb) orbitOf.set(o, orb);
    const r = R();
    const s: State = r < 1 - pMirror ? 0 : r < 1 - pMirror * 0.45 ? 1 : 2;
    for (const o of orb) state.set(o, s);
  }

  const trace = () => {
    const seen = new Set<string>();
    const comps: [number, number][][] = [];
    const all: [number, number, number, number][] = [];
    for (let a = 0; a <= n; a++) for (let j = 0; j < n; j++) all.push([2 * a, 2 * j + 1, a === n ? -1 : 1, 1]);
    for (let b = 0; b <= n; b++) for (let i = 0; i < n; i++) all.push([2 * i + 1, 2 * b, 1, b === n ? -1 : 1]);
    for (const [sx, sy, sdx, sdy] of all) {
      if (seen.has(`${sx},${sy},${sdx * sdy}`)) continue;
      let x = sx, y = sy, dx = sdx, dy = sdy;
      const pts: [number, number][] = [];
      for (let guard = 0; guard < 40000; guard++) {
        seen.add(`${x},${y},${dx * dy}`);
        pts.push([x, y]);
        x += dx; y += dy;
        seen.add(`${x},${y},${dx * dy}`);
        const vertical = x % 2 === 0;
        const boundary = vertical ? x === 0 || x === N2 : y === 0 || y === N2;
        const st = boundary ? 1 : state.get(key(x, y)) ?? 0;
        if (st === 1) { if (vertical) dx = -dx; else dy = -dy; }
        else if (st === 2) { if (vertical) dy = -dy; else dx = -dx; }
        if (x === sx && y === sy && dx === sdx && dy === sdy) break;
      }
      comps.push(pts);
    }
    return comps;
  };

  let comps = trace();
  let symmetry = 'D4';
  if (wantOne) {
    // join loops by placing mirrors where two different loops cross; relax the symmetry only if we must
    const c2 = (k: string) => { const [x, y] = k.split(',').map(Number); return Array.from(new Set([k, key(N2 - x, N2 - y)])); };
    const phases: [string, (k: string) => string[]][] = [['D4', (k) => orbitOf.get(k)!], ['C2', c2], ['—', (k) => [k]]];
    for (const [name, orbit] of phases) {
      let progress = true;
      while (comps.length > 1 && progress) {
        progress = false;
        const membership = new Map<string, Set<number>>();
        comps.forEach((c, ci) => c.forEach(([x, y]) => { const k = key(x, y); if (!membership.has(k)) membership.set(k, new Set()); membership.get(k)!.add(ci); }));
        const cands = edges.map(([x, y]) => key(x, y)).filter((k) => (membership.get(k)?.size ?? 0) > 1);
        for (let i = cands.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [cands[i], cands[j]] = [cands[j], cands[i]]; }
        outer: for (const pick of cands.slice(0, 80)) {
          const orb = orbit(pick);
          const cur = state.get(pick)!;
          if (orb.some((o) => state.get(o) !== cur)) continue;
          const alts: State[] = cur === 0 ? (R() < 0.5 ? [1, 2] : [2, 1]) : cur === 1 ? [2, 0] : [1, 0];
          for (const s of alts) {
            for (const o of orb) state.set(o, s);
            const next = trace();
            if (next.length < comps.length) { comps = next; progress = true; if (name !== 'D4') symmetry = name; break outer; }
          }
          for (const o of orb) state.set(o, cur);
        }
      }
      if (comps.length === 1) break;
    }
  }
  let crossings = 0, mirrors = 0;
  for (const [x, y] of edges) { const s = state.get(key(x, y)); if (s === 0) crossings++; else mirrors++; }

  // smooth path: quadratic curves through the half-way points, bulged into round loops at the turns
  const paths: string[] = [], lengths: number[] = [];
  for (const pts of comps) {
    const P = pts.map(([x, y]) => [x / 2, y / 2]);
    const m = P.length;
    const mid = (i: number) => { const a = P[i % m], b = P[(i + 1) % m]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
    let d = '';
    let len = 0;
    const s0 = mid(m - 1);
    d += `M${s0[0].toFixed(3)} ${s0[1].toFixed(3)}`;
    for (let i = 0; i < m; i++) {
      const c = P[i], e = mid(i), s = mid(i - 1 + m);
      const turn = Math.abs((e[0] - c[0]) * (s[1] - c[1]) - (e[1] - c[1]) * (s[0] - c[0])) > 1e-6;
      if (turn) {
        // push the control point outward → rounder loops like a hand-drawn kolam
        const cx = c[0] + (c[0] - (s[0] + e[0]) / 2) * 0.55, cy = c[1] + (c[1] - (s[1] + e[1]) / 2) * 0.55;
        d += `Q${cx.toFixed(3)} ${cy.toFixed(3)} ${e[0].toFixed(3)} ${e[1].toFixed(3)}`;
        len += 0.62;
      } else {
        d += `L${e[0].toFixed(3)} ${e[1].toFixed(3)}`;
        len += 0.7071;
      }
    }
    paths.push(d + 'Z');
    lengths.push(len);
  }
  return { n, paths, lengths, components: comps.length, crossings, mirrors, symmetry };
}

/** Try several seeds; prefer one unbroken line with the most symmetry. */
function generate(n: number, seed: number, wantOne: boolean): Kolam {
  if (!wantOne) return generateOnce(n, seed, false, 0.42);
  const rank = (k: Kolam) => (k.components === 1 ? 10 : 0) - k.components + (k.symmetry === 'D4' ? 3 : k.symmetry === 'C2' ? 2 : 0);
  let best: Kolam | null = null;
  const tries = n <= 7 ? 14 : n <= 9 ? 7 : 4;
  const t0 = performance.now();
  for (let i = 0; i < tries; i++) {
    const k = generateOnce(n, seed + i * 104729, true, 0.3 + ((i * 0.37) % 0.35));
    if (!best || rank(k) > rank(best)) best = k;
    if (best.components === 1 && best.symmetry === 'D4') break;
    if (performance.now() - t0 > 700) break;
  }
  return best!;
}

const FESTIVE = ['#f5c518', '#e2412b', '#e0338a', '#2fa34f', '#2f6fdc', '#ff8a2a', '#8a4fd8'];

export class KolamSection implements Section {
  chapter = 'kolam';
  private svg!: SVGSVGElement;
  private meta!: HTMLElement;
  private n = 7;
  private sikku = true;
  private color = false;
  private seed = (Math.random() * 1e9) | 0;
  private drawStart = -1;
  private drawDur = 8;
  private strokes: { el: SVGPathElement; len: number; t0: number; t1: number }[] = [];
  private tip!: SVGCircleElement;
  private started = false;
  private done = false;
  private k: Kolam | null = null;

  init() {
    this.svg = document.querySelector('.kolam__svg')!;
    this.meta = document.querySelector('[data-kolam-meta]')!;
    document.querySelector('[data-kolam="new"]')!.addEventListener('click', () => { this.seed = (Math.random() * 1e9) | 0; this.make(true); });
    document.querySelectorAll<HTMLButtonElement>('[data-kolam-size]').forEach((b) => b.addEventListener('click', () => {
      this.n = +b.dataset.kolamSize!;
      document.querySelectorAll('[data-kolam-size]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      this.make(true);
    }));
    const sk = document.querySelector<HTMLInputElement>('[data-kolam="sikku"]')!;
    sk.addEventListener('change', () => { this.sikku = sk.checked; this.make(true); });
    const co = document.querySelector<HTMLInputElement>('[data-kolam="color"]')!;
    co.addEventListener('change', () => { this.color = co.checked; this.make(true); });
    i18n.onChange(() => this.writeMeta());
    this.make(false);
  }

  private make(animate: boolean) {
    this.k = generate(this.n, this.seed, this.sikku);
    const k = this.k;
    const s = this.svg;
    s.innerHTML = '';
    const pad = 0.8;
    s.setAttribute('viewBox', `${-pad} ${-pad} ${k.n + 2 * pad} ${k.n + 2 * pad}`);
    const defs = svgEl('defs', {}, s);
    const f = svgEl('filter', { id: 'flour', x: '-5%', y: '-5%', width: '110%', height: '110%' }, defs);
    svgEl('feTurbulence', { type: 'fractalNoise', baseFrequency: '2.2', numOctaves: '2', seed: String(this.seed % 97), result: 'n' }, f);
    svgEl('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: '0.06', xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' }, f);
    svgEl('feGaussianBlur', { in: 'd', stdDeviation: '0.012', result: 'b' }, f);
    const fm = svgEl('feMerge', {}, f);
    svgEl('feMergeNode', { in: 'b' }, fm);
    const glow = svgEl('filter', { id: 'kglow', x: '-10%', y: '-10%', width: '120%', height: '120%' }, defs);
    svgEl('feGaussianBlur', { stdDeviation: '0.08' }, glow);
    const dots = svgEl('g', { class: 'kolam__dots' }, s);
    for (let i = 0; i < k.n; i++) for (let j = 0; j < k.n; j++) {
      const c = this.color ? FESTIVE[(i * 3 + j * 5) % FESTIVE.length] : '#f6efe2';
      svgEl('circle', { cx: i + 0.5, cy: j + 0.5, r: 0.055, fill: c, opacity: 0.9 }, dots);
    }
    const halo = svgEl('g', { filter: 'url(#kglow)', opacity: '0.35' }, s);
    const g = svgEl('g', { filter: 'url(#flour)' }, s);
    this.strokes = [];
    const total = k.lengths.reduce((a, b) => a + b, 0);
    let acc = 0;
    k.paths.forEach((d, i) => {
      const col = this.color ? FESTIVE[i % FESTIVE.length] : '#f6efe2';
      const width = 0.085;
      const hp = svgEl('path', { d, fill: 'none', stroke: col, 'stroke-width': width * 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, halo) as SVGPathElement;
      const p = svgEl('path', { d, fill: 'none', stroke: col, 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g) as SVGPathElement;
      const L = p.getTotalLength();
      for (const el of [p, hp]) { el.style.strokeDasharray = `${L} ${L}`; el.style.strokeDashoffset = animate || !this.started ? String(L) : '0'; }
      const t0 = acc / total, t1 = (acc + k.lengths[i]) / total;
      acc += k.lengths[i];
      this.strokes.push({ el: p, len: L, t0, t1 }, { el: hp, len: L, t0, t1 });
    });
    this.tip = svgEl('circle', { r: 0.13, fill: 'url(#tipg)', opacity: 0 }, s);
    const tg = svgEl('radialGradient', { id: 'tipg' }, defs);
    svgEl('stop', { offset: '0', 'stop-color': '#fff8e8', 'stop-opacity': '0.95' }, tg);
    svgEl('stop', { offset: '1', 'stop-color': '#fff8e8', 'stop-opacity': '0' }, tg);
    this.drawDur = Math.min(16, 3 + total * 0.05);
    this.done = false;
    if (animate) this.drawStart = performance.now() / 1000;
    this.writeMeta();
  }

  private writeMeta() {
    const k = this.k;
    if (!k) return;
    const nl = i18n.lang === 'nl';
    const lines = k.components === 1 ? (nl ? '1 doorlopende lijn' : '1 unbroken line') : nl ? `${k.components} lijnen` : `${k.components} lines`;
    this.meta.textContent = `${k.n} × ${k.n} pulli · ${lines} · ${k.crossings} ${nl ? 'kruisingen' : 'crossings'} · ${k.mirrors} ${nl ? 'spiegels' : 'mirrors'} · ${nl ? 'symmetrie' : 'symmetry'} ${k.symmetry === '—' ? '≈D4' : k.symmetry}`;
  }

  update(f: Frame) {
    const cov = f.chapters.coverage('kolam');
    if (!this.started && cov > 0.6) { this.started = true; this.drawStart = performance.now() / 1000; }
    if (this.drawStart < 0) return;
    const now = performance.now() / 1000;
    const t = Math.min(1, Math.max(0, (now - this.drawStart) / this.drawDur));
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    let tipSet = false;
    for (const s of this.strokes) {
      const k = Math.max(0, Math.min(1, (ease - s.t0) / Math.max(1e-6, s.t1 - s.t0)));
      s.el.style.strokeDashoffset = String(s.len * (1 - k));
      if (!tipSet && k > 0 && k < 1) {
        const pt = s.el.getPointAtLength(s.len * k);
        this.tip.setAttribute('cx', String(pt.x));
        this.tip.setAttribute('cy', String(pt.y));
        this.tip.setAttribute('opacity', '1');
        tipSet = true;
      }
    }
    if (!tipSet) this.tip.setAttribute('opacity', '0');
    if (t >= 1 && !this.done) { this.done = true; audio.chime(1318, 0.06); }
  }
}
