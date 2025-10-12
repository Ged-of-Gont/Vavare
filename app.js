// app.js — 4-shaft draft + multi-treadle (single-row UI), tightened

const els = {
  pattern:    document.getElementById('pattern'),
  warpCount:  document.getElementById('warpCount'),
  weftCount:  document.getElementById('weftCount'),
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

const N = 12;                          // fixed 12×12
const ctx = els.canvas.getContext('2d');

// Per-thread colors
let warpColors = new Array(N);
let weftColors = new Array(N);

// Draft state (4 shafts)
let threading = Array.from({ length: N }, (_, c) => (c % 4) + 1);
let treadling = Array.from({ length: N }, (_, r) => new Set([(r % 4) + 1])); // multi-treadle
let tieup = { 1: new Set([1, 2]), 2: new Set([2, 3]), 3: new Set([3, 4]), 4: new Set([4, 1]) };

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function getSettings() {
  const cellSize = clamp(parseInt(els.cellSize.value, 10) || 18, 10, 60);
  return { warpCount: N, weftCount: N, cellSize };
}
function syncCellSizeCSS(px) { document.documentElement.style.setProperty('--cs', px + 'px'); }

// ---------- Color bars (DRY) ----------
function buildBar(container, colors, titlePrefix, onChange) {
  container.innerHTML = '';
  for (let i = 0; i < N; i++) {
    const wrap = document.createElement('div');
    wrap.className = 'cell';
    const input = document.createElement('input');
    input.type = 'color';
    input.value = colors[i] || '#cccccc';
    input.title = `${titlePrefix} ${i + 1}`;
    input.addEventListener('input', () => { colors[i] = input.value; scheduleRender(); onChange?.(); });
    wrap.appendChild(input);
    container.appendChild(wrap);
  }
}
function buildColorBars() {
  buildBar(els.warpBar, warpColors, 'Warp');
  buildBar(els.weftBar, weftColors, 'Weft');
}
function seedFromAB() {
  const { warpA, warpB, weftA, weftB } = els;
  for (let c = 0; c < N; c++) warpColors[c] = (c % 2 === 0) ? warpA.value : warpB.value;
  for (let r = 0; r < N; r++) weftColors[r] = (r % 2 === 0) ? weftA.value : weftB.value;
}

// ---------- Draft UI ----------
function cycle(v, min = 1, max = 4, backwards = false) {
  return backwards ? (v - 2 + max) % max + 1 : (v % max) + 1;
}
function buildThreadingUI() {
  els.threading.innerHTML = '';
  for (let c = 0; c < N; c++) {
    const b = document.createElement('button');
    b.textContent = threading[c];
    b.title = `Warp ${c + 1}: Shaft ${threading[c]}`;
    b.addEventListener('click', (e) => {
      threading[c] = cycle(threading[c], 1, 4, e.shiftKey);
      b.textContent = threading[c];
      b.title = `Warp ${c + 1}: Shaft ${threading[c]}`;
      scheduleRender();
    });
    els.threading.appendChild(b);
  }
}
function buildTreadlingUI() {
  els.treadling.innerHTML = '';
  for (let r = 0; r < N; r++) {
    const row = document.createElement('div');
    row.className = 'treadle-row';
    for (let t = 1; t <= 4; t++) {
      const b = document.createElement('button');
      b.textContent = t;
      b.title = `Pick ${r + 1}: Toggle treadle ${t}`;
      if (treadling[r].has(t)) b.classList.add('on');
      b.addEventListener('click', () => {
        if (treadling[r].has(t)) treadling[r].delete(t); else treadling[r].add(t);
        if (treadling[r].size === 0) treadling[r].add(t); // keep at least one
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
    const t = +cb.dataset.t, s = +cb.dataset.s;
    cb.checked = tieup[t].has(s);
    cb.onchange = () => { cb.checked ? tieup[t].add(s) : tieup[t].delete(s); scheduleRender(); };
  });
}

// ---------- Pattern from draft ----------
function buildPatternFromDraft(rows, cols) {
  const m = Array.from({ length: rows }, () => Array(cols).fill(false));
  for (let r = 0; r < rows; r++) {
    const lifted = new Set();
    treadling[r].forEach(t => (tieup[t] || new Set()).forEach(s => lifted.add(s)));
    for (let c = 0; c < cols; c++) m[r][c] = lifted.has(threading[c]); // true = warp over
  }
  return m;
}

// ---------- Presets (declarative) ----------
const PRESET_PLAIN =        { key:'plain',        threadingSeq:[1,2],             treadlingSeq:[[1],[2]],                   tieup:{1:[1],   2:[2],   3:[],   4:[]} };
const PRESET_TWILL_2X2 =    { key:'twill2x2',     threadingSeq:[1,2,3,4],         treadlingSeq:[[1],[2],[3],[4]],           tieup:{1:[1,2], 2:[2,3], 3:[3,4], 4:[4,1]} };
const PRESET_BASKET_2X2 =   { key:'basket2x2',    threadingSeq:[1,1,2,2],         treadlingSeq:[[1],[1],[2],[2]],           tieup:{1:[1],   2:[2],   3:[],   4:[]} };
const PRESET_TWILL_2_1_3S = { key:'twill2_1_3shaft', threadingSeq:[1,2,3],        treadlingSeq:[[1],[2],[3]],               tieup:{1:[1,2], 2:[2,3], 3:[3,1], 4:[]} };
const PRESET_POINT_TWILL_4 ={ key:'pointTwill4',  threadingSeq:[1,2,3,4,3,2],     treadlingSeq:[[1],[2],[3],[4],[3],[2]],   tieup:{1:[1,2], 2:[2,3], 3:[3,4], 4:[4,1]} };
const PRESET_BROKEN_TWILL_4={ key:'brokenTwill4', threadingSeq:[1,2,3,4],         treadlingSeq:[[1],[3],[2],[4]],           tieup:{1:[1,2], 2:[2,3], 3:[3,4], 4:[4,1]} };
const PRESET_HERRINGBONE_4 ={ key:'herringbone4', threadingSeq:[1,2,3,4],         treadlingSeq:[[1],[2],[3],[4],[3],[2]],   tieup:{1:[1,2], 2:[2,3], 3:[3,4], 4:[4,1]} };
const PRESET_BIRDSEYE_4 =   { key:'birdsEye4',    threadingSeq:[1,2,3,4,3,2],     treadlingSeq:[[1],[2],[3],[4],[3],[2]],   tieup:{1:[1,2], 2:[2,3], 3:[3,4], 4:[4,1]} };
const PRESET_GOOSEEYE_4 =   { key:'gooseEye4',    threadingSeq:[1,2,3,4,4,3,2,1], treadlingSeq:[[1],[2],[3],[4],[4],[3],[2],[1]], tieup:{1:[1,2],2:[2,3],3:[3,4],4:[4,1]} };
const PRESET_ROSEPATH_4 =   { key:'rosepath4',    threadingSeq:[1,2,3,4],         treadlingSeq:[[1],[2],[3],[4],[3],[2]],   tieup:{1:[1,3], 2:[2,4], 3:[1,2], 4:[3,4]} };
const PRESET_MS_OS_4 =      { key:'msos4',        threadingSeq:[1,2,1,2,3,4,3,4], treadlingSeq:[[1],[2],[1],[2],[3],[4],[3],[4]], tieup:{1:[1,2],2:[2,3],3:[3,4],4:[4,1]} };
const PRESET_HUCK_SPOT_4 =  { key:'huckSpot4',    threadingSeq:[1,2,1,2,3,4,3,4], treadlingSeq:[[1],[2],[1],[2],[3],[4],[3],[4]], tieup:{1:[1,3],2:[2,4],3:[1,2],4:[3,4]} };
const PRESET_LOG_CABIN =    { key:'logCabin',     threadingSeq:[1,2],             treadlingSeq:[[1],[2]],                   tieup:{1:[1],   2:[2],   3:[],   4:[]} };

const PRESETS = {
  plain: PRESET_PLAIN,
  twill2x2: PRESET_TWILL_2X2,
  basket2x2: PRESET_BASKET_2X2,
  twill2_1_3shaft: PRESET_TWILL_2_1_3S,
  pointTwill4: PRESET_POINT_TWILL_4,
  brokenTwill4: PRESET_BROKEN_TWILL_4,
  herringbone4: PRESET_HERRINGBONE_4,
  birdsEye4: PRESET_BIRDSEYE_4,
  gooseEye4: PRESET_GOOSEEYE_4,
  rosepath4: PRESET_ROSEPATH_4,
  msos4: PRESET_MS_OS_4,
  huckSpot4: PRESET_HUCK_SPOT_4,
  logCabin: PRESET_LOG_CABIN,
};

// small utility
function repeatToLength(seq, n) {
  const out = new Array(n), L = seq.length;
  for (let i = 0; i < n; i++) out[i] = seq[i % L];
  return out;
}
function applyPreset(name) {
  const p = PRESETS[name]; if (!p) return;
  threading = repeatToLength(p.threadingSeq, N);
  const trSeq = repeatToLength(p.treadlingSeq, N);
  treadling = trSeq.map(arr => new Set(arr));
  tieup = { 1: new Set(p.tieup[1] || []), 2: new Set(p.tieup[2] || []), 3: new Set(p.tieup[3] || []), 4: new Set(p.tieup[4] || []) };
  buildThreadingUI(); buildTreadlingUI(); wireTieupUI(); scheduleRender();
}

// ---------- Render (coalesced with rAF) ----------
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

// ---------- Misc ----------
function randColor() {
  const h = Math.floor(Math.random() * 360);
  const s = 60 + Math.floor(Math.random() * 30);
  const l = 55 + Math.floor(Math.random() * 20);
  return hslToHex(h, s, l);
}
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = x => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

// ---------- Events ----------
els.applyAB.addEventListener('click', () => { seedFromAB(); buildColorBars(); scheduleRender(); });
els.randomize.addEventListener('click', () => {
  els.warpA.value = randColor(); els.warpB.value = randColor();
  els.weftA.value = randColor(); els.weftB.value = randColor();
  seedFromAB(); buildColorBars(); scheduleRender();
});
els.save.addEventListener('click', () => {
  const data = {
    version: 4,
    ...getSettings(),
    warpA: els.warpA.value, warpB: els.warpB.value,
    weftA: els.weftA.value, weftB: els.weftB.value,
    warpColors, weftColors,
    threading,
    treadling: treadling.map(set => [...set]),
    tieup: Object.fromEntries(Object.entries(tieup).map(([t, set]) => [t, [...set]])),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'weave.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
els.load.addEventListener('change', async () => {
  const file = els.load.files[0]; if (!file) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    if (data.cellSize) els.cellSize.value = data.cellSize;
    if (data.warpA) els.warpA.value = data.warpA;
    if (data.warpB) els.warpB.value = data.warpB;
    if (data.weftA) els.weftA.value = data.weftA;
    if (data.weftB) els.weftB.value = data.weftB;
    if (Array.isArray(data.warpColors) && data.warpColors.length === N) warpColors = data.warpColors.slice();
    if (Array.isArray(data.weftColors) && data.weftColors.length === N) weftColors = data.weftColors.slice();
    if (Array.isArray(data.threading) && data.threading.length === N) threading = data.threading.slice();
    if (Array.isArray(data.treadling) && data.treadling.length === N) treadling = data.treadling.map(arr => new Set(arr));
    if (data.tieup) {
      tieup = { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set() };
      Object.entries(data.tieup).forEach(([t, arr]) => arr.forEach(s => tieup[+t].add(+s)));
    }
    syncCellSizeCSS(getSettings().cellSize);
    buildColorBars(); buildThreadingUI(); buildTreadlingUI(); wireTieupUI(); scheduleRender();
  } catch {
    alert('Invalid JSON');
  } finally { els.load.value = ''; }
});
els.pattern.addEventListener('change', () => applyPreset(els.pattern.value));
['change', 'input'].forEach(evt => els.cellSize.addEventListener(evt, scheduleRender));

// ---------- First run ----------
syncCellSizeCSS(getSettings().cellSize);
seedFromAB();
buildColorBars();
buildThreadingUI();
buildTreadlingUI();
wireTieupUI();
applyPreset(els.pattern.value); // seeds and schedules first render
