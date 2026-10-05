// Каталог прототипа: плиты, опоры, отделки, размеры, шпон и демо-формула цены.
// Цены условные – в бою подставляется прайс или формула производства.

import slabGoldenEye from '../assets/slabs/golden-eye-glitter.jpg';
import slabManaos from '../assets/slabs/manaos-green-pulido.jpg';
import slabLemurian from '../assets/slabs/lemurian-pulido.jpg';
import slabCamelot from '../assets/slabs/camelot-pulido.jpg';
import slabMetallic from '../assets/slabs/metallic-urban-matt.jpg';
import slabMineral from '../assets/slabs/mineral-stone-natural.jpg';
import slabPositano from '../assets/slabs/positano-bronzo.jpg';
import slabGlastonbury from '../assets/slabs/glastonbury-savia-matt.jpg';
import slabWacom from '../assets/slabs/wacom-forest-pulido.jpg';
import slabPandora from '../assets/slabs/pandora-pulido.jpg';
import slabElyt from '../assets/slabs/elyt-pulido.jpg';
import slabRavena from '../assets/slabs/ravena-natural.jpg';
import slabCement from '../assets/slabs/plain-cement-coffee-grey-matt.jpg';
import slabLouvreDark from '../assets/slabs/louvre-dark-grey-carving.jpg';
import slabLouvreLight from '../assets/slabs/louvre-light-grey-carving.jpg';
import slabLimestone from '../assets/slabs/limestone-beige-carving.jpg';

import renderAtlas from '../assets/renders/atlas.jpg';
import renderSamurai from '../assets/renders/samurai.jpg';
import renderInfinity from '../assets/renders/infinity.jpg';

import finBlack from '../assets/finishes/black.jpg';
import finWhite from '../assets/finishes/white.jpg';
import finVelvet from '../assets/finishes/velvet.jpg';
import finBrass from '../assets/finishes/brass.jpg';
import finBronze from '../assets/finishes/bronze.jpg';

export const SLAB_GROUPS = [
  { id: 'exclusive', name: 'Exclusive' },
  { id: 'second', name: 'Категория 2' },
];

export const SURFACES = {
  polished: { label: 'глянец', roughness: 0.14, clearcoat: 0.6, clearcoatRoughness: 0.05 },
  matt: { label: 'мат', roughness: 0.62, clearcoat: 0, clearcoatRoughness: 0 },
  carving: { label: 'рельеф', roughness: 0.7, clearcoat: 0, clearcoatRoughness: 0, bump: true },
};

export const SLABS = [
  { id: 'golden-eye-glitter', name: 'Golden Eye Glitter', group: 'exclusive', surface: 'polished', img: slabGoldenEye },
  { id: 'manaos-green-pulido', name: 'Manaos Green Pulido', group: 'exclusive', surface: 'polished', img: slabManaos },
  { id: 'lemurian-pulido', name: 'Lemurian Pulido', group: 'exclusive', surface: 'polished', img: slabLemurian },
  { id: 'camelot-pulido', name: 'Camelot Pulido', group: 'exclusive', surface: 'polished', img: slabCamelot },
  { id: 'metallic-urban-matt', name: 'Metallic Urban Matt', group: 'exclusive', surface: 'matt', img: slabMetallic },
  { id: 'mineral-stone-natural', name: 'Mineral Stone Natural', group: 'exclusive', surface: 'matt', img: slabMineral },
  { id: 'positano-bronzo', name: 'Positano Bronzo', group: 'exclusive', surface: 'matt', img: slabPositano },
  { id: 'glastonbury-savia-matt', name: 'Glastonbury Savia Matt', group: 'exclusive', surface: 'matt', img: slabGlastonbury },
  { id: 'wacom-forest-pulido', name: 'Wacom Forest Pulido', group: 'second', surface: 'polished', img: slabWacom },
  { id: 'pandora-pulido', name: 'Pandora Pulido', group: 'second', surface: 'polished', img: slabPandora },
  { id: 'elyt-pulido', name: 'Elyt Pulido', group: 'second', surface: 'polished', img: slabElyt },
  { id: 'ravena-natural', name: 'Ravena Natural', group: 'second', surface: 'matt', img: slabRavena },
  { id: 'plain-cement-coffee-grey-matt', name: 'Plain Cement Coffee Grey Matt', group: 'second', surface: 'matt', img: slabCement },
  { id: 'louvre-dark-grey-carving', name: 'Louvre Dark Grey Carving', group: 'second', surface: 'carving', img: slabLouvreDark },
  { id: 'louvre-light-grey-carving', name: 'Louvre Light Grey Carving', group: 'second', surface: 'carving', img: slabLouvreLight },
  { id: 'limestone-beige-carving', name: 'Limestone Beige Carving', group: 'second', surface: 'carving', img: slabLimestone },
];

export const MODELS = [
  { id: 'atlas', name: 'ATLAS', line: 'Две колонны из изогнутого стального листа', render: renderAtlas, base: 189000, legs: 96000 },
  { id: 'samurai', name: 'SAMURAI', line: 'Две скрещённые опоры-створки', render: renderSamurai, base: 199000, legs: 104000 },
  { id: 'infinity', name: 'INFINITY', line: 'Две ленты из стального листа, сплетённые восьмёркой', render: renderInfinity, base: 179000, legs: 88000 },
];

export const FINISHES = [
  { id: 'black', name: 'Глубокий чёрный', group: 'std', img: finBlack, color: '#151515', metalness: 0.35, roughness: 0.48 },
  { id: 'white', name: 'Белый', group: 'std', img: finWhite, color: '#e7e5e0', metalness: 0, roughness: 0.4 },
  { id: 'velvet', name: 'Серо-бежевый бархат', group: 'std', img: finVelvet, color: '#6d5f51', metalness: 0.25, roughness: 0.82 },
  { id: 'brass', name: 'Латунь брашированная', group: 'selection', img: finBrass, color: '#8e7c4d', metalness: 1, roughness: 0.42, brushed: true },
  { id: 'bronze', name: 'Бронза брашированная', group: 'selection', img: finBronze, color: '#6a4f3b', metalness: 1, roughness: 0.44, brushed: true },
];

export const SIZES = [
  { id: '200x110', L: 2.0, W: 1.1, add: 0 },
  { id: '220x110', L: 2.2, W: 1.1, add: 12000 },
  { id: '240x120', L: 2.4, W: 1.2, add: 28000 },
  { id: '260x120', L: 2.6, W: 1.2, add: 41000 },
];

export const SHAPES = [
  { id: 'A', name: 'Бочка', hint: 'длинные стороны слегка выгнуты' },
  { id: 'C', name: 'Прямоугольник', hint: 'со скруглёнными углами' },
  { id: 'O', name: 'Овал', hint: 'только шпон', veneerOnly: true },
];

export const VENEERS = [
  { id: 'oak', name: 'Дуб натуральный', rate: 38000, light: '#caa576', base: '#ac8557', dark: '#7b5834' },
  { id: 'smoked', name: 'Дуб копчёный', rate: 42000, light: '#8b6a4b', base: '#6a4c34', dark: '#3f2c1d' },
  { id: 'walnut', name: 'Орех американский', rate: 48000, light: '#8e6849', base: '#684833', dark: '#3a271a' },
  { id: 'eucalyptus', name: 'Эвкалипт', rate: 52000, light: '#a07e62', base: '#7d5d45', dark: '#4b3527' },
  { id: 'ash', name: 'Ясень белёный', rate: 40000, light: '#e9e1d3', base: '#d5c8b3', dark: '#a4927a' },
  { id: 'black-oak', name: 'Дуб чёрный', rate: 44000, light: '#4c423a', base: '#2e2823', dark: '#14110e' },
];

export const LAYOUTS = [
  { id: 'straight', name: 'Прямая', k: 1 },
  { id: 'book', name: 'Зеркальная', k: 1.12 },
  { id: 'radial', name: 'Лучами', k: 1.3 },
];

export const VENEER_LIMITS = { L: [1.6, 3.2], W: [0.8, 1.4] };

export const DEFAULT_CONFIG = {
  model: 'atlas', top: 'ceramic', slab: 'golden-eye-glitter', shape: 'A', size: '240x120',
  finish: 'brass', veneer: 'oak', layout: 'radial', gloss: 20, L: 2.8, W: 1.2,
};

const byId = (list, id) => list.find((x) => x.id === id) || list[0];
export const getModel = (id) => byId(MODELS, id);
export const getSlab = (id) => byId(SLABS, id);
export const getFinish = (id) => byId(FINISHES, id);
export const getSize = (id) => byId(SIZES, id);
export const getVeneer = (id) => byId(VENEERS, id);
export const getLayout = (id) => byId(LAYOUTS, id);

export function glossLabel(g) {
  if (g <= 25) return 'матовый';
  if (g <= 50) return 'полуматовый';
  if (g <= 75) return 'полуглянцевый';
  return 'глянцевый';
}

// Площадь столешницы, м²
function area(shape, L, W) {
  if (shape === 'O') return (Math.PI * L * W) / 4;
  if (shape === 'A') return L * W * 0.96;
  return L * W - (4 - Math.PI) * 0.1 * 0.1;
}

const round1000 = (x) => Math.round(x / 1000) * 1000;

export function dims(cfg) {
  if (cfg.top === 'veneer') return { L: cfg.L, W: cfg.W };
  const s = getSize(cfg.size);
  return { L: s.L, W: s.W };
}

export function price(cfg) {
  const m = getModel(cfg.model);
  const f = getFinish(cfg.finish);
  const finishAdd = f.group === 'selection' ? 18000 : 0;
  if (cfg.top === 'ceramic') {
    const s = getSize(cfg.size);
    const slab = getSlab(cfg.slab);
    const slabAdd = slab.group === 'exclusive' ? 24000 : 0;
    const lines = [
      [`Стол ${m.name}, ${s.id.replace('x', ' × ')} см`, m.base + s.add],
      [`Плита ${slab.name}`, slabAdd],
      [`Опора: ${f.name.toLowerCase()}`, finishAdd],
    ];
    return { total: lines.reduce((a, l) => a + l[1], 0), lines, term: 'около 30 дней', exact: true };
  }
  const v = getVeneer(cfg.veneer);
  const lay = getLayout(cfg.layout);
  const glossK = cfg.gloss > 75 ? 1.18 : cfg.gloss > 50 ? 1.1 : cfg.gloss > 25 ? 1.04 : 1;
  const topPrice = round1000(area(cfg.shape, cfg.L, cfg.W) * v.rate * lay.k * glossK);
  const lines = [
    [`Опора ${m.name}`, m.legs],
    [`Столешница ${Math.round(cfg.L * 100)} × ${Math.round(cfg.W * 100)} см, ${v.name.toLowerCase()}`, topPrice],
    [`Раскладка: ${lay.name.toLowerCase()}, лак ${glossLabel(cfg.gloss)}`, 0],
    [`Опора: ${f.name.toLowerCase()}`, finishAdd],
  ];
  return { total: lines.reduce((a, l) => a + l[1], 0), lines, term: 'срок назовём при расчёте', exact: false };
}

export function minPrice(modelId) {
  return getModel(modelId).base;
}

export const rub = (n) => n.toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₽';
