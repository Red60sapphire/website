/*
 * Site config — edit this file to change your profile, links and presence.
 */
window.SITE_CONFIG = {
  // Discord user id — required for the Spotify / game / avatar presence.
  // Join https://discord.gg/lanyard first, then paste your id here.
  discordId: "1248841609567666197",

  // Fallback theme (used until presence loads a colour from album art).
  theme: { a: "#ff4d8d", b: "#7b5cff" },

  // Optional overrides. Leave empty to use Discord / local assets.
  banner: "/assets/img/icon.png",
  avatar: "",
  displayName: "",

  // Presence refresh. Lanyard's socket updates instantly; this is a fallback poll.
  pollMs: 30000,

  // View counter (abacus.jasoncameron.dev namespace/key). Set enabled:false to hide.
  counter: { enabled: true, namespace: "red60", key: "website" },
};
