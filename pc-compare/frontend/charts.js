"use strict";

/* Grafiklar: tashqi kutubxonasiz, sof SVG. Internet shart emas. */
const Charts = (() => {
  const COLORS = ["#0a7e8c", "#d98324", "#7a5af8"];
  const DASH = ["", "7 4", "2 4"];
  const PURPOSE_COLOR = { Ofis: "#0a7e8c", Ijod: "#d98324", Gaming: "#7a5af8" };
  const PURPOSE_SHAPE = { Ofis: "●", Ijod: "■", Gaming: "▲" };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  const f1 = (v) => v.toFixed(1);

  /* Radar diagramma: series = [{values: [0..100, ...]}], labels = eksa nomlari */
  function radar(series, labels, aria) {
    const W = 480, H = 340, cx = W / 2, cy = 170, R = 108, n = labels.length;
    const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const pt = (i, r) => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r];
    let g = "";

    [25, 50, 75, 100].forEach((level) => {
      const pts = labels.map((_, i) => pt(i, (R * level) / 100).map(f1).join(",")).join(" ");
      g += '<polygon class="rgrid" points="' + pts + '"/>';
    });
    labels.forEach((label, i) => {
      const e = pt(i, R);
      g += '<line class="rgrid" x1="' + cx + '" y1="' + cy + '" x2="' + f1(e[0]) + '" y2="' + f1(e[1]) + '"/>';
      const l = pt(i, R + 14);
      const c = Math.cos(ang(i)), s = Math.sin(ang(i));
      const anchor = c > 0.3 ? "start" : c < -0.3 ? "end" : "middle";
      const dy = s > 0.3 ? "0.85em" : s < -0.3 ? "0" : "0.35em";
      g += '<text class="rtxt" x="' + f1(l[0]) + '" y="' + f1(l[1]) + '" dy="' + dy + '" text-anchor="' + anchor + '">' + esc(label) + "</text>";
    });
    series.forEach((s, k) => {
      const col = COLORS[k % COLORS.length];
      const pts = s.values.map((v, i) => pt(i, (R * Math.max(0, Math.min(100, v))) / 100));
      const poly = pts.map((p) => f1(p[0]) + "," + f1(p[1])).join(" ");
      g += '<polygon points="' + poly + '" fill="' + col + '" fill-opacity="0.14" stroke="' + col +
        '" stroke-width="2.2" stroke-dasharray="' + DASH[k % DASH.length] + '" stroke-linejoin="round"/>';
      pts.forEach((p) => { g += '<circle cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="3.4" fill="' + col + '"/>'; });
    });
    return '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(aria) + '">' + g + "</svg>";
  }

  function niceMax(v) {
    const step = Math.pow(10, Math.floor(Math.log10(v))) / 2;
    return Math.ceil(v / step) * step;
  }

  /* Nuqtali diagramma. points: [{id, x, y, purpose, label}] */
  function scatter(points, o) {
    const W = 760, H = 430, ml = 56, mr = 28, mt = 16, mb = 54;
    const xMax = niceMax(Math.max(...points.map((p) => p.x)));
    const yMin = Math.max(0, Math.floor((Math.min(...points.map((p) => p.y)) - 5) / 10) * 10);
    const yMax = 100;
    const X = (v) => ml + (v / xMax) * (W - ml - mr);
    const Y = (v) => H - mb - ((v - yMin) / (yMax - yMin)) * (H - mt - mb);
    let g = "";

    for (let v = yMin; v <= yMax; v += 10) {
      g += '<line class="rgrid" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + f1(Y(v)) + '" y2="' + f1(Y(v)) + '"/>';
      g += '<text class="rtxt" x="' + (ml - 8) + '" y="' + f1(Y(v)) + '" dy="0.35em" text-anchor="end">' + v + "</text>";
    }
    for (let i = 0; i <= 5; i++) {
      const v = (xMax * i) / 5;
      g += '<line class="rgrid" y1="' + mt + '" y2="' + (H - mb) + '" x1="' + f1(X(v)) + '" x2="' + f1(X(v)) + '"/>';
      g += '<text class="rtxt" x="' + f1(X(v)) + '" y="' + (H - mb + 18) + '" text-anchor="middle">' + esc(o.fmtX(v)) + "</text>";
    }
    g += '<text class="rtxt ax" x="' + ((ml + W - mr) / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(o.xLabel) + "</text>";
    g += '<text class="rtxt ax" transform="translate(14 ' + ((mt + H - mb) / 2) + ') rotate(-90)" text-anchor="middle">' + esc(o.yLabel) + "</text>";

    /* Nuqta yozuvlari bir-birini bosmasligi uchun oddiy joylashtirish */
    const boxes = [];
    const hit = (b) => boxes.some((o2) => b.x < o2.x + o2.w && b.x + b.w > o2.x && b.y < o2.y + o2.h && b.y + b.h > o2.y);
    const dots = points.map((p) => ({ p, x: X(p.x), y: Y(p.y) }));
    dots.forEach((d) => boxes.push({ x: d.x - 8, y: d.y - 8, w: 16, h: 16 }));

    dots.forEach((d) => {
      const p = d.p, col = PURPOSE_COLOR[p.purpose] || COLORS[0];
      let shape;
      if (p.purpose === "Ijod") shape = '<rect x="' + f1(d.x - 6) + '" y="' + f1(d.y - 6) + '" width="12" height="12" fill="' + col + '"/>';
      else if (p.purpose === "Gaming") shape = '<polygon points="' + f1(d.x) + "," + f1(d.y - 8) + " " + f1(d.x + 7.5) + "," + f1(d.y + 6) + " " + f1(d.x - 7.5) + "," + f1(d.y + 6) + '" fill="' + col + '"/>';
      else shape = '<circle cx="' + f1(d.x) + '" cy="' + f1(d.y) + '" r="6.5" fill="' + col + '"/>';
      g += '<g class="dot" data-id="' + p.id + '" tabindex="0" role="button" aria-label="' + esc(p.label) + '"><title>' + esc(p.label) + "</title>" + shape + "</g>";

      const w = p.short.length * 5.6, h = 12;
      const cands = [
        { x: d.x + 11, y: d.y - 6, a: "start" },
        { x: d.x - 11, y: d.y - 6, a: "end" },
        { x: d.x - w / 2, y: d.y - 24, a: "start" },
        { x: d.x - w / 2, y: d.y + 12, a: "start" }
      ];
      for (const c of cands) {
        const bx = c.a === "end" ? c.x - w : c.x;
        const box = { x: bx, y: c.y, w: w, h: h };
        if (box.x < ml - 4 || box.x + w > W - 2 || box.y < mt - 4 || box.y + h > H - mb + 4) continue;
        if (hit(box)) continue;
        boxes.push(box);
        g += '<text class="rtxt dl" x="' + f1(c.a === "end" ? c.x : bx) + '" y="' + f1(c.y + 9.5) + '" text-anchor="' + c.a + '">' + esc(p.short) + "</text>";
        break;
      }
    });
    return '<svg class="chart wide" viewBox="0 0 ' + W + " " + H + '" role="group" aria-label="' + esc(o.aria) + '">' + g + "</svg>";
  }

  return { COLORS, DASH, PURPOSE_COLOR, PURPOSE_SHAPE, radar, scatter, esc };
})();
