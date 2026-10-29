"use strict";

/* ==========================================================================
   PC Taqqos — asosiy dastur.
   Fayllar tartibi: i18n.js (tarjima) → data.js (katalog) → store.js (ma'lumotlar
   qatlami) → charts.js (grafiklar) → app.js (shu fayl).
   ========================================================================== */

/* ---------- Sozlamalar va holat ---------- */
const MAX_COMPARE = 3;
const DEFAULT_RATE = 12500;
const TYPES = ["Noutbuk", "Stol kompyuteri"];
const PURPOSES = ["Ofis", "Ijod", "Gaming"];
const LANGS = ["uz", "ru", "en"];

const state = {
  q: "", type: "all", purpose: "all", brand: "all",
  ram: "all", ssd: "all", screen: "all", battery: "all", favOnly: false,
  maxPrice: 0, sort: "score", compare: [], diffOnly: false
};

const prefs = Object.assign({ lang: "uz", theme: null, cur: "USD", rate: DEFAULT_RATE, name: "" }, LS.get(KEYS.prefs, {}) || {});
if (!LANGS.includes(prefs.lang)) prefs.lang = "uz";
if (prefs.cur !== "UZS") prefs.cur = "USD";
if (!(Number(prefs.rate) >= 1)) prefs.rate = DEFAULT_RATE;
if (prefs.theme !== "dark" && prefs.theme !== "light") {
  prefs.theme = (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
}
I18N.lang = prefs.lang;

let favs = new Set((LS.get(KEYS.fav, []) || []).map(Number));
const savePrefs = () => LS.set(KEYS.prefs, prefs);
const saveFavs = () => LS.set(KEYS.fav, [...favs]);

const $ = (id) => document.getElementById(id);
const qsa = (sel, root) => Array.from((root || document).querySelectorAll(sel));

/* ---------- Yordamchi funksiyalar ---------- */
const dash = "—";

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function money(usd) {
  if (prefs.cur === "UZS") {
    const v = Math.round((usd * prefs.rate) / 1000) * 1000;
    return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " " + t("cur.uzs");
  }
  return "$" + usd.toLocaleString("en-US");
}
function moneyShort(usd) {
  if (prefs.cur === "UZS") return (Math.round(((usd * prefs.rate) / 1e6) * 10) / 10) + " " + t("u.mln");
  return "$" + Math.round(usd).toLocaleString("en-US");
}
const size = (v) => (v >= 1000 ? v / 1000 + " TB" : v + " GB");

function starsHtml(n) {
  const full = Math.round(n);
  return '<span class="stars" aria-hidden="true">' + "★".repeat(full) + "☆".repeat(5 - full) + "</span>";
}

function toast(msg) {
  const el = $("toast");
  /* Modal oyna ochiq bo'lsa, xabar uning ichida ko'rinishi uchun ko'chiramiz */
  const host = document.querySelector("dialog[open]") || document.body;
  if (el.parentNode !== host) host.appendChild(el);
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2600);
}

function errMsg(err) {
  if (err && err.code && I18N.dict.uz["err." + err.code]) return t("err." + err.code);
  if (err && err.name === "TypeError") return t("err.network");
  return t("err.generic");
}

function icon(p) {
  const desktop = p.type !== "Noutbuk";
  return desktop
    ? '<svg class="icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><rect x="6" y="8" width="36" height="24" rx="2"/><path d="M18 40h12M24 32v8"/></svg>'
    : '<svg class="icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><rect x="9" y="10" width="30" height="20" rx="2"/><path d="M4 36h40l-3 -6H7z"/></svg>';
}

function download(name, text, mime) {
  const blob = new Blob([text], { type: mime + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function csvCell(v) {
  let s = String(v === null || v === undefined ? "" : v);
  if (/^[=+@\t\r]|^-[^\d.]/.test(s)) s = "'" + s;   // Excel formulalaridan himoya
  return '"' + s.replace(/"/g, '""') + '"';
}
const csvText = (rows) => "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";

const tType = (v) => tx("type", v);
const tPurpose = (v) => tx("purpose", v);
function tGpu(s) {
  return String(s)
    .replace("(integratsiyalangan)", "(" + t("gpu.integrated") + ")")
    .replace(/(\d+)-yadroli GPU/, (m, n) => t("gpu.cores", { n }));
}

/* ---------- Ma'lumotlarga kirish ---------- */
const all = () => Store.computers;
const find = (id) => all().find((p) => p.id === id);
const reviewsOf = (p) => p.reviews;
function ratingOf(p) {
  const r = reviewsOf(p);
  return r.length ? r.reduce((s, x) => s + x.stars, 0) / r.length : 0;
}
const valueOf = (p) => (p.score / p.price) * 100;
const uniq = (key) => [...new Set(all().map((p) => p[key]))].sort();

/* Katalog bo'yicha minimum/maksimumlar (radar va tavsiyalar uchun) */
function norms() {
  const L = all();
  const nums = (f) => L.map(f);
  return {
    minP: Math.min(...nums((p) => p.price)), maxP: Math.max(...nums((p) => p.price)),
    maxRam: Math.max(...nums((p) => p.ram)), maxSsd: Math.max(...nums((p) => p.storage)),
    maxBat: Math.max(1, ...nums((p) => p.battery || 0)),
    minW: Math.min(...nums((p) => p.weight)), maxW: Math.max(...nums((p) => p.weight)),
    maxVal: Math.max(...nums(valueOf))
  };
}
const AXES = [
  { l: "ax.perf", get: (p) => p.score },
  { l: "ax.cheap", get: (p, n) => (n.maxP === n.minP ? 100 : ((n.maxP - p.price) / (n.maxP - n.minP)) * 100) },
  { l: "ax.value", get: (p, n) => (valueOf(p) / n.maxVal) * 100 },
  { l: "ax.ram", get: (p, n) => (p.ram / n.maxRam) * 100 },
  { l: "ax.ssd", get: (p, n) => (p.storage / n.maxSsd) * 100 },
  { l: "ax.battery", get: (p, n) => ((p.battery || 0) / n.maxBat) * 100 },
  { l: "ax.light", get: (p, n) => (n.maxW === n.minW ? 100 : ((n.maxW - p.weight) / (n.maxW - n.minW)) * 100) }
];

/* ---------- Tema, til, valyuta ---------- */
function applyTheme() {
  document.documentElement.setAttribute("data-theme", prefs.theme);
  $("btn-theme").textContent = prefs.theme === "dark" ? "☀" : "☾";
}

function applyCurrencyUi() {
  qsa(".seg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cur === prefs.cur)));
  $("rate-box").hidden = prefs.cur !== "UZS";
  if (document.activeElement !== $("rate")) $("rate").value = prefs.rate;
  $("price-out").textContent = money(state.maxPrice);
}

function applyI18n() {
  document.documentElement.lang = I18N.lang;
  document.title = t("app.title");
  qsa("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  qsa("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  qsa("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
  $("s-lang").value = I18N.lang;
  $("mode-info").textContent = t("mode." + Store.mode);
  fillFilters();
  applyCurrencyUi();
}

/* ---------- Filtrlar ---------- */
function fillSel(id, values, labelFn, current) {
  const sel = $(id);
  sel.innerHTML = '<option value="all">' + esc(t("f.all")) + "</option>" +
    values.map((v) => '<option value="' + esc(v) + '">' + esc(labelFn ? labelFn(v) : v) + "</option>").join("");
  sel.value = values.map(String).includes(String(current)) ? String(current) : "all";
  return sel.value;
}

function fillFilters() {
  state.type = fillSel("f-type", uniq("type"), tType, state.type);
  state.purpose = fillSel("f-purpose", uniq("purpose"), tPurpose, state.purpose);
  state.brand = fillSel("f-brand", uniq("brand"), null, state.brand);
  state.ram = fillSel("f-ram", [8, 16, 32, 64], (v) => t("opt.ramMin", { v }), state.ram);
  state.ssd = fillSel("f-ssd", [256, 512, 1000, 2000], (v) => t("opt.ssdMin", { v: size(v) }), state.ssd);
  state.screen = fillSel("f-screen", ["small", "mid", "big"], (v) => t("screen." + v), state.screen);
  state.battery = fillSel("f-battery", [8, 12, 16], (v) => t("opt.batMin", { v }), state.battery);
  $("f-fav").checked = state.favOnly;
  $("f-sort").value = state.sort;
}

function syncPriceRange(initial) {
  const r = $("f-price");
  const prices = all().map((p) => p.price);
  const atMax = initial || Number(r.value) >= Number(r.max);
  r.min = Math.floor(Math.min(...prices) / 50) * 50;
  r.max = Math.ceil(Math.max(...prices) / 50) * 50;
  if (atMax) r.value = r.max;
  r.value = Math.min(Number(r.value), Number(r.max));
  state.maxPrice = Number(r.value);
  $("price-out").textContent = money(state.maxPrice);
}

function screenCat(v) {
  if (v === null || v === undefined) return null;
  return v < 14 ? "small" : v < 16 ? "mid" : "big";
}

function filtered() {
  const q = state.q.trim().toLowerCase();
  const list = all().filter((p) =>
    (state.type === "all" || p.type === state.type) &&
    (state.purpose === "all" || p.purpose === state.purpose) &&
    (state.brand === "all" || p.brand === state.brand) &&
    p.price <= state.maxPrice &&
    (state.ram === "all" || p.ram >= Number(state.ram)) &&
    (state.ssd === "all" || p.storage >= Number(state.ssd)) &&
    (state.screen === "all" || screenCat(p.screen) === state.screen) &&
    (state.battery === "all" || (p.battery !== null && p.battery !== undefined && p.battery >= Number(state.battery))) &&
    (!state.favOnly || favs.has(p.id)) &&
    (!q || [p.brand, p.model, p.cpu, p.gpu, p.type, p.purpose, tType(p.type), tPurpose(p.purpose)].join(" ").toLowerCase().includes(q))
  );
  const sorters = {
    "score": (a, b) => b.score - a.score,
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    "value": (a, b) => valueOf(b) - valueOf(a),
    "rating": (a, b) => ratingOf(b) - ratingOf(a)
  };
  return list.sort(sorters[state.sort]);
}

/* ---------- Ro'yxatni chizish ---------- */
function cardHtml(p) {
  const sel = state.compare.includes(p.id);
  const isFav = favs.has(p.id);
  const n = reviewsOf(p).length;
  return `
  <article class="card${sel ? " selected" : ""}">
    <div class="card-head">
      ${icon(p)}
      <div class="titles">
        <p class="brand">${esc(p.brand)}</p>
        <h3>${esc(p.model)}</h3>
      </div>
      <span class="price">${esc(money(p.price))}</span>
    </div>
    <div class="tags">
      <span class="tag">${esc(tType(p.type))}</span><span class="tag">${esc(tPurpose(p.purpose))}</span>
      <button class="fav${isFav ? " on" : ""}" type="button" data-fav="${p.id}" aria-pressed="${isFav}" aria-label="${esc(t(isFav ? "fav.remove" : "fav.add"))}">${isFav ? "♥" : "♡"}</button>
    </div>
    <dl class="specs">
      <div><dt>${esc(t("card.cpu"))}</dt><dd>${esc(p.cpu)}</dd></div>
      <div><dt>${esc(t("card.ram"))}</dt><dd>${p.ram} GB</dd></div>
      <div><dt>${esc(t("card.ssd"))}</dt><dd>${size(p.storage)}</dd></div>
      <div><dt>${esc(t("card.gpu"))}</dt><dd>${esc(tGpu(p.gpu))}</dd></div>
    </dl>
    <div class="perf">
      <span>${esc(t("card.perf"))}</span>
      <div class="bar"><i style="width:${p.score}%"></i></div>
      <b>${p.score}</b>
    </div>
    <div class="card-foot">
      <label class="cmp"><input type="checkbox" data-cmp="${p.id}" ${sel ? "checked" : ""}> ${esc(t("card.compare"))}</label>
      <button class="link" type="button" data-detail="${p.id}" aria-label="${esc(t("card.details", { model: p.brand + " " + p.model }))}">${starsHtml(ratingOf(p))} ${ratingOf(p).toFixed(1)} (${n})</button>
    </div>
  </article>`;
}

function render() {
  const list = filtered();
  $("count").textContent = list.length ? t("count", { n: list.length }) : "";
  $("grid").innerHTML = list.length
    ? list.map(cardHtml).join("")
    : '<div class="empty">' + esc(t("empty")) + "</div>";
  renderTray();
  syncHash();
}

/* Qayta chizishdan keyin klaviatura fokusi yo'qolmasligi uchun */
function renderKeepFocus(selector) {
  render();
  const el = document.querySelector(selector);
  if (el) el.focus();
}

/* ---------- Taqqoslash paneli ---------- */
function toggleCompare(id) {
  const i = state.compare.indexOf(id);
  if (i >= 0) {
    state.compare.splice(i, 1);
  } else if (state.compare.length >= MAX_COMPARE) {
    toast(t("tray.max", { n: MAX_COMPARE }));
    return false;
  } else {
    state.compare.push(id);
  }
  render();
  return true;
}

function renderTray() {
  state.compare = state.compare.filter((id) => find(id));
  const n = state.compare.length;
  $("tray").hidden = n === 0;
  $("chips").innerHTML = state.compare.map((id) => {
    const p = find(id);
    const name = p.brand + " " + p.model;
    return '<span class="chip">' + esc(name) +
      '<button type="button" data-remove="' + id + '" aria-label="' + esc(t("tray.remove", { name })) + '">&times;</button></span>';
  }).join("");
  $("go").disabled = n < 2;
  $("go").textContent = n < 2 ? t("tray.need") : t("tray.go", { n });
}

/* Havola orqali ulashish: #compare=3,8,9 */
function hashIds() {
  const m = /^#compare=([\d,]+)$/.exec(location.hash);
  if (!m) return [];
  return [...new Set(m[1].split(",").map(Number))].filter((id) => find(id)).slice(0, MAX_COMPARE);
}
function syncHash() {
  const want = state.compare.length ? "#compare=" + state.compare.join(",") : "";
  if (location.hash === want) return;
  if (!want && !location.hash.startsWith("#compare")) return;
  try {
    history.replaceState(null, "", want || (location.pathname + location.search));
  } catch (e) {
    try { location.hash = want; } catch (e2) { /* ruxsat yo'q */ }
  }
}

/* Taqqoslash jadvali: qaysi qator qaysi tomonga "yaxshi" hisoblanadi */
const ROWS = [
  { l: "row.price", get: (p) => p.price, fmt: money, best: "min" },
  { l: "row.cpu", get: (p) => p.cpu },
  { l: "row.cores", get: (p) => p.cores, fmt: (v) => String(v), best: "max" },
  { l: "row.ram", get: (p) => p.ram, fmt: (v) => t("u.gb", { v }), best: "max" },
  { l: "row.ssd", get: (p) => p.storage, fmt: size, best: "max" },
  { l: "row.gpu", get: (p) => p.gpu, fmt: tGpu },
  { l: "row.screen", get: (p) => p.screen, fmt: (v) => t("u.inch", { v }) },
  { l: "row.battery", get: (p) => p.battery, fmt: (v) => t("u.hour", { v }), best: "max" },
  { l: "row.weight", get: (p) => p.weight, fmt: (v) => t("u.kg", { v }), best: "min" },
  { l: "row.score", get: (p) => p.score, fmt: (v) => t("u.score", { v }), best: "max" },
  { l: "row.value", get: (p) => Math.round(valueOf(p) * 10) / 10, fmt: (v) => String(v), best: "max" },
  { l: "row.rating", get: (p) => (reviewsOf(p).length ? Math.round(ratingOf(p) * 10) / 10 : null), fmt: (v) => t("u.stars", { v }), best: "max" }
];

function buildCompare() {
  const items = state.compare.map(find).filter(Boolean);
  const wins = items.map(() => 0);
  const rows = ROWS.map((row) => {
    const vals = items.map(row.get);
    let bestVal = null;
    if (row.best) {
      const nums = vals.filter((v) => v !== null && v !== undefined);
      const same = nums.length > 0 && nums.every((v) => v === nums[0]);
      if (nums.length && !same) bestVal = row.best === "max" ? Math.max(...nums) : Math.min(...nums);
    }
    const cells = vals.map((v, i) => {
      const isBest = bestVal !== null && v === bestVal;
      if (isBest) wins[i]++;
      let delta = "";
      if (bestVal !== null && !isBest && v !== null && v !== undefined && bestVal !== 0) {
        const pct = ((v - bestVal) / bestVal) * 100;
        const a = Math.abs(pct);
        delta = (pct > 0 ? "+" : "−") + (a < 1 ? "<1" : Math.round(a)) + "%";
      }
      const text = v === null || v === undefined ? dash : (row.fmt ? row.fmt(v) : String(v));
      return { text, best: isBest, delta };
    });
    const same = vals.every((v) => v === vals[0]);
    return { label: t(row.l), cells, same };
  });
  return { items, rows, wins };
}

function openCompare() {
  const { items, rows, wins } = buildCompare();
  if (items.length < 2) return;
  state.diffOnly = $("diff-only").checked;
  const shown = state.diffOnly ? rows.filter((r) => !r.same) : rows;

  $("table").innerHTML =
    "<thead><tr><th></th>" +
    items.map((p) => '<th scope="col"><small>' + esc(p.brand) + "</small>" + esc(p.model) + "</th>").join("") +
    "</tr></thead><tbody>" +
    (shown.length
      ? shown.map((r) => '<tr><th scope="row">' + esc(r.label) + "</th>" + r.cells.map((c) =>
          '<td class="' + (c.best ? "best" : "") + '">' + esc(c.text) +
          (c.delta ? '<span class="delta">' + c.delta + "</span>" : "") + "</td>").join("") + "</tr>").join("")
      : '<tr><td colspan="' + (items.length + 1) + '">' + esc(t("cmp.noDiff")) + "</td></tr>") +
    "</tbody>";

  const top = Math.max(...wins);
  const leaders = items.filter((_, i) => wins[i] === top);
  $("winner").textContent = leaders.length === 1
    ? t("cmp.winner.one", { name: leaders[0].brand + " " + leaders[0].model, n: top })
    : t("cmp.winner.tie", { names: leaders.map((p) => p.brand + " " + p.model).join(" / "), n: top });

  const n = norms();
  const series = items.map((p) => ({ values: AXES.map((a) => a.get(p, n)) }));
  $("radar-wrap").innerHTML =
    '<p class="radar-title">' + esc(t("cmp.radar")) + "</p>" +
    Charts.radar(series, AXES.map((a) => t(a.l)), t("cmp.radarAria")) +
    '<ul class="rlegend">' + items.map((p, i) =>
      '<li><i style="border-top-color:' + Charts.COLORS[i % 3] + ";border-top-style:" + (i === 0 ? "solid" : i === 1 ? "dashed" : "dotted") + '"></i>' +
      esc(p.brand + " " + p.model) + "</li>").join("") + "</ul>";

  if (!$("dlg-compare").open) $("dlg-compare").showModal();
}

async function copyLink() {
  syncHash();
  const url = location.href;
  try {
    await navigator.clipboard.writeText(url);
    toast(t("cmp.copied"));
    return;
  } catch (e) { /* zaxira usul */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = url;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    $("dlg-compare").appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    toast(ok ? t("cmp.copied") : t("cmp.copyFail"));
  } catch (e) {
    toast(t("cmp.copyFail"));
  }
}

function compareCsv() {
  const { items, rows } = buildCompare();
  const data = [[""].concat(items.map((p) => p.brand + " " + p.model))]
    .concat(rows.map((r) => [r.label].concat(r.cells.map((c) => c.text))));
  download("pc-taqqos-taqqoslash.csv", csvText(data), "text/csv");
  toast(t("cmp.saved"));
}

/* ---------- Batafsil va sharhlar ---------- */
let currentId = null;
let editingRid = null;

function openDetail(id) {
  currentId = id;
  editingRid = null;
  renderDetail();
  if (!$("dlg-detail").open) $("dlg-detail").showModal();
}

function reviewItemHtml(r) {
  const acts = [];
  if (r.mine) acts.push('<button class="link" type="button" data-redit="' + esc(r.rid) + '">' + esc(t("rev.editBtn")) + "</button>");
  if (Store.canDeleteReview(r)) acts.push('<button class="link danger" type="button" data-rdel="' + esc(r.rid) + '">' + esc(t("rev.delBtn")) + "</button>");
  return "<li><b>" + esc(r.name) + "</b>" + (r.mine ? '<span class="rev-me">' + esc(t("rev.mine")) + "</span>" : "") +
    starsHtml(r.stars) + "<p>" + esc(r.text) + "</p>" +
    (acts.length ? '<div class="rev-act">' + acts.join("") + "</div>" : "") + "</li>";
}

function renderDetail() {
  const p = find(currentId);
  if (!p) { $("dlg-detail").close(); return; }
  $("d-title").textContent = p.brand + " " + p.model;
  const rows = [
    [t("row.price"), esc(money(p.price))],
    [t("row.cpu"), esc(t("det.cpuCores", { cpu: p.cpu, n: p.cores }))],
    [t("row.ram"), p.ram + " GB"], [t("row.ssd"), size(p.storage)],
    [t("row.gpu"), esc(tGpu(p.gpu))],
    [t("row.screen"), p.screen ? esc(t("u.inch", { v: p.screen })) : dash],
    [t("row.battery"), p.battery ? esc(t("u.hour", { v: p.battery })) : dash],
    [t("row.weight"), esc(t("u.kg", { v: p.weight }))]
  ];
  const editing = editingRid !== null ? reviewsOf(p).find((r) => String(r.rid) === String(editingRid)) : null;
  const val = editing || { name: prefs.name || "", stars: 5, text: "" };
  $("d-body").innerHTML =
    '<dl class="specs" style="padding:0">' + rows.map((r) => "<div><dt>" + esc(r[0]) + "</dt><dd>" + r[1] + "</dd></div>").join("") + "</dl>" +
    '<h3 class="d-h">' + esc(t("det.reviews")) + "</h3>" +
    '<ul class="rev-list" id="rev-list">' +
    (reviewsOf(p).length ? reviewsOf(p).map(reviewItemHtml).join("") : '<li><p>' + esc(t("det.noReviews")) + "</p></li>") + "</ul>" +
    '<h3 class="d-h" id="rev-title">' + esc(t(editing ? "det.edit" : "det.leave")) + "</h3>" +
    '<form class="rev" id="rev-form">' +
    '<div class="row"><input name="rname" placeholder="' + esc(t("rev.name")) + '" aria-label="' + esc(t("rev.name")) + '" maxlength="30" required value="' + esc(val.name) + '">' +
    '<select name="rstars" aria-label="' + esc(t("rev.stars")) + '">' +
    [5, 4, 3, 2, 1].map((s) => '<option value="' + s + '"' + (s === val.stars ? " selected" : "") + ">" + s + " ★</option>").join("") + "</select></div>" +
    '<textarea name="rtext" rows="3" placeholder="' + esc(t("rev.text")) + '" aria-label="' + esc(t("rev.text")) + '" maxlength="300" required>' + esc(val.text) + "</textarea>" +
    '<div class="btns"><button class="btn" type="submit">' + esc(t(editing ? "rev.save" : "rev.send")) + "</button>" +
    (editing ? '<button class="btn ghost" type="button" id="rev-cancel">' + esc(t("rev.cancel")) + "</button>" : "") + "</div></form>";
  $("rev-form").addEventListener("submit", submitReview);
  const cancel = $("rev-cancel");
  if (cancel) cancel.addEventListener("click", () => { editingRid = null; renderDetail(); });
}

async function submitReview(e) {
  e.preventDefault();
  const f = e.target;
  const p = find(currentId);
  const review = {
    name: f.elements.rname.value.trim(),
    stars: Number(f.elements.rstars.value),
    text: f.elements.rtext.value.trim()
  };
  if (!review.name || !review.text) return;
  const btn = f.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    if (editingRid !== null) {
      await Store.updateReview(p.id, editingRid, review);
      toast(t("rev.updated"));
    } else {
      await Store.addReview(p.id, review);
      toast(t("rev.added"));
    }
    prefs.name = review.name;
    savePrefs();
    editingRid = null;
    renderDetail();
    render();
  } catch (err) {
    toast(errMsg(err));
    btn.disabled = false;
  }
}

async function onDetailClick(e) {
  const ed = e.target.closest("[data-redit]");
  const del = e.target.closest("[data-rdel]");
  if (ed) {
    editingRid = ed.dataset.redit;
    renderDetail();
    $("rev-title").scrollIntoView({ block: "center" });
    $("rev-form").elements.rtext.focus();
  } else if (del) {
    if (!window.confirm(t("rev.confirmDel"))) return;
    try {
      await Store.deleteReview(currentId, del.dataset.rdel);
      if (editingRid === del.dataset.rdel) editingRid = null;
      toast(t("rev.deleted"));
      renderDetail();
      render();
    } catch (err) { toast(errMsg(err)); }
  }
}

/* ---------- "Menga mos kompyuter" ---------- */
function recommend(pref) {
  const n = norms();
  const pool = all().filter((p) =>
    p.price <= pref.budget &&
    (pref.purpose === "all" || p.purpose === pref.purpose) &&
    (pref.type === "all" || p.type === pref.type));
  const sum = pref.wp + pref.wv + pref.wm;
  const wp = sum ? pref.wp : 1, wv = sum ? pref.wv : 1, wm = sum ? pref.wm : 1;
  const wsum = wp + wv + wm;
  return pool.map((p) => {
    const perf = p.score / 100;
    const value = valueOf(p) / n.maxVal;
    const light = n.maxW === n.minW ? 1 : (n.maxW - p.weight) / (n.maxW - n.minW);
    const mob = ((p.battery || 0) / n.maxBat) * 0.5 + light * 0.5;
    const match = (wp * perf + wv * value + wm * mob) / wsum;
    return { p, pct: Math.round(match * 100) };
  }).sort((a, b) => b.pct - a.pct).slice(0, 3);
}

function setupAdvisor() {
  const r = $("adv-budget");
  const prices = all().map((p) => p.price);
  const min = Math.floor(Math.min(...prices) / 50) * 50, max = Math.ceil(Math.max(...prices) / 50) * 50;
  const keep = setupAdvisor.done ? Number(r.value) : 1200;
  setupAdvisor.done = true;
  r.min = min; r.max = max;
  r.value = Math.min(Math.max(keep, min), max);
  const keepP = $("adv-purpose").value || "all", keepT = $("adv-type").value || "all";
  fillSel("adv-purpose", uniq("purpose"), tPurpose, keepP);
  fillSel("adv-type", uniq("type"), tType, keepT);
}

function renderAdvice() {
  const pref = {
    budget: Number($("adv-budget").value), purpose: $("adv-purpose").value, type: $("adv-type").value,
    wp: Number($("w-perf").value), wv: Number($("w-value").value), wm: Number($("w-mob").value)
  };
  $("adv-budget-out").textContent = money(pref.budget);
  const res = recommend(pref);
  let h = "";
  if (!res.length) {
    const same = all().filter((p) => (pref.purpose === "all" || p.purpose === pref.purpose) && (pref.type === "all" || p.type === pref.type));
    if (same.length) {
      const c = same.reduce((a, b) => (a.price <= b.price ? a : b));
      h = '<p class="empty">' + esc(t("adv.none")) + "<br>" + esc(t("adv.cheapest", { name: c.brand + " " + c.model, price: money(c.price) })) + "</p>";
    } else {
      h = '<p class="empty">' + esc(t("adv.nothing")) + "</p>";
    }
  } else {
    h = res.map((r, i) => {
      const p = r.p;
      const inCmp = state.compare.includes(p.id);
      const facts = [t("adv.f.perf", { v: p.score }), t("adv.f.price", { v: money(p.price) }),
        p.battery ? t("adv.f.mob", { b: p.battery, w: p.weight }) : t("adv.f.weight", { w: p.weight })];
      return '<article class="adv-card"><div class="adv-top"><div><p class="brand">' + esc(p.brand) + "</p><h3>" + (i + 1) + ". " + esc(p.model) + "</h3></div>" +
        '<span class="price">' + esc(money(p.price)) + "</span></div>" +
        '<div class="match"><div class="bar"><i style="width:' + r.pct + '%"></i></div><span>' + esc(t("adv.match", { n: r.pct })) + "</span></div>" +
        "<ul>" + facts.map((f) => "<li>" + esc(f) + "</li>").join("") + "</ul>" +
        '<div class="adv-btns"><button class="btn ghost sm" type="button" data-adv-detail="' + p.id + '">' + esc(t("adv.details")) + "</button>" +
        '<button class="btn sm" type="button" data-adv-cmp="' + p.id + '"' + (inCmp ? " disabled" : "") + ">" + esc(t(inCmp ? "adv.inCmp" : "adv.addCmp")) + "</button></div></article>";
    }).join("");
    if (state.compare.length >= 2) h += '<button id="adv-go" class="btn adv-go" type="button">' + esc(t("adv.go", { n: state.compare.length })) + "</button>";
  }
  $("adv-result").innerHTML = h;
}

function openAdvisor() {
  setupAdvisor();
  renderAdvice();
  if (!$("dlg-advisor").open) $("dlg-advisor").showModal();
}

/* ---------- Narx va unumdorlik xaritasi ---------- */
function openMap() {
  renderMap();
  if (!$("dlg-map").open) $("dlg-map").showModal();
}
function renderMap() {
  const pts = all().map((p) => ({
    id: p.id, x: p.price, y: p.score, purpose: p.purpose,
    short: (p.brand + " " + p.model).replace(/\s*\(.*?\)\s*/g, " ").trim().slice(0, 22),
    label: p.brand + " " + p.model + " — " + money(p.price) + ", " + p.score + "/100"
  }));
  $("map").innerHTML = Charts.scatter(pts, { xLabel: t("map.x"), yLabel: t("map.y"), fmtX: moneyShort, aria: t("map.aria") });
  $("map-legend").innerHTML = uniq("purpose").map((pu) =>
    '<span><b style="color:' + (Charts.PURPOSE_COLOR[pu] || Charts.COLORS[0]) + '">' + (Charts.PURPOSE_SHAPE[pu] || "●") + "</b> " + esc(tPurpose(pu)) + "</span>").join("");
}

/* ---------- Boshqaruv (qo'shish, o'chirish, import/eksport) ---------- */
const num = (v, lo, hi, int, opt) => {
  if (v === null || v === undefined || v === "") return opt ? null : NaN;
  const x = Number(v);
  if (!Number.isFinite(x) || x < lo || x > hi || (int && !Number.isInteger(x))) return NaN;
  return x;
};
const str = (v, max) => (typeof v === "string" && v.trim() && v.trim().length <= max ? v.trim() : null);

/* Kiritilgan kompyuterni tekshiradi (serverdagi qoidalar bilan bir xil). Noto'g'ri bo'lsa null */
function cleanComputer(o) {
  if (!o || typeof o !== "object") return null;
  const c = {
    brand: str(o.brand, 40), model: str(o.model, 60),
    type: TYPES.includes(o.type) ? o.type : null, purpose: PURPOSES.includes(o.purpose) ? o.purpose : null,
    cpu: str(o.cpu, 80), cores: num(o.cores, 1, 128, true),
    ram: num(o.ram, 1, 1024, true), storage: num(o.storage, 1, 100000, true),
    gpu: str(o.gpu, 80), screen: num(o.screen, 5, 100, false, true), battery: num(o.battery, 0, 100, true, true),
    weight: num(o.weight, 0.1, 100), price: num(o.price, 1, 1000000, true), score: num(o.score, 0, 100, true)
  };
  for (const k of Object.keys(c)) {
    const v = c[k];
    if (v === null && k !== "screen" && k !== "battery") return null;
    if (typeof v === "number" && Number.isNaN(v)) return null;
  }
  return c;
}
const exists = (c) => all().some((p) => p.brand.toLowerCase() === c.brand.toLowerCase() && p.model.toLowerCase() === c.model.toLowerCase());

function fieldHtml(id, key, type, extra) {
  return '<div class="field"><label for="ac-' + id + '">' + esc(t("fld." + key)) + '</label><input id="ac-' + id + '" name="' + id + '" type="' + type + '" ' + (extra || "") + "></div>";
}
function selectFieldHtml(id, key, values, fn) {
  return '<div class="field"><label for="ac-' + id + '">' + esc(t("fld." + key)) + '</label><select id="ac-' + id + '" name="' + id + '">' +
    values.map((v) => '<option value="' + esc(v) + '">' + esc(fn(v)) + "</option>").join("") + "</select></div>";
}

function renderAdmin() {
  const server = Store.mode === "server";
  const can = Store.canManage();
  let h = '<div class="adm"><p class="note">' + esc(t(server ? "adm.mode.server" : "adm.mode.local")) + "</p>";

  if (!can) {
    h += '<h3>' + esc(t("adm.login")) + '</h3><p class="note">' + esc(t("adm.needLogin")) + "</p>" +
      '<form id="adm-login" class="adm-row"><div class="field"><label for="adm-pass">' + esc(t("adm.password")) + '</label>' +
      '<input id="adm-pass" type="password" autocomplete="current-password" required></div>' +
      '<button class="btn" type="submit">' + esc(t("adm.loginBtn")) + "</button></form>";
  } else {
    if (server) {
      h += '<div class="adm-row"><span>' + esc(t("adm.loggedIn")) + '</span><button id="adm-logout" class="btn ghost sm" type="button">' + esc(t("adm.logout")) + "</button></div>";
    }
    h += "<h3>" + esc(t("adm.add")) + '</h3><form id="ac-form" class="adm-grid">' +
      fieldHtml("brand", "brand", "text", 'maxlength="40" required') +
      fieldHtml("model", "model", "text", 'maxlength="60" required') +
      selectFieldHtml("type", "type", TYPES, tType) +
      selectFieldHtml("purpose", "purpose", PURPOSES, tPurpose) +
      fieldHtml("cpu", "cpu", "text", 'maxlength="80" required') +
      fieldHtml("cores", "cores", "number", 'min="1" max="128" step="1" required') +
      fieldHtml("ram", "ram", "number", 'min="1" max="1024" step="1" required') +
      fieldHtml("storage", "storage", "number", 'min="1" max="100000" step="1" required') +
      fieldHtml("gpu", "gpu", "text", 'maxlength="80" required') +
      fieldHtml("screen", "screen", "number", 'min="5" max="100" step="0.1"') +
      fieldHtml("battery", "battery", "number", 'min="0" max="100" step="1"') +
      fieldHtml("weight", "weight", "number", 'min="0.1" max="100" step="0.01" required') +
      fieldHtml("price", "price", "number", 'min="1" max="1000000" step="1" required') +
      fieldHtml("score", "score", "number", 'min="0" max="100" step="1" required') +
      '<button class="btn" type="submit">' + esc(t("adm.addBtn")) + "</button></form>";

    const managed = all().filter((p) => Store.canDeleteComputer(p));
    h += "<h3>" + esc(t("adm.list")) + "</h3>" + (managed.length
      ? '<ul class="adm-list">' + managed.map((p) => "<li><span>" + esc(p.brand + " " + p.model) + " — " + esc(money(p.price)) +
          '</span><button class="btn danger sm" type="button" data-del-pc="' + p.id + '">' + esc(t("adm.delete")) + "</button></li>").join("") + "</ul>"
      : '<p class="note">' + esc(t("adm.noCustom")) + "</p>");
  }

  h += "<h3>" + esc(t("adm.data")) + '</h3><div class="adm-row">' +
    '<button id="adm-json" class="btn ghost sm" type="button">' + esc(t("adm.exportJson")) + "</button>" +
    '<button id="adm-csv" class="btn ghost sm" type="button">' + esc(t("adm.exportCsv")) + "</button>" +
    '<span class="btn ghost sm file-btn">' + esc(t("adm.import")) + '<input id="adm-import" type="file" accept=".json,application/json" aria-label="' + esc(t("adm.import")) + '"></span></div></div>';
  $("admin-body").innerHTML = h;

  const login = $("adm-login");
  if (login) login.addEventListener("submit", onLogin);
  const out = $("adm-logout");
  if (out) out.addEventListener("click", () => { Store.logout(); renderAdmin(); });
  const form = $("ac-form");
  if (form) form.addEventListener("submit", onAddComputer);
  $("adm-json").addEventListener("click", exportJson);
  $("adm-csv").addEventListener("click", exportCatalogCsv);
  $("adm-import").addEventListener("change", onImport);
}

async function onLogin(e) {
  e.preventDefault();
  const btn = e.target.querySelector("button");
  btn.disabled = true;
  try {
    await Store.login($("adm-pass").value);
    renderAdmin();
    render();
  } catch (err) {
    toast(err && err.code === "unauthorized" ? t("adm.badPass") : errMsg(err));
    btn.disabled = false;
  }
}

async function afterDataChange() {
  syncPriceRange(false);
  fillFilters();
  render();
  if ($("dlg-compare").open) { if (state.compare.length >= 2) openCompare(); else $("dlg-compare").close(); }
  if ($("dlg-admin").open) renderAdmin();
}

async function onAddComputer(e) {
  e.preventDefault();
  const f = e.target;
  const g = (k) => f.elements[k].value;
  const c = cleanComputer({
    brand: g("brand"), model: g("model"), type: g("type"), purpose: g("purpose"), cpu: g("cpu"), cores: g("cores"),
    ram: g("ram"), storage: g("storage"), gpu: g("gpu"), screen: g("screen"), battery: g("battery"),
    weight: g("weight"), price: g("price"), score: g("score")
  });
  if (!c) { toast(t("err.invalid")); return; }
  if (exists(c)) { toast(t("adm.exists")); return; }
  const btn = f.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    await Store.addComputer(c);
    toast(t("adm.added"));
    await afterDataChange();
  } catch (err) {
    toast(errMsg(err));
    btn.disabled = false;
  }
}

async function onDeleteComputer(id) {
  const p = find(id);
  if (!p || !window.confirm(t("adm.confirmDelPc", { name: p.brand + " " + p.model }))) return;
  try {
    await Store.deleteComputer(id);
    favs.delete(id);
    saveFavs();
    toast(t("adm.deleted"));
    await afterDataChange();
  } catch (err) { toast(errMsg(err)); }
}

function exportJson() {
  const data = all().map((p) => ({
    id: p.id, brand: p.brand, model: p.model, type: p.type, purpose: p.purpose, cpu: p.cpu, cores: p.cores, ram: p.ram,
    storage: p.storage, gpu: p.gpu, screen: p.screen, battery: p.battery, weight: p.weight, price: p.price, score: p.score,
    reviews: p.reviews.map((r) => ({ name: r.name, stars: r.stars, text: r.text }))
  }));
  download("pc-taqqos-katalog.json", JSON.stringify(data, null, 2), "application/json");
}

function exportCatalogCsv() {
  const head = ["id", "brand", "model", "type", "purpose", "cpu", "cores", "ram_gb", "ssd_gb", "gpu", "screen_in", "battery_h", "weight_kg", "price_usd", "score", "avg_rating", "reviews"];
  const rows = all().map((p) => [p.id, p.brand, p.model, p.type, p.purpose, p.cpu, p.cores, p.ram, p.storage, p.gpu,
    p.screen, p.battery, p.weight, p.price, p.score, reviewsOf(p).length ? ratingOf(p).toFixed(2) : "", reviewsOf(p).length]);
  download("pc-taqqos-katalog.csv", csvText([head].concat(rows)), "text/csv");
}

async function onImport(e) {
  const file = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!file) return;
  if (!Store.canManage()) { toast(t("adm.importNeedAdmin")); return; }
  let list;
  try {
    const data = JSON.parse(await file.text());
    list = Array.isArray(data) ? data : (data && Array.isArray(data.computers) ? data.computers : null);
  } catch (err) { list = null; }
  if (!list) { toast(t("adm.importBad")); return; }
  let ok = 0, skip = 0;
  for (const item of list) {
    const c = cleanComputer(item);
    if (!c || exists(c)) { skip++; continue; }
    try { await Store.addComputer(c); ok++; } catch (err) { skip++; }
  }
  toast(t("adm.imported", { ok, skip }));
  await afterDataChange();
}

/* ---------- Ochiq oynalarni yangilash (til/valyuta o'zgarganda) ---------- */
function refreshOpenDialogs() {
  if ($("dlg-compare").open) openCompare();
  if ($("dlg-detail").open) renderDetail();
  if ($("dlg-advisor").open) { setupAdvisor(); renderAdvice(); }
  if ($("dlg-map").open) renderMap();
  if ($("dlg-admin").open) renderAdmin();
}

function refreshAll() {
  applyCurrencyUi();
  render();
  refreshOpenDialogs();
}

/* ---------- Hodisalar ---------- */
function resetFilters() {
  Object.assign(state, { q: "", type: "all", purpose: "all", brand: "all", ram: "all", ssd: "all", screen: "all", battery: "all", favOnly: false, sort: "score" });
  $("q").value = "";
  $("f-price").value = $("f-price").max;
  state.maxPrice = Number($("f-price").max);
  fillFilters();
  $("price-out").textContent = money(state.maxPrice);
  render();
}

function bind() {
  $("q").addEventListener("input", (e) => { state.q = e.target.value; render(); });
  [["f-type", "type"], ["f-purpose", "purpose"], ["f-brand", "brand"], ["f-ram", "ram"], ["f-ssd", "ssd"],
    ["f-screen", "screen"], ["f-battery", "battery"], ["f-sort", "sort"]].forEach(([id, key]) => {
    $(id).addEventListener("change", (e) => { state[key] = e.target.value; render(); });
  });
  $("f-fav").addEventListener("change", (e) => { state.favOnly = e.target.checked; render(); });
  $("f-price").addEventListener("input", (e) => {
    state.maxPrice = Number(e.target.value);
    $("price-out").textContent = money(state.maxPrice);
    render();
  });
  $("reset").addEventListener("click", resetFilters);
  $("ftoggle").addEventListener("click", () => {
    const box = document.querySelector(".filters");
    const open = box.classList.toggle("open");
    $("ftoggle").setAttribute("aria-expanded", String(open));
  });

  $("grid").addEventListener("change", (e) => {
    const id = e.target.dataset.cmp;
    if (!id) return;
    if (!toggleCompare(Number(id))) e.target.checked = false;
    else { const el = document.querySelector('[data-cmp="' + id + '"]'); if (el) el.focus(); }
  });
  $("grid").addEventListener("click", (e) => {
    const fav = e.target.closest("[data-fav]");
    if (fav) {
      const id = Number(fav.dataset.fav);
      if (favs.has(id)) favs.delete(id); else favs.add(id);
      saveFavs();
      renderKeepFocus('[data-fav="' + id + '"]');
      return;
    }
    const btn = e.target.closest("[data-detail]");
    if (btn) openDetail(Number(btn.dataset.detail));
  });
  $("chips").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove]");
    if (btn) toggleCompare(Number(btn.dataset.remove));
  });
  $("clear").addEventListener("click", () => { state.compare = []; render(); });
  $("go").addEventListener("click", openCompare);

  /* Taqqoslash oynasi */
  $("diff-only").addEventListener("change", openCompare);
  $("cmp-link").addEventListener("click", copyLink);
  $("cmp-csv").addEventListener("click", compareCsv);
  $("cmp-print").addEventListener("click", () => window.print());

  /* Batafsil */
  $("d-body").addEventListener("click", onDetailClick);

  /* Tavsiya */
  $("btn-advisor").addEventListener("click", openAdvisor);
  $("adv-form").addEventListener("input", renderAdvice);
  $("adv-form").addEventListener("change", renderAdvice);
  $("adv-result").addEventListener("click", (e) => {
    const d = e.target.closest("[data-adv-detail]");
    const c = e.target.closest("[data-adv-cmp]");
    if (d) { $("dlg-advisor").close(); openDetail(Number(d.dataset.advDetail)); }
    if (c && toggleCompare(Number(c.dataset.advCmp))) {
      toast(t("adv.added", { n: state.compare.length, max: MAX_COMPARE }));
      renderAdvice();
    }
    if (e.target.closest("#adv-go")) { $("dlg-advisor").close(); openCompare(); }
  });

  /* Xarita */
  $("btn-map").addEventListener("click", openMap);
  const dotOpen = (e) => {
    const g = e.target.closest("[data-id]");
    if (!g || !$("map").contains(g)) return;
    if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    $("dlg-map").close();
    openDetail(Number(g.dataset.id));
  };
  $("map").addEventListener("click", dotOpen);
  $("map").addEventListener("keydown", dotOpen);

  /* Boshqaruv */
  $("btn-admin").addEventListener("click", () => { renderAdmin(); if (!$("dlg-admin").open) $("dlg-admin").showModal(); });
  $("admin-body").addEventListener("click", (e) => {
    const b = e.target.closest("[data-del-pc]");
    if (b) onDeleteComputer(Number(b.dataset.delPc));
  });

  /* Til, valyuta, mavzu */
  $("s-lang").addEventListener("change", (e) => {
    prefs.lang = LANGS.includes(e.target.value) ? e.target.value : "uz";
    I18N.lang = prefs.lang;
    savePrefs();
    applyI18n();
    render();
    refreshOpenDialogs();
  });
  qsa(".seg button").forEach((b) => b.addEventListener("click", () => {
    prefs.cur = b.dataset.cur === "UZS" ? "UZS" : "USD";
    savePrefs();
    refreshAll();
  }));
  $("rate").addEventListener("input", (e) => {
    const v = Number(e.target.value);
    if (!(v >= 1)) return;
    prefs.rate = v;
    savePrefs();
    $("price-out").textContent = money(state.maxPrice);
    render();
    refreshOpenDialogs();
  });
  $("btn-theme").addEventListener("click", () => {
    prefs.theme = prefs.theme === "dark" ? "light" : "dark";
    savePrefs();
    applyTheme();
  });

  /* Oynalarni yopish: tugma yoki fon bosilganda */
  qsa("dialog").forEach((d) => {
    d.addEventListener("click", (e) => { if (e.target === d || e.target.closest("[data-close]")) d.close(); });
    d.addEventListener("close", () => { const el = $("toast"); if (el.parentNode !== document.body) document.body.appendChild(el); });
  });

  window.addEventListener("hashchange", () => {
    const ids = hashIds();
    if (ids.join() !== state.compare.join()) {
      state.compare = ids;
      render();
      if (ids.length >= 2) openCompare();
    }
  });
}

/* ---------- Ishga tushirish ---------- */
async function main() {
  applyTheme();
  $("count").textContent = t("loading");
  try {
    await Store.init();
    syncPriceRange(true);
    applyI18n();
    state.compare = hashIds();
    bind();
    render();
    if (state.compare.length >= 2) openCompare();
  } catch (err) {
    console.error(err);
    $("grid").innerHTML = '<div class="empty">' + esc(t("err.generic")) + "</div>";
  }
}

main();
