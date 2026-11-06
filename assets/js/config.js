/*
 * Site config — edit this file to change your profile, links and presence.
 */
window.SITE_CONFIG = {
  // Discord user id — required for the Spotify / game / avatar presence.
  // Join https://discord.gg/lanyard first, then paste your id here.
  discordId: "1248841609567666197",

  // Fallback theme (used until presence loads a colour from album art).
  theme: { a: "#5aa9ff", b: "#7aa2ff" },

  // Optional overrides. Leave empty to use Discord / local assets.
  banner: "/assets/img/banner.png",
  avatar: "",
  displayName: "",

  // Intro: the avatar drawn out of characters, click to zoom in.
  intro: true,
  introImage: "/assets/img/avatar.png",

  // Optional extra Discord-style badges: [{ name: "Nitro", icon: "url" }]
  badges: [],

  // Server-tag badge. Cached locally so it always renders.
  clanBadge: "/assets/img/clan-badge.png",

  // Presence refresh. Lanyard's socket updates instantly; this is a fallback poll.
  pollMs: 30000,

  // View counter (abacus.jasoncameron.dev namespace/key). Set enabled:false to hide.
  counter: { enabled: true, namespace: "red60", key: "website" },
};
