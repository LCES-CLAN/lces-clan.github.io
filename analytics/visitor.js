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
        visitorId: getVisitorId()
      };
    },

    // Async — fetches IP + city/region/country from ipapi.co.
    // Returns a Promise resolving to { ip, city, region, country, org }.
    // Falls back to { ip: 'unknown' } on failure.
    getGeo: function() {
      if (this._geoCache) return Promise.resolve(this._geoCache);

      var cfg = LCES.Analytics.Config;
      return fetch(cfg.geoApiUrl)
        .then(function(r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(function(d) {
          var geo = {
            ip:      d.ip      || 'unknown',
            city:    d.city    || '',
            region:  d.region  || '',
            country: d.country_name || '',
            org:     d.org     || ''
          };
          LCES.Analytics.Visitor._geoCache = geo;
          return geo;
        })
        .catch(function() {
          return { ip: 'unknown', city: '', region: '', country: '', org: '' };
        });
    }
  };
})();
