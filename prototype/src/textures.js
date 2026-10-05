// Процедурные текстуры: шпон (прямая, зеркальная, лучами), брашированный металл, микрорельеф керамики.
// В бою шпон заменяется сканами образцов, но раскладка листов остаётся этой логикой.

const TABLE = 256;
let noise = null;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Бесшовный value-noise fbm, считается один раз
function noiseTable() {
  if (noise) return noise;
  const rand = rng(1337);
  const out = new Float32Array(TABLE * TABLE);
  let amp = 1;
  let sum = 0;
  for (let o = 0; o < 5; o++) {
    const P = 4 << o;
    const lat = new Float32Array(P * P).map(() => rand());
    for (let y = 0; y < TABLE; y++) {
      const v = (y / TABLE) * P;
      const j0 = Math.floor(v);
      const j1 = (j0 + 1) % P;
      let fv = v - j0;
      fv = fv * fv * (3 - 2 * fv);
      for (let x = 0; x < TABLE; x++) {
        const u = (x / TABLE) * P;
        const i0 = Math.floor(u);
        const i1 = (i0 + 1) % P;
        let fu = u - i0;
        fu = fu * fu * (3 - 2 * fu);
        const a = lat[j0 * P + i0] + (lat[j0 * P + i1] - lat[j0 * P + i0]) * fu;
        const b = lat[j1 * P + i0] + (lat[j1 * P + i1] - lat[j1 * P + i0]) * fu;
        out[y * TABLE + x] += amp * (a + (b - a) * fv);
      }
    }
    sum += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= sum;
  noise = out;
  return out;
}

// Выборка шума, координаты в периодах таблицы
function n2(x, y) {
  const t = noise;
  x = (x - Math.floor(x)) * TABLE;
  y = (y - Math.floor(y)) * TABLE;
  const i0 = x | 0;
  const j0 = y | 0;
  const i1 = (i0 + 1) & (TABLE - 1);
  const j1 = (j0 + 1) & (TABLE - 1);
  const fx = x - i0;
  const fy = y - j0;
  const a = t[j0 * TABLE + i0] + (t[j0 * TABLE + i1] - t[j0 * TABLE + i0]) * fx;
  const b = t[j1 * TABLE + i0] + (t[j1 * TABLE + i1] - t[j1 * TABLE + i0]) * fx;
  return a + (b - a) * fy;
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const veneerCache = new Map();

// Холст со шпоном. Lm×Wm – размер покрываемой области в метрах, центр раскладки в центре холста.
export function veneerCanvas(v, layout, { Lm = 3.2, Wm = 1.4, width = 1600, wedges = 14 } = {}) {
  const key = [v.id, layout, Lm, Wm, width].join('|');
  if (veneerCache.has(key)) return veneerCache.get(key);
  noiseTable();
  const w = width;
  const h = Math.round((width * Wm) / Lm);
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const L = hex(v.light);
  const B = hex(v.base);
  const D = hex(v.dark);
  const leaf = 0.19;
  const step = (Math.PI * 2) / wedges;
  const cs = [];
  const sn = [];
  for (let k = 0; k < wedges; k++) {
    const phi = -Math.PI + (k + 0.5) * step;
    cs.push(Math.cos(phi));
    sn.push(Math.sin(phi));
  }
  const seamW = Math.max(0.0012, (Lm / w) * 0.9);
  let p = 0;
  for (let py = 0; py < h; py++) {
    const Y = (0.5 - (py + 0.5) / h) * Wm;
    for (let px = 0; px < w; px++) {
      const X = ((px + 0.5) / w - 0.5) * Lm;
      let gu;
      let gv;
      let id;
      let seam;
      if (layout === 'radial') {
        const th = Math.atan2(Y, X) + Math.PI;
        const k = Math.min(wedges - 1, Math.floor(th / step));
        gu = X * cs[k] + Y * sn[k];
        gv = -X * sn[k] + Y * cs[k];
        if (k & 1) gv = -gv;
        const r = Math.hypot(X, Y);
        seam = r * Math.min(th - k * step, (k + 1) * step - th);
        id = k >> 1;
        if (r < 0.006) seam = 0;
      } else {
        const yy = Y + Wm / 2;
        const k = Math.floor(yy / leaf);
        let local = yy - k * leaf;
        seam = Math.min(local, leaf - local);
        if (layout === 'book' && k & 1) local = leaf - local;
        gu = X;
        gv = local;
        id = layout === 'book' ? k >> 1 : k;
      }
      const o = hash(id + 1) * 7.3;
      const warp = n2(gu * 0.45 + o, gv * 3.5 + o) - 0.5;
      const t = gv * 105 + warp * 7 + (n2(gu * 0.12 + o, gv * 0.9) - 0.5) * 4;
      const f = t - Math.floor(t);
      const late = Math.pow(Math.sin(f * Math.PI), 10);
      const tone = Math.min(1, Math.max(0, (n2(gu * 0.3 + o, gv * 2.2 + o) - 0.25) * 1.9));
      const pore = n2(gu * 5 + o, gv * 55) > 0.7 ? 0.22 : 0;
      const leafTone = 1 + (hash(id + 11) - 0.5) * 0.09;
      let dk = Math.min(1, late * 0.45 + pore);
      let shade = leafTone;
      if (seam < seamW) shade *= 0.8;
      for (let c = 0; c < 3; c++) {
        const base = L[c] + (B[c] - L[c]) * tone;
        d[p + c] = Math.max(0, Math.min(255, (base + (D[c] - base) * dk) * shade));
      }
      d[p + 3] = 255;
      p += 4;
    }
  }
  ctx.putImageData(img, 0, 0);
  veneerCache.set(key, cv);
  return cv;
}

export function brushedCanvas(vertical = true) {
  const s = 512;
  const cv = document.createElement('canvas');
  cv.width = s;
  cv.height = s;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = 'rgb(222,222,222)';
  ctx.fillRect(0, 0, s, s);
  const rand = rng(vertical ? 21 : 42);
  for (let i = 0; i < 3400; i++) {
    const x = rand() * s;
    const tone = rand() < 0.5 ? 255 : 120;
    ctx.strokeStyle = `rgba(${tone},${tone},${tone},${rand() * 0.24})`;
    ctx.lineWidth = rand() * 1.8 + 0.3;
    ctx.beginPath();
    if (vertical) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, s);
    } else {
      ctx.moveTo(0, x);
      ctx.lineTo(s, x);
    }
    ctx.stroke();
  }
  return cv;
}

export function grainCanvas() {
  const s = 256;
  const cv = document.createElement('canvas');
  cv.width = s;
  cv.height = s;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(s, s);
  const rand = rng(5);
  for (let i = 0; i < s * s; i++) {
    const g = 205 + rand() * 50;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = g;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

// Мелкая минеральная структура камня: добавляет резкости поверх фото плиты
export function detailCanvas() {
  noiseTable();
  const s = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(s, s);
  const rand = rng(77);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const u = x / s;
      const v = y / s;
      let n = n2(u * 4, v * 4) * 0.55 + n2(u * 8 + 0.3, v * 8 + 0.7) * 0.3 + rand() * 0.15;
      n = Math.max(0, Math.min(1, (n - 0.5) * 2.2 + 0.5));
      const i = (y * s + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = n * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

// Бетон: крупные разводы, мелкая пористость и редкие раковины
export function concreteCanvas() {
  noiseTable();
  const s = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(s, s);
  const rand = rng(91);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const u = x / s;
      const v = y / s;
      let n = 0.55 + (n2(u, v) - 0.5) * 0.5 + (n2(u * 4 + 0.2, v * 4 + 0.9) - 0.5) * 0.25 + (rand() - 0.5) * 0.12;
      if (rand() > 0.9985) n *= 0.55;
      const g = Math.max(0, Math.min(255, n * 255));
      const i = (y * s + x) * 4;
      img.data[i] = g;
      img.data[i + 1] = g * 0.985;
      img.data[i + 2] = g * 0.96;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}
