import * as THREE from 'three';
import type { Chapters } from './chapters';

/* ─────────────────────────────────────────────────────────────
   Stage — one WebGL2 context for the whole journey.
   Up to two scenes render into HDR targets and are crossfaded by
   how much of the viewport their chapters cover. A hand-rolled
   mip-chain bloom, ACES tone mapping, subtle chromatic aberration,
   vignette and film grain finish every frame.
   ───────────────────────────────────────────────────────────── */

export interface Frame {
  t: number;
  dt: number;
  chapters: Chapters;
  pointer: THREE.Vector2; // -1..1
}

export abstract class StageScene {
  abstract readonly chapters: string[];
  bloom = 0.8;
  bloomThreshold = 0.6;
  exposure = 1;
  weight = 0;
  stage!: Stage;
  async init(_stage: Stage): Promise<void> {}
  resize(_w: number, _h: number): void {}
  /** Weight contributed by one of this scene's chapters (default: its viewport coverage). */
  chapterWeight(_id: string, coverage: number, _ch: Chapters): number { return coverage; }
  abstract update(frame: Frame): void;
  abstract render(renderer: THREE.WebGLRenderer): void;
}

const FS_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export function fullscreenGeometry() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  return g;
}

export class FSQuad {
  mesh: THREE.Mesh;
  static camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  static geo = fullscreenGeometry();
  constructor(public material: THREE.ShaderMaterial) {
    this.mesh = new THREE.Mesh(FSQuad.geo, material);
    this.mesh.frustumCulled = false;
  }
  render(r: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget | null) {
    r.setRenderTarget(target);
    r.render(this.mesh, FSQuad.camera);
  }
}

export const fsMaterial = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>, extra: Partial<THREE.ShaderMaterialParameters> = {}) =>
  new THREE.ShaderMaterial({ vertexShader: FS_VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false, ...extra });

const DOWN_FRAG = /* glsl */ `
  uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
  void main() {
    vec2 t = uTexel;
    vec3 a = texture2D(tSrc, vUv + t * vec2(-2.0, 2.0)).rgb;
    vec3 b = texture2D(tSrc, vUv + t * vec2( 0.0, 2.0)).rgb;
    vec3 c = texture2D(tSrc, vUv + t * vec2( 2.0, 2.0)).rgb;
    vec3 d = texture2D(tSrc, vUv + t * vec2(-2.0, 0.0)).rgb;
    vec3 e = texture2D(tSrc, vUv).rgb;
    vec3 f = texture2D(tSrc, vUv + t * vec2( 2.0, 0.0)).rgb;
    vec3 g = texture2D(tSrc, vUv + t * vec2(-2.0,-2.0)).rgb;
    vec3 h = texture2D(tSrc, vUv + t * vec2( 0.0,-2.0)).rgb;
    vec3 i = texture2D(tSrc, vUv + t * vec2( 2.0,-2.0)).rgb;
    vec3 j = texture2D(tSrc, vUv + t * vec2(-1.0, 1.0)).rgb;
    vec3 k = texture2D(tSrc, vUv + t * vec2( 1.0, 1.0)).rgb;
    vec3 l = texture2D(tSrc, vUv + t * vec2(-1.0,-1.0)).rgb;
    vec3 m = texture2D(tSrc, vUv + t * vec2( 1.0,-1.0)).rgb;
    vec3 o = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
    gl_FragColor = vec4(max(o, 0.0), 1.0);
  }
`;

const PREFILTER_FRAG = /* glsl */ `
  uniform sampler2D tA; uniform sampler2D tB; uniform float wA; uniform float wB;
  uniform vec2 uTexel; uniform float uThreshold; varying vec2 vUv;
  vec3 s(vec2 uv) { return texture2D(tA, uv).rgb * wA + texture2D(tB, uv).rgb * wB; }
  void main() {
    vec2 t = uTexel;
    vec3 c = (s(vUv + t * vec2(-1., -1.)) + s(vUv + t * vec2(1., -1.)) + s(vUv + t * vec2(-1., 1.)) + s(vUv + t * vec2(1., 1.))) * 0.25;
    float br = max(c.r, max(c.g, c.b));
    float knee = uThreshold * 0.6;
    float soft = clamp(br - uThreshold + knee, 0.0, 2.0 * knee);
    soft = soft * soft / (4.0 * knee + 1e-4);
    float contrib = max(soft, br - uThreshold) / max(br, 1e-4);
    c *= contrib;
    c /= 1.0 + max(c.r, max(c.g, c.b)) * 0.15; // tame fireflies
    gl_FragColor = vec4(c, 1.0);
  }
`;

const UP_FRAG = /* glsl */ `
  uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uRadius; varying vec2 vUv;
  void main() {
    vec2 t = uTexel * uRadius;
    vec3 c = texture2D(tSrc, vUv).rgb * 4.0;
    c += (texture2D(tSrc, vUv + vec2(-t.x, 0.)).rgb + texture2D(tSrc, vUv + vec2(t.x, 0.)).rgb + texture2D(tSrc, vUv + vec2(0., -t.y)).rgb + texture2D(tSrc, vUv + vec2(0., t.y)).rgb) * 2.0;
    c += texture2D(tSrc, vUv - t).rgb + texture2D(tSrc, vUv + t).rgb + texture2D(tSrc, vUv + vec2(-t.x, t.y)).rgb + texture2D(tSrc, vUv + vec2(t.x, -t.y)).rgb;
    gl_FragColor = vec4(c / 16.0, 1.0);
  }
`;

const FINAL_FRAG = /* glsl */ `
  uniform sampler2D tA; uniform sampler2D tB; uniform sampler2D tBloom;
  uniform float wA; uniform float wB; uniform float uBloom; uniform float uExposure;
  uniform float uTime; uniform vec2 uRes; uniform float uFlash;
  varying vec2 vUv;
  vec3 aces(vec3 x) {
    const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
  }
  float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
  void main() {
    vec2 uv = vUv;
    vec2 d = uv - 0.5;
    float r2 = dot(d, d);
    vec2 off = d * r2 * 0.012;
    vec3 col;
    col.r = texture2D(tA, uv + off).r * wA + texture2D(tB, uv + off).r * wB;
    col.g = texture2D(tA, uv).g * wA + texture2D(tB, uv).g * wB;
    col.b = texture2D(tA, uv - off).b * wA + texture2D(tB, uv - off).b * wB;
    col += texture2D(tBloom, uv).rgb * uBloom;
    col *= uExposure;
    col += uFlash * vec3(1.0, 0.85, 0.6);
    col = aces(col);
    col *= 1.0 - smoothstep(0.18, 0.95, r2 * 1.6) * 0.55;
    col = toSRGB(col);
    float g = hash(gl_FragCoord.xy + fract(uTime * 7.31) * 811.0) - 0.5;
    col += g * 0.028;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export class Stage {
  renderer: THREE.WebGLRenderer;
  scenes: StageScene[] = [];
  width = 1;
  height = 1;
  dpr = 1;
  maxDpr: number;
  private rtA: THREE.WebGLRenderTarget;
  private rtB: THREE.WebGLRenderTarget;
  private black: THREE.DataTexture;
  private mips: THREE.WebGLRenderTarget[] = [];
  private prefilter: FSQuad;
  private down: FSQuad;
  private up: FSQuad;
  private final: FSQuad;
  flash = 0;
  exposure = 1;
  private frameTimes: number[] = [];
  private lastQualityCheck = 0;
  pointer = new THREE.Vector2();
  pointerTarget = new THREE.Vector2();

  constructor(public canvas: HTMLCanvasElement, public chapters: Chapters) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.maxDpr = Math.min(window.devicePixelRatio || 1, matchMedia('(pointer: coarse)').matches ? 1.5 : 1.75);
    this.dpr = this.maxDpr;
    const rtOpts: THREE.RenderTargetOptions = { type: THREE.HalfFloatType, samples: 4, depthBuffer: true };
    this.rtA = new THREE.WebGLRenderTarget(1, 1, rtOpts);
    this.rtB = new THREE.WebGLRenderTarget(1, 1, rtOpts);
    this.black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    this.black.needsUpdate = true;
    for (let i = 0; i < 6; i++) this.mips.push(new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false }));

    this.prefilter = new FSQuad(fsMaterial(PREFILTER_FRAG, { tA: { value: null }, tB: { value: null }, wA: { value: 1 }, wB: { value: 0 }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 0.6 } }));
    this.down = new FSQuad(fsMaterial(DOWN_FRAG, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } }));
    this.up = new FSQuad(fsMaterial(UP_FRAG, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uRadius: { value: 1 } }, { blending: THREE.AdditiveBlending, transparent: true }));
    this.final = new FSQuad(
      fsMaterial(FINAL_FRAG, {
        tA: { value: null }, tB: { value: null }, tBloom: { value: null },
        wA: { value: 1 }, wB: { value: 0 }, uBloom: { value: 0.8 }, uExposure: { value: 1 },
        uTime: { value: 0 }, uRes: { value: new THREE.Vector2() }, uFlash: { value: 0 },
      }),
    );

    window.addEventListener('pointermove', (e) => {
      this.pointerTarget.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    }, { passive: true });
    this.resize();
  }

  add(...s: StageScene[]) {
    for (const sc of s) { sc.stage = this; this.scenes.push(sc); }
  }

  async init(onProgress?: (p: number) => void) {
    let done = 0;
    for (const s of this.scenes) {
      await s.init(this);
      s.resize(this.width, this.height);
      onProgress?.(++done / this.scenes.length);
    }
  }

  /** Compile every scene's programs up front so the first scroll never stutters. */
  warmup() {
    for (const s of this.scenes) {
      try {
        this.renderer.setRenderTarget(this.rtA);
        s.update({ t: 0, dt: 0.016, chapters: this.chapters, pointer: this.pointer });
        s.render(this.renderer);
      } catch (e) { console.warn('warmup', e); }
    }
    this.renderer.setRenderTarget(null);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.width = w;
    this.height = h;
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(w, h, false);
    const bw = Math.floor(w * this.dpr), bh = Math.floor(h * this.dpr);
    this.rtA.setSize(bw, bh);
    this.rtB.setSize(bw, bh);
    let mw = bw >> 1, mh = bh >> 1;
    for (const m of this.mips) { m.setSize(Math.max(1, mw), Math.max(1, mh)); mw >>= 1; mh >>= 1; }
    (this.final.material.uniforms.uRes.value as THREE.Vector2).set(bw, bh);
    for (const s of this.scenes) s.resize(w, h);
  }

  get bufferSize() { return { w: Math.floor(this.width * this.dpr), h: Math.floor(this.height * this.dpr) }; }

  private adaptQuality(dt: number, t: number) {
    this.frameTimes.push(dt);
    if (this.frameTimes.length > 90) this.frameTimes.shift();
    if (t - this.lastQualityCheck < 2.5 || this.frameTimes.length < 90) return;
    this.lastQualityCheck = t;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    if (avg > 1 / 42 && this.dpr > 0.75) {
      this.dpr = Math.max(0.75, this.dpr - 0.25);
      this.resize();
      this.frameTimes.length = 0;
    } else if (avg < 1 / 58 && this.dpr < this.maxDpr) {
      this.dpr = Math.min(this.maxDpr, this.dpr + 0.25);
      this.resize();
      this.frameTimes.length = 0;
    }
  }

  frame(t: number, dt: number) {
    this.pointer.lerp(this.pointerTarget, 1 - Math.exp(-4 * dt));
    this.adaptQuality(dt, t);
    const r = this.renderer;
    const f: Frame = { t, dt, chapters: this.chapters, pointer: this.pointer };

    for (const s of this.scenes) {
      let w = 0;
      for (const id of s.chapters) w += s.chapterWeight(id, this.chapters.coverage(id), this.chapters);
      s.weight = Math.min(1, w);
    }
    const vis = this.scenes.filter((s) => s.weight > 0.003).sort((a, b) => b.weight - a.weight).slice(0, 2);

    const targets = [this.rtA, this.rtB];
    const weights = [0, 0];
    let bloom = 0, thr = 0, exp = 0, wsum = 0;
    vis.forEach((s, i) => {
      s.update(f);
      r.setRenderTarget(targets[i]);
      r.setClearColor(0x000000, 1);
      r.clear();
      s.render(r);
      const w = s.weight * s.weight * (3 - 2 * s.weight);
      weights[i] = w;
      bloom += s.bloom * w; thr += s.bloomThreshold * w; exp += s.exposure * w; wsum += w;
    });
    if (wsum > 0) { bloom /= wsum; thr /= wsum; exp /= wsum; } else { thr = 1; exp = 1; }

    const texA = vis[0] ? this.rtA.texture : this.black;
    const texB = vis[1] ? this.rtB.texture : this.black;
    const { w: bw, h: bh } = this.bufferSize;

    // bloom
    const pu = this.prefilter.material.uniforms;
    pu.tA.value = texA; pu.tB.value = texB; pu.wA.value = weights[0]; pu.wB.value = weights[1];
    (pu.uTexel.value as THREE.Vector2).set(1 / bw, 1 / bh);
    pu.uThreshold.value = thr;
    this.prefilter.render(r, this.mips[0]);
    const du = this.down.material.uniforms;
    for (let i = 1; i < this.mips.length; i++) {
      du.tSrc.value = this.mips[i - 1].texture;
      (du.uTexel.value as THREE.Vector2).set(1 / this.mips[i - 1].width, 1 / this.mips[i - 1].height);
      this.down.render(r, this.mips[i]);
    }
    const uu = this.up.material.uniforms;
    r.autoClear = false;
    for (let i = this.mips.length - 1; i > 0; i--) {
      uu.tSrc.value = this.mips[i].texture;
      (uu.uTexel.value as THREE.Vector2).set(1 / this.mips[i].width, 1 / this.mips[i].height);
      uu.uRadius.value = 1.0;
      this.up.render(r, this.mips[i - 1]);
    }
    r.autoClear = true;

    const fu = this.final.material.uniforms;
    fu.tA.value = texA; fu.tB.value = texB; fu.tBloom.value = this.mips[0].texture;
    fu.wA.value = weights[0]; fu.wB.value = weights[1];
    fu.uBloom.value = bloom; fu.uExposure.value = exp * this.exposure;
    fu.uTime.value = t; fu.uFlash.value = this.flash;
    this.final.render(r, null);
    this.flash *= Math.exp(-dt * 2.5);
  }
}
