import type { Section } from '../core/section';
import type { Frame } from '../core/stage';
import { audio } from '../core/audio';
import { i18n } from '../core/i18n';
import { clamp, smoothstep, TAU } from '../core/util';
import { DEITIES, type Deity } from '../content/deities';

/* ─────────────────────────────────────────────────────────────
   Ekaṃ sat — twelve faces of the One, orbiting a single light.
   Every emblem is drawn in code: a lotus of the deity's number,
   a coloured field, and an attribute — trident, discus, vīṇā,
   peacock feather, bow, mace, vel — or a seed-syllable.
   ───────────────────────────────────────────────────────────── */

function icon(d: Deity) {
  const c = d.color;
  const S = `stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  const text = (t: string, size: number, dy = 0) => `<text x="0" y="${dy}" text-anchor="middle" dominant-baseline="central" font-family="Tiro Devanagari Sanskrit" font-size="${size}" fill="${c}">${t}</text>`;
  switch (d.icon) {
    case 'om': return text('ॐ', 36, 2);
    case 'shrim': return text('श्रीं', 24, 3);
    case 'dum': return `<path d="M0 17 L-17 -12 L17 -12 Z" ${S} stroke-width="1.2" opacity="0.6"/>` + text('दुं', 24, 0);
    case 'krim': return `<path d="M0 18 L-18 -10 L18 -10 Z M0 12 L-12 -6 L12 -6 Z" ${S} stroke-width="1" opacity="0.5"/>` + text('क्रीं', 22, -1);
    case 'trishula':
      return `<path d="M0 23 L0 -21 M-11 -18 C-12 -6 -6 -4 0 -4 C6 -4 12 -6 11 -18" ${S}/>` +
        `<path d="M0 -25 L-2.6 -19 L2.6 -19 Z M-11 -22 L-13.5 -16 L-8.5 -16.5 Z M11 -22 L13.5 -16 L8.5 -16.5 Z" fill="${c}"/>` +
        `<path d="M-5 5 L5 5 L-5 14 L5 14 Z" ${S} stroke-width="1.6"/><path d="M-5 9.5 C-9 12 -8 15 -6 16" ${S} stroke-width="1"/>`;
    case 'chakra': {
      let p = `<g class="spin"><circle r="13" ${S}/><circle r="4" ${S} stroke-width="1.8"/>`;
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; p += `<line x1="${Math.cos(a) * 4}" y1="${Math.sin(a) * 4}" x2="${Math.cos(a) * 13}" y2="${Math.sin(a) * 13}" ${S} stroke-width="1.2"/>`; }
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU, b = a + TAU / 32, e = a - TAU / 32;
        p += `<path d="M${Math.cos(e) * 13.5} ${Math.sin(e) * 13.5} Q${Math.cos(a) * 17} ${Math.sin(a) * 17} ${Math.cos(a + 0.18) * 20} ${Math.sin(a + 0.18) * 20} Q${Math.cos(b) * 16} ${Math.sin(b) * 16} ${Math.cos(b) * 13.5} ${Math.sin(b) * 13.5}" fill="${c}" opacity="0.85"/>`;
      }
      return p + '</g>';
    }
    case 'lotus': {
      let p = '';
      for (const [rot, sc] of [[-58, 0.7], [58, 0.7], [-30, 0.86], [30, 0.86], [0, 1]] as const)
        p += `<path transform="rotate(${rot} 0 12) scale(${sc})" d="M0 12 C-7 2 -7 -9 0 -18 C7 -9 7 2 0 12Z" fill="${c}" fill-opacity="0.18" ${S} stroke-width="1.5"/>`;
      return p + `<path d="M-15 14 Q0 20 15 14" ${S} stroke-width="1.6"/>`;
    }
    case 'veena':
      return `<g transform="rotate(-38)"><circle cx="0" cy="12" r="8" ${S}/><circle cx="0" cy="12" r="3" fill="${c}" opacity="0.6"/>` +
        `<rect x="-2" y="-18" width="4" height="26" rx="1.5" ${S} stroke-width="1.6"/><circle cx="0" cy="-19" r="4.5" ${S} stroke-width="1.8"/>` +
        [-12, -8, -4, 0].map((y) => `<line x1="-3.5" x2="3.5" y1="${y}" y2="${y}" ${S} stroke-width="0.9"/>`).join('') + '</g>';
    case 'feather': {
      let p = `<path d="M8 22 Q2 4 -5 -14" ${S} stroke-width="1.4" stroke="#d9b36a"/>`;
      for (let i = 0; i < 16; i++) {
        const t = i / 15, x = 8 - 13 * t, y = 22 - 36 * t + Math.sin(t * 3) * 1.5, w = 5 + 7 * Math.sin(t * Math.PI * 0.9);
        p += `<path d="M${x} ${y} q${-w} ${-2 - t * 2} ${-w * 1.2} ${-6}" stroke="#2fa37a" stroke-width="0.8" fill="none" opacity="0.8"/><path d="M${x} ${y} q${w} ${-2 - t * 2} ${w * 1.2} ${-6}" stroke="#2fa37a" stroke-width="0.8" fill="none" opacity="0.8"/>`;
      }
      return p + `<ellipse cx="-4" cy="-11" rx="8" ry="10" fill="#1d8f6a"/><ellipse cx="-4" cy="-10.5" rx="6" ry="7.6" fill="#d9a441"/><ellipse cx="-4" cy="-10" rx="4.6" ry="6" fill="#2f6fdc"/><ellipse cx="-4.2" cy="-9.4" rx="2.6" ry="3.6" fill="#0b1640"/>`;
    }
    case 'bow':
      return `<path d="M-7 -21 Q14 0 -7 21" ${S} stroke-width="2.6"/><path d="M-7 -21 L-7 21" ${S} stroke-width="0.9"/>` +
        `<path d="M-16 0 L19 0" ${S} stroke-width="1.6"/><path d="M19 0 L13 -3.5 L13 3.5 Z" fill="${c}"/><path d="M-16 0 L-20 -3.5 M-16 0 L-20 3.5 M-13 0 L-17 -3.5 M-13 0 L-17 3.5" ${S} stroke-width="1.1"/>`;
    case 'gada':
      return `<path d="M0 23 L0 1" ${S} stroke-width="3"/><circle cx="0" cy="-9" r="11" fill="${c}" fill-opacity="0.2" ${S}/>` +
        `<ellipse cx="0" cy="-9" rx="4.5" ry="11" ${S} stroke-width="1.1"/><ellipse cx="0" cy="-9" rx="8.5" ry="11" ${S} stroke-width="0.9"/><path d="M-11 -9 L11 -9" ${S} stroke-width="1"/>` +
        `<path d="M0 -20 L0 -25" ${S} stroke-width="2"/><circle cx="0" cy="-26" r="1.8" fill="${c}"/><path d="M-4 1 L4 1" ${S} stroke-width="2.2"/>`;
    case 'vel':
      return `<path d="M0 -24 C9 -13 8 -4 0 3 C-8 -4 -9 -13 0 -24Z" fill="${c}" fill-opacity="0.25" ${S}/><path d="M0 -18 L0 -2" ${S} stroke-width="1"/>` +
        `<path d="M0 3 L0 24" ${S} stroke-width="2.4"/><ellipse cx="0" cy="5.5" rx="4" ry="1.6" ${S} stroke-width="1.4"/>`;
  }
}

export function emblem(d: Deity, big = false) {
  const n = d.petals;
  let petals = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU - Math.PI / 2, da = Math.PI / n;
    const r0 = 33, r1 = 46, rm = 39.5;
    const p0 = [Math.cos(a - da) * r0, Math.sin(a - da) * r0], p1 = [Math.cos(a + da) * r0, Math.sin(a + da) * r0], t = [Math.cos(a) * r1, Math.sin(a) * r1];
    const c0 = [Math.cos(a - da * 1.2) * rm, Math.sin(a - da * 1.2) * rm], c1 = [Math.cos(a + da * 1.2) * rm, Math.sin(a + da * 1.2) * rm];
    petals += `<path d="M${p0}Q${c0} ${t}Q${c1} ${p1}" fill="${d.color}" fill-opacity="0.07" stroke="${d.color}" stroke-opacity="0.75" stroke-width="0.8"/>`;
  }
  const gid = `eg-${d.id}-${big ? 'b' : 's'}`;
  return `<svg viewBox="-50 -50 100 100" aria-hidden="true"><defs><radialGradient id="${gid}"><stop offset="0" stop-color="#0b0812"/><stop offset="0.7" stop-color="#0b0812"/><stop offset="1" stop-color="${d.color}" stop-opacity="0.35"/></radialGradient></defs>` +
    `<circle r="48" fill="none" stroke="${d.color}" stroke-opacity="0.35" stroke-width="0.6"/>${petals}` +
    `<circle r="32" fill="url(#${gid})" stroke="${d.color}" stroke-width="1"/><g>${icon(d)}</g></svg>`;
}

export class EkamSection implements Section {
  chapter = 'ekam';
  private orbit!: HTMLElement;
  private meds: HTMLButtonElement[] = [];
  private rays!: SVGSVGElement;
  private lines: SVGLineElement[] = [];
  private panel!: HTMLElement;
  private angle = 0;
  private speed = 0.05;
  private hover = -1;
  private open: Deity | null = null;

  init() {
    this.orbit = document.querySelector('[data-orbit]')!;
    this.panel = document.querySelector('[data-deity]')!;
    this.rays = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.rays.setAttribute('class', 'ekam__rays');
    this.orbit.appendChild(this.rays);
    DEITIES.forEach((d, i) => {
      const b = document.createElement('button');
      b.className = 'medallion';
      b.style.setProperty('--c', d.color);
      b.setAttribute('aria-label', d.name);
      b.innerHTML = emblem(d) + `<span class="medallion__name">${d.name}<small lang="sa">${d.deva}</small></span>`;
      b.addEventListener('pointerenter', () => { this.hover = i; audio.chime(523.25 * Math.pow(2, [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26][i] / 12), 0.035); });
      b.addEventListener('pointerleave', () => { if (this.hover === i) this.hover = -1; });
      b.addEventListener('focus', () => (this.hover = i));
      b.addEventListener('blur', () => { if (this.hover === i) this.hover = -1; });
      b.addEventListener('click', () => this.show(d));
      this.orbit.appendChild(b);
      this.meds.push(b);
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('stroke', d.color);
      this.rays.appendChild(l);
      this.lines.push(l);
    });
    this.panel.querySelector('[data-deity-close]')!.addEventListener('click', () => this.hide());
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.hide(); });
    i18n.onChange(() => { if (this.open) this.show(this.open, true); });
  }

  private show(d: Deity, silent = false) {
    this.open = d;
    const P = (x: { en: string; nl: string }) => i18n.pick(x);
    const nl = i18n.lang === 'nl';
    this.panel.style.setProperty('--c', d.color);
    this.panel.querySelector('[data-deity-emblem]')!.innerHTML = emblem(d, true);
    this.panel.querySelector('[data-deity-body]')!.innerHTML = `
      <h3>${d.name}</h3><p class="deva-name" lang="sa">${d.deva}</p><p class="epithet">${P(d.epithet)}</p>
      <p>${P(d.text)}</p>
      <dl><dt>${nl ? 'Attributen' : 'Attributes'}</dt><dd>${P(d.attrs)}</dd><dt>${nl ? 'Vāhana' : 'Vāhana'}</dt><dd>${P(d.vahana)}</dd><dt>${nl ? 'Gemalin' : 'Consort'}</dt><dd>${P(d.consort)}</dd></dl>
      <p class="mantra" lang="sa">${d.mantra}</p><p class="mantra-tr">${P(d.mantraTr)}</p>`;
    this.panel.hidden = false;
    if (!silent) audio.bell(392 * (0.75 + (DEITIES.indexOf(d) % 4) * 0.125), 0.2);
  }

  private hide() { this.panel.hidden = true; this.open = null; }

  update(f: Frame) {
    const W = this.orbit.clientWidth, H = this.orbit.clientHeight;
    const mobile = W < 900;
    const cx = mobile ? W * 0.5 : W * 0.64, cy = mobile ? H * 0.62 : H * 0.5;
    const Rx = mobile ? W * 0.4 : Math.min(W * 0.25, 500), Ry = mobile ? H * 0.2 : H * 0.36;
    const target = this.hover >= 0 || this.open ? 0 : 0.05;
    this.speed += (target - this.speed) * Math.min(1, f.dt * 3);
    this.angle += this.speed * f.dt;
    const enter = smoothstep(0.2, 0.8, f.chapters.coverage('ekam'));
    this.rays.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const n = this.meds.length;
    this.meds.forEach((m, i) => {
      const a = this.angle + (i / n) * TAU;
      const z = Math.sin(a);
      const stagger = clamp(enter * 1.6 - (i / n) * 0.6);
      const rr = 0.35 + 0.65 * stagger;
      const x = cx + Math.cos(a) * Rx * rr, y = cy + z * Ry * rr;
      const depth = (z + 1) / 2;
      const s = (0.7 + 0.3 * depth) * (this.hover === i ? 1.12 : 1);
      m.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`;
      m.style.opacity = String((0.45 + 0.55 * depth) * stagger);
      m.style.zIndex = String(Math.round(depth * 100));
      const l = this.lines[i];
      l.setAttribute('x1', String(cx)); l.setAttribute('y1', String(cy));
      l.setAttribute('x2', String(x)); l.setAttribute('y2', String(y));
      l.setAttribute('stroke-opacity', String((this.hover === i ? 0.7 : 0.14 + 0.12 * depth) * stagger));
      l.setAttribute('stroke-width', this.hover === i ? '1.4' : '0.7');
    });
  }
}
