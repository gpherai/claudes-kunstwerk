import type { Section } from '../core/section';
import type { Frame } from '../core/stage';
import { audio } from '../core/audio';
import { i18n } from '../core/i18n';
import { svgEl, toDeva, TAU } from '../core/util';
import { VERSES } from '../content/verses';

/* ─────────────────────────────────────────────────────────────
   The wheel of the Gītā, modelled on the stone chariot wheels of
   the Konark Sun Temple (13th c.): eight broad spokes, eight slim
   ones, a beaded rim, a lotus hub. Its rim carries the eighteen
   chapters. Drag it, fling it, let it settle: a verse arrives.
   ───────────────────────────────────────────────────────────── */

const N = 18;

export class GitaSection implements Section {
  chapter = 'gita';
  private svg!: SVGSVGElement;
  private rotor!: SVGGElement;
  private card!: HTMLElement;
  private angle = 0;
  private vel = 0;
  private dragging = false;
  private lastA = 0;
  private lastT = 0;
  private settled = true;
  private current = -1;
  private lastTick = 0;

  init() {
    this.svg = document.querySelector('.gita__wheel')!;
    this.card = document.querySelector('[data-verse]')!;
    this.build();
    const btn = document.querySelector<HTMLButtonElement>('.gita__spin')!;
    btn.addEventListener('click', () => { this.vel = (Math.random() > 0.5 ? 1 : -1) * (7 + Math.random() * 6); this.settled = false; });
    const toAngle = (e: PointerEvent) => {
      const r = this.svg.getBoundingClientRect();
      return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
    };
    this.svg.addEventListener('pointerdown', (e) => {
      this.dragging = true; this.settled = false;
      this.lastA = toAngle(e); this.lastT = performance.now(); this.vel = 0;
      this.svg.setPointerCapture(e.pointerId);
    });
    this.svg.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const a = toAngle(e);
      let d = a - this.lastA;
      if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU;
      const now = performance.now();
      const dt = Math.max(1, now - this.lastT) / 1000;
      this.angle += d;
      this.vel = this.vel * 0.6 + (d / dt) * 0.4;
      this.lastA = a; this.lastT = now;
    });
    const up = () => { this.dragging = false; };
    this.svg.addEventListener('pointerup', up);
    this.svg.addEventListener('pointercancel', up);
    this.svg.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') btn.click(); });
    i18n.onChange(() => { if (this.current >= 0) this.showVerse(this.current, true); });
    this.showVerse(14, true); // 15.7 — the verse that contains the word sanātana
    this.angle = -((14 + 0.5) / N) * TAU;
  }

  private build() {
    const s = this.svg;
    const defs = svgEl('defs', {}, s);
    const g1 = svgEl('radialGradient', { id: 'stone', cx: '0.4', cy: '0.35', r: '0.8' }, defs);
    svgEl('stop', { offset: '0', 'stop-color': '#c9a27a' }, g1);
    svgEl('stop', { offset: '1', 'stop-color': '#6e4a2e' }, g1);
    const g2 = svgEl('linearGradient', { id: 'spoke', x1: '0', x2: '1' }, defs);
    svgEl('stop', { offset: '0', 'stop-color': '#8a6240' }, g2);
    svgEl('stop', { offset: '0.5', 'stop-color': '#cfa77c' }, g2);
    svgEl('stop', { offset: '1', 'stop-color': '#7a5436' }, g2);
    const rot = svgEl('g', {}, s);
    this.rotor = rot;
    // rim
    svgEl('circle', { r: 1.0, fill: 'url(#stone)' }, rot);
    svgEl('circle', { r: 0.8, fill: '#140d0a' }, rot);
    svgEl('circle', { r: 0.985, fill: 'none', stroke: '#e9c38e', 'stroke-width': 0.006, opacity: 0.6 }, rot);
    svgEl('circle', { r: 0.815, fill: 'none', stroke: '#e9c38e', 'stroke-width': 0.005, opacity: 0.5 }, rot);
    // eighteen chapter segments on the rim
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * TAU - Math.PI / 2;
      svgEl('line', { x1: Math.cos(a0) * 0.82, y1: Math.sin(a0) * 0.82, x2: Math.cos(a0) * 0.98, y2: Math.sin(a0) * 0.98, stroke: '#3b2618', 'stroke-width': 0.012 }, rot);
      const am = a0 + TAU / N / 2;
      const t = svgEl('text', {
        x: 0, y: 0, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 0.085, fill: '#2b1a10', 'font-family': 'Tiro Devanagari Sanskrit',
        transform: `translate(${Math.cos(am) * 0.9} ${Math.sin(am) * 0.9}) rotate(${(am * 180) / Math.PI + 90})`,
      }, rot);
      t.textContent = toDeva(i + 1);
      const bead = svgEl('circle', { cx: Math.cos(am) * 0.955, cy: Math.sin(am) * 0.955, r: 0.009, fill: '#f6d98b', opacity: 0.8 }, rot);
      bead.setAttribute('class', `seg seg-${i}`);
    }
    // beads along the inner rim
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * TAU;
      svgEl('circle', { cx: Math.cos(a) * 0.775, cy: Math.sin(a) * 0.775, r: 0.012, fill: '#b58a60' }, rot);
    }
    // spokes: 8 broad with medallions, 8 slim
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      const broad = i % 2 === 0;
      const w = broad ? 0.075 : 0.028;
      const g = svgEl('g', { transform: `rotate(${(a * 180) / Math.PI})` }, rot);
      svgEl('path', { d: `M0.2 ${-w * 0.7} L0.77 ${-w} L0.77 ${w} L0.2 ${w * 0.7} Z`, fill: 'url(#spoke)' }, g);
      if (broad) {
        svgEl('circle', { cx: 0.5, cy: 0, r: 0.07, fill: '#3a2618', stroke: '#e0b884', 'stroke-width': 0.008 }, g);
        for (let k = 0; k < 8; k++) {
          const b = (k / 8) * TAU;
          svgEl('ellipse', { cx: 0.5 + Math.cos(b) * 0.04, cy: Math.sin(b) * 0.04, rx: 0.022, ry: 0.01, transform: `rotate(${(b * 180) / Math.PI} ${0.5 + Math.cos(b) * 0.04} ${Math.sin(b) * 0.04})`, fill: '#d9ae78', opacity: 0.85 }, g);
        }
        svgEl('circle', { cx: 0.5, cy: 0, r: 0.015, fill: '#f6d98b' }, g);
      }
    }
    // hub: lotus
    svgEl('circle', { r: 0.22, fill: 'url(#stone)', stroke: '#e9c38e', 'stroke-width': 0.006 }, rot);
    for (let k = 0; k < 16; k++) {
      const b = (k / 16) * TAU;
      svgEl('path', { d: `M0 0 Q0.05 -0.07 0 -0.19 Q-0.05 -0.07 0 0`, transform: `rotate(${(b * 180) / Math.PI})`, fill: '#8a5f3c', stroke: '#e9c38e', 'stroke-width': 0.004, opacity: 0.9 }, rot);
    }
    svgEl('circle', { r: 0.06, fill: '#2b1a10', stroke: '#f6d98b', 'stroke-width': 0.008 }, rot);
    svgEl('circle', { r: 0.02, fill: '#f6d98b' }, rot);
    s.setAttribute('tabindex', '0');
  }

  private showVerse(i: number, silent = false) {
    this.current = i;
    const v = VERSES[i];
    const nl = i18n.lang === 'nl';
    const P = (x: { en: string; nl: string }) => i18n.pick(x);
    this.card.classList.add('is-changing');
    setTimeout(() => {
      this.card.innerHTML = `<p class="verse-card__ref">${nl ? 'Hoofdstuk' : 'Chapter'} ${i + 1} · ${nl ? 'vers' : 'verse'} ${v.ref}</p>
        <p class="verse-card__sa" lang="sa">${v.sa.replace('\n', '<br>')}</p>
        <p class="verse-card__iast">${v.iast}</p>
        <p class="verse-card__tr">${P(v.tr)}</p>${v.note ? `<p class="verse-card__note">${P(v.note)}</p>` : ''}`;
      this.card.classList.remove('is-changing');
    }, silent ? 0 : 380);
    if (!silent) audio.bell(261.6 * Math.pow(2, (i % 7) / 12), 0.25);
  }

  update(f: Frame) {
    const dt = f.dt;
    if (!this.dragging) {
      this.angle += this.vel * dt;
      this.vel *= Math.exp(-dt * 0.9);
      if (!this.settled && Math.abs(this.vel) < 0.35) {
        // settle on the segment under the pointer (top)
        const seg = TAU / N;
        const idx = Math.round((-this.angle) / seg - 0.5);
        const target = -(idx + 0.5) * seg;
        this.angle += (target - this.angle) * Math.min(1, dt * 6);
        this.vel *= 0.8;
        if (Math.abs(target - this.angle) < 0.002) {
          this.settled = true;
          this.angle = target;
          const i = ((idx % N) + N) % N;
          if (i !== this.current) this.showVerse(i);
        }
      }
    }
    // ticks as segments pass the pointer
    const seg = TAU / N;
    const tickIdx = Math.floor(-this.angle / seg);
    if (tickIdx !== this.lastTick) { this.lastTick = tickIdx; if (!this.settled) audio.tick(0.04); }
    this.rotor.setAttribute('transform', `rotate(${(this.angle * 180) / Math.PI})`);
  }
}
