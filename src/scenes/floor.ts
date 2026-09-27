import * as THREE from 'three';
import { StageScene, FSQuad, fsMaterial, type Frame } from '../core/stage';

/* The threshold at dawn: a swept floor of red earth, washed smooth,
   lit low and warm from the doorway. Backdrop for the kolam. */
const FRAG = /* glsl */ `
  uniform float uTime; uniform vec2 uRes; uniform vec2 uPointer;
  varying vec2 vUv;
  float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { v += a * n2(p); p = p * 2.07 + 5.1; a *= 0.5; } return v; }
  void main() {
    float asp = uRes.x / uRes.y;
    vec2 p = (vUv - 0.5) * vec2(asp, 1.0);
    float n = fbm(p * 3.0);
    float sweep = fbm(vec2(p.x * 1.2 + p.y * 0.4, p.y * 9.0 + n)) ;
    vec3 earth = mix(vec3(0.085, 0.03, 0.018), vec3(0.16, 0.06, 0.03), n);
    earth = mix(earth, earth * 1.35, smoothstep(0.45, 0.75, sweep) * 0.5);
    earth *= 0.85 + 0.3 * fbm(p * 40.0);
    // low dawn light from the upper left doorway
    vec2 L = p - vec2(-0.9 * asp * 0.5 - 0.2 + uPointer.x * 0.03, 0.75 + uPointer.y * 0.03);
    float light = exp(-dot(L, L) * 0.9);
    vec3 col = earth * (0.35 + 1.4 * light) + vec3(1.0, 0.55, 0.25) * 0.05 * light;
    col *= 1.0 - 0.35 * smoothstep(0.4, 1.1, length(p));
    gl_FragColor = vec4(col, 1.0);
  }
`;

export class FloorScene extends StageScene {
  readonly chapters = ['kolam'];
  bloom = 0.35;
  bloomThreshold = 0.9;
  private quad!: FSQuad;
  async init() {
    this.quad = new FSQuad(fsMaterial(FRAG, { uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uPointer: { value: new THREE.Vector2() } }));
  }
  resize(w: number, h: number) { (this.quad.material.uniforms.uRes.value as THREE.Vector2).set(w, h); }
  update(f: Frame) {
    this.quad.material.uniforms.uTime.value = f.t;
    (this.quad.material.uniforms.uPointer.value as THREE.Vector2).copy(f.pointer);
  }
  render(r: THREE.WebGLRenderer) { this.quad.render(r, r.getRenderTarget()); }
}
