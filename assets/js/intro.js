/*
 * intro — the avatar rendered as a field of characters; click to zoom through.
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

  const RAMP = ["·", ":", ";", "+", "*", "x", "#", "%", "@"];
  const COLS = 64;
  const image = new Image();
  image.src = CFG.introImage || "/assets/img/avatar.png";

  const render = () => {
    const rows = Math.round(COLS * 0.62);
    const cell = Math.min(
      (window.innerWidth * 0.9) / (COLS * 0.6),
      (window.innerHeight * 0.72) / rows,
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

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < COLS; x++) {
        const nx = (x + 0.5) / COLS - 0.5;
        const ny = (y + 0.5) / rows - 0.5;
        if (nx * nx + ny * ny > 0.25) continue;

        const i = (y * COLS + x) * 4;
        const alpha = data[i + 3];
        if (alpha < 24) continue;

        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const weight = Math.max(0, Math.min(1, 1 - lum));
        const glyph = RAMP[Math.min(RAMP.length - 1, Math.floor(weight * RAMP.length))];

        if (weight < 0.04) continue;

        ctx.fillStyle = `rgba(${r},${g},${b},${0.25 + weight * 0.75})`;
        ctx.fillText(glyph, x * cellW + cellW / 2, y * cell + cell / 2 + 1);
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
