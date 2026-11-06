/*
 * intro — the avatar rendered as a dense ASCII portrait; click to zoom through.
 */
(() => {
  const CFG = window.SITE_CONFIG || {};
  const intro = document.getElementById("intro");
  if (!intro) return;

  const canvas = document.getElementById("intro-canvas");
  const params = new URLSearchParams(location.search);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const skip = CFG.intro === false || params.get("intro") === "0";

  const finish = (animate) => {
    if (animate && !reduce) {
      canvas.style.transform = "scale(7)";
      canvas.style.opacity = "0";
      intro.style.opacity = "0";
      intro.style.pointerEvents = "none";
      setTimeout(() => intro.remove(), 950);
    } else {
      intro.remove();
    }
    document.body.classList.remove("intro-lock");
  };

  if (skip) {
    intro.remove();
    return;
  }

  document.body.classList.add("intro-lock");

  /* glyph bands — shadows are dense, mids carry detail, highlights go sparse */
  const BANDS = [
    [0.36, "#%&@8"],
    [0.58, "xX+=*"],
    [0.8, "O0QCoc"],
    [1.01, ".:;,"],
  ];

  function pickGlyph(lum) {
    for (let i = 0; i < BANDS.length; i++) {
      if (lum < BANDS[i][0]) {
        const set = BANDS[i][1];
        return set[Math.floor(Math.random() * set.length)];
      }
    }
    return ".";
  }

  /* luminance → warm palette (charcoal → bronze → amber → gold) */
  const WARM = [
    [0.0, [62, 36, 16]],
    [0.16, [98, 56, 21]],
    [0.32, [142, 80, 25]],
    [0.48, [190, 110, 32]],
    [0.64, [232, 152, 40]],
    [0.8, [252, 202, 78]],
    [0.93, [255, 238, 182]],
  ];

  function warmAt(l) {
    for (let i = 1; i < WARM.length; i++) {
      if (l <= WARM[i][0]) {
        const [t0, c0] = WARM[i - 1];
        const [t1, c1] = WARM[i];
        const t = (l - t0) / (t1 - t0);
        return [
          Math.round(c0[0] + (c1[0] - c0[0]) * t),
          Math.round(c0[1] + (c1[1] - c0[1]) * t),
          Math.round(c0[2] + (c1[2] - c0[2]) * t),
        ];
      }
    }
    return WARM[WARM.length - 1][1];
  }

  const COLS = 78;
  const image = new Image();
  image.src = CFG.introImage || "/assets/img/avatar.png";

  const render = () => {
    const rows = Math.round(COLS * 0.62);
    const cell = Math.min(
      (window.innerWidth * 0.9) / (COLS * 0.6),
      (window.innerHeight * 0.82) / rows,
      22
    );
    const cellW = cell * 0.6;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(COLS * cellW * dpr);
    canvas.height = Math.round(rows * cell * dpr);
    canvas.style.width = `${COLS * cellW}px`;
    canvas.style.height = `${rows * cell}px`;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const sample = document.createElement("canvas");
    sample.width = COLS;
    sample.height = rows;
    const sctx = sample.getContext("2d", { willReadFrequently: true });
    sctx.drawImage(image, 0, 0, COLS, rows);

    let data;
    try {
      data = sctx.getImageData(0, 0, COLS, rows).data;
    } catch (e) {
      data = null;
    }

    if (!data) {
      ctx.drawImage(image, 0, 0, COLS * cellW, rows * cell);
      requestAnimationFrame(() => canvas.classList.add("ready"));
      return;
    }

    ctx.font = `${cell * 1.02}px "Geist Mono", ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const bg = [data[0], data[1], data[2]];

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < COLS; x++) {
        const nx = (x + 0.5) / COLS - 0.5;
        const ny = (y + 0.5) / rows - 0.5;
        const radius = Math.sqrt(nx * nx + ny * ny);
        const cx = x * cellW + cellW / 2;
        const cy = y * cell + cell / 2 + 1;

        /* halo: tiny cyan field outside the portrait */
        if (radius > 0.5) {
          const falloff = Math.max(0, 1 - (radius - 0.5) / 0.42);
          if (Math.random() < 0.5 * falloff * falloff) {
            const cyan = Math.random() < 0.62;
            const alpha = (0.1 + 0.32 * falloff) * (0.6 + Math.random() * 0.4);
            ctx.fillStyle = cyan
              ? `rgba(95,208,240,${alpha})`
              : `rgba(84,138,190,${alpha})`;
            ctx.fillText(Math.random() < 0.7 ? "·" : ".", cx, cy);
          }
          continue;
        }

        const i = (y * COLS + x) * 4;
        if (data[i + 3] < 24) continue;

        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        /* drop the flat blue backdrop so the portrait sits on black */
        const dr = r - bg[0];
        const dg = g - bg[1];
        const db = b - bg[2];
        if (dr * dr + dg * dg + db * db < 2100) continue;

        let lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

        /* gentle lift so the face glows, without flattening the shadow range */
        const glow = Math.max(0, 1 - radius / 0.5);
        lum = Math.min(1, lum * 0.94 + 0.06 + glow * 0.1);

        const glyph = pickGlyph(lum);
        const shade = Math.pow(lum, 1.1);
        const [wr, wg, wb] = warmAt(shade);
        const alpha = 0.88 + Math.random() * 0.12;

        ctx.fillStyle = `rgba(${wr},${wg},${wb},${alpha.toFixed(3)})`;
        ctx.fillText(glyph, cx, cy);
      }
    }

    requestAnimationFrame(() => canvas.classList.add("ready"));
  };

  const boot = () => {
    const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.all([image.decode ? image.decode().catch(() => {}) : null, fonts]).then(render);
  };

  if (image.complete) boot();
  else image.addEventListener("load", boot, { once: true });
  image.addEventListener("error", () => finish(false), { once: true });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 200);
  });

  let done = false;
  const enter = () => {
    if (done) return;
    done = true;
    finish(true);
  };

  intro.addEventListener("click", enter);
  intro.addEventListener("wheel", enter, { passive: true });
  window.addEventListener("keydown", enter);

  setTimeout(() => {
    if (!done) {
      done = true;
      finish(false);
    }
  }, 20000);
})();
