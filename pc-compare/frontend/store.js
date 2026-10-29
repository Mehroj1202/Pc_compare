"use strict";

/* ==========================================================================
   Ma'lumotlar qatlami.
   Ikki rejim bor va sayt o'zi tanlaydi:
     "server" — sayt python server/server.py orqali ochilgan: ma'lumotlar SQLite'da;
     "local"  — index.html faylni to'g'ridan-to'g'ri (yoki Live Server orqali) ochilgan:
                data.js + brauzer xotirasi (localStorage).
   ========================================================================== */

const LS = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }
};

const KEYS = {
  reviews: "pc-taqqos-sharhlar",   // oldingi versiyadagi kalit: eski sharhlar saqlanib qoladi
  custom: "pc-taqqos-custom",
  fav: "pc-taqqos-fav",
  prefs: "pc-taqqos-prefs",
  client: "pc-taqqos-client"
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function makeClientId() {
  let id = LS.get(KEYS.client, null);
  if (typeof id === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(id)) return id;
  id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : "c" + uid() + uid();
  LS.set(KEYS.client, id);
  return id;
}

function tokenGet() { try { return sessionStorage.getItem("pc-taqqos-admin") || null; } catch (e) { return null; } }
function tokenSet(v) {
  try { if (v) sessionStorage.setItem("pc-taqqos-admin", v); else sessionStorage.removeItem("pc-taqqos-admin"); } catch (e) { /* ruxsat yo'q */ }
}

const Store = {
  mode: "local",
  computers: [],
  token: null,
  clientId: makeClientId(),
  _mine: {},     // mahalliy rejim: {kompyuterId: [{rid, name, stars, text}]}
  _custom: [],   // mahalliy rejim: foydalanuvchi qo'shgan kompyuterlar

  /* ---------- boshlash ---------- */
  async init() {
    this.token = tokenGet();
    if (/^https?:$/.test(location.protocol)) {
      try {
        this.computers = await this._fetchComputers(2500);
        this.mode = "server";
        return;
      } catch (e) { /* server yo'q: mahalliy rejim */ }
    }
    this.mode = "local";
    this._loadLocal();
  },

  canManage() { return this.mode === "local" || !!this.token; },
  canDeleteComputer(p) { return this.mode === "server" ? !!this.token : !!p.custom; },
  canDeleteReview(r) { return !!r.mine || (this.mode === "server" && !!this.token && r.rid != null); },

  /* ---------- server ---------- */
  async _fetchComputers(timeoutMs) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs || 8000);
    try {
      const res = await fetch("api/computers", { headers: { "X-Client-Id": this.clientId }, signal: ctl.signal });
      const type = res.headers.get("content-type") || "";
      if (!res.ok || type.indexOf("json") < 0) throw new Error("server emas");
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("noto'g'ri javob");
      return data.map((c) => Object.assign({}, c, { custom: false }));
    } finally { clearTimeout(timer); }
  },

  async _req(method, path, body) {
    const headers = { "X-Client-Id": this.clientId };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (this.token) headers["Authorization"] = "Bearer " + this.token;
    const res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    let data = null;
    try { data = await res.json(); } catch (e) { /* bo'sh javob */ }
    if (!res.ok) {
      const err = new Error((data && data.error) || ("HTTP " + res.status));
      err.status = res.status;
      err.code = (data && data.code) || "generic";
      if (res.status === 401 && this.token && path !== "api/login") { this.token = null; tokenSet(null); }
      throw err;
    }
    return data;
  },

  async _reload() { this.computers = await this._fetchComputers(8000); },

  async login(password) {
    if (this.mode !== "server") return true;
    const data = await this._req("POST", "api/login", { password });
    this.token = data.token;
    tokenSet(this.token);
    return true;
  },
  logout() { this.token = null; tokenSet(null); },

  /* ---------- mahalliy rejim ---------- */
  _loadLocal() {
    const mine = LS.get(KEYS.reviews, {});
    this._mine = (mine && typeof mine === "object" && !Array.isArray(mine)) ? mine : {};
    let changed = false;
    Object.keys(this._mine).forEach((id) => {
      if (!Array.isArray(this._mine[id])) { this._mine[id] = []; changed = true; }
      this._mine[id].forEach((r) => { if (!r.rid) { r.rid = uid(); changed = true; } });
    });
    if (changed) LS.set(KEYS.reviews, this._mine);
    const custom = LS.get(KEYS.custom, []);
    this._custom = Array.isArray(custom) ? custom.filter((c) => c && typeof c.id === "number") : [];
    this._build();
  },

  _build() {
    const seed = COMPUTERS.map((c) => Object.assign({}, c, {
      custom: false,
      reviews: c.reviews.map((r) => ({ rid: null, name: r.name, stars: r.stars, text: r.text, mine: false }))
    }));
    const extra = this._custom.map((c) => Object.assign({}, c, { custom: true, reviews: [] }));
    this.computers = seed.concat(extra).map((c) => {
      const mine = (this._mine[c.id] || []).map((r) => ({ rid: r.rid, name: r.name, stars: r.stars, text: r.text, mine: true }));
      c.reviews = c.reviews.concat(mine);
      return c;
    });
  },

  _saveLocal() {
    LS.set(KEYS.reviews, this._mine);
    LS.set(KEYS.custom, this._custom);
    this._build();
  },

  /* ---------- sharhlar ---------- */
  async addReview(pcId, review) {
    if (this.mode === "server") {
      await this._req("POST", "api/computers/" + pcId + "/reviews", review);
      return this._reload();
    }
    (this._mine[pcId] = this._mine[pcId] || []).push({ rid: uid(), name: review.name, stars: review.stars, text: review.text });
    this._saveLocal();
  },

  async updateReview(pcId, rid, review) {
    if (this.mode === "server") {
      await this._req("PUT", "api/reviews/" + rid, review);
      return this._reload();
    }
    const r = (this._mine[pcId] || []).find((x) => x.rid === rid);
    if (r) { r.name = review.name; r.stars = review.stars; r.text = review.text; }
    this._saveLocal();
  },

  async deleteReview(pcId, rid) {
    if (this.mode === "server") {
      await this._req("DELETE", "api/reviews/" + rid);
      return this._reload();
    }
    this._mine[pcId] = (this._mine[pcId] || []).filter((x) => x.rid !== rid);
    this._saveLocal();
  },

  /* ---------- kompyuterlar ---------- */
  async addComputer(data) {
    if (this.mode === "server") {
      await this._req("POST", "api/computers", data);
      return this._reload();
    }
    const maxId = Math.max(999, ...this.computers.map((c) => c.id));
    this._custom.push(Object.assign({}, data, { id: maxId + 1 }));
    this._saveLocal();
  },

  async deleteComputer(id) {
    if (this.mode === "server") {
      await this._req("DELETE", "api/computers/" + id);
      return this._reload();
    }
    this._custom = this._custom.filter((c) => c.id !== id);
    delete this._mine[id];
    this._saveLocal();
  }
};
