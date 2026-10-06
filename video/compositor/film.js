// Deterministic compositor for the Medyze product film.
//
// window.render(t) sets every style from the time `t` alone (no timers, no
// CSS transitions), so frame N always renders identically. The UI shown is
// only ever a screenshot from capture.mjs; this file adds a camera, the
// typography, and emphasis layers (dim / ring / lift / click pulse) positioned
// from geometry the capture read out of the real DOM.
(() => {
  const TL = window.__TIMELINE;
  const M = window.__MANIFEST ?? null;
  const C = TL.cues;
  const CAP = "../captures/";
  const FPS = TL.fps;

  // Window geometry (must match #window in index.html) and the UI viewport.
  const WIN = { w: 1232, h: 693 };
  const VP = M?.viewport ?? { width: 1440, height: 810 };
  const S0 = WIN.w / VP.width;

  const $ = (id) => document.getElementById(id);
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, p) => a + (b - a) * p;
  const ease = {
    outExpo: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
    inQuad: (p) => p * p,
    inOutCubic: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    outCubic: (p) => 1 - Math.pow(1 - p, 3),
  };

  // ── Blur → sharp ─────────────────────────────────────────────────────────
  // One curve for every transition in the film. Incoming: starts blurred,
  // tracked out, slightly displaced/scaled, and lands fully sharp exactly at
  // `sharpAt`. Outgoing: blur rises, tracking compresses, opacity falls.
  function focus(t, sharpAt, outAt, o = {}) {
    const dIn = o.dIn ?? 0.42;
    const dOut = o.dOut ?? 0.28;
    const p = ease.outExpo(clamp((t - (sharpAt - dIn)) / dIn));
    const q = outAt == null ? 0 : ease.inQuad(clamp((t - outAt) / dOut));
    return {
      visible: t >= sharpAt - dIn && (outAt == null || t < outAt + dOut),
      opacity: Math.min(1, p * 1.6) * (1 - q),
      blur: (1 - p) * (o.blurIn ?? 12) + q * (o.blurOut ?? 10),
      track: (1 - p) * (o.trackIn ?? 0.14) - q * (o.trackOut ?? 0.05),
      dx: (1 - p) * (o.dxIn ?? 0) + q * (o.dxOut ?? 0),
      dy: (1 - p) * (o.dyIn ?? 22) + q * (o.dyOut ?? -12),
      scale: lerp(o.scaleIn ?? 1.03, 1, p) * (1 - q * (o.scaleOut ?? 0.025)),
    };
  }

  function apply(el, s, { tracking = true } = {}) {
    if (!s.visible || s.opacity <= 0.001) {
      // opacity too: a child set to visibility:visible would otherwise show
      // through a hidden parent.
      el.style.visibility = "hidden";
      el.style.opacity = "0";
      return;
    }
    el.style.visibility = "visible";
    el.style.opacity = s.opacity.toFixed(4);
    el.style.filter = s.blur > 0.05 ? `blur(${s.blur.toFixed(2)}px)` : "none";
    el.style.transform = `translate(${s.dx.toFixed(2)}px, ${s.dy.toFixed(2)}px) scale(${s.scale.toFixed(4)})`;
    if (tracking) el.style.letterSpacing = `${(+el.dataset.track + s.track).toFixed(4)}em`;
  }

  // ── Capture helpers ──────────────────────────────────────────────────────
  const st = (name) => M?.states[name];
  const file = (name) => st(name)?.file;
  function seqFrame(name, t0, t) {
    const s = M.sequences[name];
    const i = Math.floor((t - t0) * FPS + 1e-6);
    return s.files[clamp(i, 0, s.files.length - 1)];
  }
  const seqEnd = (name, t0) => t0 + M.sequences[name].files.length / FPS;
  const center = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
  const union = (...bs) => {
    const x = Math.min(...bs.map((b) => b.x)), y = Math.min(...bs.map((b) => b.y));
    const r = Math.max(...bs.map((b) => b.x + b.w)), btm = Math.max(...bs.map((b) => b.y + b.h));
    return { x, y, w: r - x, h: btm - y };
  };
  /** Rows actually on screen: the offer list scrolls inside the modal. */
  const visibleRows = (state) => {
    const a = st(state).listArea;
    return st(state).rows.map((r, i) => ({ ...r, i })).filter((r) => {
      const cy = r.box.y + r.box.h / 2;
      return cy > a.y && cy < a.y + a.h;
    });
  };
  const clipTo = (b, a) => {
    const y = Math.max(b.y, a.y), btm = Math.min(b.y + b.h, a.y + a.h);
    return { x: b.x, y, w: b.w, h: Math.max(0, btm - y) };
  };
  /** Zoom at which box `b` fills `frac` of the window (never below 1). */
  const fit = (b, frac, max = 2.1) => clamp(Math.min((WIN.w * frac) / (b.w * S0), (WIN.h * frac) / (b.h * S0)), 1, max);

  // ── Camera ───────────────────────────────────────────────────────────────
  // Keys of {t, f:{x,y} in UI css px, z}; eased per segment. Two keys at the
  // same t make a hard cut.
  function camAt(keys, t) {
    if (t <= keys[0].t) return keys[0];
    for (let i = 1; i < keys.length; i++) {
      const a = keys[i - 1], b = keys[i];
      if (t < b.t) {
        const p = ease.inOutCubic(clamp((t - a.t) / Math.max(1e-6, b.t - a.t)));
        return { f: { x: lerp(a.f.x, b.f.x, p), y: lerp(a.f.y, b.f.y, p) }, z: lerp(a.z, b.z, p) };
      }
    }
    return keys[keys.length - 1];
  }
  function placeCam(el, cam) {
    const s = S0 * cam.z;
    let tx = WIN.w / 2 - cam.f.x * s;
    let ty = WIN.h / 2 - cam.f.y * s;
    tx = clamp(tx, WIN.w - VP.width * s, 0);
    ty = clamp(ty, WIN.h - VP.height * s, 0);
    el.style.transform = `translate(${tx.toFixed(3)}px, ${ty.toFixed(3)}px) scale(${s.toFixed(5)})`;
  }

  // ── Image swapping (awaits decode so a frame is never captured mid-load) ─
  let pending = [];
  function setImg(img, f) {
    if (!f || img.dataset.f === f) return;
    img.dataset.f = f;
    img.src = CAP + f;
    pending.push(img.decode().catch(() => {}));
  }
  function setBox(el, b, pad = 0) {
    el.style.left = `${b.x - pad}px`;
    el.style.top = `${b.y - pad}px`;
    el.style.width = `${b.w + pad * 2}px`;
    el.style.height = `${b.h + pad * 2}px`;
  }
  function pulse(el, at, t) {
    const p = clamp((t - at) / 0.42);
    if (!M || t < at || p >= 1) return (el.style.visibility = "hidden");
    const r = lerp(8, 30, ease.outCubic(p));
    el.style.visibility = "visible";
    el.style.width = el.style.height = `${r * 2}px`;
    el.style.marginLeft = el.style.marginTop = `${-r}px`;
    el.style.opacity = (0.55 * (1 - p)).toFixed(3);
  }

  const fmtINR = (v) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: Number.isInteger(v) ? 0 : 2 }).format(v);

  // ── Layout that depends on measured text ─────────────────────────────────
  function init() {
    document.querySelectorAll(".seg").forEach((el) => {
      const fs = parseFloat(getComputedStyle(el).fontSize);
      const ls = getComputedStyle(el).letterSpacing;
      el.dataset.track = ls === "normal" ? 0 : parseFloat(ls) / fs;
    });
    const finding = $("h-finding");
    $("h-price").style.left = `${finding.offsetLeft + finding.offsetWidth + 22}px`;

    if (M) {
      const rows = st("modal-loaded").rows;
      const chosen = M.data.chosen;
      const offerFor = (name) => M.data.offers.find((o) => o.pharmacy?.name === name);
      $("n-compare").textContent = `${rows.length} pharmacies · from ${fmtINR(M.data.offers[0].price)}`;
      const c = offerFor(chosen.name);
      $("n-choose").textContent = `${chosen.name} · ${fmtINR(c.price)}${chosen.isCheapestShown ? " · lowest price" : ""}`;
      $("end-url").textContent = M.data.buy.href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
      const dims = document.querySelector("#L-modal .dims");
      rows.forEach((r, i) => {
        if (i === chosen.index) return;
        const d = document.createElement("div");
        d.className = "dim";
        d.dataset.row = i;
        dims.appendChild(d);
      });
    }
    for (const id of ["end-1", "end-2", "end-url", "brand"]) {
      const el = $(id);
      el.style.left = `${(1920 - el.offsetWidth) / 2}px`;
    }
    if (!M) $("window").style.display = "none";
  }

  let camSearch, camModal, camDetail;
  function buildCameras() {
    if (!M) return;
    // The bar spans the page; the typing happens in its left part, so the
    // camera frames the query and the result row rather than the whole bar.
    const bar = st("search-results").bar;
    const barLeft = { x: bar.x, y: bar.y, w: Math.min(bar.w, 640), h: bar.h };
    const o = st("search-results").option;
    const option = { ...o, w: Math.min(o.w, 640 - (o.x - bar.x)) };
    const searchFocus = union(barLeft, option);
    camSearch = [
      { t: C.searchIn, f: { x: center(bar).x, y: center(bar).y + 140 }, z: 1.12 },
      { t: C.typeStart + 0.45, f: center(barLeft), z: fit(barLeft, 0.8, 2) },
      { t: C.searchResults, f: center(barLeft), z: fit(barLeft, 0.8, 2) },
      { t: C.searchResults + 0.45, f: center(searchFocus), z: fit(searchFocus, 0.78, 2) },
      { t: C.searchOut + 0.3, f: center(searchFocus), z: fit(searchFocus, 0.78, 2) * 1.04 },
    ];

    const card = st("card-idle").card;
    const dialog = st("modal-loaded").dialog;
    const rows = st("modal-loaded").rows;
    const rowsAll = union(...visibleRows("modal-loaded").map((r) => r.box));
    const chosen = st("modal-added").rows[M.data.chosen.index].box;
    const cont = st("modal-added").continue;
    const chosenAndCont = union(chosen, cont);
    camModal = [
      { t: C.cardIn, f: center(card), z: 1.55 },
      { t: C.cardClick, f: center(card), z: 1.66 },
      { t: C.cardClick + 0.4, f: center(dialog), z: fit(dialog, 0.97) },
      { t: C.comparePush, f: center(dialog), z: fit(dialog, 0.97) },
      { t: C.addClick - 0.15, f: center(rowsAll), z: fit(rowsAll, 0.88) },
      { t: C.addedSharp + 0.15, f: center(chosen), z: fit(chosen, 0.8, 1.9) },
      { t: C.continueFrame, f: center(chosen), z: fit(chosen, 0.8, 1.9) * 1.02 },
      { t: C.continueClick - 0.08, f: center(chosenAndCont), z: fit(chosenAndCont, 0.82, 1.9) },
      { t: C.continueClick + 0.3, f: center(chosenAndCont), z: fit(chosenAndCont, 0.82, 1.9) * 1.03 },
    ];

    const d = st("detail");
    const panel = union(d.h1, d.selectedFrom, d.buy);
    const overlay = st("redirect").status;
    const bars = { x: overlay.x, y: overlay.y - 110, w: overlay.w, h: overlay.h + 110 };
    camDetail = [
      { t: C.detailIn, f: center(panel), z: fit(panel, 0.78, 1.7) * 0.97 },
      { t: C.buyClick, f: center(panel), z: fit(panel, 0.78, 1.7) * 1.04 },
      { t: C.redirect, f: center(bars), z: 1.12 },
      { t: C.redirect, f: center(bars), z: 1.12 },
      { t: C.endOut + 0.3, f: center(bars), z: 1.2 },
    ];
  }

  // ── Sections ─────────────────────────────────────────────────────────────
  function renderHook(t) {
    const h = C.hook;
    const segs = [
      ["h-finding", h.finding, { blurIn: 10 }],
      ["h-price", h.rightPrice, { blurIn: 10 }],
      ["h-shouldnt", h.shouldnt, { blurIn: 10 }],
      ["h-websites", h.websites, { dIn: 0.5, blurIn: 18, trackIn: 0.12, dyIn: 30, scaleIn: 1.06 }],
    ];
    segs.forEach(([id, start, o], i) => {
      const dIn = o.dIn ?? 0.42;
      apply($(id), focus(t, start + dIn, h.exit + i * 0.035, { ...o, dIn, dOut: 0.3, blurOut: 14, trackOut: 0.06, dxOut: -24, dyOut: 0, scaleOut: 0.03 }));
    });
  }

  function renderWindow(t) {
    if (!M) return;
    apply($("window"), focus(t, C.searchSharp, C.endOut, {
      dIn: C.searchSharp - C.searchIn, blurIn: 18, trackIn: 0, dyIn: 28, scaleIn: 0.965,
      dOut: C.endSharp - C.endOut - 0.02, blurOut: 16, dyOut: -10, scaleOut: 0.035,
    }), { tracking: false });
  }

  function renderSearch(t) {
    const L = $("L-search");
    apply(L, focus(t, C.searchIn, C.searchOut, { dIn: 0.001, trackIn: 0, dyIn: 0, blurOut: 12, dOut: 0.3, dyOut: 0, scaleOut: -0.02 }), { tracking: false });
    if (!M || L.style.visibility === "hidden") return;
    let f;
    const typed = Math.floor((t - C.typeStart) / C.typeStep) + 1;
    if (t < C.typeStart - 0.14) f = "search-idle";
    else if (t < C.typeStart) f = "search-focus";
    else if (t < C.searchLoading) f = `search-type-${clamp(typed, 1, 8)}`;
    else if (t < C.searchResults) f = st("search-loading") ? "search-loading" : "search-type-8";
    else if (t < C.searchHover) f = "search-results";
    else f = "search-hover";
    setImg(L.querySelector("img.ui"), file(f));
    placeCam(L.querySelector(".cam"), camAt(camSearch, t));
  }

  function renderModal(t) {
    const L = $("L-modal");
    apply(L, focus(t, C.cardSharp, C.continueClick + 0.04, { dIn: C.cardSharp - C.cardIn, blurIn: 14, trackIn: 0, dyIn: 0, scaleIn: 1.03, blurOut: 12, dOut: 0.26, dyOut: 0, scaleOut: -0.02 }), { tracking: false });
    if (!M || L.style.visibility === "hidden") return;

    let f;
    if (t < C.cardHover) f = file("card-idle");
    else if (t < C.cardClick) f = t < seqEnd("card-hover", C.cardHover) ? seqFrame("card-hover", C.cardHover, t) : file("card-hovered");
    else if (t < C.modalLoaded) f = seqFrame("modal-open", C.cardClick, t);
    else if (t < C.addClick - 0.2) f = file("modal-loaded");
    else if (t < C.addClick) f = file("modal-add-hover");
    else if (t < seqEnd("modal-added", C.addClick)) f = seqFrame("modal-added", C.addClick, t);
    else f = file("modal-added");
    const img = L.querySelector("img.ui");
    setImg(img, f);
    placeCam(L.querySelector(".cam"), camAt(camModal, t));

    const ci = M.data.chosen.index;
    const loadedRows = st("modal-loaded").rows;
    const addedRows = st("modal-added").rows;

    // Compare: soft ring on the cheapest shown offer.
    const ringLow = $("ring-lowest");
    const lowIn = clamp((t - C.lowestRing) / 0.3);
    const lowOut = ci === 0 ? clamp((t - C.addClick) / 0.01) : clamp((t - C.addClick) / 0.2);
    const lowO = ease.outCubic(lowIn) * (1 - lowOut) * 0.55;
    ringLow.style.visibility = lowO > 0.001 ? "visible" : "hidden";
    setBox(ringLow, loadedRows[0].box, 5);
    ringLow.style.opacity = lowO.toFixed(3);

    // Choose: dim the rest, lift + ring the selected offer.
    const sel = ease.outCubic(clamp((t - C.addClick) / (C.addedSharp - C.addClick + 0.05)));
    const selOut = clamp((t - C.continueClick) / 0.2);
    const k = sel * (1 - selOut);
    const area = st("modal-added").listArea;
    L.querySelectorAll(".dim").forEach((d) => {
      const b = clipTo(addedRows[+d.dataset.row].box, area);
      setBox(d, b, 1);
      d.style.opacity = (0.5 * k).toFixed(3);
      d.style.visibility = k > 0.001 && b.h > 0 ? "visible" : "hidden";
    });
    const lift = L.querySelector(".lift");
    const cb = addedRows[ci].box;
    if (k > 0.001) {
      lift.style.visibility = "visible";
      setBox(lift, cb);
      const li = lift.querySelector("img");
      setImg(li, f);
      li.style.left = `${-cb.x}px`;
      li.style.top = `${-cb.y}px`;
      lift.style.transform = `scale(${(1 + 0.025 * k).toFixed(4)})`;
      lift.style.boxShadow = `0 ${18 * k}px ${40 * k}px -16px rgba(2,11,66,${(0.35 * k).toFixed(3)})`;
    } else lift.style.visibility = "hidden";
    const ring = $("ring-chosen");
    const rIn = clamp((t - (C.addedSharp - 0.16)) / 0.16);
    const rk = ease.outCubic(rIn) * (1 - selOut);
    ring.style.visibility = rk > 0.001 ? "visible" : "hidden";
    setBox(ring, cb, 6 + 6 * (1 - ease.outCubic(rIn)));
    ring.style.transform = `scale(${(1 + 0.025 * k).toFixed(4)})`;
    ring.style.opacity = rk.toFixed(3);

    // Click pulses at the real click targets.
    const card = st("card-idle").card;
    const pc = $("pulse-card");
    pc.style.left = `${card.x + card.w / 2}px`;
    pc.style.top = `${card.y + card.h * 0.45}px`;
    pulse(pc, C.cardClick, t);
    const add = loadedRows[ci].add;
    const pa = $("pulse-add");
    pa.style.left = `${add.x + add.w / 2}px`;
    pa.style.top = `${add.y + add.h / 2}px`;
    pulse(pa, C.addClick, t);
    const cont = st("modal-added").continue;
    const pk = $("pulse-continue");
    pk.style.left = `${cont.x + cont.w / 2}px`;
    pk.style.top = `${cont.y + cont.h / 2}px`;
    pulse(pk, C.continueClick, t);
  }

  function renderDetail(t) {
    const L = $("L-detail");
    apply(L, focus(t, C.detailSharp, null, { dIn: C.detailSharp - C.detailIn, blurIn: 14, trackIn: 0, dyIn: 0, scaleIn: 1.03 }), { tracking: false });
    if (!M || L.style.visibility === "hidden") return;
    let f;
    if (t < C.buyClick - 0.22) f = file("detail");
    else if (t < C.redirect) f = file("detail-buy-hover");
    else f = seqFrame("redirect", C.redirect, t);
    setImg(L.querySelector("img.ui"), f);
    placeCam(L.querySelector(".cam"), camAt(camDetail, t));

    const buy = st("detail").buy;
    const ring = $("ring-buy");
    const rIn = ease.outCubic(clamp((t - (C.detailSharp + 0.12)) / 0.25));
    const rk = t < C.redirect ? rIn : 0;
    ring.style.visibility = rk > 0.001 ? "visible" : "hidden";
    setBox(ring, buy, 5 + 5 * (1 - rIn));
    ring.style.borderRadius = "16px";
    ring.style.opacity = rk.toFixed(3);
    const pb = $("pulse-buy");
    pb.style.left = `${buy.x + buy.w / 2}px`;
    pb.style.top = `${buy.y + buy.h / 2}px`;
    if (t < C.redirect) pulse(pb, C.buyClick, t);
    else pb.style.visibility = "hidden";
  }

  function renderLabels(t) {
    const lab = { dIn: 0.4, blurIn: 12, trackIn: 0.16, dyIn: 18, dOut: 0.28, blurOut: 10, trackOut: 0.06, dyOut: -10 };
    const eye = { ...lab, blurIn: 6, dyIn: 8, trackIn: 0.3 };
    const note = { ...lab, blurIn: 6, dyIn: 10, trackIn: 0.08 };
    const choosePre = C.addedSharp - 0.36; // Compare starts leaving as Choose arrives
    apply($("e-search"), focus(t, C.typeStart - 0.04, C.searchOut, { ...eye, dIn: 0.3 }));
    // Sharp on the frame the first keystroke lands.
    apply($("l-find"), focus(t, C.typeStart, C.searchOut, { ...lab, dIn: 0.3 }));
    apply($("e-compare"), focus(t, C.modalLoaded - 0.04, choosePre, eye));
    apply($("l-compare"), focus(t, C.modalLoaded, choosePre, lab));
    if (M) apply($("n-compare"), focus(t, C.modalLoaded + 0.18, choosePre, note));
    apply($("e-choose"), focus(t, C.addedSharp - 0.04, C.detailIn, eye));
    apply($("e-redirect"), focus(t, C.detailSharp, C.endOut, eye));
    apply($("l-choose"), focus(t, C.addedSharp, C.endOut, lab));
    if (M) apply($("n-choose"), focus(t, C.addedSharp + 0.16, C.endOut, note));
  }

  function renderEnd(t) {
    const o = { dIn: 0.3, blurIn: 14, trackIn: 0.14, dyIn: 16, scaleIn: 1.02 };
    apply($("end-1"), focus(t, C.endSharp - 0.05, null, o));
    apply($("end-2"), focus(t, C.endSharp, null, o));
    if (M) apply($("end-url"), focus(t, C.endSharp + 0.06, null, { ...o, blurIn: 8, trackIn: 0.06, dyIn: 10 }));
    apply($("brand"), focus(t, C.endSharp + 0.1, null, { ...o, blurIn: 8, trackIn: 0, dyIn: 10 }), { tracking: false });
  }

  window.render = async (t) => {
    pending = [];
    renderHook(t);
    renderWindow(t);
    renderSearch(t);
    renderModal(t);
    renderDetail(t);
    renderLabels(t);
    renderEnd(t);
    await Promise.all(pending);
  };

  window.ready = (async () => {
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load('500 88px "Albert Sans"'),
      document.fonts.load('600 88px "Albert Sans"'),
      document.fonts.load('700 100px "Albert Sans"'),
      document.fonts.load('800 184px "Albert Sans"'),
      document.fonts.load('400 22px "Geist Mono"'),
    ]);
    init();
    buildCameras();
  })();
})();
