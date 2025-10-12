(function () {
  // pattern[r][c] === true  => warp over; false => weft over
  function buildPattern(patternType, rows, cols) {
    const m = Array.from({ length: rows }, () => Array(cols));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (patternType === 'plain') {
          m[r][c] = ((r + c) % 2) === 0;
        } else if (patternType === 'twill2x2') {
          m[r][c] = ((r + c) % 4) < 2;
        } else {
          m[r][c] = ((r + c) % 2) === 0;
        }
      }
    }
    return m;
  }

  function drawWeave(ctx, opts) {
    const {
      warpCount, weftCount, cellSize,
      warpA, warpB, weftA, weftB,
      pattern
    } = opts;

    // snap to integers to avoid half-pixel AA seams
    const cs = Math.max(4, Math.round(cellSize));
    const width  = warpCount * cs;
    const height = weftCount * cs;
    const dpr = window.devicePixelRatio || 1;

    // main canvas @ device pixels
    ctx.canvas.width  = Math.max(300, width) * dpr;
    ctx.canvas.height = Math.max(300, height) * dpr;
    ctx.canvas.style.width  = Math.max(300, width) + 'px';
    ctx.canvas.style.height = Math.max(300, height) + 'px';

    // clear bg
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#f7f7f7';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // offscreen warp & weft layers
    const warpLayer = document.createElement('canvas');
    const weftLayer = document.createElement('canvas');
    warpLayer.width = weftLayer.width = ctx.canvas.width;
    warpLayer.height = weftLayer.height = ctx.canvas.height;
    const wctx = warpLayer.getContext('2d');
    const fctx = weftLayer.getContext('2d');
    wctx.scale(dpr, dpr);
    fctx.scale(dpr, dpr);

    // yarn geometry (~90% of cell ⇒ vertex holes + colored inter-thread gaps)
    const yarn   = Math.min(cs * 0.9, cs);
    const radius = yarn * 0.48;
    const bleed  = cs; // extend beyond bounds so band ends never expose bg

    // helpers
    const alt = (i, A, B) => (i % 2 === 0 ? A : B);

    function lighten(hex, amt) {
      const { r, g, b } = hexToRgb(hex);
      const L = x => Math.round(x + (255 - x) * amt);
      return rgbToHex(L(r), L(g), L(b));
    }
    function hexToRgb(hex) {
      const h = hex.replace('#', '');
      const n = h.length === 3 ? h.split('').map(ch => ch + ch).join('') : h;
      const i = parseInt(n, 16);
      return { r: (i >> 16) & 255, g: (i >> 8) & 255, b: i & 255 };
    }
    function rgbToHex(r, g, b) {
      const h = x => x.toString(16).padStart(2, '0');
      return '#' + h(r) + h(g) + h(b);
    }
    function roundedRect(pctx, x, y, w, h, r, fillStyle) {
      pctx.fillStyle = fillStyle;
      pctx.beginPath();
      const rr = Math.min(r, Math.min(w, h) / 2);
      pctx.moveTo(x + rr, y);
      pctx.lineTo(x + w - rr, y);
      pctx.quadraticCurveTo(x + w, y, x + w, y + rr);
      pctx.lineTo(x + w, y + h - rr);
      pctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
      pctx.lineTo(x + rr, y + h);
      pctx.quadraticCurveTo(x, y + h, x, y + h - rr);
      pctx.lineTo(x, y + rr);
      pctx.quadraticCurveTo(x, y, x + rr, y);
      pctx.closePath();
      pctx.fill();
    }
    function weftFill(yCenter, color, pctx) {
      const g = pctx.createLinearGradient(0, yCenter - yarn/2, 0, yCenter + yarn/2);
      const hi = lighten(color, 0.14);
      g.addColorStop(0.0, hi);
      g.addColorStop(0.5, color);
      g.addColorStop(1.0, hi);
      return g;
    }
    function warpFill(xCenter, color, pctx) {
      const g = pctx.createLinearGradient(xCenter - yarn/2, 0, xCenter + yarn/2, 0);
      const hi = lighten(color, 0.14);
      g.addColorStop(0.0, hi);
      g.addColorStop(0.5, color);
      g.addColorStop(1.0, hi);
      return g;
    }

    // draw continuous WEFT bands (horizontal)
    for (let r = 0; r < weftCount; r++) {
      const y = r * cs + Math.floor(cs / 2);
      const color = alt(r, weftA, weftB);
      roundedRect(
        fctx,
        -bleed, y - yarn/2,
        width + 2*bleed, yarn,
        radius,
        weftFill(y, color, fctx)
      );
    }

    // draw continuous WARP bands (vertical)
    for (let c = 0; c < warpCount; c++) {
      const x = c * cs + Math.floor(cs / 2);
      const color = alt(c, warpA, warpB);
      roundedRect(
        wctx,
        x - yarn/2, -bleed,
        yarn, height + 2*bleed,
        radius,
        warpFill(x, color, wctx)
      );
    }

    // === Per-cell composition (no grid, no white seams) ===
    // Expand crops slightly (eps) so AA never exposes background along cell borders.
    const eps = 1.0; // try 0.75–1.25 if your screen still shows hairlines

    // Convert CSS px rect -> device px rect, clamped
    function toSrcRect(x, y, w, h) {
      const sx = Math.max(0, Math.floor((x) * dpr));
      const sy = Math.max(0, Math.floor((y) * dpr));
      const sw = Math.min(ctx.canvas.width  - sx, Math.ceil((w) * dpr));
      const sh = Math.min(ctx.canvas.height - sy, Math.ceil((h) * dpr));
      return [sx, sy, sw, sh];
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    for (let r = 0; r < weftCount; r++) {
      for (let c = 0; c < warpCount; c++) {
        const x = c * cs, y = r * cs;
        const dx = x - eps, dy = y - eps, dw = cs + 2*eps, dh = cs + 2*eps;
        const [sx0, sy0, sw0, sh0] = toSrcRect(dx, dy, dw, dh);

        if (pattern[r][c]) {
          // warp over: draw BOTH, weft first (under), then warp (over)
          ctx.drawImage(weftLayer, sx0, sy0, sw0, sh0, dx, dy, dw, dh);
          ctx.drawImage(warpLayer, sx0, sy0, sw0, sh0, dx, dy, dw, dh);
        } else {
          // weft over: draw BOTH, warp first (under), then weft (over)
          ctx.drawImage(warpLayer, sx0, sy0, sw0, sh0, dx, dy, dw, dh);
          ctx.drawImage(weftLayer, sx0, sy0, sw0, sh0, dx, dy, dw, dh);
        }
      }
    }

    ctx.restore();
  }

  window.WeaveLib = { buildPattern, drawWeave };
})();
