// LCES Analytics — Self-Whitelist
// Visit any page with ?lces_admin to permanently whitelist your browser.
// Your visits will be silently skipped until you deactivate.
// Single responsibility: check / toggle the whitelist flag. No sending logic.
(function() {
  window.LCES = window.LCES || {};
  window.LCES.Analytics = window.LCES.Analytics || {};

  var KEY; // set lazily so config.js has time to register
  var badgeInjected = false;

  function cfg() { return LCES.Analytics.Config; }

  // Show a small persistent badge so the owner knows they're whitelisted
  function injectBadge() {
    if (badgeInjected) return;
    badgeInjected = true;
    var el = document.createElement('div');
    el.textContent = 'Analytics OFF';
    el.style.cssText = 'position:fixed;bottom:8px;left:8px;z-index:9999;font-family:"Share Tech Mono",monospace;font-size:0.55rem;padding:2px 8px;background:rgba(46,204,64,0.15);color:#2ecc40;border:1px solid rgba(46,204,64,0.3);border-radius:3px;pointer-events:none;opacity:0.7;';
    document.body.appendChild(el);
  }

  window.LCES.Analytics.Whitelist = {

    // Returns true if the current visitor is whitelisted (i.e. should be SKIPPED).
    // Also handles the ?lces_admin activation.
    isWhitelisted: function() {
      KEY = cfg().whitelistStorageKey;

      // ── Activation via URL param ─────────────────────────────────
      var params = new URLSearchParams(location.search);
      if (params.has(cfg().whitelistParam)) {
        localStorage.setItem(KEY, '1');
        console.log(
          '%c[LCES Analytics]%c Whitelist ACTIVE — your visits are no longer tracked.',
          'color:#2ecc40;font-weight:bold', 'color:inherit'
        );
        console.log(
          '%c[LCES Analytics]%c To undo, run: %cLCES.Analytics.unwhitelist()',
          'color:#2ecc40;font-weight:bold', 'color:inherit', 'color:#4db8ff'
        );
        injectBadge();
        return true;
      }

      // ── Check stored flag ────────────────────────────────────────
      if (localStorage.getItem(KEY) === '1') {
        injectBadge();
        return true;
      }

      return false;
    },

    // Deactivate the whitelist so your visits are tracked again.
    deactivate: function() {
      KEY = cfg().whitelistStorageKey;
      localStorage.removeItem(KEY);
      console.log(
        '%c[LCES Analytics]%c Whitelist REMOVED — your visits are now tracked.',
        'color:#c0392b;font-weight:bold', 'color:inherit'
      );
    }
  };
})();
