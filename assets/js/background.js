/*
 * ambient background — slow smoke, drifting particles, rare lightning.
 * Purely decorative: low alpha, throttled, paused when the tab is hidden.
 */
(() => {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let w = 0;
  let h = 0;
  let dpr = 1;
  let blobs = [];
  let particles = [];
  let bolt = null;
  let flash = 0;
  let nextBolt = performance.now() + 9000;

  function makeSprite(rgb) {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, `rgba(${rgb},0.55)`);
    grad.addColorStop(0.45, `rgba(${rgb},0.22)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return c;
  }

  const sprites = [makeSprite("62,132,206"), makeSprite("34,86,156"), makeSprite("90,152,220")];

  function seed() {
    blobs = Array.from({ length: 8 }, (_, i) => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: (0.34 + Math.random() * 0.38) * Math.max(w, h),
      sprite: sprites[i % sprites.length],
      a: 0.18 + Math.random() * 0.16,
      vx: (Math.random() - 0.5) * 0.045,
      vy: (Math.random() - 0.5) * 0.028,
      phase: Math.random() * Math.PI * 2,
      spin: 0.00004 + Math.random() * 0.00007,
    }));

    particles = Array.from({ length: 46 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.6 + Math.random() * 1.5,
      a: 0.06 + Math.random() * 0.16,
      vy: -(0.05 + Math.random() * 0.16),
      vx: (Math.random() - 0.5) * 0.06,
    }));
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function drawBolt(time) {
    if (!bolt) {
      const x = w * (0.15 + Math.random() * 0.7);
      const points = [{ x, y: -20 }];
      let cx = x;
      let cy = -20;
      const step = h * 0.09;
      while (cy < h * (0.55 + Math.random() * 0.3)) {
        cx += (Math.random() - 0.5) * w * 0.07;
        cy += step * (0.6 + Math.random());
        points.push({ x: cx, y: cy });
      }
      bolt = { points, born: time, life: 420 };
      flash = 1;
    }

    const age = time - bolt.born;
    if (age > bolt.life) {
      bolt = null;
      return;
    }

    const fade = 1 - age / bolt.life;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    ctx.beginPath();
    ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
    for (const p of bolt.points) ctx.lineTo(p.x, p.y);

    ctx.strokeStyle = `rgba(120,180,255,${0.16 * fade})`;
    ctx.lineWidth = 7;
    ctx.stroke();

    ctx.strokeStyle = `rgba(210,235,255,${0.5 * fade})`;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  }

  let last = 0;

  function frame(time) {
    requestAnimationFrame(frame);
    if (time - last < 33) return;
    const dt = Math.min(time - last, 60);
    last = time;

    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";

    for (const b of blobs) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.phase += b.spin * dt * 16;

      const pad = b.r * 0.5;
      if (b.x < -pad) b.x = w + pad;
      if (b.x > w + pad) b.x = -pad;
      if (b.y < -pad) b.y = h + pad;
      if (b.y > h + pad) b.y = -pad;

      const wobble = 1 + Math.sin(b.phase) * 0.06;
      ctx.globalAlpha = b.a * (0.85 + Math.sin(b.phase * 0.7) * 0.15);
      const r = b.r * wobble;
      ctx.drawImage(b.sprite, b.x - r, b.y - r, r * 2, r * 2);
    }

    ctx.globalAlpha = 1;
    for (const p of particles) {
      p.x += p.vx * dt * 0.06;
      p.y += p.vy * dt * 0.06;
      if (p.y < -8) {
        p.y = h + 8;
        p.x = Math.random() * w;
      }
      if (p.x < -8) p.x = w + 8;
      if (p.x > w + 8) p.x = -8;

      ctx.beginPath();
      ctx.fillStyle = `rgba(150,200,255,${p.a})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (time > nextBolt) {
      drawBolt(time);
      nextBolt = time + 16000 + Math.random() * 16000;
    } else if (bolt) {
      drawBolt(time);
    }

    if (flash > 0) {
      flash = Math.max(0, flash - dt / 260);
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(120,175,255,${0.05 * flash})`;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.globalCompositeOperation = "source-over";
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 180);
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) last = 0;
  });

  resize();

  if (reduce) {
    ctx.globalCompositeOperation = "lighter";
    for (const b of blobs) {
      ctx.globalAlpha = b.a;
      ctx.drawImage(b.sprite, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  } else {
    requestAnimationFrame(frame);
  }
})();
