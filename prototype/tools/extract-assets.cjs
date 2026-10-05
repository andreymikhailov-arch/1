// Нарезка ассетов прототипа из страниц каталога (jpg 1280px).
// Запуск: node tools/extract-assets.cjs <папка_с_картинками_каталога>
// 1.jpg – плиты керамогранита, 2.jpg – INFINITY, 3.jpg – карта цветов металла, 4.jpg – SAMURAI, 5.jpg – ATLAS
const path = require('path');
const sharp = require('sharp');

const SRC = process.argv[2] || path.join(__dirname, '../../catalog');
const OUT = path.join(__dirname, '../assets');

const slabColumns = [85, 233, 381, 529, 686, 834, 982, 1130];
const slabRows = [90, 462];
const SW = 136, SH = 295;
const slabIds = [
  'golden-eye-glitter', 'manaos-green-pulido', 'lemurian-pulido', 'camelot-pulido',
  'wacom-forest-pulido', 'pandora-pulido', 'elyt-pulido', 'ravena-natural',
  'metallic-urban-matt', 'mineral-stone-natural', 'positano-bronzo', 'glastonbury-savia-matt',
  'plain-cement-coffee-grey-matt', 'louvre-dark-grey-carving', 'louvre-light-grey-carving', 'limestone-beige-carving',
];

const renders = {
  atlas: { file: '5.jpg', left: 120, top: 395, width: 1060, height: 380 },
  samurai: { file: '4.jpg', left: 115, top: 400, width: 1060, height: 370 },
  infinity: { file: '2.jpg', left: 85, top: 395, width: 1110, height: 360 },
};

const finishes = {
  black: { left: 140, top: 190 }, white: { left: 560, top: 190 }, velvet: { left: 985, top: 190 },
  brass: { left: 140, top: 600 }, bronze: { left: 563, top: 600 }, copper: { left: 985, top: 600 },
};

(async () => {
  let i = 0;
  for (const top of slabRows) {
    for (const left of slabColumns) {
      const id = slabIds[i++];
      // внутренний прямоугольник без скруглений формы A, поворот в горизонталь (плита 2,6×1,2 м)
      // в два шага: в одном конвейере sharp применяет rotate раньше extract
      const crop = await sharp(path.join(SRC, '1.jpg'))
        .extract({ left: left + 9, top: top + 20, width: SW - 18, height: SH - 40 })
        .toBuffer();
      await sharp(crop)
        .rotate(90)
        .resize(1536, 709, { kernel: 'lanczos3' })
        .sharpen({ sigma: 1.2, m1: 0.6, m2: 1.4 })
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(path.join(OUT, 'slabs', id + '.jpg'));
    }
  }
  for (const [id, r] of Object.entries(renders)) {
    await sharp(path.join(SRC, r.file)).extract(r).jpeg({ quality: 84, mozjpeg: true })
      .toFile(path.join(OUT, 'renders', id + '.jpg'));
  }
  for (const [id, f] of Object.entries(finishes)) {
    await sharp(path.join(SRC, '3.jpg')).extract({ ...f, width: 200, height: 200 })
      .resize(160, 160).jpeg({ quality: 82, mozjpeg: true })
      .toFile(path.join(OUT, 'finishes', id + '.jpg'));
  }
  console.log('ok');
})();
