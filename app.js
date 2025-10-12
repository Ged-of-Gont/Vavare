

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
};

const N = 12; // fixed 12×12
const ctx = els.canvas.getContext('2d');

// Per-thread color arrays
let warpColors = new Array(N);
let weftColors = new Array(N);

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function getSettings() {
  const warpCount = N;
  const weftCount = N;
  const cellSize  = clamp(parseInt(els.cellSize.value, 10) || 18, 10, 40);
  const patternType = els.pattern.value;
  return { warpCount, weftCount, cellSize, patternType };
}

// Keep the per-thread color swatches exactly one cell in size
function syncCellSizeCSS(cs) {
  document.documentElement.style.setProperty('--cs', cs + 'px');
}

// Create color bars (top for warp, left for weft)
function buildColorBars() {
  els.warpBar.innerHTML = '';
  els.weftBar.innerHTML = '';

  for (let c = 0; c < N; c++) {
    const wrap = document.createElement('div');
    wrap.className = 'cell';
    const input = document.createElement('input');
    input.type = 'color';
    input.value = warpColors[c] || '#cccccc';
    input.title = `Warp ${c + 1}`;
    input.addEventListener('input', () => {
      warpColors[c] = input.value;
      render();
    });
    wrap.appendChild(input);
    els.warpBar.appendChild(wrap);
  }

  for (let r = 0; r < N; r++) {
    const wrap = document.createElement('div');
    wrap.className = 'cell';
    const input = document.createElement('input');
    input.type = 'color';
    input.value = weftColors[r] || '#cccccc';
    input.title = `Weft ${r + 1}`;
    input.addEventListener('input', () => {
      weftColors[r] = input.value;
      render();
    });
    wrap.appendChild(input);
    els.weftBar.appendChild(wrap);
  }
}

function seedFromAB() {
  // Use A/B alternation to fill both arrays
  const wA = els.warpA.value, wB = els.warpB.value;
  const fA = els.weftA.value, fB = els.weftB.value;
  for (let c = 0; c < N; c++) warpColors[c] = (c % 2 === 0) ? wA : wB;
  for (let r = 0; r < N; r++) weftColors[r] = (r % 2 === 0) ? fA : fB;
}

function render() {
  // Gather current settings (pattern type, fixed 12×12, cellSize, etc.)
  const s = getSettings();

  // Keep the color-bar swatches in perfect lockstep with the canvas cells
  syncCellSizeCSS(s.cellSize);

  // Build the over/under pattern grid, then draw
  const { buildPattern, drawWeave } = window.WeaveLib;
  const pattern = buildPattern(s.patternType, s.weftCount, s.warpCount);

  drawWeave(ctx, {
    ...s,
    pattern,
    warpColors,   // per-column colors (array of 12 hex strings)
    weftColors    // per-row colors (array of 12 hex strings)
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

// Wire up global A/B actions
els.applyAB.addEventListener('click', () => {
  seedFromAB();
  buildColorBars();
  render();
});

els.randomize.addEventListener('click', () => {
  els.warpA.value = randColor();
  els.warpB.value = randColor();
  els.weftA.value = randColor();
  els.weftB.value = randColor();
  seedFromAB();
  buildColorBars();
  render();
});

// Save / Load includes per-thread colors
els.save.addEventListener('click', () => {
  const data = {
    version: 2,
    ...getSettings(),
    warpA: els.warpA.value,
    warpB: els.warpB.value,
    weftA: els.weftA.value,
    weftB: els.weftB.value,
    warpColors,
    weftColors
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
    if (data.patternType) els.pattern.value = data.patternType;
    if (data.cellSize)    els.cellSize.value  = data.cellSize;

    // A/B and per-thread colors
    if (data.warpA) els.warpA.value = data.warpA;
    if (data.warpB) els.warpB.value = data.warpB;
    if (data.weftA) els.weftA.value = data.weftA;
    if (data.weftB) els.weftB.value = data.weftB;

    if (Array.isArray(data.warpColors) && data.warpColors.length === N) warpColors = data.warpColors.slice();
    if (Array.isArray(data.weftColors) && data.weftColors.length === N) weftColors = data.weftColors.slice();

    // Set swatch size BEFORE rebuilding bars (aligns with loaded cellSize)
    syncCellSizeCSS(getSettings().cellSize);

    buildColorBars();
    render();
  } catch {
    alert('Invalid JSON');
  } finally {
    els.load.value = '';
  }
});

// React to pattern / size changes
['change', 'input'].forEach(evt => {
  [els.pattern, els.cellSize].forEach(el => el.addEventListener(evt, render));
});

// First run: sync sizes, seed colors, build bars, render
const initialCS = getSettings().cellSize;
syncCellSizeCSS(initialCS);
seedFromAB();
buildColorBars();
window.addEventListener('load', render);
