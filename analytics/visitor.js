// LCES Analytics — Visitor Data Collection
// Fetches IP + geolocation, parses UA, collects referrer & screen info.
// Single responsibility: gather raw visitor data. No sending logic here.
(function() {
  window.LCES = window.LCES || {};
  window.LCES.Analytics = window.LCES.Analytics || {};

  // ─── Simple UA Parser ───────────────────────────────────────────
  function parseUA(ua) {
    var browser = 'Unknown';
    var os = 'Unknown';

    // Browser (order matters — Edge contains "Chrome", etc.)
    if (ua.indexOf('Edg/')   > -1) browser = 'Edge';
    else if (ua.indexOf('OPR/')    > -1) browser = 'Opera';
    else if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
    else if (ua.indexOf('Chrome')  > -1) browser = 'Chrome';
    else if (ua.indexOf('Safari')  > -1) browser = 'Safari';

    // OS
    if (ua.indexOf('Windows')    > -1) os = 'Windows';
    else if (ua.indexOf('Mac OS')     > -1) os = 'macOS';
    else if (ua.indexOf('Linux')      > -1) os = 'Linux';
    else if (ua.indexOf('Android')    > -1) os = 'Android';
    else if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) os = 'iOS';

    return browser + ' / ' + os;
  }

  // ─── Visitor ID Cookie ──────────────────────────────────────────
  // A persistent anonymous ID stored in a cookie. Survives across sessions
  // so you can correlate the same visitor even if their IP changes.
  var COOKIE_NAME = 'lces_vid';
  var COOKIE_DAYS = 365;

  function generateId() {
    // Short random hex string (8 chars = 32 bits, plenty for 253 visitors)
    var hex = '';
    for (var i = 0; i < 8; i++) {
      hex += Math.floor(Math.random() * 16).toString(16);
    }
    return hex;
  }

  function getVisitorId() {
    var match = document.cookie.match(new RegExp('(?:^|; )' + COOKIE_NAME + '=([^;]*)'));
    if (match) return decodeURIComponent(match[1]);
    var id = generateId();
    var expires = new Date(Date.now() + COOKIE_DAYS * 864e5).toUTCString();
    document.cookie = COOKIE_NAME + '=' + encodeURIComponent(id) + '; expires=' + expires + '; path=/; SameSite=Lax';
    return id;
  }

  // ─── Public API ─────────────────────────────────────────────────
  window.LCES.Analytics.Visitor = {

    // Cached geolocation response (so we only call the API once per page)
    _geoCache: null,

    // Get or create the persistent visitor ID
    getId: function() {
      return getVisitorId();
    },

    // Synchronous snapshot — no network calls.
    snapshot: function() {
      var page = location.pathname.split('/').pop() || 'index.html';
      return {
        page:      page,
        referrer:  document.referrer || 'Direct',
        ua:        navigator.userAgent,
        parsedUA:  parseUA(navigator.userAgent),
        screen:    screen.width + '×' + screen.height,
        viewport:  window.innerWidth + '×' + window.innerHeight,
        language:  navigator.language || 'unknown',
        timezone:  (Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown'),
        timestamp: new Date().toISOString(),
        visitorId: getVisitorId(),
        // Internal-only fields (used by BotFilter, not shown in embeds)
        cores:    navigator.hardwareConcurrency || 0,
        touch:    navigator.maxTouchPoints
      };
    },

    // ── IP & Geolocation — fallback chain ─────────────────────────
    // Tries multiple APIs in order. Ad blockers often kill the first one.
    // Each entry: { url, parse(response_json) → { ip, city, region, country, org } }
    _geoApis: [
      {
        // ipapi.co — full geolocation, HTTPS, 30k req/month free
        url: 'https://ipapi.co/json/',
        parse: function(d) {
          return {
            ip: d.ip || 'unknown',
            city: d.city || '',
            region: d.region || '',
            country: d.country_name || '',
            org: d.org || ''
          };
        }
      },
      {
        // ipwho.is — full geolocation, HTTPS, no key needed
        url: 'https://ipwho.is/',
        parse: function(d) {
          return {
            ip: d.ip || 'unknown',
            city: d.city || '',
            region: d.region || '',
            country: d.country || '',
            org: (d.connection && d.connection.org) || ''
          };
        }
      },
      {
        // ipify — IP only (no geolocation), HTTPS, extremely reliable
        url: 'https://api.ipify.org?format=json',
        parse: function(d) {
          return {
            ip: d.ip || 'unknown',
            city: '', region: '', country: '', org: ''
          };
        }
      }
    ],

    // Try each API in sequence until one succeeds.
    // Returns a Promise resolving to { ip, city, region, country, org }.
    // Skips all external calls when Config.enableGeoApi is false.
    getGeo: function() {
      if (this._geoCache) return Promise.resolve(this._geoCache);

      // ── Geo API Toggle ───────────────────────────────────────────
      // When disabled, return unknown geo immediately without any
      // external network requests. Prevents iOS Safari privacy warning.
      var Config = window.LCES && window.LCES.Analytics && window.LCES.Analytics.Config;
      if (Config && Config.enableGeoApi === false) {
        var unknown = { ip: 'unknown', city: '', region: '', country: '', org: '' };
        this._geoCache = unknown;
        console.log('[LCES Analytics] Geo API disabled — skipping external requests.');
        return Promise.resolve(unknown);
      }

      var apis = this._geoApis;
      var idx = 0;
      var Visitor = this;

      function tryNext() {
        if (idx >= apis.length) {
          console.warn('[LCES Analytics] All IP APIs failed — falling back to unknown.');
          return { ip: 'unknown', city: '', region: '', country: '', org: '' };
        }
        var api = apis[idx++];
        return fetch(api.url)
          .then(function(r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
          })
          .then(function(d) {
            var geo = api.parse(d);
            if (!geo.ip || geo.ip === 'unknown') throw new Error('No IP in response');
            Visitor._geoCache = geo;
            console.log('[LCES Analytics] IP resolved via ' + api.url);
            return geo;
          })
          .catch(function(err) {
            console.warn('[LCES Analytics] ' + api.url + ' failed: ' + err.message);
            return tryNext();
          });
      }

      return tryNext();
    }
  };
})();
