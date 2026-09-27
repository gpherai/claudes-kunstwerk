import * as THREE from 'three';
import { GPUComputationRenderer, type Variable } from 'three/addons/misc/GPUComputationRenderer.js';
import { StageScene, type Frame, type Stage } from '../core/stage';
import { clamp, damp, isMobile, smoothstep } from '../core/util';

/* ─────────────────────────────────────────────────────────────
   One continuous universe of sand, from Om to galaxy.
   Positions & velocities live in float textures (GPGPU). Every
   grain feels a blend of forces:
     · Om      — spring to a point sampled inside the ॐ glyph
     · plate   — Chladni physics: descend the gradient of f², get
                 kicked where |f| is large → gather on nodal lines
     · bindu   — collapse to a point (with a faint halo)
     · egg     — Hiraṇyagarbha, the golden womb
     · galaxy  — a two-armed spiral with differential rotation
     · scatter — the dark, formless waters
   plus a divergence-free flow field and the visitor's cursor.
   ───────────────────────────────────────────────────────────── */

const COMMON = /* glsl */ `
  #define PI 3.14159265359
  vec4 hash42(vec2 p) {
    vec4 p4 = fract(vec4(p.xyxy) * vec4(.1031, .1030, .0973, .1099));
    p4 += dot(p4, p4.wzxy + 33.33);
    return fract((p4.xxyz + p4.yzzw) * p4.zywx);
  }
`;

const VELOCITY = /* glsl */ `
  ${COMMON}
  uniform float uTime, uDt;
  uniform float uOm, uPlate, uBindu, uEgg, uGalaxy, uScatter, uCurl, uJitter, uDamp, uBreath, uBurst;
  uniform vec4 uChA, uChB; uniform float uChMix, uPlateR;
  uniform vec3 uPointer; uniform float uPointerK;
  uniform sampler2D tOm;

  float chladni(vec2 p, vec4 c) {
    float r = length(p);
    float a = atan(p.y, p.x) + c.w;
    float seg = 2.0 * PI / c.z;
    a = mod(a, seg);
    a = abs(a - seg * 0.5);
    vec2 q = vec2(cos(a), sin(a)) * r;
    return cos(c.x * PI * q.x) * cos(c.y * PI * q.y) - cos(c.y * PI * q.x) * cos(c.x * PI * q.y);
  }
  float field(vec2 p) { return mix(chladni(p, uChA), chladni(p, uChB), uChMix); }

  vec3 flow(vec3 p, float t) {
    vec3 a = vec3(sin(p.y * 1.3 + t * 0.31) + sin(p.z * 2.1 - t * 0.23),
                  sin(p.z * 1.7 + t * 0.27) + sin(p.x * 1.9 + t * 0.19),
                  sin(p.x * 1.5 - t * 0.21) + sin(p.y * 2.3 + t * 0.29));
    vec3 q = p * 2.7 + 11.0;
    vec3 b = vec3(sin(q.y + t * 0.5) + sin(q.z * 1.3), sin(q.z + t * 0.43) + sin(q.x * 1.2), sin(q.x - t * 0.37) + sin(q.y * 1.1));
    return a + 0.5 * b;
  }

  vec3 galaxyTarget(vec4 s, float t) {
    float r = 0.05 + 1.45 * pow(s.x, 1.7);
    float arm = floor(s.y * 2.0);
    float sc = (s.z - 0.5) * (0.35 + 0.9 * exp(-r * 1.3));
    float th = arm * PI + log(r / 0.05) * 1.25 + sc - t * 0.22 / (0.25 + r);
    vec3 g = vec3(cos(th) * r, (s.w - 0.5) * 0.08 * exp(-r * 0.8), sin(th) * r);
    if (s.x < 0.13) {
      vec3 d = normalize(s.yzw - 0.5 + 1e-4);
      g = d * 0.26 * pow(s.x / 0.13, 0.6) * vec3(1.0, 0.55, 1.0);
    }
    float tl = -1.08;
    return vec3(g.x, g.y * cos(tl) - g.z * sin(tl), g.y * sin(tl) + g.z * cos(tl));
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 P = texture2D(texturePosition, uv);
    vec3 pos = P.xyz;
    vec3 vel = texture2D(textureVelocity, uv).xyz;
    vec4 s = hash42(uv * 1731.7 + 3.1);
    vec3 acc = vec3(0.0);
    float settle = 0.0;

    if (uOm > 0.001) {
      vec3 tgt = texture2D(tOm, uv).xyz;
      acc += (tgt - pos) * 10.0 * uOm;
    }

    if (uPlate > 0.001) {
      vec2 p = pos.xy / uPlateR;
      float e = 0.0025;
      float f = field(p);
      vec2 gr = vec2(field(p + vec2(e, 0.0)) - field(p - vec2(e, 0.0)), field(p + vec2(0.0, e)) - field(p - vec2(0.0, e))) / (2.0 * e);
      float gl = length(gr) + 1e-3;
      float d = f / gl;                         // signed distance to the nodal line (plate units)
      vec2 toLine = -d * gr / gl;
      vec2 fl = toLine * 34.0;
      float fm = length(fl);
      if (fm > 4.0) fl *= 4.0 / fm;
      acc.xy += fl * uPlateR * uPlate;
      vec4 rn = hash42(uv * 917.3 + fract(uTime * 13.17) * 97.0);
      acc.xy += (rn.xy - 0.5) * min(abs(d) * 22.0, 1.0) * uJitter * uPlate;
      settle = uPlate * 16.0 * exp(-d * d / 0.00004);
      float rr = length(p);
      if (rr > 1.0) acc.xy -= (p / rr) * (rr - 1.0) * 60.0 * uPlate;
      acc.z += -pos.z * 16.0 * uPlate;
    }

    if (uBindu > 0.001) {
      vec3 d = normalize(s.xyz - 0.5 + 1e-4);
      vec3 tgt = d * 0.035 * pow(s.w, 2.0);
      if (s.w > 0.9) {
        float a = s.x * 2.0 * PI + uTime * (0.25 + s.y * 0.2);
        float rad = 0.2 + s.z * 0.25;
        tgt = vec3(cos(a) * rad, sin(a) * rad, (s.y - 0.5) * 0.05);
      }
      acc += (tgt - pos) * 7.0 * uBindu;
    }

    if (uEgg > 0.001) {
      vec3 d = normalize(s.xyz - 0.5 + 1e-4);
      float shell = s.w < 0.22 ? pow(s.w / 0.22, 0.5) * 0.9 : 1.0 - 0.05 * s.w;
      vec3 tgt = d * vec3(0.42, 0.56, 0.42) * shell;
      float ca = cos(uTime * 0.15), sa = sin(uTime * 0.15);
      tgt.xz = mat2(ca, -sa, sa, ca) * tgt.xz;
      acc += (tgt - pos) * 5.0 * uEgg;
    }

    if (uGalaxy > 0.001) acc += (galaxyTarget(s, uTime) - pos) * 4.0 * uGalaxy;

    if (uScatter > 0.001) {
      vec3 tgt = (s.xyz - 0.5) * vec3(7.5, 4.2, 4.0);
      tgt += flow(tgt * 0.4, uTime * 0.3) * 0.25;
      acc += (tgt - pos) * 0.5 * uScatter;
    }

    float pl = length(pos) + 1e-4;
    acc += (pos / pl) * sin(uTime * 1.25) * uBreath * 1.6;
    acc += (pos / pl) * uBurst * 14.0;
    acc += flow(pos * 1.2, uTime) * uCurl;

    vec2 dp = pos.xy - uPointer.xy;
    float dl = length(dp);
    acc.xy += dp / (dl + 1e-3) * smoothstep(0.3, 0.0, dl) * 22.0 * uPointerK;

    vel *= exp(-(uDamp + settle) * uDt);
    vel += acc * uDt;
    float sp = length(vel);
    if (sp > 5.0) vel *= 5.0 / sp;
    gl_FragColor = vec4(vel, 1.0);
  }
`;

const POSITION = /* glsl */ `
  uniform float uDt;
  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 P = texture2D(texturePosition, uv);
    vec3 v = texture2D(textureVelocity, uv).xyz;
    gl_FragColor = vec4(P.xyz + v * uDt, P.w);
  }
`;

const POINT_VERT = /* glsl */ `
  ${COMMON}
  uniform sampler2D tPos; uniform sampler2D tVel;
  uniform float uSize, uDpr, uBright, uTime;
  uniform float uOm, uPlate, uBindu, uEgg, uGalaxy, uScatter;
  uniform vec3 uPlateColor;
  attribute vec2 ref;
  varying vec3 vColor;
  void main() {
    vec4 P = texture2D(tPos, ref);
    vec3 vel = texture2D(tVel, ref).xyz;
    vec4 s = hash42(ref * 1731.7 + 3.1);
    vec4 mv = modelViewMatrix * vec4(P.xyz, 1.0);
    gl_Position = projectionMatrix * mv;
    float sparkle = step(0.988, fract(s.y * 7.13));
    float size = uSize * (0.55 + 0.9 * s.x * s.x) * (1.0 + sparkle * 1.6);
    gl_PointSize = max(1.0, size * uDpr * (3.2 / -mv.z));

    vec3 gold = vec3(1.0, 0.6, 0.2);
    vec3 cream = vec3(1.0, 0.85, 0.62);
    vec3 cOm = mix(gold, cream, s.z * 0.7) * 0.9;
    vec3 cPlate = mix(uPlateColor, cream, s.z * 0.35);
    vec3 cBindu = vec3(1.0, 0.8, 0.55) * (s.w > 0.9 ? 0.6 : 0.35);
    vec3 cEgg = mix(vec3(1.0, 0.42, 0.08), vec3(1.0, 0.8, 0.45), s.w * s.w) * 0.75;
    float gr = s.x;
    vec3 cGal = gr < 0.13 ? vec3(1.0, 0.78, 0.5) * 1.6 : mix(vec3(0.45, 0.62, 1.0), vec3(0.95, 0.9, 1.0), s.z * 0.6);
    if (gr >= 0.13 && s.w > 0.94) cGal = vec3(1.0, 0.35, 0.55) * 1.3;
    vec3 cScat = mix(vec3(0.3, 0.36, 0.85), vec3(0.95, 0.7, 0.4), step(0.93, s.z)) * 0.42;
    float wsum = uOm + uPlate + uBindu + uEgg + uGalaxy + uScatter + 1e-4;
    vec3 col = (cOm * uOm + cPlate * uPlate + cBindu * uBindu + cEgg * uEgg + cGal * uGalaxy + cScat * uScatter) / wsum;
    float sp = length(vel);
    col += vec3(1.0, 0.55, 0.25) * clamp(sp * 0.25, 0.0, 0.8);
    float tw = 0.75 + 0.25 * sin(uTime * (1.0 + s.y * 3.0) + s.x * 40.0);
    vColor = col * uBright * tw * (1.0 + sparkle * 2.2);
  }
`;

const POINT_FRAG = /* glsl */ `
  varying vec3 vColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c) * 4.0;
    if (d > 1.0) discard;
    float a = exp(-d * 3.5) * (1.0 - d);
    gl_FragColor = vec4(vColor, a);
  }
`;

const BG_FRAG = /* glsl */ `
  uniform float uTime, uNebula, uGlow, uStars, uPlate, uPlateR; uniform vec2 uRes; uniform vec2 uGlowPos; uniform vec2 uPlatePos;
  varying vec2 vUv;
  float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * n2(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
  void main() {
    vec2 p = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
    vec3 col = vec3(0.0);
    vec2 g = p - uGlowPos;
    col += vec3(1.0, 0.5, 0.16) * 0.05 * uGlow * exp(-dot(g, g) * 6.0);
    col += vec3(0.45, 0.18, 0.5) * 0.018 * uGlow * exp(-dot(g, g) * 1.2);
    if (uPlate > 0.001) {
      vec2 q = (p - uPlatePos) / uPlateR;
      float r = length(q);
      float disc = smoothstep(1.0, 0.985, r);
      float rim = exp(-pow((r - 1.0) / 0.012, 2.0));
      float sheen = pow(max(0.0, 1.0 - length(q - vec2(-0.35, 0.4))), 3.0);
      vec3 brass = vec3(0.034, 0.021, 0.01) * disc * (0.55 + 0.7 * sheen) + vec3(1.0, 0.7, 0.35) * rim * 0.22;
      brass += vec3(0.02, 0.012, 0.006) * disc * sin(r * 180.0) * 0.4;
      col += brass * uPlate;
    }
    if (uNebula > 0.001) {
      vec2 q = p * 1.6 + vec2(uTime * 0.01, 0.0);
      vec2 w = vec2(fbm(q + uTime * 0.02), fbm(q + 5.2 - uTime * 0.015));
      float n = fbm(q + 2.2 * w);
      float m = smoothstep(0.35, 0.95, n);
      vec3 neb = mix(vec3(0.05, 0.03, 0.14), vec3(0.32, 0.1, 0.36), m);
      neb = mix(neb, vec3(0.9, 0.45, 0.2), smoothstep(0.7, 1.0, n) * 0.55);
      neb += vec3(0.1, 0.25, 0.45) * smoothstep(0.5, 0.9, w.x) * 0.35;
      col += neb * m * 0.55 * uNebula;
    }
    if (uStars > 0.001) {
      vec2 sp = vUv * uRes / 2.2;
      vec2 id = floor(sp);
      float r = h(id);
      if (r > 0.9965) {
        vec2 f = fract(sp) - 0.5;
        float tw = 0.6 + 0.4 * sin(uTime * (0.5 + r * 4.0) + r * 100.0);
        col += vec3(0.85, 0.9, 1.0) * smoothstep(0.35, 0.0, length(f)) * tw * uStars * (r - 0.9965) * 300.0;
      }
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;

type Ch = [number, number, number, number];
const MODES: Ch[] = [
  [2, 5, 4, 0.0],
  [3, 5, 6, Math.PI / 6],
  [3, 5, 8, 0.0],
];

export class ParticleScene extends StageScene {
  readonly chapters = ['om', 'nada', 'nasadiya', 'pralaya'];
  bloom = 1.1;
  bloomThreshold = 0.35;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(40, 1, 0.05, 50);
  private group = new THREE.Group();
  private gpu!: GPUComputationRenderer;
  private posVar!: Variable;
  private velVar!: Variable;
  private points!: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private bg!: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private N = 512;
  private steps = 1;
  private baseBright = 0.16;
  private mobile = false;
  private visW = 4;
  private enterAt = -1;
  private tNow = 0;
  private fit = 1;
  private simTime = 0;
  /** Smoothed parameters */
  p = {
    om: 0, plate: 0, bindu: 0, egg: 0, galaxy: 0, scatter: 1, curl: 0.25, jitter: 7, damp: 3.2, breath: 0, burst: 0,
    bright: 0.6, nebula: 0, glow: 0, stars: 0, tilt: 0, pointer: 0, zoom: 0, gx: 0, gy: 0, gs: 1, plateVis: 0,
  };
  /** Exposed for audio: position through the AUM steps (-1 … 3+). */
  nadaPos = -1;
  private chIdx = 0;
  private ray = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private tmp = new THREE.Vector3();

  async init(stage: Stage) {
    const q = new URLSearchParams(location.search);
    this.N = q.get('n') ? +q.get('n')! : isMobile() ? 256 : 512;
    this.steps = q.get('steps') ? +q.get('steps')! : 1;
    this.baseBright = this.N >= 512 ? 0.16 : this.N >= 384 ? 0.26 : 0.5;
    const N = this.N;
    const r = stage.renderer;
    this.camera.position.set(0, 0, 3.2);
    this.scene.add(this.group);

    this.gpu = new GPUComputationRenderer(N, N, r);
    if (!r.capabilities.isWebGL2) this.gpu.setDataType(THREE.HalfFloatType);
    const pos0 = this.gpu.createTexture();
    const vel0 = this.gpu.createTexture();
    const pd = pos0.image.data as Float32Array;
    for (let i = 0; i < N * N; i++) {
      pd[i * 4 + 0] = (Math.random() - 0.5) * 7.5;
      pd[i * 4 + 1] = (Math.random() - 0.5) * 4.2;
      pd[i * 4 + 2] = (Math.random() - 0.5) * 4;
      pd[i * 4 + 3] = Math.random();
    }
    this.velVar = this.gpu.addVariable('textureVelocity', VELOCITY, vel0);
    this.posVar = this.gpu.addVariable('texturePosition', POSITION, pos0);
    this.gpu.setVariableDependencies(this.velVar, [this.posVar, this.velVar]);
    this.gpu.setVariableDependencies(this.posVar, [this.posVar, this.velVar]);
    const omTex = await this.makeOmTexture(N);
    Object.assign(this.velVar.material.uniforms, {
      uTime: { value: 0 }, uDt: { value: 0.016 },
      uOm: { value: 0 }, uPlate: { value: 0 }, uBindu: { value: 0 }, uEgg: { value: 0 }, uGalaxy: { value: 0 }, uScatter: { value: 1 },
      uCurl: { value: 0.25 }, uJitter: { value: 7 }, uDamp: { value: 3.2 }, uBreath: { value: 0 }, uBurst: { value: 0 },
      uChA: { value: new THREE.Vector4(...MODES[0]) }, uChB: { value: new THREE.Vector4(...MODES[0]) }, uChMix: { value: 0 },
      uPlateR: { value: 0.82 }, uPointer: { value: new THREE.Vector3(9, 9, 0) }, uPointerK: { value: 0 },
      tOm: { value: omTex },
    });
    this.posVar.material.uniforms.uDt = { value: 0.016 };
    const err = this.gpu.init();
    if (err) throw new Error(err);

    const geo = new THREE.BufferGeometry();
    const refs = new Float32Array(N * N * 2);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x;
      refs[i * 2] = (x + 0.5) / N;
      refs[i * 2 + 1] = (y + 0.5) / N;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * N * 3), 3));
    geo.setAttribute('ref', new THREE.BufferAttribute(refs, 2));
    const mat = new THREE.ShaderMaterial({
      vertexShader: POINT_VERT, fragmentShader: POINT_FRAG,
      uniforms: {
        tPos: { value: null }, tVel: { value: null }, uSize: { value: N === 512 ? 2.1 : 3.2 }, uDpr: { value: 1 }, uBright: { value: 1 }, uTime: { value: 0 },
        uOm: { value: 0 }, uPlate: { value: 0 }, uBindu: { value: 0 }, uEgg: { value: 0 }, uGalaxy: { value: 0 }, uScatter: { value: 1 },
        uPlateColor: { value: new THREE.Color(1, 0.6, 0.22) },
      },
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.group.add(this.points);

    const bgMat = new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`,
      fragmentShader: BG_FRAG,
      uniforms: { uTime: { value: 0 }, uNebula: { value: 0 }, uGlow: { value: 0 }, uStars: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uGlowPos: { value: new THREE.Vector2(0, 0.1) }, uPlate: { value: 0 }, uPlateR: { value: 0.3 }, uPlatePos: { value: new THREE.Vector2() } },
      depthTest: false, depthWrite: false,
    });
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    this.bg = new THREE.Mesh(tri, bgMat);
    this.bg.frustumCulled = false;
    this.bg.renderOrder = -1;
    this.scene.add(this.bg);
  }

  /** Sample N² points inside the ॐ glyph (plus a thin halo ring). */
  private async makeOmTexture(N: number) {
    try { await document.fonts.load('400 700px "Tiro Devanagari Sanskrit"', 'ॐ'); } catch { /* fall back to any font */ }
    const S = 768;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.fillStyle = '#fff';
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.font = '400 560px "Tiro Devanagari Sanskrit", serif';
    const m = g.measureText('ॐ');
    const w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
    const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    const x = S / 2 + (m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2;
    const y = S / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
    g.fillText('ॐ', x, y);
    const img = g.getImageData(0, 0, S, S).data;
    const pts: number[] = [];
    for (let j = 0; j < S; j += 1) for (let i = 0; i < S; i += 1) if (img[(j * S + i) * 4 + 3] > 140) pts.push(i, j);
    const extent = Math.max(w, h) || S * 0.7;
    const world = 1.5; // glyph size in world units
    const tex = new Float32Array(N * N * 4);
    const count = pts.length / 2;
    for (let k = 0; k < N * N; k++) {
      let px: number, py: number, pz: number;
      if (Math.random() < 0.075 || count === 0) {
        const a = Math.random() * Math.PI * 2;
        const rr = 1.02 + (Math.random() - 0.5) * 0.012 + (Math.random() < 0.3 ? 0.05 : 0);
        px = Math.cos(a) * rr; py = Math.sin(a) * rr; pz = 0;
      } else {
        const q = Math.floor(Math.random() * count);
        px = ((pts[q * 2] + Math.random() - S / 2) / extent) * world;
        py = (-(pts[q * 2 + 1] + Math.random() - S / 2) / extent) * world;
        pz = (Math.random() - 0.5) * 0.06;
      }
      tex[k * 4] = px; tex[k * 4 + 1] = py + 0.02; tex[k * 4 + 2] = pz; tex[k * 4 + 3] = 1;
    }
    const t = new THREE.DataTexture(tex, N, N, THREE.RGBAFormat, THREE.FloatType);
    t.needsUpdate = true;
    return t;
  }

  enter() { this.enterAt = this.tNow; }

  resize(w: number, h: number) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const visH = 2 * 3.2 * Math.tan(THREE.MathUtils.degToRad(20));
    const visW = visH * this.camera.aspect;
    // keep the composition inside the free space between the text columns
    this.mobile = w < 900;
    this.visW = visW;
    this.fit = this.mobile ? Math.min(1, (visW * 0.46) / 1.0) : Math.min(1.15, visH / 2.1);
    (this.bg.material.uniforms.uRes.value as THREE.Vector2).set(w, h);
    this.points.material.uniforms.uDpr.value = this.stage.dpr;
  }

  private targets(frame: Frame) {
    const ch = frame.chapters;
    const vh = ch.vh;
    const u = (id: string) => {
      const c = ch.get(id)!;
      return (ch.scrollY - c.top) / Math.max(1, c.height - vh);
    };
    const T = {
      om: 0, plate: 0, bindu: 0, egg: 0, galaxy: 0, scatter: 0, curl: 0.06, jitter: 7, damp: 3.2, breath: 0, burst: 0,
      bright: 1, nebula: 0, glow: 0, stars: 0, tilt: 0, pointer: 0, zoom: 0, gx: 0, gy: 0, gs: 1, plateVis: 0,
    };
    const m = this.mobile, W = this.visW;
    const enterT = this.enterAt < 0 ? 0 : smoothstep(0, 3.2 / this.steps, this.tNow - this.enterAt);
    const pr = ch.get('pralaya')!;
    if (pr.coverage > 0 && ch.scrollY > ch.get('nasadiya')!.top + ch.get('nasadiya')!.height - vh * 0.5) {
      const up = u('pralaya');
      T.bindu = 1;
      T.bright = 0.9 - smoothstep(0.2, 0.9, up) * 0.35;
      T.curl = 0.02;
      T.glow = 0.4;
      T.bright = T.bright * 0.35;
      this.nadaPos = -1;
      return T;
    }
    const u0 = u('om'), u1 = u('nada'), u2 = u('nasadiya');
    const s1 = ((u1 - 0.1) / 0.87) * 4;
    const s2 = ((u2 - 0.1) / 0.87) * 6;
    this.nadaPos = s1;

    // ── Om
    const omOut = smoothstep(0.55, 1.05, u0);
    T.om = enterT * (1 - omOut);
    T.scatter = 1 - enterT;
    T.glow = enterT * (1 - omOut) + 0.3;
    T.pointer = enterT * (1 - omOut);
    // ── Nāda plate
    const plateIn = smoothstep(-0.22, 0.02, u1);
    const plateOut = smoothstep(2.82, 3.08, s1);
    T.plate = plateIn * (1 - plateOut) * enterT;
    T.pointer += T.plate * 0.6;
    const idx = clamp(s1, 0, 2.999);
    this.chIdx = idx;
    T.jitter = 2.2 + 0.8 * clamp(s1 / 3);
    // ── turīya → bindu
    const binduIn = smoothstep(2.85, 3.2, s1);
    const binduOut = smoothstep(-0.12, 0.08, u2);
    T.bindu = binduIn * (1 - binduOut);
    // ── Nāsadīya
    const nasIn = smoothstep(-0.14, 0.06, u2);
    T.scatter += nasIn * (1 - smoothstep(1.95, 2.45, s2));
    T.breath = nasIn * smoothstep(0.7, 1.2, s2) * (1 - smoothstep(1.9, 2.3, s2));
    T.egg = smoothstep(1.95, 2.55, s2) * (1 - smoothstep(3.95, 4.15, s2));
    T.burst = smoothstep(3.92, 4.02, s2) * (1 - smoothstep(4.02, 4.3, s2));
    T.galaxy = smoothstep(4.05, 4.6, s2);
    T.nebula = nasIn * (0.35 + 0.65 * smoothstep(3.9, 4.8, s2));
    T.stars = nasIn;
    T.curl = 0.06 + nasIn * (0.35 * (1 - T.egg) * (1 - T.galaxy) + 0.05);
    T.bright = 1 - nasIn * (1 - smoothstep(1.9, 2.6, s2)) * 0.45 + T.egg * 0.35 - T.galaxy * 0.05;
    T.zoom = T.galaxy * 0.25 * smoothstep(4.5, 6, s2);
    if (T.scatter > 0.5) T.damp = 1.6;
    T.bright *= 1 - 0.65 * T.scatter * (1 - T.om) - 0.55 * T.bindu - 0.4 * T.plate;
    // composition per chapter (desktop: beside the text columns; mobile: above it)
    const wOm = 1 - plateIn, wNas = nasIn, wNada = plateIn * (1 - nasIn);
    T.gx = m ? 0 : wOm * W * 0.2 + wNada * -W * 0.12;
    T.gy = m ? wOm * 0.42 + wNada * 0.16 + wNas * 0.34 : wOm * 0.04 + wNas * 0.34;
    T.gs = m ? 1 : wOm * 0.9 + wNada * 1.0 + wNas * 0.8;
    T.plateVis = T.plate;
    return T;
  }

  update(frame: Frame) {
    const dt = Math.min(frame.dt, 1 / 30);
    const pdt = frame.dt * this.steps;
    this.tNow = frame.t;
    this.simTime += dt * this.steps;
    const T = this.targets(frame);
    const p = this.p as Record<string, number>;
    for (const k in T) {
      const fast = k === 'burst' ? 12 : k === 'pointer' ? 6 : 2.2;
      p[k] = damp(p[k], (T as Record<string, number>)[k], fast, pdt);
    }

    // Chladni mode morph
    const i0 = Math.floor(this.chIdx);
    const f = this.chIdx - i0;
    const a = MODES[i0], b = MODES[Math.min(MODES.length - 1, i0 + 1)];
    const mix = smoothstep(0.62, 1.0, f);
    const vu = this.velVar.material.uniforms;
    (vu.uChA.value as THREE.Vector4).set(...a);
    (vu.uChB.value as THREE.Vector4).set(...b);
    vu.uChMix.value = mix;
    vu.uTime.value = this.simTime;
    vu.uDt.value = dt;
    this.posVar.material.uniforms.uDt.value = dt;
    for (const k of ['om', 'plate', 'bindu', 'egg', 'galaxy', 'scatter', 'curl', 'jitter', 'damp', 'breath', 'burst'] as const) {
      vu['u' + k[0].toUpperCase() + k.slice(1)].value = this.p[k];
    }
    vu.uPlateR.value = 0.86;

    // pointer on the z=0 plane in group space
    this.ray.setFromCamera(frame.pointer, this.camera);
    if (this.ray.ray.intersectPlane(this.plane, this.tmp)) {
      this.tmp.sub(this.group.position).divideScalar(this.fit * this.p.gs);
      (vu.uPointer.value as THREE.Vector3).copy(this.tmp);
    }
    vu.uPointerK.value = this.p.pointer;

    for (let i = 0; i < this.steps; i++) this.gpu.compute();

    const mu = this.points.material.uniforms;
    mu.tPos.value = this.gpu.getCurrentRenderTarget(this.posVar).texture;
    mu.tVel.value = this.gpu.getCurrentRenderTarget(this.velVar).texture;
    mu.uTime.value = this.simTime;
    mu.uBright.value = this.p.bright * this.baseBright;
    mu.uDpr.value = this.stage.dpr;
    for (const k of ['om', 'plate', 'bindu', 'egg', 'galaxy', 'scatter'] as const) mu['u' + k[0].toUpperCase() + k.slice(1)].value = this.p[k];
    const pc = mu.uPlateColor.value as THREE.Color;
    const cols = [[1.0, 0.52, 0.16], [1.0, 0.78, 0.45], [1.0, 0.5, 0.42]];
    const ca = cols[i0], cb = cols[Math.min(2, i0 + 1)];
    pc.setRGB(ca[0] + (cb[0] - ca[0]) * mix, ca[1] + (cb[1] - ca[1]) * mix, ca[2] + (cb[2] - ca[2]) * mix);

    const bu = this.bg.material.uniforms;
    bu.uTime.value = this.simTime;
    bu.uNebula.value = this.p.nebula;
    bu.uGlow.value = this.p.glow;
    bu.uStars.value = this.p.stars;
    const sc = this.fit * this.p.gs * (1 + this.p.zoom);
    const asp = this.stage.width / this.stage.height;
    const visH = this.visW / asp;
    (bu.uGlowPos.value as THREE.Vector2).set(this.p.gx / visH, this.p.gy / visH);
    (bu.uPlatePos.value as THREE.Vector2).set(this.p.gx / visH, this.p.gy / visH);
    bu.uPlateR.value = (0.86 * sc) / visH + 0.012;
    bu.uPlate.value = this.p.plateVis;

    // composition
    this.group.scale.setScalar(sc);
    this.group.position.set(this.p.gx, this.p.gy, 0);
    this.group.rotation.x = -frame.pointer.y * 0.12;
    this.group.rotation.y = frame.pointer.x * 0.16;
  }

  render(r: THREE.WebGLRenderer) {
    r.render(this.scene, this.camera);
  }
}
