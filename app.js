// app.js — full file with 4-shaft draft

const els = {
  pattern: document.getElementById('pattern'),
  warpCount: document.getElementById('warpCount'),
  weftCount: document.getElementById('weftCount'),
  warpA: document.getElementById('warpA'),
  warpB: document.getElementById('warpB'),
  weftA: document.getElementById('weftA'),
  weftB: document.getElementById('weftB'),
  cellSize: document.getElementById('cellSize'),
  canvas: document.getElementById('weave'),
  randomize: document.getElementById('randomize'),
  applyAB: document.getElementById('applyAB'),
  save: document.getElementById('save'),
  load: document.getElementById('load'),
  warpBar: document.getElementById('warpBar'),
  weftBar: document.getElementById('weftBar'),
  threading: document.getElementById('threading'),
  treadling: document.getElementById('treadling'),
  tieupWrap: document.getElementById('tieupWrap'),
};

const N = 12; // fixed 12×12
const ctx = els.canvas.getContext('2d');

// Per-thread color arrays
let warpColors = new Array(N);
let weftColors = new Array(N);

// 4-shaft draft state
let threading  = Array.from({length:N}, (_,c)=> (c % 4) + 1); // 1,2,3,4 repeat
let treadling  = Array.from({length:N}, (_,r)=> (r % 4) + 1); // 1,2,3,4 repeat
// tieup[treadle] = Set of shafts it lifts (1..4). Default = 2/2 twill tie-up.
let tieup = {
  1: new Set([1,2]),
  2: new Set([2,3]),
  3: new Set([3,4]),
  4: new Set([4,1]),
};

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function getSettings() {
  const warpCount = N, weftCount = N;
  const cellSize  = clamp(parseInt(els.cellSize.value, 10) || 18, 10, 40);
  const patternType = els.pattern.value; // used for presets below
  return { warpCount, weftCount, cellSize, patternType };
}

// Keep the per-thread color swatches exactly one cell in size
function syncCellSizeCSS(cs) {
  document.documentElement.style.setProperty('--cs', cs + 'px');
}

// ===== Color bars (existing) =====
function buildColorBars() {
  els.warpBar.innerHTML = '';
  els.weftBar.innerHTML = '';

  for (let c = 0; c < N; c++) {
    const wrap = document.createElement('div');
    wrap.className = 'cell';
    const input = document.createElement('input');
    input.type = 'color';
    input.value = warpColors[c] || '#cccccc';
    input.title = `Warp ${c+1}`;
    input.addEventListener('input', () => { warpColors[c] = input.value; render(); });
    wrap.appendChild(input);
    els.warpBar.appendChild(wrap);
  }

  for (let r = 0; r < N; r++) {
    const wrap = document.createElement('div');
    wrap.className = 'cell';
    const input = document.createElement('input');
    input.type = 'color';
    input.value = weftColors[r] || '#cccccc';
    input.title = `Weft ${r+1}`;
    input.addEventListener('input', () => { weftColors[r] = input.value; render(); });
    wrap.appendChild(input);
    els.weftBar.appendChild(wrap);
  }
}

function seedFromAB() {
  const wA = els.warpA.value, wB = els.warpB.value;
  const fA = els.weftA.value, fB = els.weftB.value;
  for (let c = 0; c < N; c++) warpColors[c] = (c % 2 === 0) ? wA : wB;
  for (let r = 0; r < N; r++) weftColors[r] = (r % 2 === 0) ? fA : fB;
}

// ===== Draft UI =====
// click-to-cycle helper (1..4), Shift+click cycles backward
function cycle(v, min=1, max=4, backwards=false) {
  return backwards ? (v - 2 + max) % max + 1 : v % max + 1;
}

function buildThreadingUI() {
  els.threading.innerHTML = '';
  for (let c = 0; c < N; c++) {
    const b = document.createElement('button');
    b.textContent = threading[c];
    b.title = `Warp ${c+1}: Shaft ${threading[c]}`;
    b.addEventListener('click', (e)=>{
      const back = e.shiftKey;
      threading[c] = cycle(threading[c], 1, 4, back);
      b.textContent = threading[c];
      b.title = `Warp ${c+1}: Shaft ${threading[c]}`;
      render();
    });
    els.threading.appendChild(b);
  }
}

function buildTreadlingUI() {
  els.treadling.innerHTML = '';
  for (let r = 0; r < N; r++) {
    const b = document.createElement('button');
    b.textContent = treadling[r];
    b.title = `Pick ${r+1}: Treadle ${treadling[r]}`;
    b.addEventListener('click', (e)=>{
      const back = e.shiftKey;
      treadling[r] = cycle(treadling[r], 1, 4, back);
      b.textContent = treadling[r];
      b.title = `Pick ${r+1}: Treadle ${treadling[r]}`;
      render();
    });
    els.treadling.appendChild(b);
  }
}

function wireTieupUI() {
  // reflect current state
  els.tieupWrap.querySelectorAll('input[type="checkbox"]').forEach(cb=>{
    const t = +cb.dataset.t, s = +cb.dataset.s;
    cb.checked = tieup[t].has(s);
    cb.onchange = ()=>{
      if (cb.checked) tieup[t].add(s); else tieup[t].delete(s);
      render();
    };
  });
}

// ===== Pattern from draft =====
function buildPatternFromDraft(rows, cols) {
  const m = Array.from({length: rows}, ()=> Array(cols).fill(false));
  for (let r = 0; r < rows; r++) {
    const t = treadling[r];                 // treadle used on this pick (1..4)
    const lifted = tieup[t];                // Set of shafts that lift
    for (let c = 0; c < cols; c++) {
      const shaft = threading[c];           // shaft of this warp end (1..4)
      m[r][c] = lifted.has(shaft);          // true = warp over; false = weft over
    }
  }
  return m;
}

// ===== Presets (hooked to your existing pattern select) =====
function applyPreset(name) {
  if (name === 'plain') {
    // 2-shaft plain weave on 4-shaft loom
    threading = Array.from({length:N}, (_,c)=> (c % 2) + 1); // 1,2 repeat
    treadling = Array.from({length:N}, (_,r)=> (r % 2) + 1); // 1,2 repeat
    tieup = { 1:new Set([1]), 2:new Set([2]), 3:new Set(), 4:new Set() };
  } else if (name === 'twill2x2') {
    // standard 2/2 twill
    threading = Array.from({length:N}, (_,c)=> (c % 4) + 1); // 1,2,3,4 repeat
    treadling = Array.from({length:N}, (_,r)=> (r % 4) + 1); // 1,2,3,4 repeat
    tieup = {
      1:new Set([1,2]),
      2:new Set([2,3]),
      3:new Set([3,4]),
      4:new Set([4,1]),
    };
  }
  buildThreadingUI();
  buildTreadlingUI();
  wireTieupUI();
  render();
}

function render() {
  const s = getSettings();
  syncCellSizeCSS(s.cellSize);

  // Compute drawdown from draft
  const pattern = buildPatternFromDraft(s.weftCount, s.warpCount);

  // Draw using your existing renderer
  window.WeaveLib.drawWeave(ctx, {
    warpCount: s.warpCount,
    weftCount: s.weftCount,
    cellSize:  s.cellSize,
    warpColors,
    weftColors,
    pattern
  });
}

// random pastel color for A/B seeding
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

// A/B actions
els.applyAB.addEventListener('click', () => { seedFromAB(); buildColorBars(); render(); });
els.randomize.addEventListener('click', () => {
  els.warpA.value = randColor(); els.warpB.value = randColor();
  els.weftA.value = randColor(); els.weftB.value = randColor();
  seedFromAB(); buildColorBars(); render();
});

// Save / Load (now includes draft)
els.save.addEventListener('click', () => {
  const data = {
    version: 3,
    ...getSettings(),
    warpA: els.warpA.value, warpB: els.warpB.value,
    weftA: els.weftA.value, weftB: els.weftB.value,
    warpColors, weftColors,
    threading, treadling,
    tieup: Object.fromEntries(Object.entries(tieup).map(([t,set])=>[t,[...set]])),
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
    if (data.patternType) els.pattern.value = data.patternType;
    if (data.cellSize)    els.cellSize.value = data.cellSize;

    if (data.warpA) els.warpA.value = data.warpA;
    if (data.warpB) els.warpB.value = data.warpB;
    if (data.weftA) els.weftA.value = data.weftA;
    if (data.weftB) els.weftB.value = data.weftB;

    if (Array.isArray(data.warpColors) && data.warpColors.length === N) warpColors = data.warpColors.slice();
    if (Array.isArray(data.weftColors) && data.weftColors.length === N) weftColors = data.weftColors.slice();

    if (Array.isArray(data.threading) && data.threading.length === N) threading = data.threading.slice();
    if (Array.isArray(data.treadling) && data.treadling.length === N) treadling = data.treadling.slice();

    if (data.tieup) {
      tieup = { 1:new Set(), 2:new Set(), 3:new Set(), 4:new Set() };
      Object.entries(data.tieup).forEach(([t,arr])=>{
        arr.forEach(s=> tieup[+t].add(+s));
      });
    }

    syncCellSizeCSS(getSettings().cellSize);
    buildColorBars();
    buildThreadingUI();
    buildTreadlingUI();
    wireTieupUI();
    render();
  } catch {
    alert('Invalid JSON');
  } finally {
    els.load.value = '';
  }
});

// Pattern preset select
els.pattern.addEventListener('change', ()=> applyPreset(els.pattern.value));

// React to size changes
['change','input'].forEach(evt => { [els.cellSize].forEach(el => el.addEventListener(evt, render)); });

// First run
const initialCS = getSettings().cellSize;
syncCellSizeCSS(initialCS);
seedFromAB();
buildColorBars();
buildThreadingUI();
buildTreadlingUI();
wireTieupUI();
applyPreset(els.pattern.value); // sets an initial draft & renders
