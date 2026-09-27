import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { StageScene, type Frame, type Stage } from '../core/stage';
import type { Chapters } from '../core/chapters';
import { clamp, damp, easeInOut, TAU } from '../core/util';
import { solveSriYantra } from '../sections/yantra';
import FACES from '../data/yantra-faces.json';

/* ─────────────────────────────────────────────────────────────
   Mahā Meru — the Śrī Yantra raised into a mountain. Every
   enclosure is extruded to the height of its rank: the earth
   square, the three circles, the lotuses of sixteen and eight,
   the rings of 14, 10, 10 and 8 triangles, the central triangle,
   and on the summit the bindu. Polished gold under an HDR room
   environment; it rises out of the flat diagram as you scroll.
   ───────────────────────────────────────────────────────────── */

/** How far into the Meru step we are (0 → diagram, 1 → mountain). */
export function meruAmount(ch: Chapters) {
  return clamp((ch.stepPos('yantra') - 5.85) / 0.35);
}

const RT = 0.5;

function extrude(pts: [number, number][], h: number, holes: [number, number][][] = [], bevel = 0.004) {
  const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const hole of holes) s.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x, y))));
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.002, h - bevel), bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 48 });
  g.rotateX(-Math.PI / 2);
  return g;
}
const circle = (r: number, n = 128) => Array.from({ length: n }, (_, i) => [Math.cos((i / n) * TAU) * r, Math.sin((i / n) * TAU) * r] as [number, number]);
const inset = (p: number[][], d: number) => {
  const cx = p.reduce((s, q) => s + q[0], 0) / p.length, cy = p.reduce((s, q) => s + q[1], 0) / p.length;
  return p.map(([x, y]) => { const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1; return [x - (dx / l) * d, y - (dy / l) * d] as [number, number]; });
};

export class MeruScene extends StageScene {
  readonly chapters = ['yantra'];
  bloom = 0.45;
  bloomThreshold = 0.95;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 0.05, 50);
  private tiers: { mesh: THREE.Object3D; h: number; k: number }[] = [];
  private root = new THREE.Group();
  private bindu!: THREE.Mesh;
  private bg!: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private m = 0;
  private az = 0.6;

  chapterWeight(id: string, cov: number, ch: Chapters) { return id === 'yantra' ? cov * meruAmount(ch) : 0; }

  async init(stage: Stage) {
    const pm = new THREE.PMREMGenerator(stage.renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    this.scene.environmentIntensity = 0.5;

    // backdrop: kumkum-red sanctum glow + stars
    this.bg = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        depthWrite: false, depthTest: false,
        uniforms: { uTime: { value: 0 }, uAsp: { value: 1 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }',
        fragmentShader: `varying vec2 vUv; uniform float uTime; uniform float uAsp;
          float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          void main(){ vec2 p = (vUv - 0.5) * vec2(uAsp, 1.0);
            vec3 c = vec3(0.05, 0.006, 0.01) + vec3(0.9, 0.2, 0.06) * 0.22 * exp(-dot(p - vec2(-0.12 * uAsp, -0.05), p - vec2(-0.12 * uAsp, -0.05)) * 3.0);
            vec2 id = floor(vUv * vec2(uAsp, 1.0) * 160.0); float r = h(id);
            c += vec3(1.0, 0.9, 0.8) * step(0.994, r) * (0.4 + 0.4 * sin(uTime + r * 90.0));
            gl_FragColor = vec4(c, 1.0); }`,
      }),
    );
    this.bg.frustumCulled = false;
    this.bg.renderOrder = -1;
    this.scene.add(this.bg);

    const gold = new THREE.MeshStandardMaterial({ color: '#f0bf5a', metalness: 1, roughness: 0.32 });
    const goldDeep = new THREE.MeshStandardMaterial({ color: '#c98a2e', metalness: 1, roughness: 0.34 });
    const rose = new THREE.MeshStandardMaterial({ color: '#f2a07a', metalness: 1, roughness: 0.28 });
    const add = (g: THREE.BufferGeometry, mat: THREE.Material, h: number, k: number) => {
      const mesh = new THREE.Mesh(g, mat);
      this.root.add(mesh);
      this.tiers.push({ mesh, h, k });
    };

    // plinth + bhūpura (three stepped square walls with four gates)
    add(extrude(inset([[-1.12, -1.12], [1.12, -1.12], [1.12, 1.12], [-1.12, 1.12]], 0), 0.03, [], 0.006), goldDeep, 0.03, 0);
    for (let k = 0; k < 3; k++) {
      const S = 1.06 - k * 0.028, g = 0.15 - k * 0.012, d = 0.07 - k * 0.012, e = 0.05, w = 0.022;
      const side = (rot: number, s: number, gg: number, dd: number) => {
        const pts: [number, number][] = [[-s, -s], [-gg, -s], [-gg, -s - dd], [-gg - e, -s - dd], [-gg - e, -s - dd - 0.02], [gg + e, -s - dd - 0.02], [gg + e, -s - dd], [gg, -s - dd], [gg, -s]];
        const c = Math.cos(rot), sn = Math.sin(rot);
        return pts.map(([x, y]) => [x * c - y * sn, x * sn + y * c] as [number, number]);
      };
      const rots = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
      const outer = rots.flatMap((r) => side(r, S, g, d));
      const inner = rots.flatMap((r) => side(r, S - w, g + w, d)).reverse();
      add(extrude(outer, 0.06 + k * 0.03, [inner], 0.003), gold, 0.06 + k * 0.03, 1);
    }
    // three circles as a stepped drum
    add(extrude(circle(0.935), 0.13, [circle(0.86).reverse()], 0.004), goldDeep, 0.13, 2);
    for (const [r, h] of [[0.93, 0.135], [0.905, 0.15], [0.88, 0.165]] as const) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.006, 8, 160).rotateX(Math.PI / 2).translate(0, h, 0), gold);
      this.root.add(t); this.tiers.push({ mesh: t, h, k: 2 });
    }
    // lotus of sixteen petals, then of eight
    const petals = (n: number, r0: number, r1: number, rot: number, h: number, k: number, mat: THREE.Material) => {
      add(extrude(circle(r1), h - 0.03, [circle(r0 - 0.005).reverse()], 0.003), goldDeep, h - 0.03, k);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rot - Math.PI / 2, da = Math.PI / n;
        const pts: [number, number][] = [];
        const q = (t: number, side: number) => {
          const ang = a + side * da * (1 - t) * (1 + 0.35 * Math.sin(t * Math.PI));
          const r = r0 + (r1 - r0) * t;
          return [Math.cos(ang) * r, -Math.sin(ang) * r] as [number, number];
        };
        for (let j = 0; j <= 12; j++) pts.push(q(j / 12, -1));
        for (let j = 12; j >= 0; j--) pts.push(q(j / 12, 1));
        add(extrude(inset(pts, 0.006), h, [], 0.006), mat, h, k);
      }
    };
    petals(16, 0.705, 0.86, Math.PI / 16, 0.21, 3, rose);
    petals(8, RT + 0.012, 0.69, 0, 0.27, 4, gold);
    // platform under the triangles
    add(extrude(circle(RT + 0.01), 0.3, [], 0.004), goldDeep, 0.3, 5);
    // 43 triangles, each ring one step higher
    const H = [0.36, 0.43, 0.5, 0.57, 0.64];
    for (const f of FACES as { d: number; p: number[][] }[]) {
      const r = Math.min(4, Math.max(0, f.d));
      const pts = inset(f.p.map(([x, y]) => [x * RT, y * RT]), 0.0035);
      add(extrude(pts, H[r], [], 0.0025), r % 2 ? rose : gold, H[r], 6 + r);
    }
    // the triangle edges as thin raised lines
    const tris = solveSriYantra().tris;
    for (const t of Object.values(tris)) {
      const P = [[-t.hw, t.by], [t.hw, t.by], [0, t.ay]].map(([x, y]) => new THREE.Vector3(x * RT, 0, -y * RT));
      for (let i = 0; i < 3; i++) {
        const a = P[i], b = P[(i + 1) % 3];
        const len = a.distanceTo(b);
        const bar = new THREE.Mesh(new THREE.BoxGeometry(len, 0.012, 0.005), gold);
        bar.position.copy(a).add(b).multiplyScalar(0.5);
        bar.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
        const grp = new THREE.Group();
        grp.add(bar);
        bar.position.y = 0.3;
        this.root.add(grp);
        this.tiers.push({ mesh: grp, h: 1, k: 6 });
      }
    }
    // bindu
    this.bindu = new THREE.Mesh(new THREE.SphereGeometry(0.03, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.6, 2) }));
    const c = tris.D5;
    this.bindu.position.set(0, 0.7, -((c.by * 2 + c.ay) / 3) * RT);
    this.root.add(this.bindu);
    const glow = new THREE.PointLight(0xffc070, 1.5, 3, 2);
    glow.position.copy(this.bindu.position).add(new THREE.Vector3(0, 0.1, 0));
    this.root.add(glow);
    const key = new THREE.DirectionalLight(0xffe0b0, 1.3);
    key.position.set(-2, 3, 2);
    this.scene.add(key, new THREE.AmbientLight(0x552222, 0.6));
    this.scene.add(this.root);
  }

  resize(w: number, h: number) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.bg.material.uniforms.uAsp.value = w / h;
  }

  update(f: Frame) {
    const target = meruAmount(f.chapters);
    this.m = damp(this.m, target, 3, f.dt);
    const rise = easeInOut(clamp(this.m));
    for (const t of this.tiers) {
      const local = easeInOut(clamp(rise * 1.6 - t.k * 0.06));
      t.mesh.scale.y = Math.max(0.002, local);
    }
    this.bindu.visible = rise > 0.9;
    this.bindu.scale.setScalar(1 + 0.25 * Math.sin(f.t * 2.2));
    this.az += f.dt * 0.12;
    const az = this.az + f.pointer.x * 0.9;
    const el = 1.45 - rise * 0.85 + f.pointer.y * 0.15;
    const mobile = this.stage.width < 900;
    const dist = mobile ? 8.0 : 5.0;
    this.camera.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist);
    this.camera.lookAt(0, 0.2, 0);
    // put the mountain left of centre on desktop (text on the right)
    this.camera.setViewOffset(this.stage.width, this.stage.height, mobile ? 0 : this.stage.width * 0.17, mobile ? this.stage.height * 0.06 : 0, this.stage.width, this.stage.height);
    this.bg.material.uniforms.uTime.value = f.t;
  }

  render(r: THREE.WebGLRenderer) { r.render(this.scene, this.camera); }
}
