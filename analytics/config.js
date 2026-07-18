// LCES Analytics — Configuration
// All constants live here. Edit this file to customize behavior.
(function() {
  window.LCES = window.LCES || {};
  window.LCES.Analytics = window.LCES.Analytics || {};

  window.LCES.Analytics.Config = {

    // ─── Discord Webhook ────────────────────────────────────────────
    // Webhook for the #analytics channel.
    // Injected at deploy time via GitHub Actions. Empty == silent no-op locally.
    webhookUrl: '',

    // ─── IP & Geolocation API ───────────────────────────────────────
    // Returns IP, city, region, country, org — no token needed.
    // Free tier: 30k req/month, more than enough for us.
    geoApiUrl: 'https://ipapi.co/json/',

    // ─── Self-Whitelist ─────────────────────────────────────────────
    // Visit ?63 on any page to deactivate analytics. 
    // Browser will longer send analytics until cleared.
    whitelistParam: '63',
    whitelistStorageKey: 'lces_analytics_whitelist',

    // ─── Page Labels ────────────────────────────────────────────────
    // Maps pathname → human-readable name for Discord embeds.
    pageLabels: {
      '':                'Home',
      'index.html':      'Home',
      'roster.html':   'Officer Roster',
      'guestbook.html':  'Re-enlistment'
    },

    // ─── Timing ─────────────────────────────────────────────────────
    // Minimum ms between webhook posts (Discord allows ~5/2s).
    dispatchDelayMs: 1500,
    // How long to wait before considering a scroll event "settled".
    scrollDebounceMs: 2000,
    // Min ms between page views from the same visitor+page (throttle reloads/tabs).
    pageViewThrottleMs: 30000
  };
})();
