// LCES Analytics — Bot / Crawler Filter
// Detects non-human traffic using two layers:
//   1. User-Agent pattern matching (definitive — catches crawlers,
//      scripts, automation frameworks by name)
//   2. Heuristic signal scoring (conservative — only blocks when
//      multiple strong bot indicators combine to score ≥ 5)
//
// The scoring threshold is deliberately high to avoid false positives
// against real members using VPNs, unusual browsers, etc.
// When in doubt: let it through.
// Single responsibility: answer "is this traffic definitely non-human?"
(function() {
  'use strict';

  window.LCES = window.LCES || {};
  window.LCES.Analytics = window.LCES.Analytics || {};

  // ─── Bot / Crawler UA patterns (lowercase) ──────────────────────
  // Covers major search engines, social media crawlers, SEO tools,
  // monitoring services, automation frameworks, and HTTP libraries.
  var BOT_UA_PATTERNS = [
    // Search engine crawlers
    'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
    'yandexbot', 'yandeximages', 'sogou', 'exabot', 'ia_archiver',

    // Social media & link preview crawlers
    'facebot', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
    'slackbot-link', 'discordbot', 'telegrambot', 'whatsapp',

    // SEO & analytics tools
    'semrush', 'ahrefsbot', 'dotbot', 'mj12bot', 'rogerbot',
    'screaming frog', 'seobility',

    // Headless browsers & automation frameworks
    'headlesschrome', 'phantomjs', 'puppeteer', 'selenium',
    'playwright', 'cypress', 'webdriver',

    // HTTP libraries (scripts, not browsers)
    'wget', 'curl', 'python-requests', 'go-http-client',
    'python-urllib', 'okhttp', 'axios', 'node-fetch',
    'aiohttp', 'httpx', 'java/', 'libwww',

    // Performance & uptime monitoring
    'lighthouse', 'pagespeed', 'prerender', 'chrome-lighthouse',
    'datadog', 'newrelic', 'pingdom', 'uptimerobot',
    'statuscake', 'checkly', 'netcraft', 'dotcom-monitor',
    'gosquared', 'freshping',

    // Security scanners (crawling for vulnerabilities)
    'zgrab', 'masscan', 'nmap', 'nikto', 'sqlmap',
    'acunetix', 'nessus', 'openvas', 'wpscan',
    'burpsuite', 'netsparker'
  ];

  // ─── Heuristic scoring ──────────────────────────────────────────
  // Score ≥ 5 = bot. Real visitors virtually never hit this threshold.
  //
  // Scoring:
  //   Unknown browser          +3  (headless, no real browser identity)
  //   800×600 screen           +3  (VGA — nobody uses this in 2026)
  //   0 touch points           +2  (headless default, all real devices
  //                                  report 1+ points)
  //   "Etc/Unknown" timezone   +2  (unset system timezone)
  //   UTC timezone             +1  (common in headless/VMs)
  //   1 CPU core               +1  (virtually always a VM/container)
  //   Direct + 800×600 + UTC   +1  (stacking bonus for max suspicion)
  var SCORE_THRESHOLD = 5;

  function heuristicScore(snapshot) {
    var score = 0;

    // Unknown browser — headless, no real browser identity
    if ((snapshot.parsedUA || '').indexOf('Unknown') !== -1) score += 3;

    // Screen resolution — 800×600 is the default headless VGA size
    if (snapshot.screen === '800×600') score += 3;

    // Touch points — 0 means headless (no real device reports 0)
    if (snapshot.touch === 0) score += 2;

    // Timezone
    if (snapshot.timezone === 'Etc/Unknown') score += 2;
    if (snapshot.timezone === 'UTC') score += 1;

    // CPU cores — 1 core is almost always a VM or container
    if (snapshot.cores === 1) score += 1;

    // Stacking bonus: trifecta of bot indicators
    if (snapshot.referrer === 'Direct' &&
        snapshot.screen === '800×600' &&
        snapshot.timezone === 'UTC') {
      score += 1;
    }

    return score;
  }

  // ─── Public API ─────────────────────────────────────────────────
  window.LCES.Analytics.BotFilter = {

    // ── Bot UA check ───────────────────────────────────────────────
    // Checks the User-Agent string against known non-human patterns.
    // No real browser identifies itself as "googlebot", "curl", etc.,
    // so this has zero false positives.
    isBotUA: function(ua) {
      var lower = (ua || navigator.userAgent || '').toLowerCase();
      for (var i = 0; i < BOT_UA_PATTERNS.length; i++) {
        if (lower.indexOf(BOT_UA_PATTERNS[i]) !== -1) return true;
      }
      return false;
    },

    // ── Full bot check ─────────────────────────────────────────────
    // Two layers: UA patterns first, then heuristic scoring.
    // The heuristic threshold is high (≥ 5) to prevent false positives.
    isBot: function(snapshot) {
      if (this.isBotUA(snapshot ? snapshot.ua : undefined)) return true;
      if (snapshot && heuristicScore(snapshot) >= SCORE_THRESHOLD) return true;
      return false;
    }
  };
})();
