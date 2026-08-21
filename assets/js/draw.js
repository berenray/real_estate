/* ===========================================================================
   Креслярська графіка.
   Кожен «візуал» на сайті — це креслення, а не фотографія: ми продаємо те,
   чого ще немає, тому показуємо графік, елевацію та план.
   Усі генератори повертають рядок SVG-розмітки.
   =========================================================================== */

const NS = 'http://www.w3.org/2000/svg';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const f = (n) => Number(n.toFixed(2));

/* Детермінований шум — щоб шахматка не «стрибала» між перезавантаженнями */
export function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

/* --------------------------------------------------------------------------
   1. КАЛЕНДАРНИЙ ГРАФІК — рядки робіт із плановою та фактичною смугою
   -------------------------------------------------------------------------- */
export function gantt(works, tl, { w = 760, rowH = 34, labelW = 300, pad = 14, compact = false } = {}) {
  /* На вузькому екрані підпис роботи не влазить у ліву колонку, тому він
     переїжджає над свою смугу — інакше довелось би скролити графік вбік
     і відвідувач бачив би смуги без назв. */
  const rh = compact ? 44 : rowH;
  const lw = compact ? pad : labelW;
  const h = pad * 2 + works.length * rh + 26;
  const x0 = lw;
  const trackW = w - lw - pad;
  const X = (t) => f(x0 + ((t - tl.from) / (tl.to - tl.from)) * trackW);

  let s = `<svg class="dwg dwg--gantt${compact ? ' dwg--gantt-c' : ''}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Календарний графік робіт">`;

  /* сітка кварталів */
  s += '<g class="dwg-grid">';
  tl.quarters.forEach((q, qi) => {
    const x = X(q.t);
    s += `<line x1="${x}" y1="${pad + 18}" x2="${x}" y2="${h - pad}" class="${q.q === 1 ? 'rule rule--year' : 'rule'}"/>`;
    if (q.q === 1 || qi === 0) s += `<text x="${x + 5}" y="${pad + 11}" class="t-year">${q.year}</text>`;
    if (!compact || q.q === 1) s += `<text x="${x + 5}" y="${h - pad + 13}" class="t-q">${['I', 'II', 'III', 'IV'][q.q - 1]}</text>`;
  });
  s += '</g>';

  /* рядки */
  works.forEach((wk, i) => {
    const y = pad + 22 + i * rh;
    const a = X(wk.a), b = X(wk.b);
    const bw = Math.max(4, b - a);
    const barY = compact ? y + 17 : y + 3;
    s += `<g class="gr" style="--i:${i}">`;
    if (compact) {
      s += `<text x="${pad}" y="${y + 11}" class="t-row t-row--c">${esc(wk.name)}</text>`;
    } else {
      s += `<text x="${pad}" y="${y + 13}" class="t-row">${esc(wk.name)}</text>`;
    }
    s += `<rect x="${a}" y="${barY}" width="${f(bw)}" height="13" rx="2" class="bar bar--plan"/>`;
    if (wk.done > 0) {
      s += `<rect x="${a}" y="${barY}" width="${f(bw * wk.done / 100)}" height="13" rx="2" class="bar bar--done"/>`;
    }
    s += `<text x="${f(b + 8)}" y="${barY + 11}" class="t-pct">${wk.done}%</text>`;
    s += '</g>';
  });

  /* лінія «сьогодні» */
  const xn = X(tl.today);
  s += `<g class="nowline"><line x1="${xn}" y1="${pad + 14}" x2="${xn}" y2="${h - pad}"/>`;
  s += `<polygon points="${xn - 5},${pad + 14} ${xn + 5},${pad + 14} ${xn},${pad + 21}"/></g>`;

  return s + '</svg>';
}

/* --------------------------------------------------------------------------
   2. ЕЛЕВАЦІЯ — фасад, що добудовується поверх за поверхом
   -------------------------------------------------------------------------- */
export function elevation(cx, { w = 340, storeys = null, bays = null } = {}) {
  const n = storeys ?? cx.storeys;
  const bay = bays ?? Math.max(3, cx.risers + 1);
  const fh = 15;                       // висота поверху в одиницях
  const podium = 2;
  const bodyW = w - 60;
  const h = 70 + n * fh + 30;
  const gx = 30;
  const gy = 60;
  const bw = bodyW / bay;

  let s = `<svg class="dwg dwg--elev" viewBox="0 0 ${w} ${h}" role="img" aria-label="Фасад: ${esc(cx.name)}, ${n} поверхів">`;

  /* горизонт та ґрунт */
  const gl = gy + n * fh;
  s += `<line x1="4" y1="${gl}" x2="${w - 4}" y2="${gl}" class="ground"/>`;
  for (let i = 0; i < 26; i++) {
    const x = 6 + i * ((w - 12) / 26);
    s += `<line x1="${f(x)}" y1="${gl}" x2="${f(x - 6)}" y2="${gl + 7}" class="hatch"/>`;
  }

  /* поверхи знизу вгору */
  for (let fl = 0; fl < n; fl++) {
    const y = gl - (fl + 1) * fh;
    const isPodium = fl < podium;
    s += `<g class="fl" data-floor="${fl + 1}">`;
    s += `<rect x="${gx}" y="${f(y)}" width="${f(bodyW)}" height="${fh}" class="slab"/>`;
    for (let b = 0; b < bay; b++) {
      const bx = gx + b * bw;
      if (isPodium) {
        s += `<rect x="${f(bx + 3)}" y="${f(y + 3)}" width="${f(bw - 6)}" height="${fh - 6}" class="glass glass--tall"/>`;
      } else {
        s += `<rect x="${f(bx + 2.5)}" y="${f(y + 3.5)}" width="${f(bw - 10)}" height="${fh - 7}" class="glass"/>`;
        s += `<line x1="${f(bx + bw - 6)}" y1="${f(y + 3)}" x2="${f(bx + bw - 6)}" y2="${f(y + fh - 3)}" class="mullion"/>`;
      }
    }
    s += '</g>';
  }

  /* контур проєктного обʼєму — те, що буде */
  s += `<rect x="${gx}" y="${f(gl - n * fh)}" width="${f(bodyW)}" height="${f(n * fh)}" class="envelope"/>`;
  /* парапет і технічний поверх */
  s += `<rect x="${gx - 4}" y="${f(gl - n * fh - 7)}" width="${f(bodyW + 8)}" height="7" class="parapet"/>`;

  /* кран — стоїть, поки квартал не зданий */
  if (cx.percent < 100) {
    const cxp = gx + bodyW + 14;
    const top = gl - n * fh - 46;
    s += `<g class="crane"><line x1="${cxp}" y1="${gl}" x2="${cxp}" y2="${f(top)}" class="crane-mast"/>`;
    for (let i = 0; i < 14; i++) {
      const y1 = gl - i * ((gl - top) / 14), y2 = gl - (i + 1) * ((gl - top) / 14);
      s += `<line x1="${cxp - 4}" y1="${f(y1)}" x2="${cxp + 4}" y2="${f(y2)}" class="crane-web"/>`;
    }
    s += `<line x1="${f(cxp - 44)}" y1="${f(top + 6)}" x2="${f(cxp + 16)}" y2="${f(top + 6)}" class="crane-jib"/>`;
    s += `<line x1="${cxp}" y1="${f(top)}" x2="${f(cxp - 40)}" y2="${f(top + 6)}" class="crane-web"/>`;
    s += `<line x1="${f(cxp - 26)}" y1="${f(top + 6)}" x2="${f(cxp - 26)}" y2="${f(top + 26)}" class="crane-web"/>`;
    s += '</g>';
  }

  /* висотна відмітка */
  s += `<g class="dim"><line x1="${gx - 16}" y1="${f(gl - n * fh)}" x2="${gx - 16}" y2="${gl}" class="dimline"/>`;
  s += `<text x="${gx - 20}" y="${f(gl - n * fh + 12)}" class="t-dim" text-anchor="end">${(n * 3).toFixed(1)} м</text></g>`;

  return s + '</svg>';
}

/* --------------------------------------------------------------------------
   3. S-КРИВА — плановий проти фактичного освоєння
   -------------------------------------------------------------------------- */
export function scurve(works, tl, { w = 560, h = 190, pad = 26 } = {}) {
  const X = (t) => f(pad + ((t - tl.from) / (tl.to - tl.from)) * (w - pad * 2));
  const Y = (p) => f(h - pad - (p / 100) * (h - pad * 2));

  const steps = 60;
  const total = works.reduce((a, wk) => a + (wk.b - wk.a), 0) || 1;
  const planPts = [], factPts = [];
  for (let i = 0; i <= steps; i++) {
    const t = tl.from + (i / steps) * (tl.to - tl.from);
    let plan = 0, fact = 0;
    for (const wk of works) {
      const span = wk.b - wk.a;
      const k = Math.min(1, Math.max(0, (t - wk.a) / span));
      plan += k * span;
      fact += Math.min(k, wk.done / 100) * span;
    }
    planPts.push([X(t), Y(plan / total * 100)]);
    if (t <= tl.today) factPts.push([X(t), Y(fact / total * 100)]);
  }
  const path = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');

  let s = `<svg class="dwg dwg--curve" viewBox="0 0 ${w} ${h}" role="img" aria-label="Крива освоєння: план і факт">`;
  s += '<g class="dwg-grid">';
  for (let p = 0; p <= 100; p += 25) {
    s += `<line x1="${pad}" y1="${Y(p)}" x2="${w - pad}" y2="${Y(p)}" class="rule"/>`;
    s += `<text x="${pad - 6}" y="${Y(p) + 4}" class="t-dim" text-anchor="end">${p}</text>`;
  }
  s += '</g>';
  s += `<path d="${path(planPts)}" class="curve curve--plan"/>`;
  s += `<path d="${path(factPts)}" class="curve curve--fact"/>`;
  const last = factPts[factPts.length - 1];
  if (last) s += `<circle cx="${last[0]}" cy="${last[1]}" r="4" class="curve-dot"/>`;
  const xn = X(tl.today);
  s += `<line x1="${xn}" y1="${pad - 8}" x2="${xn}" y2="${h - pad}" class="nowline-l"/>`;
  return s + '</svg>';
}

/* --------------------------------------------------------------------------
   4. ПЛАН КВАРТИРИ + інсоляція
   Північ угорі. Сонце в Києві опівдні стоїть на півдні, тому пряме світло
   заходить лише у вікна, повернуті до нього — північні кімнати не отримують
   його ніколи, і план це показує чесно.
   -------------------------------------------------------------------------- */
const SUN = {
  9:  { dir: [-0.82, -0.57], where: 'схід-південний схід' },
  13: { dir: [ 0.00, -1.00], where: 'південь' },
  18: { dir: [ 0.87, -0.50], where: 'захід' },
};
const NORMAL = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };

export function isLit(side, hour) {
  const d = SUN[hour].dir, n = NORMAL[side];
  return (n[0] * -d[0] + n[1] * -d[1]) > 0.15;
}

/* кінці віконного отвору в координатах плану */
function winEnds(L, win) {
  switch (win.side) {
    case 'n': return [[win.a, 0], [win.b, 0]];
    case 's': return [[win.a, L.h], [win.b, L.h]];
    case 'w': return [[0, win.a], [0, win.b]];
    default:  return [[L.w, win.a], [L.w, win.b]];
  }
}

/* кімнати, що виходять на конкретну ділянку зовнішньої стіни */
function roomsAtWall(L, win) {
  const eps = 0.01;
  return L.plots.filter((r) => {
    switch (win.side) {
      case 'n': return Math.abs(r.y) < eps            && r.x < win.b && r.x + r.w > win.a;
      case 's': return Math.abs(r.y + r.h - L.h) < eps && r.x < win.b && r.x + r.w > win.a;
      case 'w': return Math.abs(r.x) < eps            && r.y < win.b && r.y + r.h > win.a;
      default:  return Math.abs(r.x + r.w - L.w) < eps && r.y < win.b && r.y + r.h > win.a;
    }
  });
}

let uid = 0;
export function plan(L, hour = 13, { w = 560, bare = false } = {}) {
  uid += 1;
  const m = 48;
  const k = (w - m * 2) / L.w;
  const h = L.h * k + m * 2;
  const X = (x) => f(m + x * k);
  const Y = (y) => f(m + y * k);
  const d = SUN[hour].dir;

  let s = `<svg class="dwg dwg--plan" viewBox="0 0 ${w} ${f(h)}" role="img" aria-label="План: ${esc(L.title)}, ${L.area} м², сонце о ${hour}:00">`;

  /* 1. заливка приміщень */
  s += '<g class="rooms">';
  L.plots.forEach((r, i) => {
    s += `<rect class="room-fill" style="--i:${i}" x="${X(r.x)}" y="${Y(r.y)}" width="${f(r.w * k)}" height="${f(r.h * k)}"/>`;
  });
  s += '</g>';

  /* 2. промені — поверх заливки, інакше їх не видно.
        Промінь обрізається кімнатами, у які реально заходить: світло
        зупиняється на першій стіні, а не проходить наскрізь квартиру. */
  s += '<g class="sunbeams" aria-hidden="true">';
  const beam = w * 1.4;
  L.windows.forEach((win, wi) => {
    if (bare || !isLit(win.side, hour)) return;
    const rooms = roomsAtWall(L, win);
    if (!rooms.length) return;
    const cid = `beam-${uid}-${wi}`;
    s += `<clipPath id="${cid}">${rooms.map((r) =>
      `<rect x="${X(r.x)}" y="${Y(r.y)}" width="${f(r.w * k)}" height="${f(r.h * k)}"/>`).join('')}</clipPath>`;
    const [p1, p2] = winEnds(L, win);
    const q1 = [X(p1[0]) + d[0] * beam, Y(p1[1]) + d[1] * beam];
    const q2 = [X(p2[0]) + d[0] * beam, Y(p2[1]) + d[1] * beam];
    s += `<polygon class="beam" clip-path="url(#${cid})" points="${X(p1[0])},${Y(p1[1])} ${X(p2[0])},${Y(p2[1])} ${f(q2[0])},${f(q2[1])} ${f(q1[0])},${f(q1[1])}"/>`;
  });
  s += '</g>';

  /* 3. стіни та підписи */
  s += '<g class="walls">';
  L.plots.forEach((r) => {
    s += `<rect class="room-wall" x="${X(r.x)}" y="${Y(r.y)}" width="${f(r.w * k)}" height="${f(r.h * k)}"/>`;
    s += `<text x="${X(r.x + r.w / 2)}" y="${Y(r.y + r.h / 2) - 2}" class="t-room" text-anchor="middle">${esc(r.n)}</text>`;
    s += `<text x="${X(r.x + r.w / 2)}" y="${Y(r.y + r.h / 2) + 14}" class="t-area" text-anchor="middle">${r.a.toFixed(1)} м²</text>`;
  });
  s += '</g>';

  /* 4. вікна: освітлені та ні */
  s += '<g class="wins">';
  for (const win of L.windows) {
    const [p1, p2] = winEnds(L, win);
    const lit = isLit(win.side, hour);
    s += `<line class="win${lit ? ' win--lit' : ''}" x1="${X(p1[0])}" y1="${Y(p1[1])}" x2="${X(p2[0])}" y2="${Y(p2[1])}"/>`;
  }
  s += '</g>';

  /* 5. розміри */
  if (!bare) s += `<g class="dim">
    <line class="dimline" x1="${X(0)}" y1="${f(h - m + 20)}" x2="${X(L.w)}" y2="${f(h - m + 20)}"/>
    <text class="t-dim" x="${X(L.w / 2)}" y="${f(h - m + 15)}" text-anchor="middle">${(L.w / 10).toFixed(1)} м</text>
    <line class="dimline" x1="${f(m - 20)}" y1="${Y(0)}" x2="${f(m - 20)}" y2="${Y(L.h)}"/>
    <text class="t-dim" x="${f(m - 25)}" y="${Y(L.h / 2)}" text-anchor="middle" transform="rotate(-90 ${f(m - 25)} ${Y(L.h / 2)})">${(L.h / 10).toFixed(1)} м</text>
  </g>`;

  if (bare) return s + '</svg>';

  /* 6. сонце — з того боку, звідки світить, але завжди в межах аркуша */
  const cxp = X(L.w / 2), cyp = Y(L.h / 2);
  const dir = [-d[0], -d[1]];
  const IN = 30;
  let tHit = Infinity;
  if (dir[0]) tHit = Math.min(tHit, ((dir[0] > 0 ? w - IN : IN) - cxp) / dir[0]);
  if (dir[1]) tHit = Math.min(tHit, ((dir[1] > 0 ? h - IN : IN) - cyp) / dir[1]);
  const sx = cxp + dir[0] * tHit;
  const sy = cyp + dir[1] * tHit;
  s += '<g class="sun">';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    s += `<line class="sun-ray" x1="${f(sx + Math.cos(a) * 13)}" y1="${f(sy + Math.sin(a) * 13)}" x2="${f(sx + Math.cos(a) * 20)}" y2="${f(sy + Math.sin(a) * 20)}"/>`;
  }
  s += `<circle class="sun-dot" cx="${f(sx)}" cy="${f(sy)}" r="10"/>`;
  s += `<text class="t-dim t-sun" x="${f(sx)}" y="${f(sy + 34)}" text-anchor="middle">${hour}:00</text></g>`;

  /* 7. північ */
  s += `<g class="north" transform="translate(${w - 26} 28)"><line class="dimline" x1="0" y1="10" x2="0" y2="-10"/><polygon class="n-head" points="0,-12 -4,-4 4,-4"/><text class="t-dim" x="0" y="22" text-anchor="middle">Пн</text></g>`;

  return s + '</svg>';
}

/* --------------------------------------------------------------------------
   5. ІЗОМЕТРІЯ КВАРТАЛУ — масинг корпусів, підігнаний під свою рамку
   -------------------------------------------------------------------------- */
export function massing(cx, { w = 300, h = 210, pad = 14 } = {}) {
  const rnd = seeded(cx.id.split('').reduce((a, c) => a + c.charCodeAt(0), 7));
  const cols = Math.min(4, Math.ceil(Math.sqrt(cx.buildings)));
  const rows = Math.ceil(cx.buildings / cols);
  const CW = 40, CD = 24;
  const iso = (x, y, z) => [(x - y) * CW * 0.5, (x + y) * CD * 0.5 - z];

  const order = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (order.length < cx.buildings) order.push([c, r]);
  order.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
  const hgt = order.map(() => 22 + (cx.storeys / 26) * (40 + rnd() * 30));

  /* межі змісту, щоб виставити viewBox, а не сподіватись на око */
  const pts = [];
  const plotPts = [iso(-0.4, -0.4, 0), iso(cols - 0.6, -0.4, 0), iso(cols - 0.6, rows - 0.6, 0), iso(-0.4, rows - 0.6, 0)];
  pts.push(...plotPts);
  order.forEach(([c, r], i) => {
    pts.push(iso(c, r, hgt[i]), iso(c + 0.72, r, hgt[i]), iso(c + 0.72, r + 0.72, hgt[i]),
             iso(c, r + 0.72, hgt[i]), iso(c + 0.72, r + 0.72, 0), iso(c, r + 0.72, 0), iso(c + 0.72, r, 0));
  });
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const sc = Math.min((w - pad * 2) / (maxX - minX), (h - pad * 2) / (maxY - minY));
  const ox = pad + (w - pad * 2 - (maxX - minX) * sc) / 2 - minX * sc;
  const oy = pad + (h - pad * 2 - (maxY - minY) * sc) / 2 - minY * sc;
  const P = (p) => `${f(ox + p[0] * sc)},${f(oy + p[1] * sc)}`;

  let s = `<svg class="dwg dwg--iso" viewBox="0 0 ${w} ${h}" role="img" aria-label="Схема забудови: ${esc(cx.name)}, ${cx.buildings} корпусів">`;
  s += `<polygon class="plot" points="${plotPts.map(P).join(' ')}"/>`;
  order.forEach(([c, r], i) => {
    const z = hgt[i];
    s += `<g class="mass" style="--i:${i}">`;
    s += `<polygon class="m-top" points="${P(iso(c, r, z))} ${P(iso(c + 0.72, r, z))} ${P(iso(c + 0.72, r + 0.72, z))} ${P(iso(c, r + 0.72, z))}"/>`;
    s += `<polygon class="m-left" points="${P(iso(c, r + 0.72, z))} ${P(iso(c + 0.72, r + 0.72, z))} ${P(iso(c + 0.72, r + 0.72, 0))} ${P(iso(c, r + 0.72, 0))}"/>`;
    s += `<polygon class="m-right" points="${P(iso(c + 0.72, r + 0.72, z))} ${P(iso(c + 0.72, r, z))} ${P(iso(c + 0.72, r, 0))} ${P(iso(c + 0.72, r + 0.72, 0))}"/>`;
    s += '</g>';
  });
  return s + '</svg>';
}

/* --------------------------------------------------------------------------
   6. ШАХМАТКА — поверхи × секції, по три квартири на секцію
   -------------------------------------------------------------------------- */
export function chess(cx) {
  const rnd = seeded(cx.id.split('').reduce((a, c) => a + c.charCodeAt(0) * 31, 11));
  const perSec = 3;
  const secs = Math.max(2, cx.risers);
  const freeShare = cx.available / cx.units;
  const cells = [];
  for (let fl = cx.storeys; fl >= 1; fl--) {
    const row = [];
    for (let sIdx = 0; sIdx < secs; sIdx++) {
      for (let i = 0; i < perSec; i++) {
        const r = rnd();
        const boost = fl > cx.storeys - 3 ? 0.24 : 0;
        let st = 'sold';
        if (r < freeShare + boost) st = 'free';
        else if (r < freeShare + boost + 0.08) st = 'hold';
        row.push({ fl, sec: sIdx + 1, st, rooms: 1 + ((fl + i + sIdx) % 4), last: i === perSec - 1 });
      }
    }
    cells.push(row);
  }
  return { cells, secs, perSec };
}
