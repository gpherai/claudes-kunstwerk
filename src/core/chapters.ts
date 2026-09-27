import { clamp, svgEl, toDeva } from './util';

/* ─────────────────────────────────────────────────────────────
   Chapters — reads scroll position, derives each chapter's
   progress (0..1 while its sticky stage is pinned) and viewport
   coverage (used for crossfading WebGL scenes), drives the
   stacked "steps" and the japa-mala progress ring.
   ───────────────────────────────────────────────────────────── */

export interface ChapterState {
  id: string;
  el: HTMLElement;
  top: number;
  height: number;
  progress: number;
  coverage: number;
  inView: boolean;
  isIn: boolean;
  steps: HTMLElement[];
  step: number;
  stepRange: [number, number];
  index: number;
}

type StepListener = (id: string, step: number, prev: number) => void;
type EnterListener = (id: string) => void;

const BEADS = 108;

export class Chapters {
  list: ChapterState[] = [];
  map = new Map<string, ChapterState>();
  scrollY = 0;
  vh = window.innerHeight;
  docHeight = 1;
  active: ChapterState | null = null;
  private stepListeners: StepListener[] = [];
  private enterListeners: EnterListener[] = [];
  private beads: SVGCircleElement[] = [];
  private malaLinks: HTMLAnchorElement[] = [];
  private malaCount: HTMLElement | null = null;
  private litBeads = -1;

  constructor() {
    document.querySelectorAll<HTMLElement>('[data-chapter]').forEach((el, index) => {
      const steps = Array.from(el.querySelectorAll<HTMLElement>('[data-step]'));
      const rangeAttr = el.querySelector<HTMLElement>('[data-steps]')?.dataset.stepsRange;
      const stepRange = (rangeAttr ? rangeAttr.split(' ').map(Number) : [0.1, 0.97]) as [number, number];
      const st: ChapterState = { id: el.dataset.chapter!, el, top: 0, height: 0, progress: 0, coverage: 0, inView: false, isIn: false, steps, step: -1, stepRange, index };
      this.list.push(st);
      this.map.set(st.id, st);
    });
    this.buildMala();
    this.measure();
  }

  onStep(fn: StepListener) { this.stepListeners.push(fn); }
  onEnter(fn: EnterListener) { this.enterListeners.push(fn); }

  measure() {
    this.vh = window.innerHeight;
    let y = 0;
    for (const c of this.list) {
      // offsetTop chain is stable (no transforms on sections)
      let top = 0;
      let n: HTMLElement | null = c.el;
      while (n) { top += n.offsetTop; n = n.offsetParent as HTMLElement | null; }
      c.top = top;
      c.height = c.el.offsetHeight;
      y = Math.max(y, top + c.height);
    }
    this.docHeight = Math.max(y, document.documentElement.scrollHeight);
  }

  get(id: string) { return this.map.get(id); }
  progress(id: string) { return this.map.get(id)?.progress ?? 0; }
  coverage(id: string) { return this.map.get(id)?.coverage ?? 0; }

  /** Progress across a chapter including the viewport height before and after it (-> smooth entry/exit parameters). */
  span(id: string) {
    const c = this.map.get(id);
    if (!c) return 0;
    return clamp((this.scrollY - c.top + this.vh) / (c.height + this.vh));
  }

  update(scrollY: number) {
    this.scrollY = scrollY;
    const vh = this.vh;
    let best: ChapterState | null = null;
    for (const c of this.list) {
      const denom = Math.max(1, c.height - vh);
      c.progress = clamp((scrollY - c.top) / denom);
      const overlap = Math.min(scrollY + vh, c.top + c.height) - Math.max(scrollY, c.top);
      c.coverage = clamp(overlap / vh);
      c.inView = c.coverage > 0;
      const isIn = c.isIn ? c.coverage > 0.2 : c.coverage > 0.45;
      if (isIn !== c.isIn) {
        c.isIn = isIn;
        c.el.classList.toggle('is-in', isIn);
        if (isIn) this.enterListeners.forEach((fn) => fn(c.id));
      }
      if (!best || c.coverage > best.coverage) best = c;
      if (c.steps.length && c.inView) this.updateSteps(c);
    }
    if (best !== this.active) {
      this.active = best;
      this.malaLinks.forEach((a, i) => a.classList.toggle('is-active', i === best!.index));
      if (this.malaCount && best) this.malaCount.textContent = toDeva(best.index + 1);
    }
    const g = clamp(scrollY / Math.max(1, this.docHeight - vh));
    const lit = Math.round(g * BEADS);
    if (lit !== this.litBeads) {
      this.litBeads = lit;
      this.beads.forEach((b, i) => b.classList.toggle('on', i < lit));
    }
  }

  private updateSteps(c: ChapterState) {
    const [a, b] = c.stepRange;
    const n = c.steps.length;
    const t = (c.progress - a) / (b - a);
    const idx = t < 0 ? -1 : Math.min(n - 1, Math.floor(t * n));
    if (idx !== c.step) {
      const prev = c.step;
      c.step = idx;
      c.el.classList.toggle('is-stepping', idx >= 0);
      c.steps.forEach((s, i) => {
        s.classList.toggle('is-active', i === idx);
        s.classList.toggle('is-past', i < idx);
      });
      this.stepListeners.forEach((fn) => fn(c.id, idx, prev));
    }
  }

  /** Local progress inside the current step (0..1). */
  stepProgress(id: string) {
    const c = this.map.get(id);
    if (!c || !c.steps.length) return 0;
    const [a, b] = c.stepRange;
    const t = ((c.progress - a) / (b - a)) * c.steps.length;
    return clamp(t - Math.floor(t));
  }

  /** Continuous step position: -1 before first, 0..n-1 fractional. */
  stepPos(id: string) {
    const c = this.map.get(id);
    if (!c || !c.steps.length) return 0;
    const [a, b] = c.stepRange;
    return ((c.progress - a) / (b - a)) * c.steps.length;
  }

  private buildMala() {
    const svg = document.querySelector<SVGSVGElement>('.mala__svg');
    const list = document.querySelector<HTMLOListElement>('.mala__list');
    this.malaCount = document.querySelector('.mala__count');
    if (!svg || !list) return;
    const cx = 60, cy = 60, R = 50;
    // tassel + guru bead at the top
    svgEl('path', { d: `M60 6 C 57 -2, 55 -8, 52 -14 M60 6 C 61 -2, 63 -8, 66 -14 M60 6 L 60 -15`, class: 'tassel' }, svg);
    const chapterStarts = this.list.map((c) => c.index / this.list.length);
    for (let i = 0; i < BEADS; i++) {
      const a = -Math.PI / 2 + ((i + 0.5) / BEADS) * Math.PI * 2 * 0.955 + Math.PI * 0.045;
      const isMark = chapterStarts.some((s) => Math.abs(s * BEADS - i) < 0.5);
      const b = svgEl('circle', { cx: cx + Math.cos(a) * R, cy: cy + Math.sin(a) * R, r: isMark ? 2.4 : 1.55, class: 'bead' + (isMark ? ' mark' : '') }, svg);
      this.beads.push(b);
    }
    svgEl('circle', { cx, cy: cy - R, r: 3.6, class: 'guru' }, svg);
    for (const c of this.list) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#${c.id}`;
      a.innerHTML = `<span>${toDeva(c.index + 1)}</span>${c.el.dataset.title ?? c.id}`;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('goto', { detail: c.top + (c.id === 'om' ? 0 : c.height * 0.02) }));
      });
      li.appendChild(a);
      list.appendChild(li);
      this.malaLinks.push(a);
    }
  }
}
