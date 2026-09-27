import './styles/main.css';
import Lenis from 'lenis';
import gsap from 'gsap';
import { Stage, type Frame } from './core/stage';
import { Chapters } from './core/chapters';
import { audio } from './core/audio';
import { i18n } from './core/i18n';
import { clamp, smoothstep, prefersReducedMotion } from './core/util';
import { ParticleScene } from './scenes/particles';
import { CosmosScene } from './scenes/cosmos';
import { NatarajaScene } from './scenes/nataraja';
import { KalaSection } from './sections/kala';
import { NakshatraSection } from './sections/nakshatra';
import { YantraSection } from './sections/yantra';
import { KolamSection } from './sections/kolam';
import { FloorScene } from './scenes/floor';
import { MandiraScene } from './scenes/mandira';
import { PurnamScene } from './scenes/purnam';
import { MeruScene } from './scenes/meru';
import { EkamSection } from './sections/ekam';
import { GitaSection } from './sections/gita';
import { AvataraSection } from './sections/avatara';

import type { Section } from './core/section';

async function boot() {
  i18n.init();
  const canvas = document.getElementById('stage') as HTMLCanvasElement;
  const chapters = new Chapters();
  const stage = new Stage(canvas, chapters);
  const particles = new ParticleScene();
  const cosmos = new CosmosScene();
  stage.add(particles, cosmos, new NatarajaScene(), new FloorScene(), new MandiraScene(), new PurnamScene(), new MeruScene());
  const sections: Section[] = [new KalaSection(), new NakshatraSection(), new YantraSection(), new KolamSection(), new EkamSection(), new GitaSection(), new AvataraSection()];

  (window as unknown as Record<string, unknown>).__sanatana = { lenis: null, chapters, stage, particles };
  (window as unknown as Record<string, unknown>).__audio = audio;
  const ring = document.querySelector<SVGCircleElement>('.gate__ring-fill')!;
  const status = document.getElementById('gate-status')!;
  const setP = (p: number) => ring.style.setProperty('--p', String(clamp(p)));
  let pStage = 0, pAudio = 0;
  const upd = () => setP(pStage * 0.65 + pAudio * 0.35);

  const reduced = prefersReducedMotion();
  const lenis = new Lenis({ autoRaf: false, lerp: reduced ? 1 : 0.085, wheelMultiplier: 0.85, touchMultiplier: 1.4 });
  lenis.stop();
  (window as unknown as { __sanatana: Record<string, unknown> }).__sanatana.lenis = lenis;
  window.scrollTo(0, 0);

  const audioReady = audio.prepare((p) => { pAudio = p; upd(); });
  await stage.init((p) => { pStage = p; upd(); });
  for (const s of sections) await s.init();
  stage.warmup();
  await audioReady;
  setP(1);
  status.textContent = '';
  status.style.opacity = '0';

  const btnSound = document.getElementById('enter-sound') as HTMLButtonElement;
  const btnSilent = document.getElementById('enter-silent') as HTMLButtonElement;
  const soundToggle = document.getElementById('sound-toggle') as HTMLButtonElement;
  btnSound.disabled = btnSilent.disabled = false;
  btnSound.focus({ preventScroll: true });

  audio.onChange((on) => soundToggle.setAttribute('aria-pressed', String(on)));
  soundToggle.addEventListener('click', () => {
    audio.toggle();
    if (audio.enabled && chapters.active) audio.setMood(chapters.active.id);
  });

  const enter = async (withSound: boolean) => {
    btnSound.disabled = btnSilent.disabled = true;
    if (withSound) {
      await audio.enable();
      audio.setMood('om');
      audio.bell(392, 0.4);
      audio.bell(196, 0.25, 0.02);
    }
    document.getElementById('gate')!.classList.add('is-gone');
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-entered');
    particles.enter();
    stage.flash = 0.35;
    lenis.start();
    chapters.measure();
  };
  btnSound.addEventListener('click', () => enter(true));
  btnSilent.addEventListener('click', () => enter(false));

  // chapter changes → audio mood + a soft chime on steps
  let mood = '';
  chapters.onStep((id, step, prev) => {
    if (step > prev && step >= 0 && id !== 'nada') audio.chime(id === 'nataraja' ? 1245 : 1568, 0.045);
  });

  window.addEventListener('goto', (e) => lenis.scrollTo((e as CustomEvent<number>).detail, { duration: 2.2 }));
  document.querySelector('.chrome__logo')?.addEventListener('click', (e) => { e.preventDefault(); lenis.scrollTo(0, { duration: 3 }); });

  // endless: scrolling past the end returns to the bindu at the beginning
  let pushAtEnd = 0;
  const atEnd = () => lenis.scroll >= lenis.limit - 2;
  const wrap = () => {
    pushAtEnd = 0;
    stage.flash = 0.6;
    audio.bell(294, 0.35);
    lenis.scrollTo(0, { immediate: true, force: true });
    chapters.update(0);
  };
  window.addEventListener('wheel', (e) => {
    if (atEnd() && e.deltaY > 0) { pushAtEnd += e.deltaY; if (pushAtEnd > 500) wrap(); } else pushAtEnd = 0;
  }, { passive: true });
  let touchY = 0;
  window.addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    const dy = touchY - e.touches[0].clientY;
    touchY = e.touches[0].clientY;
    if (atEnd() && dy > 0) { pushAtEnd += dy * 2; if (pushAtEnd > 600) wrap(); }
  }, { passive: true });
  window.addEventListener('keydown', (e) => {
    if (atEnd() && (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ')) { pushAtEnd += 200; if (pushAtEnd > 500) wrap(); }
  });

  let lastW = window.innerWidth, lastH = window.innerHeight;
  const onResize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    // ignore mobile URL-bar jitter
    if (w === lastW && Math.abs(h - lastH) < 120) return;
    lastW = w; lastH = h;
    stage.resize();
    chapters.measure();
  };
  window.addEventListener('resize', onResize);
  new ResizeObserver(() => chapters.measure()).observe(document.getElementById('journey')!);

  const ret = document.querySelector<HTMLElement>('#pralaya .sticky')!;
  let last = performance.now() / 1000;
  gsap.ticker.lagSmoothing(0);
  gsap.ticker.add(() => {
    const now = performance.now() / 1000;
    const dt = Math.min(0.1, now - last);
    last = now;
    lenis.raf(now * 1000);
    chapters.update(lenis.scroll);
    const act = chapters.active?.id ?? 'om';
    if (act !== mood && audio.enabled) { mood = act; audio.setMood(act); }

    // Om chant driven by the AUM steps
    const s = particles.nadaPos;
    if (audio.enabled) {
      const inNada = chapters.coverage('nada') > 0.5;
      audio.setVoice(inNada ? smoothstep(-0.35, 0.05, s) * (1 - smoothstep(2.7, 3.0, s)) : 0);
      audio.setVowel(clamp(s, 0, 2.2));
    }

    const pr = chapters.progress('pralaya');
    ret.style.setProperty('--o1', String(smoothstep(0.05, 0.3, pr)));
    ret.style.setProperty('--o2', String(smoothstep(0.25, 0.5, pr)));
    ret.style.setProperty('--o3', String(smoothstep(0.5, 0.75, pr)));
    ret.style.setProperty('--o4', String(smoothstep(0.6, 0.95, pr)));

    const f: Frame = { t: now, dt, chapters, pointer: stage.pointer };
    for (const sec of sections) if (chapters.get(sec.chapter)?.inView) sec.update(f);
    stage.frame(now, dt);
  });
}

boot().catch((err) => {
  console.error(err);
  const st = document.getElementById('gate-status');
  if (st) st.textContent = /webgl|context/i.test(String(err)) ? 'This journey needs WebGL2.' : 'Something went wrong — please reload.';
});
