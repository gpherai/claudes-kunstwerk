import * as THREE from 'three';
import { StageScene, FSQuad, fsMaterial, type Frame } from '../core/stage';
import { damp } from '../core/util';
import type { Chapters } from '../core/chapters';
import { meruAmount } from './meru';

/* Ambient deep-space backdrop shared by the quieter chapters.
   Each chapter tints it: indigo for time, midnight for the sky,
   kumkum-red for the yantra, a single white source for Ekaṃ Sat,
   dawn for the Gītā. */

const FRAG = /* glsl */ `
  uniform float uTime; uniform vec2 uRes;
  uniform vec3 uTint; uniform vec3 uGlowCol; uniform float uGlow; uniform float uRays; uniform float uNeb; uniform vec2 uCenter;
  uniform vec2 uPointer;
  varying vec2 vUv;
  float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * n2(p); p = p * 2.02 + 7.3; a *= 0.5; } return v; }
  float stars(vec2 uv, float scale, float thr) {
    vec2 sp = uv * scale; vec2 id = floor(sp); float r = h(id);
    if (r < thr) return 0.0;
    vec2 o = vec2(h(id + 1.3), h(id + 2.7)) - 0.5;
    vec2 f = fract(sp) - 0.5 - o * 0.6;
    float tw = 0.55 + 0.45 * sin(uTime * (0.4 + r * 3.0) + r * 91.0);
    return smoothstep(0.08, 0.0, length(f)) * tw * (r - thr) / (1.0 - thr);
  }
  void main() {
    float asp = uRes.x / uRes.y;
    vec2 p = (vUv - 0.5) * vec2(asp, 1.0);
    vec2 par = uPointer * 0.015;
    vec3 col = uTint * (0.35 + 0.65 * (1.0 - length(p) * 0.8));
    float n = fbm(p * 1.4 + par * 2.0 + vec2(uTime * 0.006, -uTime * 0.004));
    float n2v = fbm(p * 3.1 - n * 1.5 + uTime * 0.01);
    col += uTint * 2.2 * smoothstep(0.45, 1.0, n) * uNeb;
    col += uGlowCol * 0.25 * smoothstep(0.55, 1.0, n2v) * uNeb * smoothstep(0.4, 0.9, n);
    vec2 sUv = vUv * vec2(asp, 1.0) + par;
    float s = stars(sUv, 180.0, 0.985) * 1.2 + stars(sUv + 3.1, 90.0, 0.988) * 1.6 + stars(sUv + 7.7, 42.0, 0.992) * 2.4;
    col += vec3(0.9, 0.92, 1.0) * s * (1.0 - uGlow * 0.4);
    vec2 c = p - uCenter;
    float d = length(c);
    col += uGlowCol * uGlow * (0.55 * exp(-d * d * 18.0) + 0.18 * exp(-d * 3.0));
    if (uRays > 0.001) {
      float a = atan(c.y, c.x);
      float r = fbm(vec2(a * 3.0, uTime * 0.05)) * 0.6 + 0.4 * n2(vec2(a * 12.0, uTime * 0.2));
      col += uGlowCol * uRays * pow(r, 3.0) * exp(-d * 1.6) * 0.9;
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;

type Look = { tint: [number, number, number]; glow: [number, number, number]; g: number; rays: number; neb: number; cx: number; cy: number };
const LOOKS: Record<string, Look> = {
  kala: { tint: [0.012, 0.01, 0.035], glow: [1.0, 0.62, 0.25], g: 0.35, rays: 0, neb: 0.35, cx: 0, cy: 0 },
  nakshatra: { tint: [0.006, 0.012, 0.04], glow: [0.35, 0.5, 1.0], g: 0.25, rays: 0, neb: 0.4, cx: -0.35, cy: 0 },
  yantra: { tint: [0.04, 0.004, 0.008], glow: [1.0, 0.25, 0.1], g: 0.7, rays: 0.15, neb: 0.3, cx: 0, cy: 0 },
  avatara: { tint: [0.004, 0.018, 0.04], glow: [0.35, 0.65, 1.0], g: 0.22, rays: 0.08, neb: 0.45, cx: 0, cy: -0.1 },
  ekam: { tint: [0.012, 0.01, 0.02], glow: [1.0, 0.92, 0.8], g: 1.0, rays: 0.7, neb: 0.25, cx: 0.28, cy: 0 },
  gita: { tint: [0.03, 0.012, 0.01], glow: [1.0, 0.5, 0.18], g: 0.55, rays: 0.25, neb: 0.35, cx: -0.4, cy: 0 },
};

export class CosmosScene extends StageScene {
  readonly chapters = Object.keys(LOOKS);
  bloom = 0.9;
  bloomThreshold = 0.5;
  private quad!: FSQuad;
  private cur: Look = { ...LOOKS.kala, tint: [...LOOKS.kala.tint], glow: [...LOOKS.kala.glow] };
  glowBoost = 0;
  chapterWeight(id: string, cov: number, ch: Chapters) { return id === 'yantra' ? cov * (1 - meruAmount(ch)) : cov; }

  async init() {
    this.quad = new FSQuad(fsMaterial(FRAG, {
      uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) },
      uTint: { value: new THREE.Vector3() }, uGlowCol: { value: new THREE.Vector3() }, uGlow: { value: 0 }, uRays: { value: 0 }, uNeb: { value: 0 },
      uCenter: { value: new THREE.Vector2() }, uPointer: { value: new THREE.Vector2() },
    }));
  }

  resize(w: number, h: number) { (this.quad.material.uniforms.uRes.value as THREE.Vector2).set(w, h); }

  update(f: Frame) {
    let best = 'kala', bc = -1;
    for (const id of this.chapters) { const c = f.chapters.coverage(id); if (c > bc) { bc = c; best = id; } }
    const L = LOOKS[best];
    const k = 2.0, dt = f.dt;
    for (let i = 0; i < 3; i++) {
      this.cur.tint[i] = damp(this.cur.tint[i], L.tint[i], k, dt);
      this.cur.glow[i] = damp(this.cur.glow[i], L.glow[i], k, dt);
    }
    this.cur.g = damp(this.cur.g, L.g + this.glowBoost, k, dt);
    this.cur.rays = damp(this.cur.rays, L.rays, k, dt);
    this.cur.neb = damp(this.cur.neb, L.neb, k, dt);
    const mobile = f.chapters.vh > window.innerWidth;
    this.cur.cx = damp(this.cur.cx, mobile ? 0 : L.cx, k, dt);
    this.cur.cy = damp(this.cur.cy, mobile && best === 'ekam' ? -0.12 : L.cy, k, dt);
    const u = this.quad.material.uniforms;
    u.uTime.value = f.t;
    (u.uTint.value as THREE.Vector3).fromArray(this.cur.tint);
    (u.uGlowCol.value as THREE.Vector3).fromArray(this.cur.glow);
    u.uGlow.value = this.cur.g;
    u.uRays.value = this.cur.rays;
    u.uNeb.value = this.cur.neb;
    (u.uCenter.value as THREE.Vector2).set(this.cur.cx * (window.innerWidth / window.innerHeight) * 0.5, this.cur.cy);
    (u.uPointer.value as THREE.Vector2).copy(f.pointer);
  }

  render(r: THREE.WebGLRenderer) {
    this.quad.render(r, r.getRenderTarget());
  }
}
