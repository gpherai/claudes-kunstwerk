import type { Section } from '../core/section';
import type { Frame } from '../core/stage';
import { i18n } from '../core/i18n';
import { clamp, smoothstep, svgEl, TAU } from '../core/util';
import FACES from '../data/yantra-faces.json';

/* ─────────────────────────────────────────────────────────────
   Śrī Yantra — the nine triangles are *solved*, not traced.
   We start from the rigid "Type III" construction (after the
   MIT-licensed @vibzart/sri-yantra, TeXample.net), detect every
   point where three lines should meet, and run Levenberg–Marquardt
   until all 31 triple points are exact to machine precision.
   The yantra then draws itself from the bindu outward (sṛṣṭi-krama),
   and the steps walk the seeker back inward (saṃhāra-krama).
   ───────────────────────────────────────────────────────────── */

const IDS = ['D1', 'U1', 'U3', 'U2', 'D3', 'D2', 'U4', 'D4', 'D5'];
const TIES: Record<string, string> = { U3: 'D1', U2: 'D3', D3: 'U4', D2: 'U3', U4: 'D2', D4: 'U2', D5: 'U1' };
const FREE = ['U3', 'U2', 'D3', 'D2', 'U4', 'D4', 'D5'];
// base heights (9) then half-widths of the seven inner triangles — unit circle, y up
const X0 = [0.267949, -0.242466, -0.700383, -0.479232, 0.71895, 0.46878, -0.106601, 0.156924, 0.052022,
  0.512818, 0.717353, 0.595143, 0.690162, 0.350511, 0.336486, 0.253881];

const SW = 0.0032; // 1 css px ≈ 0.0032 viewBox units at typical size

type Tri = { by: number; ay: number; hw: number; up: boolean };
type Line = [number, number, number];

function unpack(x: number[]) {
  const by: Record<string, number> = {};
  IDS.forEach((id, k) => (by[id] = x[k]));
  const out: Record<string, Tri> = {};
  for (const id of IDS) {
    const b = by[id];
    let a: number, w: number;
    if (id === 'D1') { a = -1; w = Math.sqrt(Math.max(1e-12, 1 - b * b)); }
    else if (id === 'U1') { a = 1; w = Math.sqrt(Math.max(1e-12, 1 - b * b)); }
    else { a = by[TIES[id]]; w = x[9 + FREE.indexOf(id)]; }
    out[id] = { by: b, ay: a, hw: w, up: id[0] === 'U' };
  }
  return out;
}
function linesOf(t: Record<string, Tri>) {
  const L: { l: Line; p: [number, number]; q: [number, number] }[] = [];
  for (const id of IDS) {
    const { by, ay, hw } = t[id];
    const P: [number, number][] = [[-hw, by], [hw, by], [0, ay]];
    for (let k = 0; k < 3; k++) {
      const p = P[k], q = P[(k + 1) % 3];
      const l: Line = [p[1] - q[1], q[0] - p[0], p[0] * q[1] - p[1] * q[0]];
      const n = Math.hypot(l[0], l[1]);
      L.push({ l: [l[0] / n, l[1] / n, l[2] / n], p, q });
    }
  }
  return L;
}
const det3 = (a: Line, b: Line, c: Line) =>
  a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);

function solveLinear(A: number[][], b: number[]) {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x;
}

/** Find the triple points of the starting geometry, then make them exact. */
export function solveSriYantra() {
  const L0 = linesOf(unpack(X0));
  const onSeg = (x: number, y: number, s: { p: number[]; q: number[] }, tol = 2e-3) =>
    x >= Math.min(s.p[0], s.q[0]) - tol && x <= Math.max(s.p[0], s.q[0]) + tol && y >= Math.min(s.p[1], s.q[1]) - tol && y <= Math.max(s.p[1], s.q[1]) + tol;
  const triples: [number, number, number][] = [];
  const n = L0.length;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
    const la = L0[a].l, lb = L0[b].l;
    const z = la[0] * lb[1] - la[1] * lb[0];
    if (Math.abs(z) < 1e-9) continue;
    const px = (la[1] * lb[2] - la[2] * lb[1]) / z, py = (la[2] * lb[0] - la[0] * lb[2]) / z;
    if (Math.hypot(px, py) > 1) continue;
    for (let c = b + 1; c < n; c++) {
      const lc = L0[c].l;
      if (Math.abs(lc[0] * px + lc[1] * py + lc[2]) < 2.5e-3 && onSeg(px, py, L0[a]) && onSeg(px, py, L0[b]) && onSeg(px, py, L0[c])) triples.push([a, b, c]);
    }
  }
  const res = (x: number[]) => { const L = linesOf(unpack(x)); return triples.map(([a, b, c]) => det3(L[a].l, L[b].l, L[c].l)); };
  const maxAbs = (r: number[]) => r.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  let x = [...X0];
  let lam = 1e-3;
  const before = maxAbs(res(x));
  let iters = 0;
  for (; iters < 40; iters++) {
    const r = res(x);
    if (maxAbs(r) < 1e-14) break;
    const m = x.length;
    const J = r.map(() => new Array(m).fill(0));
    for (let k = 0; k < m; k++) {
      const xp = [...x]; xp[k] += 1e-7;
      const rp = res(xp);
      for (let i = 0; i < r.length; i++) J[i][k] = (rp[i] - r[i]) / 1e-7;
    }
    const A = Array.from({ length: m }, (_, i) => Array.from({ length: m }, (_, j) => { let s = 0; for (let k = 0; k < r.length; k++) s += J[k][i] * J[k][j]; return s + (i === j ? lam : 0); }));
    const g = Array.from({ length: m }, (_, i) => { let s = 0; for (let k = 0; k < r.length; k++) s += J[k][i] * r[k]; return -s; });
    const dx = solveLinear(A, g);
    const xn = x.map((v, i) => v + dx[i]);
    const nn = res(xn).reduce((s, v) => s + v * v, 0), no = r.reduce((s, v) => s + v * v, 0);
    if (nn < no) { x = xn; lam *= 0.3; } else lam *= 10;
  }
  return { tris: unpack(x), triples: triples.length, before, after: maxAbs(res(x)), iters };
}

export class YantraSection implements Section {
  chapter = 'yantra';
  private svg!: SVGSVGElement;
  private draws: { el: SVGGeometryElement; t0: number; t1: number }[] = [];
  private groups: SVGGElement[] = [];
  private bindu!: SVGCircleElement;
  private stats = '';
  private statEl: HTMLElement | null = null;
  private lastStep = -2;

  init() {
    this.svg = document.querySelector('.yantra__svg')!;
    const t0 = performance.now();
    const sol = solveSriYantra();
    const ms = performance.now() - t0;
    this.stats = `${sol.triples} triple points · error ${sol.before.toExponential(1)} → ${sol.after.toExponential(1)} · ${sol.iters} iterations · ${ms.toFixed(1)} ms`;
    this.build(sol.tris);
    const note = document.querySelector('#yantra .footnote');
    if (note) {
      this.statEl = document.createElement('span');
      this.statEl.className = 'mono yantra__stats';
      note.after(this.statEl);
      this.statEl.textContent = this.stats;
    }
    i18n.onChange(() => { if (this.statEl) this.statEl.textContent = this.stats; });
  }

  private build(tris: Record<string, Tri>) {
    const s = this.svg;
    const defs = svgEl('defs', {}, s);
    const grad = svgEl('radialGradient', { id: 'ygl' }, defs);
    svgEl('stop', { offset: '0', 'stop-color': '#fff6d8' }, grad);
    svgEl('stop', { offset: '0.35', 'stop-color': '#f6d98b', 'stop-opacity': '0.9' }, grad);
    svgEl('stop', { offset: '1', 'stop-color': '#e9b949', 'stop-opacity': '0' }, grad);
    const mk = (cls: string) => { const g = svgEl('g', { class: `yg ${cls}` }, s); this.groups.push(g); return g; };
    const RT = 0.5; // triangle circle radius
    const draw = (el: SVGGeometryElement, t0: number, t1: number) => { el.setAttribute('pathLength', '1'); this.draws.push({ el, t0, t1 }); return el; };

    // 0 · bhūpura: three nested squares with four gates
    const gB = mk('yg-bhupura');
    for (let k = 0; k < 3; k++) {
      const S = 1.06 - k * 0.028, g = 0.15 - k * 0.012, d = 0.07 - k * 0.012, e = 0.05;
      const side = (rot: number) => {
        const pts: [number, number][] = [[-S, -S], [-g, -S], [-g, -S - d], [-g - e, -S - d], [-g - e, -S - d - 0.02], [g + e, -S - d - 0.02], [g + e, -S - d], [g, -S - d], [g, -S]];
        const c = Math.cos(rot), sn = Math.sin(rot);
        return pts.map(([x, y]) => [x * c - y * sn, x * sn + y * c] as [number, number]);
      };
      const all = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].flatMap(side);
      const dStr = 'M' + all.map(([x, y]) => `${x.toFixed(4)} ${y.toFixed(4)}`).join('L') + 'Z';
      draw(svgEl('path', { d: dStr, class: 'ln', 'stroke-width': (k === 1 ? 1.4 : 0.9) * SW }, gB) as SVGGeometryElement, 0.7 + k * 0.02, 0.98);
    }
    // three circles
    const gC = mk('yg-circles');
    [0.93, 0.905, 0.88].forEach((r, i) => draw(svgEl('circle', { cx: 0, cy: 0, r, class: 'ln', 'stroke-width': (0.8) * SW }, gC) as SVGGeometryElement, 0.62 + i * 0.02, 0.8));
    // 1 · lotuses of 16 and 8 petals
    const gL = mk('yg-lotus');
    const petals = (n: number, r0: number, r1: number, bulge: number, t0: number, t1: number, rot = 0) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rot - Math.PI / 2, da = Math.PI / n;
        const p0 = [Math.cos(a - da) * r0, Math.sin(a - da) * r0], p1 = [Math.cos(a + da) * r0, Math.sin(a + da) * r0];
        const tip = [Math.cos(a) * r1, Math.sin(a) * r1];
        const rm = r0 + (r1 - r0) * 0.55;
        const c0 = [Math.cos(a - da * bulge) * rm, Math.sin(a - da * bulge) * rm], c1 = [Math.cos(a + da * bulge) * rm, Math.sin(a + da * bulge) * rm];
        const d = `M${p0[0]} ${p0[1]}Q${c0[0]} ${c0[1]} ${tip[0]} ${tip[1]}Q${c1[0]} ${c1[1]} ${p1[0]} ${p1[1]}`;
        draw(svgEl('path', { d, class: 'ln petal', 'stroke-width': (0.9) * SW }, gL) as SVGGeometryElement, t0 + (i / n) * 0.05, t1);
        const inner = `M${Math.cos(a) * (r0 + 0.012)} ${Math.sin(a) * (r0 + 0.012)}L${Math.cos(a) * (r0 + (r1 - r0) * 0.6)} ${Math.sin(a) * (r0 + (r1 - r0) * 0.6)}`;
        draw(svgEl('path', { d: inner, class: 'ln rib', 'stroke-width': (0.5) * SW }, gL) as SVGGeometryElement, t0 + 0.05, t1);
      }
      draw(svgEl('circle', { cx: 0, cy: 0, r: r0, class: 'ln', 'stroke-width': (0.8) * SW }, gL) as SVGGeometryElement, t0 - 0.02, t1 - 0.05);
    };
    petals(8, RT + 0.012, 0.69, 1.35, 0.38, 0.62);
    petals(16, 0.705, 0.86, 1.3, 0.5, 0.72, Math.PI / 16);

    // triangle faces (āvaraṇas) — filled when their step is active
    const ring = (d: number) => (d >= 4 ? 4 : d);
    const faceGroups = [mk('yg-f14'), mk('yg-f10a'), mk('yg-f10b'), mk('yg-f8')];
    for (const f of FACES as { d: number; p: number[][] }[]) {
      const pts = f.p.map(([x, y]) => `${(x * RT).toFixed(5)},${(-y * RT).toFixed(5)}`).join(' ');
      const r = ring(f.d);
      svgEl('polygon', { points: pts, class: `face face-${r}` }, faceGroups[Math.min(3, r)]);
    }
    // 2 · the nine triangles, drawn from the centre outward
    const gT = mk('yg-tris');
    svgEl('circle', { cx: 0, cy: 0, r: RT, class: 'ln', 'stroke-width': (1) * SW }, gT);
    draw(gT.lastElementChild as SVGGeometryElement, 0.3, 0.45);
    const order = ['D5', 'U4', 'D4', 'U3', 'D3', 'U2', 'D2', 'U1', 'D1'];
    order.forEach((id, i) => {
      const t = tris[id];
      const P = [[-t.hw, t.by], [t.hw, t.by], [0, t.ay]].map(([x, y]) => `${(x * RT).toFixed(5)} ${(-y * RT).toFixed(5)}`);
      const el = svgEl('path', { d: `M${P[0]}L${P[1]}L${P[2]}Z`, class: `ln tri ${t.up ? 'tri--up' : 'tri--down'}`, 'stroke-width': (1.25) * SW }, gT) as SVGGeometryElement;
      draw(el, 0.03 + i * 0.03, 0.18 + i * 0.03);
    });
    // 3 · bindu
    const gP = mk('yg-bindu');
    svgEl('circle', { cx: 0, cy: 0.0, r: 0.07, fill: 'url(#ygl)', class: 'bindu-glow' }, gP);
    this.bindu = svgEl('circle', { cx: 0, cy: 0.0, r: 0.009, fill: '#fff6d8', class: 'bindu' }, gP);
    // put the bindu where the tradition places it: inside the central triangle, slightly below centre
    const c = tris.D5;
    const cy = -((c.by + c.ay + c.by) / 3) * RT;
    gP.querySelectorAll('circle').forEach((el) => el.setAttribute('cy', cy.toFixed(5)));
    for (const d of this.draws) { d.el.style.strokeDasharray = '1'; d.el.style.strokeDashoffset = '1'; }
  }

  update(f: Frame) {
    const ch = f.chapters;
    const p = ch.progress('yantra');
    // draw from the bindu outward while entering
    const drawT = clamp(smoothstep(-0.02, 0.12, p) * 0.75 + smoothstep(0.1, 0.5, ch.coverage('yantra')) * 0.25);
    for (const d of this.draws) {
      const k = clamp((drawT - d.t0) / (d.t1 - d.t0));
      d.el.style.strokeDashoffset = String(1 - k);
    }
    const step = ch.get('yantra')!.step;
    if (step !== this.lastStep) {
      this.lastStep = step;
      // step → which groups glow: 0 bhūpura, 1 lotus, 2 f14, 3 f10a+f10b, 4 f8(+centre), 5 bindu
      const map: Record<number, string[]> = { 0: ['yg-bhupura'], 1: ['yg-lotus', 'yg-circles'], 2: ['yg-f14'], 3: ['yg-f10a', 'yg-f10b'], 4: ['yg-f8'], 5: ['yg-bindu'] };
      const on = map[step] ?? [];
      this.svg.classList.toggle('is-focus', step >= 0);
      this.svg.classList.toggle('is-final', step === 5);
      this.svg.classList.toggle('is-meru', step === 6);
      for (const g of this.groups) g.classList.toggle('is-on', on.some((c) => g.classList.contains(c)));
    }
    const pulse = 1 + 0.25 * Math.sin(f.t * 2.2);
    this.bindu.setAttribute('r', (0.009 * (step === 5 ? 1.6 * pulse : pulse)).toFixed(4));
  }
}
