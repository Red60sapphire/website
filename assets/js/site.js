/*
 * red60.us — presence + theme
 * Lanyard gives us Discord profile / Spotify / activity data over REST + a websocket.
 */
(() => {
  const CFG = window.SITE_CONFIG || {};
  const root = document.documentElement;
  const $ = (id) => document.getElementById(id);

  const els = {
    avatar: $("avatar"),
    status: $("status"),
    name: $("display-name"),
    handle: $("handle"),
    banner: $("banner-img"),
    spotify: $("spotify-body"),
    games: $("games-body"),
    views: $("views-count"),
    viewsWrap: $("views"),
  };

  /* ------------------------------------------------------------
     theme
     ------------------------------------------------------------ */

  const STORE_KEY = "red60:theme";

  function setTheme(a, b, persist = true) {
    root.style.setProperty("--theme-a", a);
    root.style.setProperty("--theme-b", b);
    if (!persist) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ a, b }));
    } catch (e) {}
  }

  if (CFG.theme && !root.style.getPropertyValue("--theme-a")) {
    setTheme(CFG.theme.a, CFG.theme.b, false);
  }

  function hsl(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s /= 100;
    l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const hex = (n) => Math.round(n * 255).toString(16).padStart(2, "0");
    return "#" + hex(f(0)) + hex(f(8)) + hex(f(4));
  }

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l * 100];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
    return [h, s * 100, l * 100];
  }

  async function paletteFrom(url) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.src = url;
    if (img.decode) await img.decode();
    else
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });

    const size = 40;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, size, size);

    let data;
    try {
      data = ctx.getImageData(0, 0, size, size).data;
    } catch (e) {
      return null; // tainted canvas
    }

    const buckets = new Map();
    for (let i = 0; i < data.length; i += 4) {
      const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
      if (s < 28 || l < 12 || l > 88) continue;
      const key = Math.floor(h / 30) % 12;
      const weight = s / 100;
      const cur = buckets.get(key) || { w: 0, h: 0, s: 0 };
      cur.w += weight;
      cur.h += h * weight;
      cur.s += s * weight;
      buckets.set(key, cur);
    }

    if (!buckets.size) return null;

    const ranked = [...buckets.values()].sort((x, y) => y.w - x.w);
    const first = ranked[0];
    const second = ranked.find((b) => Math.abs(b.h / b.w - first.h / first.w) > 40) || first;

    const h1 = first.h / first.w;
    const h2 = second.h / second.w;
    return {
      a: hsl(h1, 42, 84),
      b: hsl(h2, 38, 52),
    };
  }

  async function themeFromImage(url) {
    if (!url) return;
    try {
      const palette = await paletteFrom(url);
      if (palette) setTheme(palette.a, palette.b);
    } catch (e) {
      /* keep current theme */
    }
  }

  /* ------------------------------------------------------------
     helpers
     ------------------------------------------------------------ */

  const pad = (n) => String(n).padStart(2, "0");

  function clock(ms) {
    if (!ms || ms < 0) ms = 0;
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }

  function elapsed(start) {
    if (!start) return "";
    const total = Math.floor((Date.now() - start) / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    if (h) return `${h}h ${m}m`;
    if (m) return `${m}m`;
    return `${Math.max(total, 0)}s`;
  }

  function avatarUrl(user) {
    if (!user || !user.avatar) return "/assets/img/icon_96px.png";
    const ext = user.avatar.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=256`;
  }

  function activityImage(activity) {
    const assets = activity.assets || {};
    const image = assets.large_image;
    if (!image) return "";
    if (/^https?:\/\//.test(image)) return image;
    if (image.startsWith("mp:external/")) {
      const match = image.match(/https?\/(.+)$/);
      return match ? `https://${match[1].replace(/^\/+/, "")}` : "";
    }
    if (activity.application_id) {
      return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${image}.png`;
    }
    return "";
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  /* ------------------------------------------------------------
     spotify
     ------------------------------------------------------------ */

  let currentTrack = null;
  let ticker = null;

  function renderSpotify(track) {
    const body = els.spotify;
    if (!body) return;

    if (!track) {
      currentTrack = null;
      body.innerHTML = '<p class="empty-text">not listening to anything right now</p>';
      return;
    }

    currentTrack = track;
    const start = track.timestamps?.start || 0;
    const end = track.timestamps?.end || 0;

    body.innerHTML = `
      <div class="track">
        <img class="track-art" id="sp-art" src="${track.album_art_url}" alt="" loading="lazy" crossorigin="anonymous">
        <div class="track-meta">
          <a class="track-name" id="sp-name" href="https://open.spotify.com/track/${track.track_id}" target="_blank" rel="noopener"></a>
          <div class="track-artists" id="sp-artist"></div>
        </div>
        <div class="eq" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
      </div>
      <div class="progress"><div class="progress-bar" id="sp-bar"></div></div>
      <div class="times"><span id="sp-cur">0:00</span><span id="sp-total"></span></div>
    `;

    $("sp-name").textContent = track.song;
    $("sp-artist").textContent = track.artist;
    $("sp-total").textContent = clock(end - start);

    themeFromImage(track.album_art_url);

    clearInterval(ticker);
    tick();
    ticker = setInterval(tick, 1000);

    function tick() {
      const bar = $("sp-bar");
      const cur = $("sp-cur");
      if (!bar || !cur) return clearInterval(ticker);
      const now = Date.now();
      const span = Math.max(end - start, 1);
      const pct = Math.min(Math.max((now - start) / span, 0), 1);
      bar.style.width = (pct * 100).toFixed(2) + "%";
      cur.textContent = clock(now - start);
    }
  }

  /* ------------------------------------------------------------
     games
     ------------------------------------------------------------ */

  function renderGames(activities) {
    const body = els.games;
    if (!body) return;

    const games = (activities || []).filter(
      (a) => a.type === 0 && a.name && a.name.toLowerCase() !== "spotify"
    );

    if (!games.length) {
      body.innerHTML = '<p class="empty-text">not playing anything right now.</p>';
      return;
    }

    body.innerHTML = games
      .slice(0, 3)
      .map((a) => {
        const img = activityImage(a);
        const detail = a.details || a.state || "";
        const since = a.timestamps?.start ? elapsed(a.timestamps.start) : "";
        return `
        <div class="game">
          ${img ? `<img class="game-icon" src="${img}" alt="" loading="lazy" onerror="this.style.display='none'">` : ""}
          <div style="min-width:0">
            <div class="game-name"></div>
            ${detail ? '<div class="game-detail"></div>' : ""}
            ${since ? `<div class="game-sub">${since} elapsed</div>` : ""}
          </div>
        </div>`;
      })
      .join("");

    [...body.querySelectorAll(".game")].forEach((node, i) => {
      const a = games[i];
      node.querySelector(".game-name").textContent = a.name;
      const detail = a.details || a.state || "";
      const detailEl = node.querySelector(".game-detail");
      if (detailEl && detail) detailEl.textContent = detail;
    });

    const first = activityImage(games[0]);
    if (first) themeFromImage(first);
  }

  /* ------------------------------------------------------------
     profile
     ------------------------------------------------------------ */

  function renderUser(data) {
    const user = data.discord_user || {};
    const name = CFG.displayName || user.global_name || user.display_name || user.username || "Red60";
    const handle = "@" + (user.username || "Red60sapphire");

    if (els.name) els.name.textContent = name;
    if (els.handle) els.handle.textContent = handle;
    if (els.status) els.status.dataset.status = data.discord_status || "offline";
    if (els.avatar && (CFG.avatar || user.avatar)) {
      els.avatar.src = CFG.avatar || avatarUrl(user);
    }
    document.title = CFG.displayName || name;
  }

  function renderPresence(data) {
    if (!data) return;
    renderUser(data);
    renderSpotify(data.listening_to_spotify ? data.spotify : null);
    renderGames(data.activities);
  }

  /* ------------------------------------------------------------
     lanyard
     ------------------------------------------------------------ */

  function connect() {
    const id = CFG.discordId;
    if (!id) {
      renderSpotify(null);
      renderGames([]);
      return;
    }

    const api = `https://api.lanyard.rest/v1/users/${id}`;

    const poll = () =>
      fetch(api)
        .then((r) => r.json())
        .then((res) => res.success && renderPresence(res.data))
        .catch(() => {});

    poll();
    setInterval(poll, CFG.pollMs || 30000);

    let ws;
    let heartbeat;
    let retry = 0;

    const open = () => {
      try {
        ws = new WebSocket("wss://api.lanyard.rest/socket");
      } catch (e) {
        return;
      }

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.op === 1) {
          const interval = msg.d.heartbeat_interval;
          clearInterval(heartbeat);
          heartbeat = setInterval(() => ws.readyState === 1 && ws.send(JSON.stringify({ op: 3 })), interval);
          ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: id } }));
        } else if (msg.op === 0) {
          retry = 0;
          renderPresence(msg.d);
        }
      };

      ws.onclose = () => {
        clearInterval(heartbeat);
        retry = Math.min(retry + 1, 6);
        setTimeout(open, retry * 2000);
      };
    };

    open();
  }

  /* ------------------------------------------------------------
     views
     ------------------------------------------------------------ */

  function counter() {
    const cfg = CFG.counter;
    if (!els.views || !cfg || cfg.enabled === false) {
      if (els.viewsWrap) els.viewsWrap.style.display = "none";
      return;
    }
    fetch(`https://abacus.jasoncameron.dev/hit/${cfg.namespace}/${cfg.key}`)
      .then((r) => r.json())
      .then((res) => {
        if (typeof res.value === "number") els.views.textContent = res.value.toLocaleString("en-US");
      })
      .catch(() => {
        if (els.viewsWrap) els.viewsWrap.style.display = "none";
      });
  }

  /* ------------------------------------------------------------
     boot
     ------------------------------------------------------------ */

  if (CFG.banner) {
    if (els.banner) els.banner.src = CFG.banner;
  } else if (els.banner) {
    els.banner.style.display = "none";
  }

  connect();
  counter();
})();
