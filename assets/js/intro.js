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

  /* glyph bands — bright pixels get solid glyphs so they cover the blue disc */
  const BANDS = [
    [0.3, ".:;,"],
    [0.55, "xX+=*"],
    [0.78, "O0QCoc"],
    [1.01, "#%@8&"],
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

  /* keep the pfp's own colours, just richer and brighter */
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));

  function punch(r, g, b, sat, up) {
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return [
      clamp((l + (r - l) * sat) * up),
      clamp((l + (g - l) * sat) * up),
      clamp((l + (b - l) * sat) * up),
    ];
  }

  const COLS = 96;
  const image = new Image();
  image.src = CFG.introImage || "/assets/img/avatar.png";

  const render = () => {
    const rows = Math.round(COLS * 0.62);
    const SCALE = 0.8;
    const cell =
      SCALE *
      Math.min(
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

        /* everything outside the pfp's circle stays black */
        if (radius > 0.5) continue;

        const i = (y * COLS + x) * 4;
        if (data[i + 3] < 24) continue;

        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        /* the pfp's blue disc, rebuilt out of characters */
        const dr = r - bg[0];
        const dg = g - bg[1];
        const db = b - bg[2];
        if (dr * dr + dg * dg + db * db < 2100) {
          const [br, bgc, bb] = punch(r, g, b, 1.1, 1.22);
          const shade = 0.68 + Math.random() * 0.22;
          ctx.fillStyle = `rgba(${br},${bgc},${bb},${shade.toFixed(3)})`;
          ctx.fillText(Math.random() < 0.8 ? "·" : ".", cx, cy);
          continue;
        }

        let lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

        /* gentle lift so the face glows, without flattening the shadow range */
        const glow = Math.max(0, 1 - radius / 0.5);
        lum = Math.min(1, lum * 0.95 + 0.06 + glow * 0.08);

        const glyph = pickGlyph(lum);
        const [wr, wg, wb] = punch(r, g, b, 1.42, 1.02);
        const alpha = 0.95;

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
