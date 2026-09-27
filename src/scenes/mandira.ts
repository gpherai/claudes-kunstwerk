import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { StageScene, type Frame, type Stage } from '../core/stage';
import { clamp, damp, easeInOut, smoothstep } from '../core/util';

/* ─────────────────────────────────────────────────────────────
   Mandira — a procedural Nāgara temple at dusk.
   The plan grows from the Vāstu-puruṣa-maṇḍala; halls rise in a
   crescendo toward the sanctum; the curvilinear śikhara is lofted
   from a stepped (saptaratha) plan along a convex profile with
   courses, crowned by a ribbed āmalaka and kalaśa. Around it, the
   spire repeats itself: 1 + 4 + 16 + 64 miniature peaks.
   ───────────────────────────────────────────────────────────── */

/** Keep only positions (non-indexed) so any geometries can be merged; normals are recomputed. */
function strip(g: THREE.BufferGeometry) {
  const n = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(n.attributes)) if (k !== 'position') n.deleteAttribute(k);
  return n;
}
function merge(list: THREE.BufferGeometry[]) {
  const g = mergeGeometries(list.map(strip))!;
  g.computeVertexNormals();
  return g;
}

function planPolygon(): [number, number][] {
  // one side of a stepped plan from corner (1,-1) to (1,1), then rotated ×4
  const side: [number, number][] = [
    [1.0, -1.0], [1.0, -0.72], [1.07, -0.72], [1.07, -0.42], [1.14, -0.42], [1.14, 0.42], [1.07, 0.42], [1.07, 0.72], [1.0, 0.72],
  ];
  const pts: [number, number][] = [];
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2, c = Math.cos(a), s = Math.sin(a);
    for (const [x, y] of side) pts.push([x * c - y * s, x * s + y * c]);
  }
  return pts;
}

/** Unit śikhara: base half-size 1 at y=0, height 1 (without finial). */
function shikharaGeometry(rings = 64) {
  const plan = planPolygon();
  const P = plan.length;
  const pos: number[] = [];
  const idx: number[] = [];
  const courses = 11;
  for (let r = 0; r <= rings; r++) {
    const t = r / rings;
    let s = 1 - 0.66 * Math.pow(t, 1.45);
    const c = (t * courses) % 1;
    s *= 1 - 0.028 * smoothstep(0.78, 0.86, c) * (1 - smoothstep(0.94, 1.0, c));
    s *= 1 + 0.018 * Math.exp(-Math.pow((c - 0.1) / 0.06, 2));
    for (let i = 0; i < P; i++) pos.push(plan[i][0] * s, t, plan[i][1] * s);
  }
  for (let r = 0; r < rings; r++) for (let i = 0; i < P; i++) {
    const a = r * P + i, b = r * P + ((i + 1) % P), c = (r + 1) * P + i, d = (r + 1) * P + ((i + 1) % P);
    idx.push(a, c, b, b, c, d);
  }
  // cap
  const top = pos.length / 3;
  pos.push(0, 1, 0);
  for (let i = 0; i < P; i++) idx.push(rings * P + i, top, rings * P + ((i + 1) % P));
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g = g.toNonIndexed();
  g.computeVertexNormals();
  return g;
}

/** Small corner āmalakas marking every storey (bhūmi) of the śikhara, in unit-spire space. */
function bhumiAmalakas(aspect: number) {
  const out: THREE.BufferGeometry[] = [];
  const courses = 11;
  for (let k = 1; k < courses; k++) {
    const t = k / courses - 0.012;
    const s = 1 - 0.66 * Math.pow(t, 1.45);
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const g = amalakaGeometry(20, 5);
      g.scale(0.16, 0.16 * aspect * 2.4, 0.16);
      g.translate(x * s * 1.0, t, z * s * 1.0);
      out.push(g);
    }
  }
  return out;
}

/** Ribbed āmalaka (a fruit-like stone disc) + kalaśa (pot) + spike, unit scale. */
function amalakaGeometry(segs = 96, rows = 14) {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= rows; j++) {
    const v = j / rows;
    const ph = (v - 0.5) * Math.PI;
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const rib = 1 + 0.07 * Math.abs(Math.sin(a * 16));
      const r = Math.cos(ph) * 0.46 * rib + 0.02;
      pos.push(Math.cos(a) * r, Math.sin(ph) * 0.12, Math.sin(a) * r);
    }
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < segs; i++) {
    const a = j * (segs + 1) + i, b = a + 1, c = a + segs + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const am = new THREE.BufferGeometry();
  am.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  am.setIndex(idx);
  return am;
}

function finialGeometry() {
  const am = amalakaGeometry();
  am.translate(0, 0.1, 0);
  const prof = [[0, 0], [0.16, 0], [0.2, 0.05], [0.13, 0.1], [0.22, 0.2], [0.24, 0.3], [0.18, 0.4], [0.08, 0.45], [0.1, 0.5], [0.04, 0.55], [0.03, 0.8], [0, 0.85]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const ka = new THREE.LatheGeometry(prof, 32);
  ka.translate(0, 0.2, 0);
  const neck = new THREE.CylinderGeometry(0.2, 0.28, 0.06, 32);
  neck.translate(0, -0.02, 0);
  return merge([am, ka, neck]);
}

function stoneMaterial(color: string, courses = 0.35) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0.0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uCourse = { value: courses };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * instanceMatrixOrIdentity(vec4(transformed, 1.0))).xyz;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>');
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      vec4 instanceMatrixOrIdentity(vec4 p) {
        #ifdef USE_INSTANCING
          return instanceMatrix * p;
        #else
          return p;
        #endif
      }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWP; uniform float uCourse;
        float hh(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float nn(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(hh(i), hh(i + vec3(1,0,0)), f.x), mix(hh(i + vec3(0,1,0)), hh(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(hh(i + vec3(0,0,1)), hh(i + vec3(1,0,1)), f.x), mix(hh(i + vec3(0,1,1)), hh(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float nz = nn(vWP * 1.3) * 0.6 + nn(vWP * 6.0) * 0.3 + nn(vWP * 22.0) * 0.1;
        diffuseColor.rgb *= 0.78 + 0.4 * nz;
        if (uCourse > 0.0) { float c = fract(vWP.y / uCourse); diffuseColor.rgb *= 0.82 + 0.18 * smoothstep(0.0, 0.08, c); }`);
  };
  return m;
}

export class MandiraScene extends StageScene {
  readonly chapters = ['mandira'];
  bloom = 0.6;
  bloomThreshold = 0.8;
  exposure = 1.0;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(34, 1, 0.5, 600);
  private base = new THREE.Group();
  private halls = new THREE.Group();
  private sanctum = new THREE.Group();
  private spire!: THREE.Mesh;
  private minis!: THREE.InstancedMesh;
  private miniData: { m: THREE.Matrix4; level: number; pos: THREE.Vector3; s: THREE.Vector3 }[] = [];
  private grid!: THREE.LineSegments;
  private gridMat!: THREE.LineBasicMaterial;
  private brahma!: THREE.Mesh;
  private diyas!: THREE.Points;
  private trail!: THREE.Points;
  private trailPos: Float32Array = new Float32Array(0);
  private sun!: THREE.DirectionalLight;
  private flag!: THREE.Mesh;
  private sky!: THREE.Mesh;
  private sp = 0;
  private tmpM = new THREE.Matrix4();
  private tmpQ = new THREE.Quaternion();
  private tmpS = new THREE.Vector3();

  async init(stage: Stage) {
    const r = stage.renderer;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    const sc = this.scene;
    sc.fog = new THREE.FogExp2(0x6a3a3c, 0.0105);

    // sky dome: dusk gradient with a low sun
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uSun: { value: new THREE.Vector3() }, uTime: { value: 0 } },
      vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }`,
      fragmentShader: `varying vec3 vD; uniform vec3 uSun; uniform float uTime;
        float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
        void main(){
          float y = vD.y;
          vec3 zen = vec3(0.02, 0.035, 0.12), mid = vec3(0.16, 0.09, 0.22), hor = vec3(0.62, 0.3, 0.2);
          vec3 c = mix(hor, mid, smoothstep(0.0, 0.18, y));
          c = mix(c, zen, smoothstep(0.15, 0.7, y));
          c = mix(c, vec3(0.141, 0.043, 0.045), 1.0 - smoothstep(-0.05, 0.02, y));
          float s = max(dot(vD, normalize(uSun)), 0.0);
          c += vec3(1.0, 0.55, 0.25) * pow(s, 8.0) * 0.8 + vec3(1.0, 0.8, 0.55) * pow(s, 300.0) * 6.0;
          vec3 q = floor(vD * 260.0);
          float st = step(0.9975, h(q)) * smoothstep(0.25, 0.6, y);
          c += vec3(0.9, 0.9, 1.0) * st * (0.5 + 0.5 * sin(uTime * 2.0 + h(q + 1.0) * 40.0));
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), skyMat);
    sc.add(this.sky);

    // lights
    this.sun = new THREE.DirectionalLight(0xffc08a, 3.2);
    this.sun.position.set(-40, 16, 26);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const cam = this.sun.shadow.camera as THREE.OrthographicCamera;
    cam.left = -30; cam.right = 30; cam.top = 30; cam.bottom = -30; cam.near = 1; cam.far = 140;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.04;
    sc.add(this.sun);
    sc.add(new THREE.HemisphereLight(0x7f95e0, 0x3a2418, 0.95));
    (skyMat.uniforms.uSun.value as THREE.Vector3).copy(this.sun.position).normalize();

    // ground
    const groundMat = stoneMaterial('#6d4a33', 0);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(220, 64).rotateX(-Math.PI / 2), groundMat);
    ground.receiveShadow = true;
    sc.add(ground);

    // Vāstu-puruṣa-maṇḍala: 8×8 grid of glowing lines under the temple
    const G = 8, cell = 2.2, half = (G * cell) / 2;
    const lp: number[] = [];
    for (let i = 0; i <= G; i++) {
      const v = -half + i * cell;
      lp.push(-half, 0.03, v - 4, half, 0.03, v - 4, v, 0.03, -half - 4, v, 0.03, half - 4);
    }
    // diagonals: the cosmic being's axes
    lp.push(-half, 0.03, -half - 4, half, 0.03, half - 4, half, 0.03, -half - 4, -half, 0.03, half - 4);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    this.gridMat = new THREE.LineBasicMaterial({ color: new THREE.Color(3.0, 1.9, 0.8), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    this.grid = new THREE.LineSegments(lg, this.gridMat);
    sc.add(this.grid);
    this.brahma = new THREE.Mesh(new THREE.PlaneGeometry(cell * 2, cell * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.2, 0.5), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.brahma.position.set(0, 0.035, -4);
    sc.add(this.brahma);

    const stone = stoneMaterial('#c7a07a');
    const stoneDark = stoneMaterial('#9c7652');
    const box = (w: number, h: number, d: number, x: number, y: number, z: number) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y + h / 2, z); return g; };

    // jagatī (platform) with tiers and front stair
    const plat: THREE.BufferGeometry[] = [];
    plat.push(box(16, 0.6, 28, 0, 0, 2), box(15, 0.5, 27, 0, 0.6, 2), box(14, 0.45, 26, 0, 1.1, 2));
    for (let i = 0; i < 6; i++) plat.push(box(4, 0.26, 0.5, 0, i * 0.26, 16.2 - i * 0.45));
    const platMesh = new THREE.Mesh(merge(plat), stoneDark);
    platMesh.castShadow = platMesh.receiveShadow = true;
    this.base.add(platMesh);
    const gate: THREE.BufferGeometry[] = [];
    for (const px of [-2.6, 2.6]) {
      gate.push(box(0.7, 0.4, 0.7, px, 0, 18.4));
      gate.push(new THREE.CylinderGeometry(0.2, 0.26, 4.4, 12).translate(px, 0.4 + 2.2, 18.4));
      gate.push(box(0.6, 0.3, 0.6, px, 4.8, 18.4));
    }
    gate.push(new THREE.TorusGeometry(2.6, 0.2, 8, 36, Math.PI).translate(0, 5.0, 18.4));
    for (let i = 1; i < 8; i++) {
      const a = (i / 8) * Math.PI;
      gate.push(new THREE.SphereGeometry(0.16, 10, 8).translate(Math.cos(a) * 2.25, 5.0 + Math.sin(a) * 2.25, 18.4));
    }
    gate.push(box(6.2, 0.3, 0.5, 0, 5.1, 18.4));
    const gf = finialGeometry(); gf.scale(1.1, 1.1, 1.1); gf.translate(0, 7.55, 18.4); gate.push(gf);
    // dīpa-stambha: a pillar of lamps
    gate.push(box(1.2, 0.5, 1.2, -9.5, 0, 14));
    gate.push(new THREE.CylinderGeometry(0.22, 0.34, 6.5, 12).translate(-9.5, 0.5 + 3.25, 14));
    for (let k = 0; k < 7; k++) gate.push(new THREE.TorusGeometry(0.55 - k * 0.04, 0.05, 6, 24).rotateX(Math.PI / 2).translate(-9.5, 1.3 + k * 0.8, 14));
    const gateMesh = new THREE.Mesh(merge(gate), stoneDark);
    gateMesh.castShadow = gateMesh.receiveShadow = true;
    this.base.add(gateMesh);
    sc.add(this.base);

    // garbhagṛha walls (with moldings) — the sanctum
    const Y0 = 1.55;
    const sg: THREE.BufferGeometry[] = [box(6.4, 5.2, 6.4, 0, Y0, -4)];
    for (const [y, s] of [[0, 7.0], [0.4, 6.8], [2.2, 6.7], [4.6, 6.9], [4.9, 7.1]] as const) sg.push(box(s, 0.28, s, 0, Y0 + y, -4));
    for (const sx of [-1, 1]) sg.push(box(0.5, 5.2, 2.2, sx * 3.35, Y0, -4), box(2.2, 5.2, 0.5, 0, Y0, -4 - 3.35));
    // niches with sculpted figures (devakoṣṭhas) on three sides of the sanctum
    const recess: THREE.BufferGeometry[] = [];
    const figure = (x: number, y: number, z: number, nx: number, nz: number, sc: number, into: THREE.BufferGeometry[]) => {
      const body = new THREE.CapsuleGeometry(0.13 * sc, 0.55 * sc, 4, 8).translate(0, 0.42 * sc, 0);
      const head = new THREE.SphereGeometry(0.12 * sc, 10, 8).translate(0, 0.98 * sc, 0);
      const crown = new THREE.ConeGeometry(0.09 * sc, 0.2 * sc, 8).translate(0, 1.16 * sc, 0);
      const arms = new THREE.CapsuleGeometry(0.05 * sc, 0.5 * sc, 3, 6).rotateZ(Math.PI / 2).translate(0, 0.62 * sc, 0.02);
      const base = new THREE.BoxGeometry(0.42 * sc, 0.08 * sc, 0.2 * sc);
      for (const g of [body, head, crown, arms, base]) { g.translate(x + nx * 0.1, y, z + nz * 0.1); into.push(g); }
    };
    const niche = (x: number, z: number, nx: number, nz: number, big: boolean) => {
      const w = big ? 1.15 : 0.8, h = big ? 2.0 : 1.5, y = Y0 + (big ? 1.5 : 1.8);
      const along = Math.abs(nx) > 0 ? [0.16, h + 0.2, w + 0.3] : [w + 0.3, h + 0.2, 0.16];
      sg.push(box(along[0], along[1], along[2], x + nx * 0.08, y - 0.1, z + nz * 0.08));
      const inner = Math.abs(nx) > 0 ? [0.2, h, w] : [w, h, 0.2];
      recess.push(box(inner[0], inner[1], inner[2], x + nx * 0.1, y, z + nz * 0.1));
      // little pyramidal pediment above the niche
      sg.push(new THREE.ConeGeometry(w * 0.62, 0.55, 4).rotateY(Math.PI / 4).scale(Math.abs(nx) > 0 ? 0.35 : 1, 1, Math.abs(nx) > 0 ? 1 : 0.35).translate(x + nx * 0.14, y + h + 0.32, z + nz * 0.14));
      figure(x, y + 0.08, z, nx, nz, big ? 1.35 : 1.0, sg);
    };
    for (const sx of [-1, 1]) {
      niche(sx * 3.6, -4, sx, 0, true);
      niche(sx * 3.2, -6.3, sx, 0, false);
      niche(sx * 3.2, -1.7, sx, 0, false);
    }
    niche(0, -7.6, 0, -1, true);
    niche(-2.3, -7.2, 0, -1, false);
    niche(2.3, -7.2, 0, -1, false);
    const recMesh = new THREE.Mesh(merge(recess), new THREE.MeshStandardMaterial({ color: '#2a1810', roughness: 1 }));
    this.sanctum.add(recMesh);
    const sanct = new THREE.Mesh(merge(sg), stone);
    sanct.castShadow = sanct.receiveShadow = true;
    this.sanctum.add(sanct);
    // the lamp inside, glimpsed through the door
    const lamp = new THREE.PointLight(0xffa040, 30, 12, 2);
    lamp.position.set(0, Y0 + 1.2, -2.2);
    this.sanctum.add(lamp);
    const lampGlow = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 3, 1.2), fog: false }));
    lampGlow.position.copy(lamp.position);
    this.sanctum.add(lampGlow);
    sc.add(this.sanctum);

    // halls with phāṃsana roofs, rising toward the sanctum like foothills
    const hallGeo: THREE.BufferGeometry[] = [];
    const finial = finialGeometry();
    const hall = (z: number, w: number, d: number, h: number, roofH: number, tiers: number) => {
      hallGeo.push(box(w, h, d, 0, Y0, z));
      hallGeo.push(box(w + 0.4, 0.3, d + 0.4, 0, Y0 + h - 0.3, z));
      for (let i = 0; i < tiers; i++) {
        const t = i / tiers;
        const sw = (w + 0.8) * (1 - t * 0.82), sd = (d + 0.8) * (1 - t * 0.82);
        const hh = roofH / tiers;
        hallGeo.push(box(sw, hh * 0.72, sd, 0, Y0 + h + i * hh, z));
        hallGeo.push(box(sw + 0.25, hh * 0.28, sd + 0.25, 0, Y0 + h + i * hh + hh * 0.72, z));
      }
      const f = finial.clone();
      const fs = Math.max(w, d) * 0.22;
      f.scale(fs * 1.6, fs * 1.6, fs * 1.6);
      f.translate(0, Y0 + h + roofH, z);
      hallGeo.push(f);
      // balconies (kakṣāsana) on the sides, with little pillars and a row of dancing figures above
      for (const sx of [-1, 1]) {
        hallGeo.push(box(0.9, 1.3, d * 0.7, sx * (w / 2 + 0.45), Y0 + 1.1, z));
        hallGeo.push(box(1.1, 0.18, d * 0.78, sx * (w / 2 + 0.5), Y0 + 3.3, z));
        const nP = Math.max(2, Math.round(d * 0.9));
        for (let i = 0; i < nP; i++) {
          const pz = z - d * 0.33 + (i / (nP - 1)) * d * 0.66;
          hallGeo.push(new THREE.CylinderGeometry(0.07, 0.08, 0.9, 8).translate(sx * (w / 2 + 0.85), Y0 + 2.85, pz));
        }
        const nF = Math.max(2, Math.round(d * 0.7));
        for (let i = 0; i < nF; i++) {
          const pz = z - d * 0.3 + (i / Math.max(1, nF - 1)) * d * 0.6;
          const g = new THREE.CapsuleGeometry(0.09, 0.4, 3, 6).rotateZ(sx * 0.25).translate(sx * (w / 2 + 0.03), Y0 + h - 1.0, pz);
          const hd = new THREE.SphereGeometry(0.09, 8, 6).translate(sx * (w / 2 + 0.03) + sx * 0.08, Y0 + h - 0.62, pz);
          hallGeo.push(g, hd);
        }
      }
      // a band of carved moulding on the walls
      for (const yy of [0.35, h * 0.62]) hallGeo.push(box(w + 0.16, 0.14, d + 0.16, 0, Y0 + yy, z));
    };
    hall(-0.3, 3.8, 2.6, 4.6, 3.2, 6);
    hall(3.6, 7.2, 5.6, 4.6, 6.2, 9);
    hall(8.8, 5.8, 4.4, 4.2, 4.6, 8);
    // ardha-maṇḍapa: open porch on pillars
    for (const px of [-1.8, 1.8]) for (const pz of [11.4, 13.6]) hallGeo.push(new THREE.CylinderGeometry(0.22, 0.26, 3.4, 12).translate(px, Y0 + 1.7, pz));
    hallGeo.push(box(4.8, 0.35, 3.4, 0, Y0 + 3.4, 12.5));
    for (let i = 0; i < 5; i++) hallGeo.push(box(4.6 * (1 - i * 0.17), 0.5, 3.2 * (1 - i * 0.17), 0, Y0 + 3.75 + i * 0.5, 12.5));
    const halls = new THREE.Mesh(merge(hallGeo), stone);
    halls.castShadow = halls.receiveShadow = true;
    this.halls.add(halls);
    sc.add(this.halls);

    // main śikhara + finial
    const unit = merge([shikharaGeometry(), (() => { const f = finialGeometry(); f.scale(0.95, 0.95, 0.95); f.translate(0, 1.0, 0); return f; })(), ...bhumiAmalakas(3.3 / 16)]);
    const SH = 16, SW = 3.3, SY = Y0 + 5.2;
    this.spire = new THREE.Mesh(unit, stone);
    this.spire.castShadow = this.spire.receiveShadow = true;
    this.spire.position.set(0, SY, -4);
    this.spire.scale.set(SW, SH, SW);
    sc.add(this.spire);
    // flag (dhvaja)
    const flagGeo = new THREE.PlaneGeometry(1.6, 0.9, 16, 4);
    flagGeo.translate(0.8, 0, 0);
    const flagMat = new THREE.MeshStandardMaterial({ color: '#ff6a1a', side: THREE.DoubleSide, roughness: 0.7, emissive: new THREE.Color('#ff4a0a'), emissiveIntensity: 0.25 });
    flagMat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = { value: 0 };
      flagMat.userData.sh = sh;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.z += sin(position.x * 3.0 - uTime * 6.0) * 0.18 * position.x; transformed.y += sin(position.x * 2.0 - uTime * 4.0) * 0.06 * position.x;');
    };
    this.flag = new THREE.Mesh(flagGeo, flagMat);
    this.flag.position.set(0, SY + SH * 1.0 + 1.9, -4);
    sc.add(this.flag);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 6), stoneDark);
    pole.position.set(0, SY + SH + 1.2, -4);
    this.spire.userData.pole = pole;
    sc.add(pole);

    // the fractal: urushṛṅgas, 1 + 4 + 16 + 64 miniature spires
    const minis: typeof this.miniData = [];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const rec = (level: number, cx: number, cz: number, w: number, h: number, y: number) => {
      if (level > 3) return;
      for (const [dx, dz] of dirs) {
        const cw = w * 0.5, ch = h * 0.6;
        const nx = cx + dx * w * 0.86, nz = cz + dz * w * 0.86;
        const pos = new THREE.Vector3(nx, y, nz);
        minis.push({ m: new THREE.Matrix4(), level, pos, s: new THREE.Vector3(cw, ch, cw) });
        rec(level + 1, nx, nz, cw, ch, y + h * 0.04);
      }
    };
    rec(1, 0, -4, SW, SH * 0.78, SY);
    this.miniData = minis;
    this.minis = new THREE.InstancedMesh(unit, stone, minis.length);
    this.minis.castShadow = this.minis.receiveShadow = true;
    minis.forEach((d, i) => { d.m.compose(d.pos, this.tmpQ, d.s); this.minis.setMatrixAt(i, d.m); });
    sc.add(this.minis);

    // diyas along the platform edge
    const dp: number[] = [];
    for (let i = 0; i < 40; i++) { const z = -10 + i * 0.66; dp.push(-6.9, 1.62, z, 6.9, 1.62, z); }
    for (let i = 0; i < 20; i++) { const x = -6.6 + i * 0.7; dp.push(x, 1.62, 14.9); }
    for (let k = 0; k < 7; k++) for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + k * 0.3, r = 0.55 - k * 0.04; dp.push(-9.5 + Math.cos(a) * r, 1.42 + k * 0.8, 14 + Math.sin(a) * r); }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
    this.diyas = new THREE.Points(dg, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uOn: { value: 0 }, uScale: { value: 1 } },
      vertexShader: `uniform float uTime; uniform float uScale; varying float vF; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vF = 0.7 + 0.3 * sin(uTime * 9.0 + position.z * 3.1 + position.x); gl_PointSize = uScale * 26.0 / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uOn; varying float vF; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); float a = exp(-d * d * 30.0) + 0.25 * exp(-d * d * 6.0); gl_FragColor = vec4(vec3(3.0, 1.5, 0.5) * a * vF * uOn, a); }`,
    }));
    sc.add(this.diyas);

    // pradakṣiṇā: a light that circles clockwise, keeping the sanctum to its right
    const TN = 90;
    this.trailPos = new Float32Array(TN * 3);
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(this.trailPos, 3));
    const ta = new Float32Array(TN);
    for (let i = 0; i < TN; i++) ta[i] = 1 - i / TN;
    tg.setAttribute('age', new THREE.BufferAttribute(ta, 1));
    this.trail = new THREE.Points(tg, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uOn: { value: 0 }, uScale: { value: 1 } },
      vertexShader: `attribute float age; uniform float uScale; varying float vA; void main(){ vA = age; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = uScale * (8.0 + 30.0 * age * age) / -mv.z * 3.0; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uOn; varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float a = exp(-dot(c,c) * 20.0) * vA * vA; gl_FragColor = vec4(vec3(3.0, 1.9, 0.9) * a * uOn, a); }`,
    }));
    this.trail.frustumCulled = false;
    sc.add(this.trail);
  }

  resize(w: number, h: number) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const s = this.stage.dpr * (h / 900);
    (this.diyas.material as THREE.ShaderMaterial).uniforms.uScale.value = s * 10;
    (this.trail.material as THREE.ShaderMaterial).uniforms.uScale.value = s * 10;
  }

  update(f: Frame) {
    const ch = f.chapters;
    const raw = ch.stepPos('mandira');
    this.sp = damp(this.sp, clamp(raw, -1, 5), 2.2, f.dt);
    const sp = this.sp;
    const prog = ch.progress('mandira');

    // build sequence
    const grid = smoothstep(-0.8, 0.2, sp) * (1 - smoothstep(2.2, 3.4, sp) * 0.75);
    this.gridMat.opacity = grid * 0.85;
    (this.brahma.material as THREE.MeshBasicMaterial).opacity = grid * (0.25 + 0.15 * Math.sin(f.t * 2)) * smoothstep(0.3, 1.2, sp + 0.5);
    const grow = (o: THREE.Object3D, t: number, full = 1) => { o.scale.y = Math.max(0.001, t * full); o.visible = t > 0.01; };
    grow(this.base, easeInOut(smoothstep(0.35, 1.2, sp)));
    grow(this.sanctum, easeInOut(smoothstep(0.7, 1.5, sp)));
    grow(this.halls, easeInOut(smoothstep(1.3, 2.3, sp)));
    const spT = easeInOut(smoothstep(1.7, 2.7, sp));
    grow(this.spire, spT, 16);
    this.flag.visible = spT > 0.98;
    (this.spire.userData.pole as THREE.Mesh).visible = spT > 0.98;
    // fractal growth, level by level
    this.miniData.forEach((d, i) => {
      const t = easeInOut(smoothstep(2.75 + (d.level - 1) * 0.28, 3.15 + (d.level - 1) * 0.28, sp));
      this.tmpS.set(d.s.x * Math.max(0.001, t), d.s.y * Math.max(0.001, t), d.s.z * Math.max(0.001, t));
      this.tmpM.compose(d.pos, this.tmpQ, this.tmpS);
      this.minis.setMatrixAt(i, this.tmpM);
    });
    this.minis.instanceMatrix.needsUpdate = true;
    this.minis.visible = sp > 2.7;

    const dMat = this.diyas.material as THREE.ShaderMaterial;
    dMat.uniforms.uTime.value = f.t;
    dMat.uniforms.uOn.value = smoothstep(1.0, 2.0, sp);
    (this.sky.material as THREE.ShaderMaterial).uniforms.uTime.value = f.t;
    const fsh = (this.flag.material as THREE.MeshStandardMaterial).userData.sh;
    if (fsh) fsh.uniforms.uTime.value = f.t;

    // pradakṣiṇā trail (clockwise seen from above)
    const trOn = smoothstep(3.6, 4.2, sp);
    (this.trail.material as THREE.ShaderMaterial).uniforms.uOn.value = trOn;
    const TN = this.trailPos.length / 3;
    for (let i = 0; i < TN; i++) {
      const a = -(f.t * 0.55 - i * 0.03);
      this.trailPos[i * 3] = Math.sin(a) * 10.5;
      this.trailPos[i * 3 + 1] = 2.2;
      this.trailPos[i * 3 + 2] = Math.cos(a) * 15 + 2;
    }
    this.trail.geometry.attributes.position.needsUpdate = true;

    // camera: from the diagram above, down to the sanctum, up the peak, around the temple
    const keys: [number, number, number, number, number][] = [
      // az, el, dist, targetY, targetZ
      [0.15, 1.2, 44, 0, -3],
      [0.45, 0.36, 30, 4, -2],
      [0.62, 0.16, 50, 10, -3],
      [0.95, 0.22, 50, 11, -4],
      [1.7, 0.16, 54, 9, -1],
    ];
    const k = clamp(sp, 0, 4);
    const i0 = Math.floor(k), fr = easeInOut(k - i0);
    const A = keys[i0], B = keys[Math.min(4, i0 + 1)];
    const L = (j: number) => A[j] + (B[j] - A[j]) * fr;
    let az = L(0) + (sp > 3.5 ? (sp - 3.5) * 0.6 : 0) + f.pointer.x * 0.08, el = L(1) - f.pointer.y * 0.04;
    const dist = L(2) * (this.stage.width < 900 ? 1.35 : 1);
    az -= prog * 0.25;
    const ty = L(3), tz = L(4);
    this.camera.position.set(Math.sin(az) * Math.cos(el) * dist, ty + Math.sin(el) * dist, tz + Math.cos(az) * Math.cos(el) * dist);
    this.camera.lookAt(0, ty, tz);
  }

  render(r: THREE.WebGLRenderer) {
    r.render(this.scene, this.camera);
  }
}
