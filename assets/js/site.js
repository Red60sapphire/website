/*
 * red60.us — Discord presence, profile and page theme.
 */
(() => {
  const CFG = window.SITE_CONFIG || {};
  const root = document.documentElement;
  const $ = (id) => document.getElementById(id);

  const els = {
    avatar: $("avatar"),
    deco: $("avatar-deco"),
    status: $("status"),
    name: $("display-name"),
    handle: $("handle"),
    badges: $("badges"),
    banner: $("banner-img"),
    spotify: $("spotify-body"),
    games: $("games-body"),
    views: $("views-count"),
    viewsWrap: $("views"),
  };

  /* ------------------------------------------------------------
     Discord badges (real flags only — never invent achievements)
     ------------------------------------------------------------ */

  const BADGE_ICONS = {
    NITRO: ["2ba85e8026a8614b640c2837bcdfe21b", "Nitro"],
    PARTNER: ["3f9748e53446a137a052f3454e2de41e", "Partnered Server Owner"],
    HYPESQUAD_EVENTS: ["8a88d63823d8a71cd5e390baa45efa02", "HypeSquad Events"],
    HYPESQUAD_BRAVERY: ["8a88d63823d8a71cd5e390baa45efa02", "HypeSquad Bravery"],
    HYPESQUAD_BRILLIANCE: ["011940fd013da3f7fb926e4a1cd2e618", "HypeSquad Brilliance"],
    HYPESQUAD_BALANCE: ["3aa41de486fa12454c3761e8e223442e", "HypeSquad Balance"],
    BUG_HUNTER_LEVEL_1: ["2717692c7dca7289b35297368a940dd0", "Bug Hunter"],
    BUG_HUNTER_LEVEL_2: ["3ae63761260f9f8b7c8f6f09f0f0ac1c", "Bug Hunter Gold"],
    EARLY_SUPPORTER: ["7060786766c9c840eb3019e725d2b358", "Early Supporter"],
    EARLY_VERIFIED_BOT_DEVELOPER: ["6df5892e0f35b7634d1412ea2ef0c5ea", "Early Verified Developer"],
    VERIFIED_BOT_DEVELOPER: ["6df5892e0f35b7634d1412ea2ef0c5ea", "Verified Bot Developer"],
    ACTIVE_DEVELOPER: ["6bdc42827a38498929a4920da12695d9", "Active Developer"],
  };

  /* bitmask fallback when the decoded profile is unavailable */
  const FLAG_BITS = {
    2: "PARTNER",
    4: "HYPESQUAD_EVENTS",
    8: "BUG_HUNTER_LEVEL_1",
    64: "HYPESQUAD_BRAVERY",
    128: "HYPESQUAD_BRILLIANCE",
    256: "HYPESQUAD_BALANCE",
    512: "EARLY_SUPPORTER",
    16384: "BUG_HUNTER_LEVEL_2",
    65536: "EARLY_VERIFIED_BOT_DEVELOPER",
    4194304: "ACTIVE_DEVELOPER",
  };

  let badgeNames = null;
  let lastUser = null;
  let profile = null;

  function badgeNode(src, title) {
    const span = document.createElement("span");
    span.className = "badge";
    span.title = title;
    span.setAttribute("aria-label", title);
    const img = document.createElement("img");
    img.src = src;
    img.alt = title;
    img.loading = "lazy";
    img.onerror = () => span.remove();
    span.appendChild(img);
    return span;
  }

  function renderBadges(source) {
    const el = els.badges;
    if (!el) return;
    el.textContent = "";

    /* the decoded profile is the source of truth; Lanyard is the fallback */
    const user = profile || source || {};

    let names = user.public_flags_array || badgeNames;
    if (!Array.isArray(names)) {
      const flags = user.public_flags || 0;
      names = Object.keys(FLAG_BITS)
        .filter((bit) => (flags & Number(bit)) === Number(bit))
        .map((bit) => FLAG_BITS[bit]);
    }

    const seen = new Set();
    for (const name of names) {
      const entry = BADGE_ICONS[name];
      if (!entry || seen.has(name)) continue;
      seen.add(name);
      el.appendChild(
        badgeNode(`https://cdn.discordapp.com/badge-icons/${entry[0]}.png`, entry[1])
      );
    }

    const guild = user.primary_guild || user.clan;
    if (guild && guild.identity_enabled && guild.badge && guild.identity_guild_id) {
      el.appendChild(
        badgeNode(
          CFG.clanBadge ||
            `https://cdn.discordapp.com/clan-badges/${guild.identity_guild_id}/${guild.badge}.png?size=32`,
          "Server tag"
        )
      );
    }

    for (const b of CFG.badges || []) {
      if (!b || !b.icon) continue;
      el.appendChild(badgeNode(b.icon, b.name || ""));
    }
  }

  function loadBadges(id) {
    fetch(`https://japi.rest/discord/v1/user/${id}`)
      .then((r) => r.json())
      .then((res) => {
        const data = res && res.data;
        if (!data) return;
        profile = data;
        badgeNames = Array.isArray(data.public_flags_array) ? data.public_flags_array : null;
        renderBadges(data);
      })
      .catch(() => {});
  }

  /* ------------------------------------------------------------
     theme
     ------------------------------------------------------------ */

  const STORE_KEY = "red60:theme";

  function setTheme(a, b, persist) {
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

  const hex = (n) => Math.round(n).toString(16).padStart(2, "0");

  function hsl(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s /= 100;
    l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return "#" + hex(f(0) * 255) + hex(f(8) * 255) + hex(f(4) * 255);
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

  async function themeFromImage(url) {
    if (!url) return;
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      if (img.decode) await img.decode();
      else await new Promise((res, rej) => ((img.onload = res), (img.onerror = rej)));

      const size = 32;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, size, size);

      let data;
      try {
        data = ctx.getImageData(0, 0, size, size).data;
      } catch (e) {
        return;
      }

      const buckets = new Map();
      for (let i = 0; i < data.length; i += 4) {
        const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
        if (s < 30 || l < 14 || l > 86) continue;
        const key = Math.floor(h / 30) % 12;
        const w = s / 100;
        const cur = buckets.get(key) || { w: 0, h: 0 };
        cur.w += w;
        cur.h += h * w;
        buckets.set(key, cur);
      }

      if (!buckets.size) return;
      const ranked = [...buckets.values()].sort((x, y) => y.w - x.w);
      const first = ranked[0];
      const second = ranked.find((b) => Math.abs(b.h / b.w - first.h / first.w) > 40) || first;

      setTheme(hsl(first.h / first.w, 46, 72), hsl(second.h / second.w, 40, 58), true);
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
    const total = Math.max(0, Math.floor((Date.now() - start) / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    if (h) return `${h}h ${m}m`;
    if (m) return `${m}m`;
    return `${total}s`;
  }

  function avatarUrl(user) {
    if (!user || !user.avatar) return "/assets/img/avatar.png";
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

  /* ------------------------------------------------------------
     spotify
     ------------------------------------------------------------ */

  let ticker = null;

  function renderSpotify(track) {
    const body = els.spotify;
    if (!body) return;

    if (!track) {
      clearInterval(ticker);
      body.innerHTML = '<p class="empty">not listening to anything right now</p>';
      return;
    }

    const start = track.timestamps?.start || 0;
    const end = track.timestamps?.end || 0;

    body.innerHTML = `
      <div class="track">
        <img class="track-art" src="${track.album_art_url}" alt="" crossorigin="anonymous" />
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
    const tick = () => {
      const bar = $("sp-bar");
      const cur = $("sp-cur");
      if (!bar || !cur) return clearInterval(ticker);
      const span = Math.max(end - start, 1);
      const pct = Math.min(Math.max((Date.now() - start) / span, 0), 1);
      bar.style.width = (pct * 100).toFixed(2) + "%";
      cur.textContent = clock(Date.now() - start);
    };
    tick();
    ticker = setInterval(tick, 1000);
  }

  /* ------------------------------------------------------------
     games
     ------------------------------------------------------------ */

  /* known activity icons when Discord sends no artwork */
  const GAME_ICONS = {
    "363445589247131668": "roblox",
  };

  function gameIcon(activity) {
    const src = activityImage(activity);

    if (src) {
      const img = document.createElement("img");
      img.className = "game-icon";
      img.src = src;
      img.alt = "";
      img.loading = "lazy";
      img.onerror = () => img.replaceWith(fallbackIcon());
      return img;
    }

    const slug = GAME_ICONS[activity.application_id];
    if (slug) {
      const img = document.createElement("img");
      img.className = "game-icon game-icon--brand";
      img.src = `/assets/icons/${slug}.svg`;
      img.alt = "";
      img.loading = "lazy";
      img.onerror = () => img.replaceWith(fallbackIcon());
      return img;
    }

    return fallbackIcon();
  }

  function fallbackIcon() {
    const span = document.createElement("span");
    span.className = "game-icon game-icon--fallback";
    span.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6.5 8h11a4.5 4.5 0 0 1 4.4 5.4l-.5 2.7a3 3 0 0 1-5.2 1.5L14.8 16H9.2l-1.4 1.6a3 3 0 0 1-5.2-1.5l-.5-2.7A4.5 4.5 0 0 1 6.5 8Z"/><path d="M7.5 11.5v3M6 13h3M16 12h.01M18 14h.01"/></svg>';
    return span;
  }

  function renderGames(activities) {
    const body = els.games;
    if (!body) return;

    const games = (activities || []).filter(
      (a) => a.type === 0 && a.name && a.name.toLowerCase() !== "spotify"
    );

    if (!games.length) {
      body.innerHTML = '<p class="empty">not playing anything right now.</p>';
      return;
    }

    body.innerHTML = "";
    for (const g of games.slice(0, 3)) {
      const detail = g.details || g.state || "";
      const since = g.timestamps?.start ? elapsed(g.timestamps.start) : "";

      const row = document.createElement("div");
      row.className = "game";
      row.appendChild(gameIcon(g));

      const meta = document.createElement("div");
      meta.className = "game-body";

      const name = document.createElement("div");
      name.className = "game-name";
      name.textContent = g.name;
      meta.appendChild(name);

      if (detail) {
        const d = document.createElement("div");
        d.className = "game-detail";
        d.textContent = detail;
        meta.appendChild(d);
      }

      if (since) {
        const s = document.createElement("div");
        s.className = "game-sub";
        s.textContent = `${since} elapsed`;
        meta.appendChild(s);
      }

      row.appendChild(meta);
      body.appendChild(row);
    }

    const first = activityImage(games[0]);
    if (first) themeFromImage(first);
  }

  /* ------------------------------------------------------------
     profile
     ------------------------------------------------------------ */

  function renderUser(data) {
    const user = data.discord_user || {};
    const name = CFG.displayName || user.global_name || user.display_name || user.username || "Red60";

    if (els.name) {
      els.name.textContent = name;

      const styles = user.display_name_styles;
      const colors = styles && Array.isArray(styles.colors) ? styles.colors : [];
      if (colors.length === 2) {
        const toHex = (n) => "#" + n.toString(16).padStart(6, "0");
        els.name.style.setProperty("--name-a", toHex(colors[0]));
        els.name.style.setProperty("--name-b", toHex(colors[1]));
        els.name.classList.add("styled");
      }
    }

    if (els.handle) els.handle.textContent = "@" + (user.username || "Red60sapphire");

    if (els.status) {
      const state = data.discord_status || "offline";
      els.status.dataset.status = state;
      els.status.title = state;
    }

    const src = CFG.avatar || avatarUrl(user);
    if (els.avatar && (CFG.avatar || user.avatar)) els.avatar.src = src;

    const deco = user.avatar_decoration_data && user.avatar_decoration_data.asset;
    if (els.deco && deco) {
      els.deco.src = `https://cdn.discordapp.com/avatar-decoration-presets/${deco}.png`;
      els.deco.hidden = false;
      els.deco.onerror = () => (els.deco.hidden = true);
    }

    renderBadges(user);
    lastUser = user;
    document.title = name;
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
    loadBadges(id);
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
          heartbeat = setInterval(
            () => ws.readyState === 1 && ws.send(JSON.stringify({ op: 3 })),
            interval
          );
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

  if (els.banner && CFG.banner) els.banner.src = CFG.banner;

  connect();
  counter();
})();
