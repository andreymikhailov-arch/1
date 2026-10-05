// Главная: тёмный бетонный зал, стол на подиуме под лучом света,
// вокруг – светящиеся каркасы категорий 01–04.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Table, sculptureGeometry } from './scene.js';
import { concreteCanvas } from './textures.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const PLINTH_H = 0.36;
const GLOW = new THREE.Color('#ffcf9a');
const GLOW_LAYER = 1;

// ---------- каркасы ----------

// Сетка по параметрической поверхности: линии вдоль и поперёк
function gridLines(fn, nu, nv, su = 48, sv = 24) {
  const pts = [];
  const p = new THREE.Vector3();
  const q = new THREE.Vector3();
  for (let i = 0; i <= nu; i++) {
    const u = i / nu;
    for (let j = 0; j < sv; j++) {
      fn(u, j / sv, p);
      fn(u, (j + 1) / sv, q);
      pts.push(p.x, p.y, p.z, q.x, q.y, q.z);
    }
  }
  for (let j = 0; j <= nv; j++) {
    const v = j / nv;
    for (let i = 0; i < su; i++) {
      fn(i / su, v, p);
      fn((i + 1) / su, v, q);
      pts.push(p.x, p.y, p.z, q.x, q.y, q.z);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

function profileSurface(points, width) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(x, y, 0)));
  return (u, v, target) => {
    const c = curve.getPoint(u);
    const bulge = Math.sin(v * Math.PI) * 0.04;
    target.set(c.x, c.y - bulge, (v - 0.5) * width);
  };
}

function chaiseWire() {
  const surf = profileSurface([[-1, 0.95], [-0.78, 0.62], [-0.45, 0.36], [0, 0.3], [0.38, 0.44], [0.62, 0.36], [1, 0.12]], 0.62);
  const g = gridLines(surf, 26, 9);
  g.translate(0, -0.45, 0);
  return g;
}

function chairWire() {
  const surf = profileSurface([[0.42, 0.42], [0.1, 0.46], [-0.26, 0.44], [-0.36, 0.7], [-0.38, 1.02]], 0.56);
  const seat = gridLines(surf, 16, 8);
  const legs = [];
  for (const [x, z] of [[0.36, 0.24], [0.36, -0.24], [-0.3, 0.24], [-0.3, -0.24]]) {
    legs.push(x, 0.44, z, x * 1.08, 0, z * 1.12);
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(legs, 3));
  const g = mergeGeometries([seat, lg]);
  g.translate(0, -0.5, 0);
  return g;
}

function tableWire() {
  const parts = [];
  const top = new THREE.EdgesGeometry(new THREE.BoxGeometry(2, 0.04, 1));
  top.translate(0, 0.74, 0);
  parts.push(top);
  // X-образные опоры
  for (const s of [-1, 1]) {
    const leg = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.06, 1.0, 0.06));
    leg.rotateZ(s * 0.72);
    leg.translate(0, 0.36, 0.18);
    parts.push(leg);
    const leg2 = leg.clone();
    leg2.translate(0, 0, -0.36);
    parts.push(leg2);
  }
  const g = mergeGeometries(parts);
  g.translate(0, -0.38, 0);
  return g;
}

function sculptureWire() {
  const g = new THREE.EdgesGeometry(sculptureGeometry('boulder'), 1);
  g.scale(1.25, 1.25, 1.25);
  g.translate(0, -0.6, 0);
  return g;
}

export const HALL_ITEMS = [
  { n: '01', name: 'Мягкая мебель', href: '#/soft', make: chaiseWire },
  { n: '02', name: 'Столы', href: '#/tables', make: tableWire },
  { n: '03', name: 'Полигональные скульптуры', href: '#/sculptures', make: sculptureWire },
  { n: '04', name: 'Стулья и кресла', href: '#/chairs', make: chairWire },
];

function plinthLabel() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.font = '300 54px Jost, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd9ad';
  ctx.letterSpacing = '12px';
  ctx.fillText('IDODOM  |  СТОЛЫ', 512, 66);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- зал ----------

export class Hall {
  constructor(container, labels) {
    this.container = container;
    this.labels = labels;
    const r = new THREE.WebGLRenderer({ antialias: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    container.prepend(r.domElement);
    this.renderer = r;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b0a09');
    scene.fog = new THREE.Fog('#0b0a09', 9, 22);
    const pmrem = new THREE.PMREMGenerator(r);
    this.envTex = pmrem.fromScene(new RoomEnvironment(r), 0.04).texture;
    scene.environment = this.envTex;
    pmrem.dispose();
    this.scene = scene;

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
    this.target = new THREE.Vector3(0, 0.95, 0);

    this.buildRoom();

    // стол на подиуме – тот же генератор, что в конфигураторе
    this.subject = new THREE.Group();
    this.subject.position.y = PLINTH_H;
    scene.add(this.subject);
    this.table = new Table(this);
    this.table.topMat.envMapIntensity = 0.45;

    this.wires = HALL_ITEMS.map((item) => {
      const mat = new THREE.LineBasicMaterial({ color: GLOW, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
      const geo = item.make();
      const obj = new THREE.LineSegments(geo, mat);
      const refl = new THREE.LineSegments(geo, mat.clone());
      refl.material.opacity = 0.16;
      refl.scale.y = -1;
      obj.layers.enable(GLOW_LAYER);
      scene.add(obj, refl);
      return { obj, refl, phase: Math.random() * Math.PI * 2 };
    });

    this.initGlow();

    this.mouse = new THREE.Vector2();
    this.onMove = (e) => {
      const b = container.getBoundingClientRect();
      this.mouse.set(((e.clientX - b.left) / b.width) * 2 - 1, ((e.clientY - b.top) / b.height) * 2 - 1);
    };
    window.addEventListener('pointermove', this.onMove);
    this.visible = true;
    this.io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; });
    this.io.observe(container);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
    this.clock = new THREE.Clock();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  // Свечение каркасов: рендер только светящегося слоя в малую текстуру, размытие, сложение поверх кадра.
  // Своё, без UnrealBloomPass – тот на части видеокарт даёт артефакты.
  initGlow() {
    const opts = { type: THREE.HalfFloatType };
    this.glowA = new THREE.WebGLRenderTarget(4, 4, opts);
    this.glowB = new THREE.WebGLRenderTarget(4, 4, opts);
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.hBlur = new THREE.ShaderMaterial(HorizontalBlurShader);
    this.vBlur = new THREE.ShaderMaterial(VerticalBlurShader);
    this.addMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, strength: { value: 0.95 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform sampler2D tDiffuse; uniform float strength; varying vec2 vUv; void main() { gl_FragColor = vec4(min(texture2D(tDiffuse, vUv).rgb * strength, vec3(1.0)), 1.0); }',
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      toneMapped: false,
    });
    for (const m of [this.hBlur, this.vBlur]) {
      m.depthTest = false;
      m.depthWrite = false;
    }
  }

  blurPass(src, dst, mat, key, amount) {
    mat.uniforms.tDiffuse.value = src.texture;
    mat.uniforms[key].value = amount;
    this.quad.material = mat;
    this.renderer.setRenderTarget(dst);
    this.renderer.render(this.quad, this.quadCam);
  }

  renderFrame() {
    const r = this.renderer;
    const bg = this.scene.background;
    this.scene.background = null;
    this.camera.layers.set(GLOW_LAYER);
    r.setRenderTarget(this.glowA);
    r.setClearColor(0x000000, 1);
    r.clear();
    r.render(this.scene, this.camera);
    this.camera.layers.enableAll();
    this.scene.background = bg;
    const w = this.glowA.width;
    const h = this.glowA.height;
    for (const k of [1.1, 2.0]) {
      this.blurPass(this.glowA, this.glowB, this.hBlur, 'h', k / w);
      this.blurPass(this.glowB, this.glowA, this.vBlur, 'v', k / h);
    }
    r.setRenderTarget(null);
    r.render(this.scene, this.camera);
    r.autoClear = false;
    this.addMat.uniforms.tDiffuse.value = this.glowA.texture;
    this.quad.material = this.addMat;
    r.render(this.quad, this.quadCam);
    r.autoClear = true;
  }

  // интерфейс, который ждёт Table
  invalidate() {}
  shadowsDirty() {
    this.subject.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }

  buildRoom() {
    const s = this.scene;
    const ct = new THREE.CanvasTexture(concreteCanvas());
    ct.colorSpace = THREE.SRGBColorSpace;
    ct.wrapS = ct.wrapT = THREE.RepeatWrapping;
    const concrete = (rx, ry, color) => {
      const t = ct.clone();
      t.needsUpdate = true;
      t.repeat.set(rx, ry);
      return new THREE.MeshStandardMaterial({ map: t, color, roughness: 0.92, envMapIntensity: 0.15 });
    };
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: '#141210', roughness: 0.32, metalness: 0.4, envMapIntensity: 0.25 }),
    );
    floor.receiveShadow = true;
    floor.renderOrder = -1;
    floor.material.depthWrite = false;
    s.add(floor);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), concrete(8, 2.4, '#3a3632'));
    wall.position.set(0, 6, -5.6);
    s.add(wall);
    const colMat = concrete(1, 4, '#4a4540');
    for (const x of [-6.8, -4.4, -2.2, 2.2, 4.4, 6.8]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.95, 9, 0.95), colMat);
      col.position.set(x, 4.5, -4.2);
      s.add(col);
      if (Math.abs(x) < 5) {
        const up = new THREE.SpotLight('#ffb36b', 26, 9, 0.32, 0.85, 1.4);
        up.position.set(x, 0.05, -3.55);
        up.target.position.set(x, 5, -3.9);
        s.add(up, up.target);
        const dot = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.025), new THREE.MeshBasicMaterial({ color: '#b98d5c' }));
        dot.position.set(x, 0.03, -3.7);
        s.add(dot);
      }
    }
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(3.3, PLINTH_H, 1.9),
      new THREE.MeshStandardMaterial({ color: '#1b1917', roughness: 0.45, metalness: 0.2, envMapIntensity: 0.3 }),
    );
    plinth.position.y = PLINTH_H / 2;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    s.add(plinth);
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.2),
      new THREE.MeshBasicMaterial({ map: plinthLabel(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    label.position.set(0, PLINTH_H * 0.5, 0.951);
    label.layers.enable(GLOW_LAYER);
    s.add(label);

    const key = new THREE.SpotLight('#fff1df', 70, 14, 0.42, 0.75, 1.2);
    key.position.set(0.6, 6.2, 2.6);
    key.target.position.set(0, PLINTH_H, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.radius = 6;
    s.add(key, key.target);
    s.add(new THREE.HemisphereLight('#4a4038', '#0a0908', 0.5));
  }

  async show(cfg) {
    await this.table.apply(cfg);
    this.shadowsDirty();
  }

  // Раскладка под пропорции экрана: на телефоне верхний ряд над подиумом, нижний – на переднем плане, как в видео
  layout() {
    const cam = this.camera;
    const portrait = cam.aspect < 0.9;
    cam.fov = portrait ? 44 : 32;
    cam.updateProjectionMatrix();
    const tan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    this.dist = Math.max(7.4, 3.5 / (portrait ? 0.98 : 0.8) / 2 / (tan * cam.aspect));
    cam.position.set(0, 1.55, this.dist);
    cam.lookAt(this.target);
    cam.updateMatrixWorld();
    const spots = portrait
      ? [[-0.5, 0.26, 0.4], [0.5, 0.26, 0.4], [-0.5, -0.6, 2.6], [0.5, -0.6, 2.6]]
      : [[-0.66, 0.36, 1.0], [0.66, 0.36, 1.0], [-0.68, -0.48, 1.9], [0.68, -0.48, 1.9]];
    const ray = new THREE.Raycaster();
    this.wires.forEach((w, i) => {
      const [nx, ny, z] = spots[i];
      ray.setFromCamera(new THREE.Vector2(nx, ny), cam);
      const t = (z - ray.ray.origin.z) / ray.ray.direction.z;
      const p = ray.ray.at(t, new THREE.Vector3());
      const span = 2 * tan * (this.dist - z) * cam.aspect;
      const size = THREE.MathUtils.clamp(span * (portrait ? 0.22 : 0.095), 0.4, 1.1);
      w.base = new THREE.Vector3(p.x, Math.max(0.62 * size, p.y), z);
      w.obj.scale.setScalar(size);
      w.refl.scale.set(size, -size, size);
      // отражение только у предметов на переднем плане, у парящих оно уходит вниз кадра
      w.refl.visible = w.base.y < 1.0;
    });
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.glowA.setSize(Math.ceil(w / 3), Math.ceil(h / 3));
    this.glowB.setSize(Math.ceil(w / 3), Math.ceil(h / 3));
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.layout();
  }

  loop() {
    this.raf = requestAnimationFrame(this.loop);
    if (!this.visible) return;
    const t = this.clock.getElapsedTime();
    const m = reduceMotion ? new THREE.Vector2() : this.mouse;
    this.camera.position.set(m.x * 0.3, 1.55 - m.y * 0.12, this.dist);
    this.camera.lookAt(this.target);
    const v = new THREE.Vector3();
    this.wires.forEach((w, i) => {
      const spin = reduceMotion ? 0.5 : t * 0.25 + w.phase;
      w.obj.rotation.y = spin;
      w.refl.rotation.y = spin;
      const bob = reduceMotion ? 0 : Math.sin(t * 0.8 + w.phase) * 0.05;
      w.obj.position.set(w.base.x, w.base.y + bob, w.base.z);
      w.refl.position.set(w.base.x, -(w.base.y + bob), w.base.z);
      // подпись следует за объектом
      const el = this.labels[i];
      if (el) {
        v.set(w.base.x, w.base.y + w.obj.scale.y * 0.55, w.base.z).project(this.camera);
        el.style.transform = `translate(${((v.x + 1) / 2) * this.container.clientWidth}px, ${((1 - v.y) / 2) * this.container.clientHeight}px)`;
      }
    });
    this.subject.rotation.y = reduceMotion ? -0.35 : -0.35 + Math.sin(t * 0.15) * 0.25;
    this.renderFrame();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('pointermove', this.onMove);
    this.io.disconnect();
    this.ro.disconnect();
    this.scene.traverse((o) => o.geometry?.dispose());
    this.glowA.dispose();
    this.glowB.dispose();
    this.envTex.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
