import {
  SLABS, SLAB_GROUPS, SURFACES, MODELS, FINISHES, SIZES, SHAPES, VENEERS, LAYOUTS, VENEER_LIMITS, DEFAULT_CONFIG,
  getModel, getSlab, getFinish, getVeneer, getLayout, glossLabel, price, minPrice, rub,
} from './data.js';
import { veneerCanvas } from './textures.js';

const app = document.getElementById('app');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
let stage = null;
let priceMode = 'exact';
try { priceMode = localStorage.getItem('idodom-price-mode') || 'exact'; } catch {}

// Сцена грузится лениво, чтобы главная открывалась мгновенно
const loadScene = () => import('./scene.js');

const slabMask = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M14 0 H86 Q97 0 97.6 9 Q100 50 97.6 91 Q97 100 86 100 H14 Q3 100 2.4 91 Q0 50 2.4 9 Q3 0 14 0Z"/></svg>',
)}")`;
document.documentElement.style.setProperty('--slab-mask', slabMask);

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('is-on'), 2600);
}

function openLead(title, cfgText) {
  $('#lead-title').textContent = title;
  $('#lead-cfg').textContent = cfgText || '';
  $('#lead').showModal();
}
$('#lead').addEventListener('close', () => {
  if ($('#lead').returnValue === 'ok') toast('Спасибо! В прототипе заявка никуда не уходит.');
});

function priceText(total, model) {
  if (priceMode === 'from') return `от ${rub(minPrice(model))}`;
  if (priceMode === 'request') return 'Цена по запросу';
  return rub(total);
}

// ---------- общие блоки ----------

const slabWall = () => `
  <section class="wall" id="slabs">
    <div class="wall__head">
      <h2>16 плит керамогранита</h2>
      <p>Столешница вырезается из плиты 2,6 × 1,2 м. Нажмите на плиту – она ляжет на стол в конфигураторе.</p>
    </div>
    ${SLAB_GROUPS.map((g) => `
      <div class="wall__group">
        <h3>${g.name}</h3>
        <div class="wall__row">
          ${SLABS.filter((s) => s.group === g.id).map((s) => `
            <a class="slab" href="#/table/atlas?slab=${s.id}" aria-label="${s.name}">
              <span class="slab__img" style="background-image:url(${s.img})"></span>
              <span class="slab__name">${s.name}</span>
              <span class="slab__meta">${SURFACES[s.surface].label}</span>
            </a>`).join('')}
        </div>
      </div>`).join('')}
  </section>`;

const modelList = () => `
  <section class="models" id="models">
    <h2 class="sr-only">Модели</h2>
    <ol class="models__list">
      ${MODELS.map((m, i) => `
        <li class="model${i === 0 ? ' is-active' : ''}" data-i="${i}">
          <a href="#/table/${m.id}">
            <span class="model__num">0${i + 1}</span>
            <span class="model__name">${m.name}</span>
            <span class="model__line">${m.line}</span>
            <span class="model__price">${priceMode === 'request' ? 'цена по запросу' : 'от ' + rub(m.base)}</span>
            <img class="model__img" src="${m.render}" alt="Стол ${m.name}" loading="lazy">
          </a>
        </li>`).join('')}
    </ol>
    <figure class="models__preview" aria-hidden="true">
      ${MODELS.map((m, i) => `<img src="${m.render}" alt="" class="${i === 0 ? 'is-on' : ''}" data-i="${i}">`).join('')}
    </figure>
  </section>`;

const veneerBlock = () => `
  <section class="veneer">
    <div class="veneer__visual"><canvas id="veneer-art" width="1400" height="600"></canvas></div>
    <div class="veneer__copy">
      <h2>Шпон – любой размер до 3,2 × 1,4 м</h2>
      <p>Те же опоры, столешница по вашим размерам. Раскладка прямая, зеркальная или лучами, тонировка, лак от матового до глянца.</p>
      <a class="btn btn--line" href="#/table/samurai?top=veneer">Рассчитать стол из шпона</a>
      <p class="veneer__note">Спечённый камень любого цвета и размера и опоры по эскизу – под заказ.</p>
    </div>
  </section>`;

const remoteSteps = () => `
  <section class="remote" id="remote">
    <h2>Заказ без приезда в шоурум</h2>
    <ol class="remote__steps">
      <li><b>Видеозвонок</b><span>Покажем плиты и опоры вживую из шоурума.</span></li>
      <li><b>Образцы</b><span>Привезём фрагменты плит и шпона домой.</span></li>
      <li><b>Расчёт и договор</b><span>Фиксируем конфигурацию, цену и срок.</span></li>
      <li><b>Производство</b><span>Фотоотчёт с каждого этапа.</span></li>
      <li><b>Доставка и сборка</b><span>По Москве и по России.</span></li>
    </ol>
  </section>`;

function drawVeneerArt() {
  const c = $('#veneer-art');
  if (!c) return;
  requestAnimationFrame(() => {
    const src = veneerCanvas(getVeneer('oak'), 'radial', { Lm: 2.8, Wm: 1.2, width: 1400 });
    const ctx = c.getContext('2d');
    ctx.drawImage(src, 0, 0, c.width, c.height);
    c.classList.add('is-on');
  });
}

function bindModels() {
  $$('.model').forEach((li) => {
    const on = () => {
      $$('.model').forEach((x) => x.classList.toggle('is-active', x === li));
      $$('.models__preview img').forEach((img) => img.classList.toggle('is-on', img.dataset.i === li.dataset.i));
    };
    li.addEventListener('mouseenter', on);
    li.addEventListener('focusin', on);
  });
}

// ---------- страницы ----------

function pageHome() {
  const picks = ['golden-eye-glitter', 'manaos-green-pulido', 'camelot-pulido', 'wacom-forest-pulido', 'pandora-pulido', 'elyt-pulido', 'ravena-natural', 'plain-cement-coffee-grey-matt'];
  app.innerHTML = `
    <section class="hero">
      <div class="hero__copy">
        <h1>Обеденные столы из керамогранита и шпона</h1>
        <p class="lead">Плита, опора, форма и размер – собираете сами и сразу видите цену. Делаем около месяца.</p>
        <div class="hero__actions">
          <a class="btn btn--primary" id="hero-cta" href="#/table/atlas">Собрать стол</a>
          <a class="link" href="#models">Все модели</a>
        </div>
        <div class="hero__pick">
          <p class="hero__pick-label">Примерьте плиту <span id="hero-slab">${getSlab(picks[0]).name}</span></p>
          <div class="hero__slabs">
            ${picks.map((id, i) => `<button type="button" class="hero__slab${i === 0 ? ' is-on' : ''}" data-slab="${id}" aria-label="${getSlab(id).name}" style="background-image:url(${getSlab(id).img})"></button>`).join('')}
          </div>
        </div>
      </div>
      <div class="hero__stage" id="hero-stage"></div>
      <p class="hero__math"><span>16 плит</span> × <span>3 опоры</span> × <span>5 отделок</span> × <span>4 размера</span> × <span>2 формы</span> = <b>1 920 столов</b></p>
    </section>
    ${modelList()}
    ${slabWall()}
    ${veneerBlock()}
    <section class="cats">
      <a class="cat cat--wide" href="#/sculptures">
        <span class="cat__name">Полигональные скульптуры</span>
        <span class="cat__text">Для интерьера, сада и города. Делаем по каталогу форм и по вашему эскизу, вместе с малыми архитектурными формами.</span>
      </a>
      <a class="cat" href="#/soft"><span class="cat__name">Мягкая мебель</span><span class="cat__text">Кожа и ткань, модульные диваны.</span></a>
      <a class="cat" href="#/beds"><span class="cat__name">Кровати</span><span class="cat__text">С мягким изголовьем, под размер.</span></a>
      <a class="cat" href="#/chairs"><span class="cat__name">Стулья</span><span class="cat__text">В пару к столам.</span></a>
    </section>
    ${remoteSteps()}
    <section class="pro">
      <div><h2>Дизайнерам</h2><p>3D-модели столов для визуализаций, образцы материалов, отдельные условия.</p><button class="link" data-lead="Сотрудничество для дизайнеров">Запросить условия</button></div>
      <div><h2>Застройщикам и ландшафтным бюро</h2><p>Городские скульптуры и МАФ: от эскиза до монтажа на объекте.</p><button class="link" data-lead="Проект для застройщика">Отправить ТЗ</button></div>
    </section>`;
  bindModels();
  drawVeneerArt();
  initHero(picks);
}

async function initHero(picks) {
  const el = document.getElementById('hero-stage');
  const { Stage, Table } = await loadScene();
  if (!document.body.contains(el)) return;
  stage = new Stage(el);
  const table = new Table(stage);
  let cfg = { ...DEFAULT_CONFIG, model: 'atlas', slab: picks[0], size: '240x120', finish: 'brass' };
  await table.apply(cfg);
  table.view('hero');
  const coarse = matchMedia('(pointer: coarse)').matches;
  stage.controls.enabled = !coarse;
  stage.controls.enableZoom = false;
  stage.controls.autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  stage.controls.autoRotateSpeed = 0.55;
  stage.onInteract = () => { stage.controls.autoRotate = false; };
  el.classList.add('is-ready');
  $('.hero__slabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-slab]');
    if (!b) return;
    $$('.hero__slab').forEach((x) => x.classList.toggle('is-on', x === b));
    cfg = { ...cfg, slab: b.dataset.slab };
    $('#hero-slab').textContent = getSlab(cfg.slab).name;
    $('#hero-cta').href = `#/table/atlas?slab=${cfg.slab}`;
    table.apply(cfg);
  });
}

function pageTables() {
  app.innerHTML = `
    <section class="page-head"><h1>Столы</h1><p>Модель стола – это опора. Любая плита подходит к любой опоре.</p></section>
    ${modelList()}${slabWall()}${veneerBlock()}${remoteSteps()}`;
  bindModels();
  drawVeneerArt();
}

function pagePlaceholder(title, text) {
  app.innerHTML = `
    <section class="page-head page-head--tall">
      <h1>${title}</h1>
      <p>${text}</p>
      <div class="hero__actions">
        <button class="btn btn--primary" data-lead="${title}: подборка">Запросить подборку</button>
        <a class="link" href="#remote">Видеозвонок из шоурума</a>
      </div>
    </section>${remoteSteps()}`;
}

// ---------- конфигуратор ----------

function readCfg(model, query) {
  const cfg = { ...DEFAULT_CONFIG, model };
  for (const [k, v] of query) {
    if (k in cfg) cfg[k] = ['gloss', 'L', 'W'].includes(k) ? Number(v) : v;
  }
  if (cfg.top === 'ceramic' && cfg.shape === 'O') cfg.shape = 'A';
  return cfg;
}

function cfgSummary(cfg) {
  const m = getModel(cfg.model);
  const f = getFinish(cfg.finish);
  if (cfg.top === 'ceramic') {
    return `${m.name}, ${getSlab(cfg.slab).name}, ${cfg.size.replace('x', '×')} см, форма ${cfg.shape}, опора – ${f.name.toLowerCase()}`;
  }
  return `${m.name}, шпон ${getVeneer(cfg.veneer).name.toLowerCase()}, ${Math.round(cfg.L * 100)}×${Math.round(cfg.W * 100)} см, раскладка ${getLayout(cfg.layout).name.toLowerCase()}, лак ${cfg.gloss}%, опора – ${f.name.toLowerCase()}`;
}

const opt = (group, id, label, active, extra = '') =>
  `<button type="button" class="opt${active ? ' is-on' : ''}" data-set="${group}" data-val="${id}" aria-pressed="${active}" ${extra}>${label}</button>`;

const shapeIcon = (id) => {
  const d = id === 'A' ? 'M6 4 Q20 1 34 4 Q37 4.5 37 8 V16 Q37 19.5 34 20 Q20 23 6 20 Q3 19.5 3 16 V8 Q3 4.5 6 4Z'
    : id === 'C' ? 'M6 3 H34 Q37 3 37 6 V18 Q37 21 34 21 H6 Q3 21 3 18 V6 Q3 3 6 3Z'
      : 'M20 3 A17 9 0 1 1 19.9 3Z';
  return `<svg viewBox="0 0 40 24" aria-hidden="true"><path d="${d}"/></svg>`;
};

const layoutIcon = (id) => {
  if (id === 'radial') {
    const lines = Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      return `<line x1="20" y1="12" x2="${(20 + Math.cos(a) * 19).toFixed(1)}" y2="${(12 + Math.sin(a) * 11).toFixed(1)}"/>`;
    }).join('');
    return `<svg viewBox="0 0 40 24" aria-hidden="true"><rect x="1" y="1" width="38" height="22" rx="3"/>${lines}</svg>`;
  }
  const ys = [6, 10, 14, 18];
  const l = id === 'book'
    ? ys.map((y, i) => `<path d="M2 ${y} Q20 ${y + (i % 2 ? 3 : -3)} 38 ${y}"/>`).join('')
    : ys.map((y) => `<line x1="2" y1="${y}" x2="38" y2="${y}"/>`).join('');
  return `<svg viewBox="0 0 40 24" aria-hidden="true"><rect x="1" y="1" width="38" height="22" rx="3"/>${l}</svg>`;
};

function panel(cfg) {
  const ceramic = cfg.top === 'ceramic';
  const m = getModel(cfg.model);
  const slab = getSlab(cfg.slab);
  return `
    <div class="cfg__head">
      <a class="crumb" href="#/tables">Столы</a>
      <h1 class="cfg__title">${m.name}</h1>
      <p class="cfg__line">${m.line}. Высота 75 см.</p>
    </div>
    <div class="seg" role="group" aria-label="Материал столешницы">
      ${opt('top', 'ceramic', 'Керамогранит', ceramic)}${opt('top', 'veneer', 'Шпон', !ceramic)}
    </div>

    <fieldset class="grp"><legend>Опора <em>${m.name}</em></legend>
      <div class="grid3">${MODELS.map((x) => opt('model', x.id, `<img src="${x.render}" alt=""><span>${x.name}</span>`, x.id === cfg.model, 'data-kind="model"')).join('')}</div>
    </fieldset>

    ${ceramic ? `
    <fieldset class="grp"><legend>Плита <em>${slab.name} · ${SURFACES[slab.surface].label}</em></legend>
      ${SLAB_GROUPS.map((g) => `<p class="sub">${g.name}</p><div class="chips">${SLABS.filter((s) => s.group === g.id).map((s) =>
        opt('slab', s.id, `<span class="chip__slab" style="background-image:url(${s.img})"></span>`, s.id === cfg.slab, `title="${s.name}" aria-label="${s.name}"`)).join('')}</div>`).join('')}
    </fieldset>` : `
    <fieldset class="grp"><legend>Шпон <em>${getVeneer(cfg.veneer).name}</em></legend>
      <div class="chips chips--veneer">${VENEERS.map((v) => opt('veneer', v.id, `<canvas class="chip__veneer" data-veneer="${v.id}" width="72" height="72"></canvas>`, v.id === cfg.veneer, `title="${v.name}" aria-label="${v.name}"`)).join('')}</div>
    </fieldset>
    <fieldset class="grp"><legend>Раскладка <em>${getLayout(cfg.layout).name}</em></legend>
      <div class="grid3">${LAYOUTS.map((l) => opt('layout', l.id, `${layoutIcon(l.id)}<span>${l.name}</span>`, l.id === cfg.layout, 'data-kind="icon"')).join('')}</div>
    </fieldset>
    <fieldset class="grp"><legend>Лак <em>${cfg.gloss}% · ${glossLabel(cfg.gloss)}</em></legend>
      <input type="range" min="5" max="100" step="5" value="${cfg.gloss}" data-range="gloss" aria-label="Глянцевость лака, %">
      <div class="scale"><span>мат</span><span>полумат</span><span>полуглянец</span><span>глянец</span></div>
    </fieldset>`}

    <fieldset class="grp"><legend>Форма <em>${SHAPES.find((s) => s.id === cfg.shape).name}</em></legend>
      <div class="grid3">${SHAPES.filter((s) => !s.veneerOnly || !ceramic).map((s) => opt('shape', s.id, `${shapeIcon(s.id)}<span>${s.name}</span>`, s.id === cfg.shape, 'data-kind="icon"')).join('')}</div>
    </fieldset>

    <fieldset class="grp"><legend>Размер <em>${ceramic ? cfg.size.replace('x', ' × ') : `${Math.round(cfg.L * 100)} × ${Math.round(cfg.W * 100)}`} см</em></legend>
      ${ceramic
    ? `<div class="grid4">${SIZES.map((s) => opt('size', s.id, s.id.replace('x', '×'), s.id === cfg.size)).join('')}</div>`
    : `<label class="rng">Длина<input type="range" min="${VENEER_LIMITS.L[0] * 100}" max="${VENEER_LIMITS.L[1] * 100}" step="5" value="${Math.round(cfg.L * 100)}" data-range="L"></label>
         <label class="rng">Ширина<input type="range" min="${VENEER_LIMITS.W[0] * 100}" max="${VENEER_LIMITS.W[1] * 100}" step="5" value="${Math.round(cfg.W * 100)}" data-range="W"></label>`}
    </fieldset>

    <fieldset class="grp"><legend>Цвет опоры <em>${getFinish(cfg.finish).name}</em></legend>
      <div class="chips">${FINISHES.map((f) => opt('finish', f.id, `<span class="chip__fin" style="background-image:url(${f.img})"></span>`, f.id === cfg.finish, `title="${f.name}" aria-label="${f.name}"`)).join('')}</div>
    </fieldset>`;
}

function priceBlock(cfg) {
  const p = price(cfg);
  const exactVeneer = cfg.top === 'veneer' && priceMode === 'exact';
  return `
    <div class="price__row">
      <div>
        <p class="price__val">${exactVeneer ? '≈ ' : ''}${priceText(p.total, cfg.model)}</p>
        <p class="price__term">${p.exact ? 'Изготовление ' + p.term : 'Ориентир по калькулятору, ' + p.term}</p>
      </div>
    </div>
    ${priceMode !== 'request' ? `<details class="price__more"><summary>Из чего складывается</summary>
      <ul>${p.lines.map(([t, v]) => `<li><span>${t}</span><span>${v ? rub(v) : 'включено'}</span></li>`).join('')}</ul></details>` : ''}
    <div class="price__actions">
      <button class="btn btn--primary" data-lead="${priceMode === 'request' ? 'Узнать цену' : 'Получить расчёт и спецификацию'}">${priceMode === 'request' ? 'Узнать цену' : 'Получить расчёт'}</button>
      <button class="btn btn--line" data-lead="Запись в шоурум">В шоурум</button>
    </div>
    <div class="price__links">
      <button class="link" data-lead="Видеозвонок из шоурума">Видеозвонок из шоурума</button>
      <button class="link" data-share>Скопировать ссылку</button>
    </div>`;
}

async function pageTable(model, query) {
  let cfg = readCfg(model, query);
  app.innerHTML = `
    <section class="cfg">
      <div class="cfg__stage" id="stage">
        <div class="stage__views" role="group" aria-label="Ракурс">
          <button type="button" data-view="three" class="is-on">3/4</button>
          <button type="button" data-view="top">Сверху</button>
          <button type="button" data-view="front">Спереди</button>
          <button type="button" data-view="detail">Деталь</button>
          <span class="stage__sep" aria-hidden="true"></span>
          <button type="button" data-room aria-pressed="false">Интерьер</button>
        </div>
        <p class="stage__hint">Вращайте стол мышью или пальцем</p>
        <p class="stage__loading" id="stage-loading">Загружаем 3D…</p>
      </div>
      <aside class="cfg__panel">
        <div id="panel"></div>
        <div class="price" id="price"></div>
      </aside>
    </section>
    <section class="facts">
      <h2>Как устроен стол</h2>
      <dl>
        <div><dt>Столешница</dt><dd>Керамогранит из плиты 2,6 × 1,2 м: четыре размера, формы A и C. Или шпон любого размера до 3,2 × 1,4 м.</dd></div>
        <div><dt>Опора</dt><dd>Изогнутый стальной лист. Три стандартных цвета или брашированные латунь и бронза.</dd></div>
        <div><dt>Срок</dt><dd>Около месяца для столов из керамогранита. Для шпона – по расчёту.</dd></div>
        <div><dt>Посмотреть вживую</dt><dd>Все плиты и опоры – в шоуруме на Гранд-2. Или по видеосвязи.</dd></div>
      </dl>
    </section>
    ${remoteSteps()}`;

  const renderPanel = () => {
    $('#panel').innerHTML = panel(cfg);
    $('#price').innerHTML = priceBlock(cfg);
    $$('.chip__veneer').forEach((c) => {
      const src = veneerCanvas(getVeneer(c.dataset.veneer), 'straight', { Lm: 0.3, Wm: 0.3, width: 72 });
      c.getContext('2d').drawImage(src, 0, 0);
    });
  };
  const syncUrl = () => {
    const q = new URLSearchParams();
    const keys = cfg.top === 'ceramic' ? ['top', 'slab', 'shape', 'size', 'finish'] : ['top', 'veneer', 'layout', 'gloss', 'shape', 'L', 'W', 'finish'];
    keys.forEach((k) => q.set(k, cfg[k]));
    history.replaceState(null, '', `#/table/${cfg.model}?${q}`);
  };
  renderPanel();

  const { Stage, Table } = await loadScene();
  if (!document.getElementById('stage')) return;
  stage = new Stage($('#stage'));
  const table = new Table(stage);
  stage.onInteract = () => $('#stage').classList.add('is-touched');
  await table.apply(cfg);
  table.view('three');
  $('#stage-loading').remove();

  let pending = null;
  const update = (patch, { rebuildPanel = true } = {}) => {
    cfg = { ...cfg, ...patch };
    if (cfg.top === 'ceramic' && cfg.shape === 'O') cfg.shape = 'A';
    if (rebuildPanel) renderPanel();
    else $('#price').innerHTML = priceBlock(cfg);
    syncUrl();
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => {
      const sizeChanged = 'size' in patch || 'top' in patch || 'model' in patch;
      table.apply(cfg).then(() => { if (sizeChanged) table.view($('.stage__views .is-on')?.dataset.view || 'three'); });
    });
  };

  $('.cfg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-set]');
    if (b) update({ [b.dataset.set]: b.dataset.val });
    const rb = e.target.closest('[data-room]');
    if (rb) {
      const on = rb.getAttribute('aria-pressed') !== 'true';
      rb.setAttribute('aria-pressed', on);
      rb.classList.toggle('is-on', on);
      $('#stage').classList.toggle('is-room', on);
      stage.setRoom(on, veneerCanvas(getVeneer('oak'), 'straight', { Lm: 3.2, Wm: 1.4, width: 1600 }));
    }
    const v = e.target.closest('[data-view]');
    if (v) {
      $$('.stage__views button').forEach((x) => x.classList.toggle('is-on', x === v));
      table.view(v.dataset.view);
    }
    if (e.target.closest('[data-share]')) {
      navigator.clipboard?.writeText(location.href).then(() => toast('Ссылка на конфигурацию скопирована'), () => toast(location.href));
    }
  });
  $('.cfg').addEventListener('input', (e) => {
    const r = e.target.closest('[data-range]');
    if (!r) return;
    const k = r.dataset.range;
    const val = k === 'gloss' ? Number(r.value) : Number(r.value) / 100;
    update({ [k]: val }, { rebuildPanel: false });
    const lg = r.closest('.grp').querySelector('legend em');
    if (k === 'gloss') lg.textContent = `${val}% · ${glossLabel(val)}`;
    else lg.textContent = `${Math.round(cfg.L * 100)} × ${Math.round(cfg.W * 100)} см`;
  });
}

// ---------- скульптуры ----------

async function pageSculptures() {
  const s = { form: 'drop', finish: 'mirror', size: 1.6, scene: 'interior' };
  app.innerHTML = `
    <section class="cfg cfg--sculpt">
      <div class="cfg__stage" id="stage" data-scene="interior">
        <p class="stage__hint">Человек рядом – 175 см, для масштаба</p>
        <p class="stage__loading" id="stage-loading">Загружаем 3D…</p>
      </div>
      <aside class="cfg__panel">
        <div class="cfg__head">
          <h1 class="cfg__title cfg__title--sm">Полигональные скульптуры</h1>
          <p class="cfg__line">Здесь будут ваши 3D-модели скульптур. В прототипе – три условные формы, чтобы показать механику: размер, покрытие, среда.</p>
        </div>
        <fieldset class="grp"><legend>Форма</legend><div class="grid3">
          ${[['drop', 'Капля'], ['boulder', 'Валун'], ['crystal', 'Кристалл']].map(([id, n]) => opt('form', id, n, id === s.form)).join('')}</div></fieldset>
        <fieldset class="grp"><legend>Высота <em id="sz">${s.size.toFixed(1).replace('.', ',')} м</em></legend>
          <input type="range" min="0.4" max="4" step="0.1" value="${s.size}" data-range="size" aria-label="Высота скульптуры, м">
          <div class="scale"><span>интерьер</span><span>сад</span><span>город</span></div></fieldset>
        <fieldset class="grp"><legend>Покрытие</legend><div class="grid2" id="sfin"></div></fieldset>
        <fieldset class="grp"><legend>Среда</legend><div class="grid3">
          ${[['interior', 'Интерьер'], ['garden', 'Сад'], ['city', 'Город']].map(([id, n]) => opt('scene', id, n, id === s.scene)).join('')}</div></fieldset>
        <div class="price"><div class="price__actions">
          <button class="btn btn--primary" data-lead="Скульптура под заказ">Обсудить проект</button>
          <button class="btn btn--line" data-lead="Портфолио городских объектов">Реализованные объекты</button>
        </div></div>
      </aside>
    </section>`;
  const { Stage, Sculpture, SCULPT_FINISHES } = await loadScene();
  if (!document.getElementById('stage')) return;
  $('#sfin').innerHTML = SCULPT_FINISHES.map((f) => opt('finish', f.id, f.name, f.id === s.finish)).join('');
  stage = new Stage($('#stage'), { shadowHeight: 1.6 });
  const sc = new Sculpture(stage);
  sc.apply(s);
  $('#stage-loading').remove();
  $('.cfg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-set]');
    if (!b) return;
    s[b.dataset.set] = b.dataset.val;
    $$(`[data-set="${b.dataset.set}"]`).forEach((x) => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b); });
    if (b.dataset.set === 'scene') $('#stage').dataset.scene = b.dataset.val;
    sc.apply(s);
  });
  let raf = 0;
  $('.cfg').addEventListener('input', (e) => {
    if (!e.target.matches('[data-range="size"]')) return;
    s.size = Number(e.target.value);
    $('#sz').textContent = `${s.size.toFixed(1).replace('.', ',')} м`;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => sc.apply(s));
  });
}

// ---------- роутер ----------

function route() {
  if (stage) { stage.dispose(); stage = null; }
  const hash = location.hash || '#/';
  if (!hash.startsWith('#/')) return;
  const [path, qs] = hash.slice(1).split('?');
  const query = new URLSearchParams(qs || '');
  const parts = path.split('/').filter(Boolean);
  $$('.nav__links a').forEach((a) => a.classList.toggle('is-on', hash.startsWith(a.getAttribute('href'))));
  window.scrollTo(0, 0);
  if (parts[0] === 'table') return pageTable(MODELS.some((m) => m.id === parts[1]) ? parts[1] : 'atlas', query);
  if (parts[0] === 'tables') return pageTables();
  if (parts[0] === 'sculptures') return pageSculptures();
  if (parts[0] === 'soft') return pagePlaceholder('Мягкая мебель', 'Диваны из кожи и ткани, модульные системы. Новые модели сейчас в производстве – покажем в шоуруме или по видеосвязи.');
  if (parts[0] === 'beds') return pagePlaceholder('Кровати', 'Кровати с мягким изголовьем под ваш размер и ткань.');
  if (parts[0] === 'chairs') return pagePlaceholder('Стулья', 'Стулья в пару к столам: подберём по цвету опоры и обивке.');
  return pageHome();
}

let lastPath = '';
window.addEventListener('hashchange', () => {
  const h = location.hash;
  if (!h.startsWith('#/')) {
    document.getElementById(h.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  const p = h.split('?')[0];
  if (p === lastPath && p.startsWith('#/table/')) return;
  lastPath = p;
  route();
});

document.addEventListener('click', (e) => {
  const l = e.target.closest('[data-lead]');
  if (l) {
    const q = new URLSearchParams((location.hash.split('?')[1]) || '');
    const model = location.hash.match(/#\/table\/(\w+)/)?.[1];
    openLead(l.dataset.lead, model ? cfgSummary(readCfg(model, q)) : '');
  }
  const a = e.target.closest('a[href^="#"]:not([href^="#/"])');
  if (a) {
    e.preventDefault();
    document.getElementById(a.getAttribute('href').slice(1))?.scrollIntoView({ behavior: 'smooth' });
  }
});

// Демо-панель для созвона: как показывать цену
const demo = document.createElement('div');
demo.className = 'demo';
demo.innerHTML = `<p>Показ цены</p>${[['exact', 'Точная'], ['from', 'От'], ['request', 'По запросу']].map(([id, n]) =>
  `<button type="button" data-mode="${id}" class="${id === priceMode ? 'is-on' : ''}">${n}</button>`).join('')}`;
document.body.appendChild(demo);
demo.addEventListener('click', (e) => {
  const b = e.target.closest('[data-mode]');
  if (!b) return;
  priceMode = b.dataset.mode;
  try { localStorage.setItem('idodom-price-mode', priceMode); } catch {}
  $$('.demo button').forEach((x) => x.classList.toggle('is-on', x === b));
  if (location.hash.startsWith('#/table/')) {
    const q = new URLSearchParams(location.hash.split('?')[1] || '');
    const model = location.hash.match(/#\/table\/(\w+)/)[1];
    $('#price').innerHTML = priceBlock(readCfg(model, q));
  } else route();
});

lastPath = (location.hash || '#/').split('?')[0];
route();
