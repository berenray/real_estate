/* ===========================================================================
   ORIYON — поведінка та рух.
   Рух стриманий: повільний наїзд героя і мʼяке проявлення блоків.
   Нічого не ховається назавжди — без GSAP сторінка лишається цілою.
   =========================================================================== */

import { TIMELINE as TL, COMPLEXES, UNITS, LAYOUTS, DEAL, STATS, FAQ, FLOORS, PHOTOS, UNIT_PHOTOS } from './data.js';
import { elevation, massing, plan, isLit } from './draw.js';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

const nf = new Intl.NumberFormat('uk-UA');
const money = (v) => nf.format(v) + ' ₴';

/* ── розрахунки з календарного плану ─────────────────────────────────── */
function floorsAt(cx, t) {
  let built = 0;
  for (const w of (FLOORS[cx.id] || [])) {
    const span = w.b - w.a;
    const k = Math.min(w.done / 100, Math.max(0, (t - w.a) / span));
    if (k <= 0) continue;
    built = Math.max(built, w.from - 1 + Math.round(k * (w.to - w.from + 1)));
  }
  return Math.min(cx.storeys, built);
}
function percentAt(cx, t) {
  const total = cx.works.reduce((a, w) => a + (w.b - w.a), 0) || 1;
  let done = 0;
  for (const w of cx.works) {
    const span = w.b - w.a;
    const k = Math.min(1, Math.max(0, (t - w.a) / span));
    done += Math.min(k, w.done / 100) * span;
  }
  return Math.round((done / total) * 100);
}
function paintFloors(root, built, total) {
  $$('.fl', root).forEach((g) => {
    const n = Number(g.dataset.floor);
    g.classList.toggle('is-planned', n > built);
    g.classList.toggle('is-top', n === built && built > 0 && built < total);
  });
  const cap = root.querySelector('.parapet');
  if (cap) cap.classList.toggle('is-planned', built < total);
}

/* ── наповнення медіа-рамок ──────────────────────────────────────────── */
/* Фото вставляємо справжнім <img>, а не фоном через CSS-змінну:
   url() усередині змінної резолвиться відносно файла стилів, а не сторінки. */
function photoTag(src, alt) {
  return `<img class="media__img" src="${src}" alt="${alt}" loading="lazy" decoding="async">`;
}

function fillMedia(el, key, svg, alt = '') {
  if (PHOTOS[key]) { el.insertAdjacentHTML('afterbegin', photoTag(PHOTOS[key], alt)); return; }
  const box = document.createElement('div');
  box.className = 'media__dwg';
  box.innerHTML = svg;
  el.prepend(box);
  const cx = COMPLEXES.find((c) => c.id === key) || COMPLEXES[0];
  if (box.querySelector('.dwg--elev')) paintFloors(box, floorsAt(cx, TL.today), cx.storeys);
}

function mountMedia() {
  const MER = COMPLEXES[0];
  const byId = (id) => COMPLEXES.find((c) => c.id === id);
  const map = {
    hero:  () => elevation(MER, { w: 420 }),
    build: () => elevation(MER, { w: 340 }),
    q1:    () => elevation(byId('q1'), { w: 260 }),
    q2:    () => elevation(byId('q2'), { w: 260 }),
    q3:    () => massing(byId('q3'), { w: 300, h: 240 }),
  };
  const DARK = new Set(['hero', 'build']);
  $$('[data-media]').forEach((el) => {
    const k = el.dataset.media;
    if (!map[k]) return;
    if (DARK.has(k)) el.classList.add('media--dark');
    const cx = COMPLEXES.find((c) => c.id === k);
    const alt = cx ? `${cx.name}, ${cx.district}` : (k === 'build' ? 'Житловий будинок у будівництві' : 'Житловий будинок у сутінках');
    fillMedia(el, k, map[k](), alt);
  });
}

/* ── про нас ─────────────────────────────────────────────────────────── */
function mountStats() {
  const host = $('[data-stats]');
  host.innerHTML = STATS.map((s) => `
    <div class="fig">
      <span class="fig__v" data-count="${s.v}" data-suffix="${s.s}">${nf.format(s.v)}${s.s}</span>
      <span class="fig__l">${s.l}</span>
    </div>`).join('');
}

/* ── квартали ────────────────────────────────────────────────────────── */
function mountComplexes() {
  const host = $('[data-complexes]');
  host.innerHTML = COMPLEXES.map((cx) => `
    <article class="cx">
      <figure class="cx__media media" data-media="${cx.id}"></figure>
      <div class="cx__t">
        <h3 class="cx__n">${cx.name}</h3>
        <span class="cx__state">${cx.stateLabel}</span>
      </div>
      <p class="cx__d">${cx.summary}</p>
      <div class="cx__meta">
        <span class="tag">${cx.district}</span>
        <span class="tag">${cx.storeys} поверхів</span>
        <span class="tag">${cx.available} вільних</span>
        <span class="tag">від ${nf.format(cx.priceFrom)} ₴/м²</span>
      </div>
      <div class="cx__bar">
        <div class="cx__track"><i data-meter="${cx.percent}"></i></div>
        <p class="cx__pct"><span>Готовність ${cx.percent}%</span><span>${cx.ready}</span></p>
      </div>
    </article>`).join('');
}

function mountProgress() {
  const host = $('[data-progress]');
  const MER = COMPLEXES[0];
  const rows = [
    [`${MER.name}, поверхів змонтовано`, `${floorsAt(MER, TL.today)} з ${MER.storeys}`],
    ['Готовність за планом робіт', `${MER.percent}%`],
    ['Наступна віха', 'Фасади, IV кв. 2026'],
  ];
  host.innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
}

/* ── квартири ────────────────────────────────────────────────────────── */
const state = { rooms: new Set(), cx: '', max: Infinity, shown: 8 };

function mountFilter() {
  $('[data-f-rooms]').innerHTML = [1, 2, 3, 4].map((r) =>
    `<button class="chip" type="button" aria-pressed="false" data-r="${r}">${r} кімн.</button>`).join('');
  $('[data-f-rooms]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-r]'); if (!b) return;
    const r = Number(b.dataset.r);
    const on = b.getAttribute('aria-pressed') === 'true';
    b.setAttribute('aria-pressed', String(!on));
    on ? state.rooms.delete(r) : state.rooms.add(r);
    state.shown = 8; renderUnits();
  });
}

function filtered() {
  return UNITS.filter((u) =>
    (!state.rooms.size || state.rooms.has(u.rooms)) &&
    (!state.cx || state.cx === u.cx) &&
    u.price <= state.max).sort((a, b) => a.price - b.price);
}

function renderUnits() {
  const host = $('[data-units]');
  const more = $('[data-more]');
  const list = filtered();

  if (!list.length) {
    host.innerHTML = `<p class="units__empty">За цими умовами вільних квартир немає.<br>Спробуйте змінити бюджет або кількість кімнат.</p>`;
    more.hidden = true;
    return;
  }

  host.innerHTML = list.slice(0, state.shown).map((u, i) => {
    const cx = COMPLEXES.find((c) => c.id === u.cx);
    const photo = UNIT_PHOTOS[i % UNIT_PHOTOS.length];
    return `<article class="unit">
      <figure class="unit__media media">${photo
        ? `<img class="media__img" src="${photo}" alt="Інтерʼєр ${u.rooms}-кімнатної квартири" loading="lazy" decoding="async">`
        : ''}</figure>
      <p class="unit__p">${money(u.price)}</p>
      <h3 class="unit__n">${u.area.toFixed(1)}<sup> м²</sup> · ${cx.name}</h3>
      <div class="unit__tags">
        <span class="tag">${u.rooms} ${u.rooms === 1 ? 'кімната' : 'кімнати'}</span>
        <span class="tag">${u.floor}/${u.of} поверх</span>
        <span class="tag">${u.view}</span>
      </div>
    </article>`;
  }).join('');

  more.hidden = list.length <= state.shown;
  more.textContent = `Показати ще ${Math.min(4, list.length - state.shown)}`;

  if (window.gsap && !REDUCED) {
    gsap.from(host.querySelectorAll('.unit'), { opacity: 0, y: 16, duration: .5, stagger: .04, ease: 'power2.out' });
  }
}

/* ── пошук у героєві ─────────────────────────────────────────────────── */
function mountSearch() {
  const form = $('[data-search]');
  const cxSel = $('[data-s-cx]');
  cxSel.innerHTML = '<option value="">Будь-який</option>' +
    COMPLEXES.map((c) => `<option value="${c.id}">${c.name} · ${c.district}</option>`).join('');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    state.cx = cxSel.value;
    const r = $('[data-s-rooms]').value;
    state.rooms = r ? new Set([Number(r)]) : new Set();
    const p = $('[data-s-price]').value;
    state.max = p ? Number(p) : Infinity;
    state.shown = 8;
    $$('[data-r]').forEach((b) => b.setAttribute('aria-pressed', String(state.rooms.has(Number(b.dataset.r)))));
    renderUnits();
    $('#kvartyry').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
  });
}

/* ── інсоляція ───────────────────────────────────────────────────────── */
const pState = { key: 'l1', hour: 13 };

function renderPlan() {
  const dwg = $('[data-plan-dwg]');
  const read = $('[data-plan-read]');
  const L = LAYOUTS[pState.key];
  dwg.innerHTML = plan(L, pState.hour, { w: 620 });

  const where = { 9: 'схід', 13: 'південь', 18: 'захід' };
  const lit = L.windows.filter((wn) => isLit(wn.side, pState.hour)).length;
  read.innerHTML = `
    <div><dt>Планування</dt><dd>${L.title}</dd></div>
    <div><dt>Площа</dt><dd>${L.area.toFixed(1)} м²</dd></div>
    <div><dt>Сонце</dt><dd>${where[pState.hour]}</dd></div>
    <div><dt>Вікон під сонцем</dt><dd>${lit} із ${L.windows.length}</dd></div>`;

  if (window.gsap && !REDUCED) {
    gsap.from(dwg.querySelectorAll('.beam'), { opacity: 0, duration: .7, ease: 'power2.out' });
  }
}

function mountPlanCtl() {
  $$('[data-plan]').forEach((b) => b.addEventListener('click', () => {
    $$('[data-plan]').forEach((x) => x.classList.toggle('is-on', x === b));
    pState.key = b.dataset.plan; renderPlan();
  }));
  $$('[data-hour]').forEach((b) => b.addEventListener('click', () => {
    $$('[data-hour]').forEach((x) => x.classList.toggle('is-on', x === b));
    pState.hour = Number(b.dataset.hour); renderPlan();
  }));
  renderPlan();
}

/* ── етапи та питання ────────────────────────────────────────────────── */
function mountDeal() {
  $('[data-deal]').innerHTML = DEAL.map((d, i) => `
    <li class="step">
      <span class="step__i">${String(i + 1).padStart(2, '0')}</span>
      <h3 class="step__k">${d.k}</h3>
      <p class="step__d">${d.d}</p>
    </li>`).join('');
}
function mountFaq() {
  $('[data-faq]').innerHTML = FAQ.map((f, i) => `
    <details class="qa"${i === 0 ? ' open' : ''}>
      <summary class="qa__b">${f.q}</summary>
      <div class="qa__a">${f.a}</div>
    </details>`).join('');
}

/* ── форма ───────────────────────────────────────────────────────────── */
function mountForm() {
  const form = $('[data-form]');
  const ok = $('[data-form-ok]');
  const check = (input) => {
    const err = $(`[data-err-for="${input.id}"]`);
    let msg = '';
    if (!input.value.trim()) msg = input.type === 'tel' ? 'Вкажіть номер телефону' : 'Вкажіть імʼя';
    else if (input.type === 'tel' && input.value.replace(/\D/g, '').length < 9) msg = 'У номері бракує цифр';
    input.setAttribute('aria-invalid', String(!!msg));
    if (err) err.textContent = msg;
    return !msg;
  };
  $$('input', form).forEach((i) => i.addEventListener('blur', () => check(i)));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const inputs = $$('input', form);
    if (!inputs.map(check).every(Boolean)) {
      inputs.find((i) => i.getAttribute('aria-invalid') === 'true')?.focus();
      return;
    }
    ok.textContent = 'Демонстрація: заявку не надіслано.';
    form.reset();
  });
}

/* ── рух ─────────────────────────────────────────────────────────────── */
function motion() {
  const links = $$('.nav__pill a');
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    links.forEach((a) => a.classList.toggle('is-on', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  ['pro', 'kvartaly', 'kvartyry', 'sonce'].forEach((id) => {
    const el = document.getElementById(id); if (el) io.observe(el);
  });

  if (REDUCED || !window.gsap || !window.ScrollTrigger) {
    $$('[data-meter]').forEach((i) => i.style.width = i.dataset.meter + '%');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  const intro = [];
  intro.push(gsap.from('.hero__frame', { opacity: 0, scale: 1.03, duration: 1.3, ease: 'expo.out' }));
  intro.push(gsap.from('.hero__say > *', { opacity: 0, y: 22, duration: 1, stagger: .1, ease: 'expo.out', delay: .35 }));
  intro.push(gsap.from('.search', { opacity: 0, y: 24, duration: .9, ease: 'expo.out', delay: .6 }));
  intro.push(gsap.from('.nav > *', { opacity: 0, y: -14, duration: .8, stagger: .07, ease: 'expo.out' }));
  /* у фоновій вкладці браузер душить rAF — доводимо вступ до кінця вручну */
  setTimeout(() => intro.forEach((t) => t && t.progress(1)), 2600);

  /* повільний наїзд креслення в героєві */
  gsap.to('.hero__frame .media__dwg', {
    scale: 1.12, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .6 },
  });

  const rise = (sel, opts = {}) => $$(sel).forEach((el) => gsap.from(el, {
    opacity: 0, y: 24, duration: .85, ease: 'expo.out', ...opts,
    scrollTrigger: { trigger: el, start: 'top 88%', once: true },
  }));
  rise('.say .display--say');
  rise('.fig', { stagger: .07 });
  rise('.collage__i');
  rise('.sec__h');
  rise('.cx');
  rise('.feature__say');
  rise('.feature__media');
  rise('.sun__ctl');
  rise('.sun__dwg');
  rise('.step');
  rise('.cta__in');

  $$('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count), suf = el.dataset.suffix || '', o = { v: 0 };
    gsap.to(o, {
      v: target, duration: 1.5, ease: 'expo.out',
      onUpdate: () => { el.textContent = nf.format(Math.round(o.v)) + suf; },
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
  $$('[data-meter]').forEach((i) => gsap.to(i, {
    width: i.dataset.meter + '%', duration: 1.2, ease: 'expo.out',
    scrollTrigger: { trigger: i, start: 'top 94%', once: true },
  }));
}

/* ── старт ───────────────────────────────────────────────────────────── */
function boot() {
  COMPLEXES.forEach((cx) => { cx.percent = percentAt(cx, TL.today); });
  mountStats();
  mountComplexes();
  mountMedia();          // після карток кварталів — вони теж мають рамки
  mountProgress();
  mountFilter();
  mountSearch();
  renderUnits();
  mountPlanCtl();
  mountDeal();
  mountFaq();
  mountForm();
  $('[data-more]').addEventListener('click', () => { state.shown += 4; renderUnits(); });
  motion();
}

if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
else boot();
