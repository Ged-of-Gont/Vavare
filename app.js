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
  save: document.getElementById('save'),
  load: document.getElementById('load'),
};

const ctx = els.canvas.getContext('2d');

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function getSettings() {
  const warpCount = clamp(parseInt(els.warpCount.value, 10) || 40, 2, 400);
  const weftCount = clamp(parseInt(els.weftCount.value, 10) || 40, 2, 400);
  const cellSize  = clamp(parseInt(els.cellSize.value, 10)  || 12, 4, 40);
  const warpA = els.warpA.value, warpB = els.warpB.value;
  const weftA = els.weftA.value, weftB = els.weftB.value;
  const patternType = els.pattern.value;
  return { warpCount, weftCount, cellSize, warpA, warpB, weftA, weftB, patternType };
}

function render() {
  const s = getSettings();
  const { buildPattern, drawWeave } = window.WeaveLib;
  const pattern = buildPattern(s.patternType, s.weftCount, s.warpCount);
  drawWeave(ctx, { ...s, pattern });
}

// random pastel color
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

// hook up controls
['change', 'input'].forEach(evt => {
  [
    els.pattern, els.warpCount, els.weftCount, els.cellSize,
    els.warpA, els.warpB, els.weftA, els.weftB
  ].forEach(el => el.addEventListener(evt, render));
});

els.randomize.addEventListener('click', () => {
  els.warpA.value = randColor();
  els.warpB.value = randColor();
  els.weftA.value = randColor();
  els.weftB.value = randColor();
  render();
});

els.save.addEventListener('click', () => {
  const data = { ...getSettings(), version: 1 };
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
    if (data.warpCount)  els.warpCount.value = data.warpCount;
    if (data.weftCount)  els.weftCount.value = data.weftCount;
    if (data.cellSize)   els.cellSize.value  = data.cellSize;
    if (data.warpA) els.warpA.value = data.warpA;
    if (data.warpB) els.warpB.value = data.warpB;
    if (data.weftA) els.weftA.value = data.weftA;
    if (data.weftB) els.weftB.value = data.weftB;
    render();
  } catch {
    alert('Invalid JSON');
  } finally {
    els.load.value = '';
  }
});

// draw once on page load
window.addEventListener('load', render);
