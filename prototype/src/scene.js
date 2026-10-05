// 3D-сцена: студийный свет, мягкие контактные тени, камера с ракурсами.
// Стол собирается из параметров: опора, форма и размер столешницы, материал, отделка.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries, mergeVertices, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader.js';
import { SURFACES, getSlab, getFinish, getVeneer, dims } from './data.js';
import { veneerCanvas, brushedCanvas, grainCanvas } from './textures.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const lerp = THREE.MathUtils.lerp;
const clamp = THREE.MathUtils.clamp;

export class Stage {
  constructor(container, { shadowSize = 4.6, shadowHeight = 0.8, fov = 30 } = {}) {
    this.container = container;
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.08;
    r.setClearColor(0x000000, 0);
    container.appendChild(r.domElement);
    this.renderer = r;

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(r);
    this.envTex = pmrem.fromScene(new RoomEnvironment(r), 0.04).texture;
    this.scene.environment = this.envTex;
    pmrem.dispose();

    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(2.5, 4.5, 3);
    this.scene.add(key);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d0c3, 0.3));

    this.camera = new THREE.PerspectiveCamera(fov, 1, 0.05, 60);
    this.camera.position.set(4, 2, 4);
    const c = new OrbitControls(this.camera, r.domElement);
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.enablePan = false;
    c.maxPolarAngle = Math.PI * 0.49;
    c.minDistance = 0.9;
    c.maxDistance = 14;
    c.addEventListener('change', () => this.invalidate());
    c.addEventListener('start', () => {
      this.tween = null;
      this.onInteract?.();
    });
    this.controls = c;

    this.subject = new THREE.Group();
    this.scene.add(this.subject);
    this.initShadows(shadowSize, shadowHeight);

    this.frames = 2;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  invalidate(n = 2) {
    this.frames = Math.max(this.frames, n);
  }

  shadowsDirty() {
    this.shadowDirty = true;
    this.invalidate();
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }

  // Мягкие контактные тени: рендер глубины снизу, размытие, проекция на пол
  initShadows(size, height) {
    const g = new THREE.Group();
    g.position.y = 0.0008;
    this.scene.add(g);
    const res = 1024;
    this.rt = new THREE.WebGLRenderTarget(res, res);
    this.rt.texture.generateMipmaps = false;
    this.rtBlur = new THREE.WebGLRenderTarget(res, res);
    this.rtBlur.texture.generateMipmaps = false;
    const geo = new THREE.PlaneGeometry(size, size).rotateX(Math.PI / 2);
    this.shadowPlane = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ map: this.rt.texture, transparent: true, depthWrite: false, opacity: 0.92 }),
    );
    this.shadowPlane.renderOrder = 1;
    this.shadowPlane.scale.y = -1;
    g.add(this.shadowPlane);
    this.blurPlane = new THREE.Mesh(geo);
    this.blurPlane.visible = false;
    g.add(this.blurPlane);
    this.shadowCam = new THREE.OrthographicCamera(-size / 2, size / 2, size / 2, -size / 2, 0, height);
    this.shadowCam.rotation.x = Math.PI / 2;
    g.add(this.shadowCam);
    const dm = new THREE.MeshDepthMaterial();
    dm.userData.darkness = { value: 1.25 };
    dm.onBeforeCompile = (shader) => {
      shader.uniforms.darkness = dm.userData.darkness;
      shader.fragmentShader = `uniform float darkness;\n${shader.fragmentShader.replace(
        'gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );',
        'gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );',
      )}`;
    };
    dm.side = THREE.DoubleSide;
    dm.depthTest = false;
    dm.depthWrite = false;
    this.depthMat = dm;
    this.hBlur = new THREE.ShaderMaterial(HorizontalBlurShader);
    this.hBlur.depthTest = false;
    this.vBlur = new THREE.ShaderMaterial(VerticalBlurShader);
    this.vBlur.depthTest = false;
    this.shadowDirty = true;
  }

  blur(amount) {
    const bp = this.blurPlane;
    bp.visible = true;
    bp.material = this.hBlur;
    this.hBlur.uniforms.tDiffuse.value = this.rt.texture;
    this.hBlur.uniforms.h.value = amount / 256;
    this.renderer.setRenderTarget(this.rtBlur);
    this.renderer.render(bp, this.shadowCam);
    bp.material = this.vBlur;
    this.vBlur.uniforms.tDiffuse.value = this.rtBlur.texture;
    this.vBlur.uniforms.v.value = amount / 256;
    this.renderer.setRenderTarget(this.rt);
    this.renderer.render(bp, this.shadowCam);
    bp.visible = false;
  }

  renderShadow() {
    const r = this.renderer;
    this.shadowPlane.visible = false;
    const alpha = r.getClearAlpha();
    r.setClearAlpha(0);
    this.scene.overrideMaterial = this.depthMat;
    r.setRenderTarget(this.rt);
    r.clear();
    r.render(this.scene, this.shadowCam);
    this.scene.overrideMaterial = null;
    this.blur(2.2);
    this.blur(0.9);
    r.setRenderTarget(null);
    r.setClearAlpha(alpha);
    this.shadowPlane.visible = true;
  }

  // Плавный облёт камеры по сфере вокруг цели
  flyTo(pos, target, ms = 750) {
    if (reduceMotion || !this.ready) {
      this.camera.position.copy(pos);
      this.controls.target.copy(target);
      this.controls.update();
      this.ready = true;
      this.invalidate();
      return;
    }
    const s0 = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
    const s1 = new THREE.Spherical().setFromVector3(pos.clone().sub(target));
    let dTheta = s1.theta - s0.theta;
    if (dTheta > Math.PI) dTheta -= Math.PI * 2;
    if (dTheta < -Math.PI) dTheta += Math.PI * 2;
    this.tween = { s0, s1, dTheta, t0: this.controls.target.clone(), t1: target.clone(), start: performance.now(), ms };
  }

  stepTween(now) {
    const tw = this.tween;
    const k = Math.min(1, (now - tw.start) / tw.ms);
    const e = 1 - Math.pow(1 - k, 3);
    const s = new THREE.Spherical(
      lerp(tw.s0.radius, tw.s1.radius, e),
      lerp(tw.s0.phi, tw.s1.phi, e),
      tw.s0.theta + tw.dTheta * e,
    );
    this.controls.target.lerpVectors(tw.t0, tw.t1, e);
    this.camera.position.setFromSpherical(s).add(this.controls.target);
    this.camera.lookAt(this.controls.target);
    if (k >= 1) this.tween = null;
    this.invalidate();
  }

  loop(now) {
    this.raf = requestAnimationFrame(this.loop);
    if (this.tween) this.stepTween(now);
    this.controls.update();
    if (this.frames <= 0) return;
    this.frames--;
    if (this.shadowDirty) {
      this.shadowDirty = false;
      this.renderShadow();
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.controls.dispose();
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    this.rt.dispose();
    this.rtBlur.dispose();
    this.envTex.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

// ---------- текстуры ----------

const loader = new THREE.TextureLoader();
const texCache = new Map();
let maxAniso = 8;

function loadTexture(url) {
  if (!texCache.has(url)) {
    texCache.set(
      url,
      new Promise((resolve) => {
        loader.load(url, (t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = maxAniso;
          resolve(t);
        });
      }),
    );
  }
  return texCache.get(url);
}

function averageColor(img) {
  const c = document.createElement('canvas');
  c.width = c.height = 8;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, 8, 8);
  const d = ctx.getImageData(0, 0, 8, 8).data;
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < d.length; i += 4) {
    r += d[i];
    g += d[i + 1];
    b += d[i + 2];
  }
  const n = d.length / 4;
  return new THREE.Color(`rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`);
}

let shared = null;
function sharedTextures() {
  if (shared) return shared;
  const mk = (cv, repeat) => {
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.anisotropy = maxAniso;
    return t;
  };
  const bV = mk(brushedCanvas(true), 2.5);
  bV.colorSpace = THREE.SRGBColorSpace;
  const bH = mk(brushedCanvas(false), 2.5);
  bH.colorSpace = THREE.SRGBColorSpace;
  shared = {
    brushedV: bV,
    brushedH: bH,
    grain: mk(grainCanvas(), 9),
  };
  return shared;
}

const veneerTex = new Map();
function veneerTexture(cfg) {
  const key = cfg.veneer + cfg.layout;
  if (!veneerTex.has(key)) {
    const t = new THREE.CanvasTexture(veneerCanvas(getVeneer(cfg.veneer), cfg.layout));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    veneerTex.set(key, t);
  }
  return veneerTex.get(key);
}

// ---------- геометрия ----------

// Контур столешницы. A – бочка (длинные стороны выгнуты), C – прямоугольник со скруглёнными углами, O – овал.
export function outlineShape(kind, L, W) {
  const s = new THREE.Shape();
  const hl = L / 2;
  const hw = W / 2;
  if (kind === 'O') {
    s.absellipse(0, 0, hl, hw, 0, Math.PI * 2, false, 0);
    return s;
  }
  const sagL = kind === 'A' ? 0.055 * (W / 1.1) : 0;
  const sagS = kind === 'A' ? 0.012 : 0;
  const r = kind === 'A' ? 0.15 : 0.1;
  const y0 = hw - sagL;
  const a = hl - r;
  const xs = hl - sagS;
  const b = y0 - r;
  // угол – квадратичная кривая с контрольной точкой на пересечении касательных
  const d1 = new THREE.Vector2(a, -2 * sagL);
  const d2 = new THREE.Vector2(-2 * sagS, b);
  const p = new THREE.Vector2(a, y0);
  const q = new THREE.Vector2(xs, b);
  const det = d1.x * -d2.y - d1.y * -d2.x;
  const lam = ((q.x - p.x) * -d2.y - (q.y - p.y) * -d2.x) / det;
  const K = new THREE.Vector2(p.x + lam * d1.x, p.y + lam * d1.y);
  s.moveTo(-a, y0);
  s.quadraticCurveTo(0, hw + sagL, a, y0);
  s.quadraticCurveTo(K.x, K.y, xs, b);
  s.quadraticCurveTo(hl + sagS, 0, xs, -b);
  s.quadraticCurveTo(K.x, -K.y, a, -y0);
  s.quadraticCurveTo(0, -hw - sagL, -a, -y0);
  s.quadraticCurveTo(-K.x, -K.y, -xs, -b);
  s.quadraticCurveTo(-hl - sagS, 0, -xs, b);
  s.quadraticCurveTo(-K.x, K.y, -a, y0);
  return s;
}

function slabGeometry(kind, L, W, thickness, bevel) {
  const g = new THREE.ExtrudeGeometry(outlineShape(kind, L, W), {
    depth: thickness - 2 * bevel,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 22,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, bevel, 0);
  return g;
}

// Лофт: замкнутый контур (x, z) по высоте с сужением и сдвигом
function loft(outline, { height, rings = 18, segs = 120, xform }) {
  const pos = [];
  const uv = [];
  const idx = [];
  const row = segs + 1;
  for (let j = 0; j <= rings; j++) {
    const h = j / rings;
    const y = h * height;
    let acc = 0;
    let prev = null;
    for (let i = 0; i <= segs; i++) {
      const base = outline((i / segs) * Math.PI * 2);
      const [x, z] = xform(base[0], base[1], h);
      if (prev) acc += Math.hypot(base[0] - prev[0], base[1] - prev[1]);
      prev = base;
      pos.push(x, y, z);
      uv.push(acc, y);
    }
  }
  for (let j = 0; j < rings; j++) {
    for (let i = 0; i < segs; i++) {
      const a = j * row + i;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const side = new THREE.BufferGeometry();
  side.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  side.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  side.setIndex(idx);
  side.computeVertexNormals();
  const n = side.attributes.normal;
  const v = new THREE.Vector3();
  for (let j = 0; j <= rings; j++) {
    const a = j * row;
    const b = a + segs;
    v.set(n.getX(a) + n.getX(b), n.getY(a) + n.getY(b), n.getZ(a) + n.getZ(b)).normalize();
    n.setXYZ(a, v.x, v.y, v.z);
    n.setXYZ(b, v.x, v.y, v.z);
  }
  const cap = (h, y, up) => {
    const pts = [];
    for (let i = 0; i < segs; i++) {
      const base = outline((i / segs) * Math.PI * 2);
      const [x, z] = xform(base[0], base[1], h);
      pts.push(new THREE.Vector2(x, z));
    }
    const tris = THREE.ShapeUtils.triangulateShape(pts, []);
    const cp = [];
    const cn = [];
    const cu = [];
    for (const t of tris) {
      let [i0, i1, i2] = t;
      const a = pts[i0];
      const b = pts[i1];
      const c = pts[i2];
      const ny = (b.y - a.y) * (c.x - a.x) - (b.x - a.x) * (c.y - a.y);
      if (ny > 0 !== up) [i1, i2] = [i2, i1];
      for (const k of [i0, i1, i2]) {
        cp.push(pts[k].x, y, pts[k].y);
        cn.push(0, up ? 1 : -1, 0);
        cu.push(pts[k].x, pts[k].y);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(cn, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(cu, 2));
    return g;
  };
  return mergeGeometries([side.toNonIndexed(), cap(1, height, true), cap(0, 0, false)]);
}

const ellipse = (rx, rz) => (t) => [rx * Math.cos(t), rz * Math.sin(t)];
// D-образное сечение: скруглённая сторона roundSide (-1 слева, 1 справа), противоположная почти плоская
const dShape = (rx, rz, roundSide) => (t) => {
  const c = Math.cos(t);
  const s = Math.sin(t);
  const e = Math.sign(c) === roundSide ? 1 : 2 / 7;
  return [rx * Math.sign(c) * Math.pow(Math.abs(c), e), rz * Math.sign(s) * Math.pow(Math.abs(s), e === 1 ? 1 : e)];
};

function legsAtlas(L, legH) {
  const k = clamp(L / 2.4, 0.86, 1.12);
  const parts = [];
  const taper = (top) => (x, z, h) => {
    const s = lerp(1, top, h);
    return [x * s, z * s];
  };
  const g1 = loft(dShape(0.17 * k, 0.21, -1), { height: legH, xform: taper(0.86) });
  g1.translate(-0.165 * k, 0, 0.05);
  const g2 = loft(dShape(0.25 * k, 0.21, 1), { height: legH, xform: taper(0.84) });
  g2.translate(0.17 * k, 0, -0.05);
  parts.push({ geo: g1, dir: 'v' }, { geo: g2, dir: 'v' });
  return parts;
}

function legsSamurai(L, legH) {
  const k = clamp(L / 2.4, 0.86, 1.12);
  return [-1, 1].map((side) => {
    const geo = loft(ellipse(0.2 * k, 0.26), {
      height: legH,
      xform: (x, z, h) => {
        const cx = side * lerp(0.27, -0.15, h) * k;
        return [cx + x * lerp(1, 0.6, h), z * lerp(1, 0.86, h)];
      },
    });
    geo.translate(0, 0, side * 0.015);
    return { geo, dir: 'v' };
  });
}

function legsInfinity(L, legH) {
  const k = clamp(L / 2.4, 0.82, 1.15);
  const T = 0.022;
  const D = 0.12;
  const pts = [
    [-0.8, legH + 0.01], [-0.67, 0.42], [-0.54, 0.12], [-0.46, 0.02], [-0.37, 0.035],
    [-0.08, 0.22], [0.36, 0.5], [0.77, legH + 0.01],
  ].map(([x, y]) => new THREE.Vector3(x * k, y, 0));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const N = 180;
  const P = curve.getSpacedPoints(N);
  const minY = Math.min(...P.map((p) => p.y));
  const dy = T / 2 + 0.003 - minY;
  const outer = [];
  const inner = [];
  for (let i = 0; i <= N; i++) {
    const a = P[Math.max(0, i - 1)];
    const b = P[Math.min(N, i + 1)];
    const tx = b.x - a.x;
    const ty = b.y - a.y;
    const len = Math.hypot(tx, ty);
    const nx = -ty / len;
    const ny = tx / len;
    outer.push(new THREE.Vector2(P[i].x + (nx * T) / 2, P[i].y + dy + (ny * T) / 2));
    inner.push(new THREE.Vector2(P[i].x - (nx * T) / 2, P[i].y + dy - (ny * T) / 2));
  }
  const shape = new THREE.Shape([...outer, ...inner.reverse()]);
  let geo = new THREE.ExtrudeGeometry(shape, {
    depth: D, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2, steps: 1,
  });
  geo.translate(0, 0, -D / 2);
  geo = toCreasedNormals(geo, Math.PI / 5);
  const g2 = geo.clone();
  g2.scale(-1, 1, 1);
  // зеркальная копия – разворачиваем порядок вершин, чтобы нормали смотрели наружу
  const pa = g2.attributes.position;
  const na = g2.attributes.normal;
  const ua = g2.attributes.uv;
  for (let i = 0; i < pa.count; i += 3) {
    for (const attr of [pa, na, ua]) {
      const sz = attr.itemSize;
      for (let c = 0; c < sz; c++) {
        const t = attr.array[(i + 1) * sz + c];
        attr.array[(i + 1) * sz + c] = attr.array[(i + 2) * sz + c];
        attr.array[(i + 2) * sz + c] = t;
      }
    }
  }
  geo.translate(0, 0, 0.09);
  g2.translate(0, 0, -0.09);
  return [
    { geo, dir: 'h' },
    { geo: g2, dir: 'h' },
  ];
}

const LEGS = { atlas: legsAtlas, samurai: legsSamurai, infinity: legsInfinity };

// ---------- стол ----------

export class Table {
  constructor(stage) {
    this.stage = stage;
    maxAniso = stage.renderer.capabilities.getMaxAnisotropy();
    this.group = new THREE.Group();
    stage.subject.add(this.group);
    const tx = sharedTextures();
    this.tx = tx;
    this.topMat = new THREE.MeshPhysicalMaterial({ roughness: 0.2, roughnessMap: tx.grain, envMapIntensity: 0.7 });
    this.edgeMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.45 });
    this.frameMat = new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.55, metalness: 0.3 });
    this.legMatV = new THREE.MeshPhysicalMaterial({ envMapIntensity: 1.1 });
    this.legMatH = new THREE.MeshPhysicalMaterial({ envMapIntensity: 1.1 });
    this.geoKey = '';
    this.cfg = null;
  }

  async apply(cfg) {
    const { L, W } = dims(cfg);
    const veneer = cfg.top === 'veneer';
    const geoKey = [cfg.model, cfg.shape, L.toFixed(3), W.toFixed(3), veneer].join('|');
    if (geoKey !== this.geoKey) {
      this.geoKey = geoKey;
      this.build(cfg, L, W, veneer);
    }
    this.applyFinish(cfg);
    await this.applyTop(cfg, veneer);
    this.cfg = { ...cfg };
    this.stage.shadowsDirty();
  }

  build(cfg, L, W, veneer) {
    for (const m of [...this.group.children]) {
      m.geometry.dispose();
      this.group.remove(m);
    }
    const topT = veneer ? 0.032 : 0.012;
    const frameT = 0.035;
    const legH = 0.75 - topT - frameT;
    const top = new THREE.Mesh(slabGeometry(cfg.shape, L, W, topT, veneer ? 0.005 : 0.002), [this.topMat, this.edgeMat]);
    top.position.y = 0.75 - topT;
    const frame = new THREE.Mesh(slabGeometry('C', Math.max(1.1, L - 0.5), Math.max(0.6, W - 0.38), frameT, 0.002), this.frameMat);
    frame.position.y = legH;
    this.group.add(top, frame);
    for (const part of LEGS[cfg.model](L, legH)) {
      this.group.add(new THREE.Mesh(part.geo, part.dir === 'h' ? this.legMatH : this.legMatV));
    }
    this.L = L;
    this.W = W;
  }

  applyFinish(cfg) {
    const f = getFinish(cfg.finish);
    for (const [m, tex] of [
      [this.legMatV, this.tx.brushedV],
      [this.legMatH, this.tx.brushedH],
    ]) {
      const want = f.brushed ? tex : null;
      if (m.map !== want) {
        m.map = want;
        m.roughnessMap = want;
        m.needsUpdate = true;
      }
      m.color.set(f.color);
      if (f.brushed) m.color.multiplyScalar(1.12);
      m.metalness = f.metalness;
      m.roughness = f.roughness;
      m.sheen = f.id === 'velvet' ? 0.6 : 0;
      m.sheenColor.set('#a39280');
      m.sheenRoughness = 0.8;
    }
  }

  async applyTop(cfg, veneer) {
    const m = this.topMat;
    let map;
    if (veneer) {
      map = veneerTexture(cfg);
      map.repeat.set(1 / 3.2, 1 / 1.4);
      map.offset.set(0.5, 0.5);
      const g = cfg.gloss / 100;
      m.roughness = lerp(0.62, 0.06, g);
      m.clearcoat = g > 0.25 ? lerp(0.2, 1, g) : 0;
      m.clearcoatRoughness = lerp(0.3, 0.02, g);
      m.bumpMap = null;
      this.edgeMat.color.set(getVeneer(cfg.veneer).base);
    } else {
      const slab = getSlab(cfg.slab);
      map = await loadTexture(slab.img);
      map.repeat.set(1 / 2.6, 1 / 1.2);
      map.offset.set(0.5, 0.5);
      const sf = SURFACES[slab.surface];
      m.roughness = sf.roughness;
      m.clearcoat = sf.clearcoat;
      m.clearcoatRoughness = sf.clearcoatRoughness;
      const bump = sf.bump ? map : null;
      if (m.bumpMap !== bump) {
        m.bumpMap = bump;
        m.needsUpdate = true;
      }
      m.bumpScale = 2.5;
      if (!map.userData.edge) map.userData.edge = averageColor(map.image).multiplyScalar(0.82);
      this.edgeMat.color.copy(map.userData.edge);
    }
    if (m.map !== map) {
      if (!m.map) m.needsUpdate = true;
      m.map = map;
    }
    this.stage.invalidate();
  }

  // Ракурсы камеры под размер стола
  view(name) {
    const L = this.L || 2.4;
    const W = this.W || 1.2;
    const d = L * 1.6 + 1.1;
    const t = new THREE.Vector3(0, 0.4, 0);
    const at = (az, el, dist, target = t) => {
      const p = new THREE.Vector3().setFromSphericalCoords(dist, Math.PI / 2 - el, az).add(target);
      this.stage.flyTo(p, target);
    };
    const rad = THREE.MathUtils.degToRad;
    if (name === 'top') at(rad(0), rad(68), d * 0.95, new THREE.Vector3(0, 0.6, 0));
    else if (name === 'front') at(rad(0), rad(4), d * 1.02, new THREE.Vector3(0, 0.42, 0));
    else if (name === 'detail') {
      const target = new THREE.Vector3(L / 2 - 0.25, 0.55, W / 2 - 0.2);
      at(rad(52), rad(14), 1.25, target);
    } else at(rad(38), rad(21), d);
  }
}

// ---------- скульптура ----------

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function sculptureGeometry(form) {
  let g = new THREE.IcosahedronGeometry(1, form === 'crystal' ? 0 : 1);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const rand = seeded(form === 'drop' ? 11 : form === 'boulder' ? 29 : 5);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i);
    let y = p.getY(i);
    let z = p.getZ(i);
    const j = form === 'boulder' ? 0.16 : 0.07;
    x += (rand() - 0.5) * j;
    y += (rand() - 0.5) * j;
    z += (rand() - 0.5) * j;
    if (form === 'drop') {
      const h = 1 - clamp((y + 1) / 2, 0, 1);
      const s = 0.62 * Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(h, 0.72))), 0.9) + 0.04;
      x *= s * 1.25;
      z *= s * 1.25;
      y *= 1.15;
    } else if (form === 'boulder') {
      x *= 1.25;
      y *= 0.78;
      z *= 0.95;
    } else {
      y *= 1.7;
      x *= 0.75;
      z *= 0.68;
    }
    p.setXYZ(i, x, y, z);
  }
  g = g.toNonIndexed();
  g.computeVertexNormals();
  g.computeBoundingBox();
  const bb = g.boundingBox;
  const h = bb.max.y - bb.min.y;
  g.translate(0, -bb.min.y, 0);
  g.scale(1 / h, 1 / h, 1 / h);
  return g;
}

export const SCULPT_FINISHES = [
  { id: 'mirror', name: 'Зеркальная нержавейка', color: '#e9e9e9', metalness: 1, roughness: 0.04 },
  { id: 'gold', name: 'Золото', color: '#d8ae5b', metalness: 1, roughness: 0.16 },
  { id: 'graphite', name: 'Графит', color: '#2b2b2c', metalness: 0.2, roughness: 0.42 },
  { id: 'white', name: 'Белая эмаль', color: '#efede7', metalness: 0, roughness: 0.38 },
  { id: 'terracotta', name: 'Терракота', color: '#b4532f', metalness: 0, roughness: 0.5 },
];

export class Sculpture {
  constructor(stage) {
    this.stage = stage;
    this.mat = new THREE.MeshPhysicalMaterial({ flatShading: true, envMapIntensity: 1.2 });
    this.mesh = new THREE.Mesh(sculptureGeometry('drop'), this.mat);
    this.human = new THREE.Group();
    const hm = new THREE.MeshStandardMaterial({ color: 0x8d877c, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 1.18, 6, 16), hm);
    body.position.y = 0.16 + 0.59;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16), hm);
    head.position.y = 1.62;
    this.human.add(body, head);
    stage.subject.add(this.mesh, this.human);
    this.form = 'drop';
  }

  apply({ form, finish, size }) {
    if (form !== this.form) {
      this.mesh.geometry.dispose();
      this.mesh.geometry = sculptureGeometry(form);
      this.form = form;
    }
    const f = SCULPT_FINISHES.find((x) => x.id === finish) || SCULPT_FINISHES[0];
    this.mat.color.set(f.color);
    this.mat.metalness = f.metalness;
    this.mat.roughness = f.roughness;
    this.mesh.scale.setScalar(size);
    const bb = new THREE.Box3().setFromObject(this.mesh);
    this.human.position.set(bb.min.x - 0.55, 0, 0.15);
    this.stage.shadowCam.left = this.stage.shadowCam.bottom = -Math.max(2.3, size * 1.4);
    this.stage.shadowCam.right = this.stage.shadowCam.top = Math.max(2.3, size * 1.4);
    this.stage.shadowCam.far = Math.max(1, size * 0.9);
    this.stage.shadowCam.updateProjectionMatrix();
    const span = Math.max(2.3, size * 1.4) * 2;
    this.stage.shadowPlane.scale.set(span / 4.6, -1, span / 4.6);
    this.stage.shadowsDirty();
    const d = Math.max(3.2, size * 2.6 + 1.6);
    const target = new THREE.Vector3(-0.3, Math.max(0.85, size * 0.45), 0);
    const pos = new THREE.Vector3().setFromSphericalCoords(d, THREE.MathUtils.degToRad(76), THREE.MathUtils.degToRad(28)).add(target);
    this.stage.flyTo(pos, target, 650);
  }
}
