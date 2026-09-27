import * as THREE from 'three';
import { StageScene, FSQuad, fsMaterial, type Frame, type Stage } from '../core/stage';
import { damp, smoothstep } from '../core/util';

/* ─────────────────────────────────────────────────────────────
   Naṭarāja as a bronze relief, sculpted from signed distance
   fields. The figure is baked once into a float texture with
   three depth layers (back · body · front) plus engraved detail,
   then lit every frame: warm key light, the ring of fire as a rim
   light, the flame in his hand as a point light, polished-bronze
   speculars, living flames, rising embers.
   ───────────────────────────────────────────────────────────── */

const SDF_COMMON = /* glsl */ `
  float sdCap(vec2 p, vec2 pa, vec2 pb, float ra, float rb) {
    p -= pa; pb -= pa;
    float h = dot(pb, pb);
    vec2 q = vec2(dot(p, vec2(pb.y, -pb.x)), dot(p, pb)) / h;
    q.x = abs(q.x);
    float b = ra - rb;
    vec2 c = vec2(sqrt(max(h - b * b, 1e-6)), b);
    float k = c.x * q.y - c.y * q.x;
    float m = dot(c, q);
    float n = dot(q, q);
    if (k < 0.0) return sqrt(h * n) - ra;
    else if (k > c.x) return sqrt(h * (n + 1.0 - 2.0 * q.y)) - rb;
    return m - ra;
  }
  float sdSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
  float sdEll(vec2 p, vec2 c, vec2 r) { vec2 q = (p - c) / r; return (length(q) - 1.0) * min(r.x, r.y); }
  float sdBox(vec2 p, vec2 c, vec2 b, float r) { vec2 d = abs(p - c) - b + r; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r; }
  float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
`;

// Figure space: y up, the ring of fire has radius ≈ 0.98 around (0, -0.02).
const BAKE_FRAG = /* glsl */ `
  ${SDF_COMMON}
  varying vec2 vUv;
  uniform float uExtent;

  // 3-segment limb with smooth joints
  float limb(vec2 p, vec2 a, vec2 b, vec2 c, float ra, float rb, float rc) {
    return smin(sdCap(p, a, b, ra, rb), sdCap(p, b, c, rb, rc), 0.012);
  }

  float hair(vec2 p) {
    float d = 1e3;
    for (int side = 0; side < 2; side++) {
      float sx = side == 0 ? -1.0 : 1.0;
      for (int j = 0; j < 7; j++) {
        float fj = float(j);
        float ang = radians(-18.0 + fj * 11.5);
        vec2 dir = vec2(cos(ang) * sx, sin(ang));
        vec2 nrm = vec2(-dir.y, dir.x);
        vec2 o = vec2(sx * 0.055, 0.66 + fj * 0.012);
        float L = 0.74 + 0.05 * sin(fj * 1.7);
        vec2 prev = o;
        for (int k = 1; k <= 6; k++) {
          float t = float(k) / 6.0;
          vec2 q = o + dir * L * t + nrm * sin(t * 7.0 + fj * 1.3) * 0.028 * t;
          float r0 = mix(0.019, 0.007, (t - 1.0 / 6.0));
          float r1 = mix(0.019, 0.006, t);
          d = min(d, sdCap(p, prev, q, r0, r1));
          prev = q;
        }
        d = min(d, length(p - prev) - 0.013); // curled tip
      }
    }
    return d;
  }

  float damaru(vec2 p, vec2 c, float a) {
    vec2 q = p - c;
    q = mat2(cos(a), -sin(a), sin(a), cos(a)) * q;
    float w = abs(q.x);
    float d = max(abs(q.y) - (0.004 + w * 0.75), w - 0.045);
    d = min(d, sdBox(q, vec2(0.0), vec2(0.008, 0.006), 0.002));
    return d - 0.002;
  }

  void main() {
    vec2 p = (vUv - 0.5) * 2.0 * uExtent;

    // ─── BACK layer: pedestal, apasmāra, locks, upper arms, sash
    float back = 1e3;
    float ped = sdBox(p, vec2(0.0, -0.84), vec2(0.5, 0.045), 0.02);
    float xr = mod(p.x + 0.04, 0.08) - 0.04;
    ped = min(ped, abs(p.x) < 0.5 ? length(vec2(xr, p.y + 0.795)) - 0.036 : 1e3);
    ped = min(ped, sdBox(p, vec2(0.0, -0.925), vec2(0.58, 0.036), 0.012));
    ped = min(ped, sdBox(p, vec2(0.0, -0.975), vec2(0.64, 0.022), 0.008));
    ped = min(ped, sdEll(p, vec2(-0.66, -0.8), vec2(0.07, 0.05)));
    ped = min(ped, sdEll(p, vec2(0.66, -0.8), vec2(0.07, 0.05)));
    back = min(back, ped);
    // Apasmāra, the dwarf of forgetting
    float apa = sdEll(p, vec2(-0.13, -0.713), vec2(0.17, 0.046));
    apa = smin(apa, length(p - vec2(0.075, -0.69)) - 0.043, 0.02);
    apa = min(apa, limb(p, vec2(-0.27, -0.71), vec2(-0.34, -0.66), vec2(-0.29, -0.625), 0.024, 0.02, 0.016));
    apa = min(apa, sdCap(p, vec2(0.04, -0.705), vec2(0.13, -0.64), 0.016, 0.012));
    back = min(back, apa);
    back = min(back, hair(p));
    // upper right arm: ḍamaru
    back = min(back, limb(p, vec2(-0.13, 0.405), vec2(-0.35, 0.405), vec2(-0.415, 0.575), 0.042, 0.03, 0.024));
    back = min(back, sdEll(p, vec2(-0.42, 0.6), vec2(0.022, 0.03)));
    back = min(back, damaru(p, vec2(-0.455, 0.655), 0.35));
    // upper left arm: agni
    back = min(back, limb(p, vec2(0.13, 0.405), vec2(0.35, 0.405), vec2(0.425, 0.565), 0.042, 0.03, 0.024));
    back = min(back, sdEll(p, vec2(0.435, 0.59), vec2(0.034, 0.018)));
    // sash
    back = min(back, sdCap(p, vec2(-0.06, 0.06), vec2(-0.24, 0.11), 0.02, 0.016));
    back = min(back, sdCap(p, vec2(-0.24, 0.11), vec2(-0.4, 0.07), 0.016, 0.013));
    back = min(back, sdCap(p, vec2(-0.4, 0.07), vec2(-0.56, 0.12), 0.013, 0.008));
    back = min(back, sdCap(p, vec2(0.08, 0.03), vec2(0.24, -0.07), 0.018, 0.013));
    back = min(back, sdCap(p, vec2(0.24, -0.07), vec2(0.4, -0.02), 0.013, 0.008));

    // ─── BODY layer: standing leg, torso, head, crown
    float body = 1e3;
    body = min(body, limb(p, vec2(-0.055, 0.0), vec2(-0.205, -0.3), vec2(-0.14, -0.615), 0.078, 0.048, 0.034));
    body = min(body, sdCap(p, vec2(-0.14, -0.615), vec2(-0.235, -0.665), 0.03, 0.02));
    float torso = sdCap(p, vec2(0.0, 0.345), vec2(0.012, 0.14), 0.108, 0.066);
    torso = smin(torso, sdCap(p, vec2(-0.1, 0.375), vec2(0.1, 0.375), 0.055, 0.055), 0.04);
    torso = smin(torso, sdCap(p, vec2(-0.05, 0.035), vec2(0.06, 0.025), 0.088, 0.088), 0.05);
    torso = min(torso, sdEll(p, vec2(0.01, 0.0), vec2(0.135, 0.068)));
    body = min(body, torso);
    body = smin(body, sdCap(p, vec2(0.0, 0.42), vec2(0.0, 0.5), 0.034, 0.03), 0.02);
    body = min(body, sdEll(p, vec2(0.0, 0.562), vec2(0.061, 0.078)));
    float crown = sdCap(p, vec2(0.0, 0.64), vec2(0.0, 0.75), 0.05, 0.068);
    crown = min(crown, sdEll(p, vec2(0.0, 0.77), vec2(0.095, 0.04)));
    crown = min(crown, length(p - vec2(0.0, 0.815)) - 0.028);
    crown = max(crown, -(length(p - vec2(-0.1, 0.748)) - 0.03));
    body = min(body, crown);
    // crescent moon & earrings
    body = min(body, max(length(p - vec2(-0.092, 0.745)) - 0.032, -(length(p - vec2(-0.105, 0.755)) - 0.027)));
    body = min(body, length(p - vec2(-0.068, 0.515)) - 0.019);
    body = min(body, length(p - vec2(0.068, 0.515)) - 0.019);

    // ─── FRONT layer: raised leg, abhaya arm, gaja-hasta arm
    float front = 1e3;
    front = min(front, limb(p, vec2(0.07, 0.0), vec2(0.345, 0.035), vec2(0.49, -0.245), 0.076, 0.048, 0.034));
    front = min(front, sdCap(p, vec2(0.49, -0.245), vec2(0.565, -0.315), 0.03, 0.018));
    front = min(front, limb(p, vec2(-0.13, 0.385), vec2(-0.3, 0.255), vec2(-0.245, 0.425), 0.04, 0.03, 0.024));
    front = min(front, sdEll(p, vec2(-0.244, 0.472), vec2(0.028, 0.046)));
    front = min(front, limb(p, vec2(0.125, 0.385), vec2(-0.085, 0.3), vec2(0.15, 0.125), 0.04, 0.03, 0.024));
    front = min(front, sdCap(p, vec2(0.15, 0.125), vec2(0.225, 0.045), 0.024, 0.014));

    // ─── engraved detail (distance to groove lines)
    float gv = 1e3;
    gv = min(gv, sdSeg(p, vec2(-0.085, 0.092), vec2(0.095, 0.085)));
    gv = min(gv, sdSeg(p, vec2(-0.08, 0.075), vec2(0.09, 0.068)));
    gv = min(gv, abs(length(p - vec2(0.0, 0.47)) - 0.075) + max(0.0, p.y - 0.45) * 4.0);
    gv = min(gv, abs(length(p - vec2(0.0, 0.47)) - 0.105) + max(0.0, p.y - 0.43) * 4.0);
    gv = min(gv, sdSeg(p, vec2(-0.04, 0.566), vec2(-0.013, 0.563)));
    gv = min(gv, sdSeg(p, vec2(0.013, 0.563), vec2(0.04, 0.566)));
    gv = min(gv, sdSeg(p, vec2(0.0, 0.592), vec2(0.0, 0.612)));
    gv = min(gv, sdSeg(p, vec2(-0.014, 0.518), vec2(0.014, 0.518)));
    gv = min(gv, sdSeg(p, vec2(-0.052, 0.64), vec2(0.052, 0.64)));
    gv = min(gv, sdSeg(p, vec2(-0.06, 0.7), vec2(0.06, 0.7)));
    gv = min(gv, abs(length(p - vec2(0.0, 0.62)) - 0.15) + step(p.y, 0.745) + step(0.8, p.y));
    gv = min(gv, sdSeg(p, vec2(-0.205, 0.43), vec2(-0.2, 0.37)));
    gv = min(gv, sdSeg(p, vec2(0.205, 0.43), vec2(0.2, 0.37)));
    gv = min(gv, sdSeg(p, vec2(-0.17, -0.56), vec2(-0.11, -0.575)));
    gv = min(gv, sdSeg(p, vec2(0.465, -0.21), vec2(0.515, -0.25)));
    gv = min(gv, sdSeg(p, vec2(-0.1, 0.02), vec2(-0.02, -0.05)));
    gv = min(gv, sdSeg(p, vec2(0.03, 0.03), vec2(0.1, -0.04)));
    gv = min(gv, sdSeg(p, vec2(-0.5, -0.82), vec2(0.5, -0.82)));
    gv = min(gv, sdSeg(p, vec2(-0.58, -0.905), vec2(0.58, -0.905)));

    gl_FragColor = vec4(back, body, front, gv);
  }
`;

const SHADE_FRAG = /* glsl */ `
  ${SDF_COMMON}
  varying vec2 vUv;
  uniform sampler2D tSdf;
  uniform float uExtent, uTime, uScale, uReveal, uFire, uFocus, uVeil, uAudio;
  uniform vec2 uRes, uCenter, uPointer;
  uniform vec2 uFocusPt[6];

  float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * n2(p); p = p * 2.1 + 3.7; a *= 0.5; } return v; }

  vec4 S(vec2 p) { return texture2D(tSdf, p / (2.0 * uExtent) + 0.5); }
  float bevel(float d, float w) { float t = clamp(-d / w, 0.0, 1.0); return sqrt(1.0 - (1.0 - t) * (1.0 - t)); }

  vec3 fireCol(float t) {
    return mix(mix(vec3(0.5, 0.05, 0.01), vec3(1.0, 0.35, 0.05), smoothstep(0.0, 0.45, t)), vec3(1.0, 0.85, 0.5), smoothstep(0.55, 1.0, t));
  }

  // prabhā: the ring of fire
  float ringSd(vec2 p) { return abs(length(p - vec2(0.0, -0.02)) - 0.975) - 0.028; }

  vec3 shadeBronze(vec3 n, vec2 p, float h, float polish) {
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 Lk = normalize(vec3(-0.55, 0.65, 0.6));
    vec2 rd = normalize(p - vec2(0.0, -0.02) + 1e-4);
    vec3 Lf = normalize(vec3(rd * 0.95, 0.25));
    vec2 fp = uFocusPt[2];
    vec3 Lh = normalize(vec3(fp - p, 0.25));
    float dh = length(fp - p);
    float flick = 0.85 + 0.15 * sin(uTime * 17.0) * sin(uTime * 7.3);
    float pat = fbm(p * 38.0) * 0.6 + fbm(p * 7.0) * 0.4;
    vec3 base = mix(vec3(0.075, 0.04, 0.02), vec3(0.3, 0.18, 0.07), polish);
    base *= 0.7 + 0.6 * pat;
    vec3 col = base * 0.08;
    float dk = max(dot(n, Lk), 0.0);
    col += base * pow(dk, 1.4) * vec3(1.0, 0.85, 0.7) * 0.6;
    float df = max(dot(n, Lf), 0.0);
    col += base * pow(df, 1.5) * vec3(1.0, 0.45, 0.12) * 2.2 * uFire * flick;
    col += base * max(dot(n, Lh), 0.0) * vec3(1.0, 0.55, 0.2) * 1.4 / (1.0 + dh * dh * 30.0) * uFire;
    vec3 Hk = normalize(Lk + V), Hf = normalize(Lf + V);
    vec3 sc = mix(vec3(0.9, 0.6, 0.3), vec3(1.0, 0.85, 0.55), polish);
    col += sc * pow(max(dot(n, Hk), 0.0), 60.0) * 0.9 * (0.4 + polish);
    col += vec3(1.0, 0.5, 0.15) * pow(max(dot(n, Hf), 0.0), 20.0) * 1.3 * uFire * flick;
    col *= 0.35 + 0.65 * h;
    return col;
  }

  vec3 layerNormal(vec2 p, int ch, float w, float e) {
    float hx1, hx0, hy1, hy0;
    vec4 a = S(p + vec2(e, 0.0)), b = S(p - vec2(e, 0.0)), c = S(p + vec2(0.0, e)), d = S(p - vec2(0.0, e));
    if (ch == 0) { hx1 = a.x; hx0 = b.x; hy1 = c.x; hy0 = d.x; }
    else if (ch == 1) { hx1 = a.y; hx0 = b.y; hy1 = c.y; hy0 = d.y; }
    else { hx1 = a.z; hx0 = b.z; hy1 = c.z; hy0 = d.z; }
    vec2 g = vec2(bevel(hx1, w) - bevel(hx0, w), bevel(hy1, w) - bevel(hy0, w)) / (2.0 * e);
    return normalize(vec3(-g * w * 0.9, 1.0));
  }

  void main() {
    vec2 frag = vUv * uRes;
    vec2 p = (frag - uCenter) / uScale;
    float sway = sin(uTime * 0.6) * 0.006;
    p = mat2(cos(sway), -sin(sway), sin(sway), cos(sway)) * (p - vec2(0.0, -0.9)) + vec2(0.0, -0.9);
    float px = 1.0 / uScale;

    // background: dark sanctum, warm glow, embers
    float rr = length(p - vec2(0.0, -0.02));
    vec3 col = vec3(0.012, 0.006, 0.006);
    col += vec3(1.0, 0.35, 0.08) * 0.05 * uFire * exp(-pow(rr - 0.98, 2.0) * 30.0);
    col += vec3(0.6, 0.18, 0.05) * 0.035 * uFire * exp(-rr * rr * 1.5);
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      vec2 q = p * (6.0 + fi * 5.0) + vec2(fi * 13.1, -uTime * (0.35 + fi * 0.2));
      vec2 id = floor(q);
      float r = h2(id + fi * 7.0);
      if (r > 0.9) {
        vec2 f = fract(q) - 0.5 - (vec2(h2(id + 1.7), h2(id + 3.1)) - 0.5) * 0.6;
        float life = fract(r * 17.0 + uTime * 0.2);
        col += fireCol(0.7) * smoothstep(0.09, 0.0, length(f)) * (1.0 - life) * 1.6 * uFire * smoothstep(1.6, 0.3, rr);
      }
    }

    // sound rings from the ḍamaru (creation)
    float fc0 = exp(-pow(uFocus - 0.0, 2.0) * 4.0);
    if (fc0 > 0.01) {
      float dd = length(p - uFocusPt[0]);
      float w = sin(dd * 60.0 - uTime * 8.0) * 0.5 + 0.5;
      col += vec3(1.0, 0.75, 0.4) * pow(w, 12.0) * exp(-dd * 3.5) * 0.5 * fc0 * smoothstep(0.03, 0.06, dd);
    }

    // ring of fire
    float rs = ringSd(p);
    float ang = atan(p.x, -(p.y + 0.02));
    float rrN = length(p - vec2(0.0, -0.02));
    float ringOn = smoothstep(-0.8, -0.74, p.y);
    float thr = (1.0 - uReveal) * 3.4;
    float sweep = smoothstep(thr - 0.25, thr, 3.25 - abs(ang)); // ignites from the base upward
    if (ringOn * sweep > 0.0) {
      // flame tongues on the outer edge: groups of licking, flickering tongues
      float N = 30.0;
      float u = ang / 6.2831853 * N;
      float k = floor(u);
      float fu = fract(u) - 0.5;
      float hk = h2(vec2(k, 1.0));
      float hgt = (0.05 + 0.07 * hk) * (0.75 + 0.35 * sin(uTime * (2.0 + hk * 2.0) + k * 1.7));
      hgt *= 1.0 + 0.45 * exp(-pow(uFocus - 2.0, 2.0) * 3.0);
      float y = (rrN - 1.0) / hgt;
      float wig = (fbm(vec2(k * 3.1, uTime * 2.2 - y * 1.5)) - 0.5) * 0.9 * y;
      float wdt = 0.42 * (1.0 - y) * smoothstep(-0.3, 0.15, y);
      float fl = smoothstep(wdt, wdt * 0.35, abs(fu + wig)) * smoothstep(1.0, 0.6, y) * step(-0.3, y);
      float lick = fbm(vec2(ang * 16.0, rrN * 20.0 - uTime * 3.2));
      float inner = smoothstep(0.05, 0.0, abs(rrN - 0.99)) * lick;
      float fire = max(fl * (1.0 - y * 0.5), inner * 0.7);
      col += fireCol(clamp(1.0 - y * 0.9 + lick * 0.25, 0.0, 1.0)) * fire * 1.05 * uFire * ringOn * sweep;
      // the bronze ring itself
      if (rs < 0.0) {
        float h = bevel(rs, 0.022);
        vec2 rd = normalize(p - vec2(0.0, -0.02));
        float side = (rrN - 0.975) / 0.028;
        vec3 n = normalize(vec3(rd * side * 0.9, 1.0 - abs(side) * 0.5));
        col = shadeBronze(n, p, h, 0.7) + vec3(1.0, 0.4, 0.1) * 0.25 * uFire;
      }
    }

    // the figure
    vec4 s = S(p);
    float e = 0.003;
    float reveal = smoothstep(0.0, 0.6, uReveal);
    vec3 fig = vec3(0.0);
    float cov = 0.0;
    if (min(s.x, min(s.y, s.z)) < px) {
      int ch = s.z < 0.0 ? 2 : s.y < 0.0 ? 1 : 0;
      float d = ch == 2 ? s.z : ch == 1 ? s.y : s.x;
      float w = ch == 0 ? 0.02 : 0.03;
      vec3 n = layerNormal(p, ch, w, e);
      float h = bevel(d, w);
      float polish = ch == 0 ? 0.35 : 0.6;
      fig = shadeBronze(n, p, h, polish);
      // contact shadows between layers
      if (ch == 1) fig *= 0.55 + 0.45 * smoothstep(-0.005, 0.03, s.z);
      if (ch == 0) fig *= (0.55 + 0.45 * smoothstep(-0.005, 0.035, s.y)) * (0.6 + 0.4 * smoothstep(-0.005, 0.03, s.z));
      // outlines where a nearer layer overlaps
      if (ch < 2) fig *= smoothstep(0.0, 0.004, abs(s.z));
      if (ch < 1) fig *= smoothstep(0.0, 0.004, abs(s.y));
      // engraved grooves
      fig *= 0.35 + 0.65 * smoothstep(0.0015, 0.0045, s.w);
      cov = smoothstep(px, -px, d);
    }
    // focus highlights (five acts)
    float glow = 0.0;
    for (int i = 0; i < 5; i++) {
      float wgt = exp(-pow(uFocus - float(i), 2.0) * 5.0);
      float dd = length(p - uFocusPt[i]);
      glow += wgt * exp(-dd * dd * 90.0);
    }
    fig += vec3(1.0, 0.7, 0.35) * glow * 0.9 * cov;
    col = mix(col, fig, cov * reveal);
    col += vec3(1.0, 0.72, 0.35) * glow * 0.12;

    // the flame in his left hand
    vec2 fq = p - uFocusPt[2];
    float fsz = 1.0 + 0.6 * exp(-pow(uFocus - 2.0, 2.0) * 3.0);
    fq /= fsz;
    float fy = fq.y / 0.11;
    float fw = (fbm(vec2(fq.x * 20.0, fq.y * 9.0 - uTime * 5.0)) - 0.5) * 0.04 * fy;
    float fshape = 1.0 - abs(fq.x + fw) / (0.03 * (1.0 - fy) * smoothstep(-0.25, 0.25, fy) + 1e-3);
    float flame = step(-0.2, fy) * step(fy, 1.0) * clamp(fshape, 0.0, 1.0);
    col += fireCol(clamp(1.0 - fy, 0.0, 1.0)) * flame * 1.8 * uFire * reveal;

    col *= 1.0 - uVeil * 0.35 * smoothstep(0.2, 1.2, length(p - uFocusPt[3]));
    gl_FragColor = vec4(col, 1.0);
  }
`;

// focus points in figure space: ḍamaru, abhaya palm, flame, foot on Apasmāra, raised foot, (heart)
const FOCUS: [number, number][] = [[-0.455, 0.655], [-0.244, 0.472], [0.435, 0.64], [-0.19, -0.655], [0.56, -0.31], [0.0, 0.3]];

export class NatarajaScene extends StageScene {
  readonly chapters = ['nataraja'];
  bloom = 0.4;
  bloomThreshold = 0.9;
  private rt!: THREE.WebGLRenderTarget;
  private quad!: FSQuad;
  private extent = 1.1;
  private focus = -1;
  private hot: HTMLElement[] = [];
  private cx = 0;
  private cy = 0;
  private scale = 1;

  async init(stage: Stage) {
    const size = 1024;
    this.rt = new THREE.WebGLRenderTarget(size, size, { type: THREE.FloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    if (!stage.renderer.extensions.has('OES_texture_float_linear')) this.rt.texture.type = THREE.HalfFloatType;
    const bake = new FSQuad(fsMaterial(BAKE_FRAG, { uExtent: { value: this.extent } }));
    bake.render(stage.renderer, this.rt);
    stage.renderer.setRenderTarget(null);
    bake.material.dispose();
    this.quad = new FSQuad(fsMaterial(SHADE_FRAG, {
      tSdf: { value: this.rt.texture }, uExtent: { value: this.extent }, uTime: { value: 0 }, uScale: { value: 300 },
      uReveal: { value: 0 }, uFire: { value: 1 }, uFocus: { value: -1 }, uVeil: { value: 0 }, uAudio: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) }, uCenter: { value: new THREE.Vector2() }, uPointer: { value: new THREE.Vector2() },
      uFocusPt: { value: FOCUS.map(([x, y]) => new THREE.Vector2(x, y)) },
    }));
    this.hot = Array.from(document.querySelectorAll<HTMLElement>('#nataraja .hotspot'));
  }

  resize() {
    const { w, h } = this.stage.bufferSize;
    (this.quad.material.uniforms.uRes.value as THREE.Vector2).set(w, h);
  }

  update(f: Frame) {
    const { w, h } = this.stage.bufferSize;
    const mobile = this.stage.width < 900;
    const ch = f.chapters;
    const pos = ch.stepPos('nataraja');
    const target = Math.max(-1, Math.min(5, pos < 0 ? -1 : Math.floor(pos)));
    this.focus = damp(this.focus, target, 3.5, f.dt);
    const prog = ch.progress('nataraja');
    const reveal = smoothstep(-0.02, 0.1, prog) * 0.7 + 0.3 * smoothstep(0.3, 1, ch.coverage('nataraja'));
    const stepping = ch.get('nataraja')!.step >= 0;
    this.scale = mobile ? Math.min(w * 0.44, h * 0.3) : h * (stepping ? 0.4 : 0.43);
    this.cx = mobile ? w * 0.5 : w * (stepping ? 0.39 : 0.62);
    this.cy = mobile ? h * 0.6 : h * 0.5;
    const u = this.quad.material.uniforms;
    const c = u.uCenter.value as THREE.Vector2;
    c.x = damp(c.x || this.cx, this.cx, 2.5, f.dt);
    c.y = damp(c.y || this.cy, this.cy, 2.5, f.dt);
    u.uScale.value = this.scale;
    u.uTime.value = f.t;
    u.uReveal.value = reveal;
    u.uFocus.value = this.focus;
    u.uFire.value = 0.85 + 0.25 * Math.exp(-Math.pow(this.focus - 2, 2) * 3);
    u.uVeil.value = Math.exp(-Math.pow(this.focus - 3, 2) * 3);
    // DOM hotspots follow the figure
    const dpr = this.stage.dpr;
    this.hot.forEach((el, i) => {
      const [fx, fy] = FOCUS[i];
      el.style.left = `${(c.x + fx * this.scale) / dpr}px`;
      el.style.top = `${(h - (c.y + fy * this.scale)) / dpr}px`;
      el.classList.toggle('is-on', i === target);
    });
  }

  render(r: THREE.WebGLRenderer) {
    this.quad.render(r, r.getRenderTarget());
  }
}
