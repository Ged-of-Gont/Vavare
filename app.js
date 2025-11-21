// app.js — weave editor: state, UI, draft logic

// ---------- Elements ----------
const els = {
  pattern:    document.getElementById('pattern'),
  layout:     document.getElementById('layout'),
  warpCountI: document.getElementById('warpCount'),
  weftCountI: document.getElementById('weftCount'),
  warpA:      document.getElementById('warpA'),
  warpB:      document.getElementById('warpB'),
  weftA:      document.getElementById('weftA'),
  weftB:      document.getElementById('weftB'),
  cellSize:   document.getElementById('cellSize'),
  canvas:     document.getElementById('weave'),
  randomize:  document.getElementById('randomize'),
  applyAB:    document.getElementById('applyAB'),
  save:       document.getElementById('save'),
  load:       document.getElementById('load'),
  warpBar:    document.getElementById('warpBar'),
  weftBar:    document.getElementById('weftBar'),
  threading:  document.getElementById('threading'),
  treadling:  document.getElementById('treadling'),
  tieupWrap:  document.getElementById('tieupWrap'),
};

// ---------- Utilities ----------
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function getCSSVar(name) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

function syncCellSizeCSS(px) {
  document.documentElement.style.setProperty('--cs', px + 'px');
}

function syncCountsCSS() {
  document.documentElement.style.setProperty('--warp', warpCount);
  document.documentElement.style.setProperty('--weft', weftCount);
}

function getSettings() {
  const cellSize = clamp(parseInt(els.cellSize.value, 10) || 18, 10, 60);
  return { warpCount, weftCount, cellSize };
}

// ---------- Initial palette from CSS ----------
function initDefaultColorsFromCSS() {
  const warpA = getCSSVar('--warp-a');
  const warpB = getCSSVar('--warp-b');
  const weftA = getCSSVar('--weft-a');
  const weftB = getCSSVar('--weft-b');

  if (warpA) els.warpA.value = warpA;
  if (warpB) els.warpB.value = warpB;
  if (weftA) els.weftA.value = weftA;
  if (weftB) els.weftB.value = weftB;
}

// ---------- Core state ----------
let warpCount = 12;
let weftCount = 12;

const ctx = els.canvas.getContext('2d');

// Per-thread colors
let warpColors = new Array(warpCount);
let weftColors = new Array(weftCount);

// Abstract color layout slots: 'A' / 'B' per warp/weft
let warpSlots = new Array(warpCount).fill('A');
let weftSlots = new Array(weftCount).fill('A');

// Draft state (4 shafts)
let threading  = Array.from({ length: warpCount }, (_, c) => (c % 4) + 1);
let treadling  = Array.from({ length: weftCount }, (_, r) => new Set([(r % 4) + 1]));
let tieup      = { 1: new Set([1, 2]), 2: new Set([2, 3]), 3: new Set([3, 4]), 4: new Set([4, 1]) };

// ---------- Color layout + palette ----------

// Map A/B slots + palette to per-thread colors
function applyPaletteToSlots() {
  const warpA = els.warpA.value;
  const warpB = els.warpB.value;
  const weftA = els.weftA.value;
  const weftB = els.weftB.value;

  warpColors = new Array(warpCount);
  weftColors = new Array(weftCount);

  for (let c = 0; c < warpCount; c++) {
    warpColors[c] = (warpSlots[c] === 'B') ? warpB : warpA;
  }
  for (let r = 0; r < weftCount; r++) {
    weftColors[r] = (weftSlots[r] === 'B') ? weftB : weftA;
  }
}

// ABAB stripes in both directions
function setLayoutStripes() {
  for (let c = 0; c < warpCount; c++) {
    warpSlots[c] = (c % 2 === 0) ? 'A' : 'B';
  }
  for (let r = 0; r < weftCount; r++) {
    weftSlots[r] = (r % 2 === 0) ? 'A' : 'B';
  }
}

// Log cabin: AABB / AABB
function setLayoutLogCabin() {
  for (let c = 0; c < warpCount; c++) {
    const block = Math.floor(c / 2);
    warpSlots[c] = (block % 2 === 0) ? 'A' : 'B';
  }
  for (let r = 0; r < weftCount; r++) {
    const block = Math.floor(r / 2);
    weftSlots[r] = (block % 2 === 0) ? 'A' : 'B';
  }
}

// Houndstooth: warp AAAA BBBB..., weft BBBB AAAA...
function setLayoutHoundstooth() {
  for (let c = 0; c < warpCount; c++) {
    const block = Math.floor(c / 4);
    warpSlots[c] = (block % 2 === 0) ? 'A' : 'B';
  }
  for (let r = 0; r < weftCount; r++) {
    const block = Math.floor(r / 4);
    weftSlots[r] = (block % 2 === 0) ? 'B' : 'A';
  }
}

// Cross weft palette for classic houndstooth
function setHoundstoothPaletteCross() {
  const colorA = els.warpA.value;
  const colorB = els.warpB.value;
  els.weftA.value = colorB; // weft A = warp B
  els.weftB.value = colorA; // weft B = warp A
}

// Decide layout based on UI + pattern name
function setLayoutFromUI(patternName) {
  const modeEl = els.layout;
  const mode = modeEl ? modeEl.value : 'auto';

  if (mode === 'stripes') {
    setLayoutStripes();
  } else if (mode === 'logCabin') {
    setLayoutLogCabin();
  } else if (mode === 'houndstooth') {
    setLayoutHoundstooth();
    setHoundstoothPaletteCross();
  } else {
    // "auto" layout based on pattern
    if (patternName === 'logCabin') {
      setLayoutLogCabin();
    } else if (patternName === 'shadowTwill4') {
      setLayoutStripes();
    } else if (patternName === 'houndstooth4') {
      setLayoutHoundstooth();
      setHoundstoothPaletteCross();
    } else {
      setLayoutStripes();
    }
  }
}

// ---------- Resizing draft ----------

function resizeDraft(newWarp, newWeft) {
  // Preserve slots and draft structure where possible
  const oldWarpSlots = warpSlots.slice();
  const oldWeftSlots = weftSlots.slice();
  const oldThr       = threading.slice();
  const oldTrd       = treadling.slice();

  warpSlots = new Array(newWarp);
  weftSlots = new Array(newWeft);

  for (let c = 0; c < newWarp; c++) {
    warpSlots[c] = oldWarpSlots[c] ?? ((c % 2 === 0) ? 'A' : 'B');
  }
  for (let r = 0; r < newWeft; r++) {
    weftSlots[r] = oldWeftSlots[r] ?? ((r % 2 === 0) ? 'A' : 'B');
  }

  threading = new Array(newWarp);
  for (let c = 0; c < newWarp; c++) {
    threading[c] = oldThr[c] ?? ((c % 4) + 1);
  }

  treadling = new Array(newWeft);
  for (let r = 0; r < newWeft; r++) {
    treadling[r] = oldTrd[r] ? new Set(oldTrd[r]) : new Set([(r % 4) + 1]);
  }

  warpCount = newWarp;
  weftCount = newWeft;
  syncCountsCSS();

  applyPaletteToSlots();
}

// ---------- Color bars UI ----------

function buildBar(container, colors, titlePrefix) {
  container.innerHTML = '';
  const len = (titlePrefix === 'Warp') ? warpCount : weftCount;

  for (let i = 0; i < len; i++) {
    const wrap  = document.createElement('div');
    wrap.className = 'cell';

    const input = document.createElement('input');
    input.type  = 'color';
    input.value = colors[i] || '#cccccc';
    input.title = `${titlePrefix} ${i + 1}`;

    // Direct per-thread color override (does not touch layout slots)
    input.addEventListener('input', () => {
      colors[i] = input.value;
      scheduleRender();
    });

    wrap.appendChild(input);
    container.appendChild(wrap);
  }
}

function buildColorBars() {
  buildBar(els.warpBar, warpColors, 'Warp');
  buildBar(els.weftBar, weftColors, 'Weft');
}

// ---------- Draft UI (threading / treadling / tie-up) ----------

function cycle(v, min = 1, max = 4, backwards = false) {
  return backwards
    ? (v - 2 + max) % max + 1
    : (v % max) + 1;
}

function buildThreadingUI() {
  els.threading.innerHTML = '';
  for (let c = 0; c < warpCount; c++) {
    const b = document.createElement('button');
    b.textContent = threading[c];
    b.title       = `Warp ${c + 1}: Shaft ${threading[c]}`;

    b.addEventListener('click', (e) => {
      threading[c] = cycle(threading[c], 1, 4, e.shiftKey);
      b.textContent = threading[c];
      b.title       = `Warp ${c + 1}: Shaft ${threading[c]}`;
      scheduleRender();
    });

    els.threading.appendChild(b);
  }
}

function buildTreadlingUI() {
  els.treadling.innerHTML = '';
  for (let r = 0; r < weftCount; r++) {
    const row = document.createElement('div');
    row.className = 'treadle-row';

    for (let t = 1; t <= 4; t++) {
      const b = document.createElement('button');
      b.textContent = t;
      b.title       = `Pick ${r + 1}: Toggle treadle ${t}`;

      if (treadling[r].has(t)) b.classList.add('on');

      b.addEventListener('click', () => {
        if (treadling[r].has(t)) {
          treadling[r].delete(t);
        } else {
          treadling[r].add(t);
        }
        // Ensure at least one treadle is active
        if (treadling[r].size === 0) {
          treadling[r].add(t);
        }
        b.classList.toggle('on', treadling[r].has(t));
        scheduleRender();
      });

      row.appendChild(b);
    }

    els.treadling.appendChild(row);
  }
}

function wireTieupUI() {
  els.tieupWrap.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    const t = +cb.dataset.t;
    const s = +cb.dataset.s;

    cb.checked = tieup[t].has(s);
    cb.onchange = () => {
      cb.checked ? tieup[t].add(s) : tieup[t].delete(s);
      scheduleRender();
    };
  });
}

// ---------- Pattern from draft ----------

function buildPatternFromDraft(rows, cols) {
  const m = Array.from({ length: rows }, () => Array(cols).fill(false));

  for (let r = 0; r < rows; r++) {
    const lifted = new Set();
    treadling[r].forEach(t =>
      (tieup[t] || new Set()).forEach(s => lifted.add(s))
    );

    for (let c = 0; c < cols; c++) {
      // true = warp over
      m[r][c] = lifted.has(threading[c]);
    }
  }
  return m;
}

// ---------- Presets ----------

function repeatToLength(seq, n) {
  const out = new Array(n);
  const L = seq.length;
  for (let i = 0; i < n; i++) out[i] = seq[i % L];
  return out;
}

function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return;

  // Draft structure from preset
  threading = repeatToLength(p.threadingSeq, warpCount);
  const trSeq = repeatToLength(p.treadlingSeq, weftCount);
  treadling = trSeq.map(arr => new Set(arr));
  tieup = {
    1: new Set(p.tieup[1] || []),
    2: new Set(p.tieup[2] || []),
    3: new Set(p.tieup[3] || []),
    4: new Set(p.tieup[4] || []),
  };

  // Color layout from UI + pattern, then palette
  setLayoutFromUI(name);
  applyPaletteToSlots();

  // UI + render
  buildColorBars();
  buildThreadingUI();
  buildTreadlingUI();
  wireTieupUI();
  scheduleRender();
}

// ---------- Render (coalesced) ----------

let rafId = null;

function scheduleRender() {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = null;
    const s = getSettings();
    syncCellSizeCSS(s.cellSize);
    const pattern = buildPatternFromDraft(s.weftCount, s.warpCount);
    window.WeaveLib.drawWeave(ctx, {
      warpCount: s.warpCount,
      weftCount: s.weftCount,
      cellSize:  s.cellSize,
      warpColors,
      weftColors,
      pattern
    });
  });
}

// ---------- Misc utils (color) ----------

function randColor() {
  const h = Math.floor(Math.random() * 360);
  const s = 60 + Math.floor(Math.random() * 30);
  const l = 55 + Math.floor(Math.random() * 20);
  return hslToHex(h, s, l);
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = x =>
    Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

// ---------- Events ----------

// Palette apply: recolor current layout
els.applyAB.addEventListener('click', () => {
  applyPaletteToSlots();
  buildColorBars();
  scheduleRender();
});

// Palette randomize: new colors, same layout
els.randomize.addEventListener('click', () => {
  els.warpA.value = randColor();
  els.warpB.value = randColor();
  els.weftA.value = randColor();
  els.weftB.value = randColor();
  applyPaletteToSlots();
  buildColorBars();
  scheduleRender();
});

// Save/load
els.save.addEventListener('click', () => {
  const data = {
    version: 5,
    warpCount,
    weftCount,
    ...getSettings(),
    warpA: els.warpA.value,
    warpB: els.warpB.value,
    weftA: els.weftA.value,
    weftB: els.weftB.value,
    warpColors,
    weftColors,
    threading,
    treadling: treadling.map(set => [...set]),
    tieup: Object.fromEntries(
      Object.entries(tieup).map(([t, set]) => [t, [...set]])
    ),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'weave.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

els.load.addEventListener('change', async () => {
  const file = els.load.files[0];
  if (!file) return;

  const text = await file.text();
  try {
    const data = JSON.parse(text);

    if (Number.isInteger(data.warpCount)) {
      warpCount = clamp(data.warpCount, 4, 64);
    }
    if (Number.isInteger(data.weftCount)) {
      weftCount = clamp(data.weftCount, 4, 64);
    }
    els.warpCountI.value = warpCount;
    els.weftCountI.value = weftCount;

    // Resize draft (slots + structure), then apply saved details
    resizeDraft(warpCount, weftCount);

    if (data.cellSize) els.cellSize.value = data.cellSize;
    if (data.warpA)    els.warpA.value   = data.warpA;
    if (data.warpB)    els.warpB.value   = data.warpB;
    if (data.weftA)    els.weftA.value   = data.weftA;
    if (data.weftB)    els.weftB.value   = data.weftB;

    if (Array.isArray(data.warpColors) && data.warpColors.length) {
      warpColors = data.warpColors.slice(0, warpCount);
    }
    if (Array.isArray(data.weftColors) && data.weftColors.length) {
      weftColors = data.weftColors.slice(0, weftCount);
    }

    if (Array.isArray(data.threading) && data.threading.length) {
      threading = data.threading.slice(0, warpCount);
    }
    if (Array.isArray(data.treadling) && data.treadling.length) {
      treadling = data.treadling
        .slice(0, weftCount)
        .map(arr => new Set(arr));
    }

    if (data.tieup) {
      tieup = { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set() };
      Object.entries(data.tieup).forEach(([t, arr]) =>
        arr.forEach(s => tieup[+t].add(+s))
      );
    }

    buildColorBars();
    buildThreadingUI();
    buildTreadlingUI();
    wireTieupUI();
    scheduleRender();
  } catch {
    alert('Invalid JSON');
  } finally {
    els.load.value = '';
  }
});

// Counts & size
function handleCountsChange() {
  const newWarp = clamp(parseInt(els.warpCountI.value, 10) || warpCount, 4, 64);
  const newWeft = clamp(parseInt(els.weftCountI.value, 10) || weftCount, 4, 64);
  if (newWarp === warpCount && newWeft === weftCount) return;

  resizeDraft(newWarp, newWeft);
  buildColorBars();
  buildThreadingUI();
  buildTreadlingUI();
  wireTieupUI();
  scheduleRender();
}

['input', 'change'].forEach(evt => {
  els.warpCountI.addEventListener(evt, handleCountsChange);
  els.weftCountI.addEventListener(evt, handleCountsChange);
  els.cellSize.addEventListener(evt, scheduleRender);
});

// Pattern + layout selectors
els.pattern.addEventListener('change', () => applyPreset(els.pattern.value));

if (els.layout) {
  els.layout.addEventListener('change', () => {
    setLayoutFromUI(els.pattern.value);
    applyPaletteToSlots();
    buildColorBars();
    scheduleRender();
  });
}

// ---------- First run ----------
window.addEventListener('load', () => {
  initDefaultColorsFromCSS();

  const initialWarp = clamp(parseInt(els.warpCountI.value, 10) || warpCount, 4, 64);
  const initialWeft = clamp(parseInt(els.weftCountI.value, 10) || weftCount, 4, 64);
  resizeDraft(initialWarp, initialWeft);

  els.warpCountI.value = warpCount;
  els.weftCountI.value = weftCount;

  syncCountsCSS();
  syncCellSizeCSS(getSettings().cellSize);

  // Initial layout: stripes + palette, then apply selected preset
  setLayoutStripes();
  applyPaletteToSlots();
  buildColorBars();
  buildThreadingUI();
  buildTreadlingUI();
  wireTieupUI();

  applyPreset(els.pattern.value);
  scheduleRender();
});
