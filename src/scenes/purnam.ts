import * as THREE from 'three';
import { StageScene, FSQuad, fsMaterial, type Frame, type Stage } from '../core/stage';
import { damp, smoothstep } from '../core/util';

/* ─────────────────────────────────────────────────────────────
   Pūrṇam — an endless lattice of mirrored jewels, ray-marched
   with three bounces, so that every sphere holds every other.
   From "Tat tvam asi" on, the cursor becomes a jewel of light —
   and it appears, reflected, in all the others.
   Rendered at reduced resolution and upsampled.
   ───────────────────────────────────────────────────────────── */

const FRAG = /* glsl */ `
  uniform float uTime, uGlow, uYou, uWhite, uIntense;
  uniform vec2 uRes, uPointer;
  varying vec2 vUv;
  float h31(vec3 p) { p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
  vec3 path(float t) { return vec3(1.0 + 0.35 * sin(t * 0.31), 1.0 + 0.3 * cos(t * 0.23), t); }
  vec3 youPos;
  float map(vec3 p, out vec3 id, out float kind) {
    vec3 q = p + 1.0;
    id = floor(q / 2.0);
    q = mod(q, 2.0) - 1.0;
    float r = 0.6 + 0.05 * sin(dot(id, vec3(1.7, 2.3, 3.1)) + uTime * 0.5);
    float d = length(q) - r;
    kind = 0.0;
    float dy = length(p - youPos) - 0.14;
    if (uYou > 0.01 && dy < d) { d = dy; kind = 2.0; }
    return d;
  }
  vec3 env(vec3 rd, vec3 fwd) {
    float f = max(dot(rd, fwd), 0.0);
    vec3 c = mix(vec3(0.015, 0.01, 0.03), vec3(0.2, 0.09, 0.04), smoothstep(-0.2, 0.9, rd.y * 0.5 + 0.5));
    c += vec3(1.0, 0.75, 0.45) * pow(f, 24.0) * 1.4 + vec3(1.0, 0.55, 0.25) * pow(f, 4.0) * 0.18;
    return c;
  }
  void main() {
    vec2 uv = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
    float t = uTime * 0.35;
    vec3 ro = path(t);
    vec3 fwd = normalize(path(t + 0.6) - ro);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
    vec3 up = cross(fwd, right);
    vec3 rd = normalize(fwd * 1.5 + right * (uv.x + uPointer.x * 0.08) + up * (uv.y + uPointer.y * 0.06));
    youPos = ro + normalize(fwd * 1.5 + right * uPointer.x * 0.6 + up * (uPointer.y * 0.4 - 0.36)) * 2.1;

    vec3 col = vec3(0.0);
    vec3 thr = vec3(1.0);
    float firstT = 20.0;
    for (int b = 0; b < 3; b++) {
      if (b == 2) thr *= 0.6;
      float tt = 0.0;
      vec3 id; float kind = 0.0;
      bool hit = false;
      for (int i = 0; i < 72; i++) {
        vec3 p = ro + rd * tt;
        float d = map(p, id, kind);
        if (d < 0.002) { hit = true; break; }
        tt += d;
        if (tt > 20.0) break;
      }
      if (b == 0) firstT = tt;
      if (!hit) { col += thr * env(rd, fwd); break; }
      vec3 p = ro + rd * tt;
      vec3 n;
      if (kind > 1.5) {
        col += thr * vec3(1.0, 0.9, 0.7) * 2.2 * uYou;
        break;
      }
      vec3 q = mod(p + 1.0, 2.0) - 1.0;
      n = normalize(q);
      float hsh = h31(id);
      if (hsh > 0.975) { // a lamp among the jewels
        float fl = 0.8 + 0.2 * sin(uTime * 3.0 + hsh * 50.0);
        col += thr * vec3(1.0, 0.6, 0.25) * 1.6 * fl * uGlow;
        break;
      }
      vec3 tint = vec3(1.0, 0.78, 0.46);
      if (hsh < 0.08) tint = vec3(1.0, 0.35, 0.35);
      else if (hsh < 0.14) tint = vec3(0.45, 0.6, 1.0);
      else if (hsh < 0.18) tint = vec3(0.45, 1.0, 0.7);
      float fres = 0.35 + 0.65 * pow(1.0 - max(dot(n, -rd), 0.0), 4.0);
      vec3 L = normalize(fwd + vec3(0.0, 0.4, 0.0));
      col += thr * tint * 0.04 * max(dot(n, L), 0.0);
      thr *= tint * mix(0.45, 0.9, fres) * uIntense;
      ro = p + n * 0.01;
      rd = reflect(rd, n);
    }
    float fog = 1.0 - exp(-firstT * 0.2);
    col = mix(col, vec3(0.03, 0.015, 0.01), fog * 0.9);
    col *= 0.3 + 0.7 * smoothstep(0.05, 0.75, length(uv * vec2(0.8, 1.2)));
    col = mix(col, vec3(1.2, 1.05, 0.85), uWhite);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const COPY = /* glsl */ `uniform sampler2D tSrc; varying vec2 vUv; void main() { gl_FragColor = texture2D(tSrc, vUv); }`;

export class PurnamScene extends StageScene {
  readonly chapters = ['purnam'];
  bloom = 0.7;
  bloomThreshold = 0.8;
  private quad!: FSQuad;
  private copy!: FSQuad;
  private low!: THREE.WebGLRenderTarget;
  private scale = 0.5;
  private you = 0;
  private white = 0;
  private time = 0;

  async init(_stage: Stage) {
    this.low = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
    this.quad = new FSQuad(fsMaterial(FRAG, {
      uTime: { value: 0 }, uGlow: { value: 1 }, uYou: { value: 0 }, uWhite: { value: 0 }, uIntense: { value: 1 },
      uRes: { value: new THREE.Vector2(1, 1) }, uPointer: { value: new THREE.Vector2() },
    }));
    this.copy = new FSQuad(fsMaterial(COPY, { tSrc: { value: this.low.texture } }));
  }

  resize() {
    const { w, h } = this.stage.bufferSize;
    this.scale = w * h > 2.5e6 ? 0.5 : 0.66;
    this.low.setSize(Math.max(1, Math.floor(w * this.scale)), Math.max(1, Math.floor(h * this.scale)));
    (this.quad.material.uniforms.uRes.value as THREE.Vector2).set(w, h);
  }

  update(f: Frame) {
    const pos = f.chapters.stepPos('purnam');
    const u = this.quad.material.uniforms;
    this.time += f.dt * (1 - 0.6 * smoothstep(0.8, 1.4, pos) * (1 - smoothstep(1.8, 2.4, pos)));
    u.uTime.value = this.time;
    this.you = damp(this.you, smoothstep(1.6, 2.2, pos), 3, f.dt);
    this.white = damp(this.white, smoothstep(3.4, 4.2, pos) * 0.85, 2, f.dt);
    u.uYou.value = this.you;
    u.uWhite.value = this.white;
    u.uIntense.value = 0.95 + 0.05 * smoothstep(0.8, 1.2, pos);
    (u.uPointer.value as THREE.Vector2).copy(f.pointer);
  }

  render(r: THREE.WebGLRenderer) {
    const prev = r.getRenderTarget();
    this.quad.render(r, this.low);
    this.copy.render(r, prev);
  }
}
