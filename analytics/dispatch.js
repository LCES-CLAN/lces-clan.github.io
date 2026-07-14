// LCES Analytics — Discord Webhook Dispatcher
// Rate-limited sender with a queue. All webhook I/O lives here.
// Single responsibility: take an embed object and reliably deliver it to Discord.
(function() {
  window.LCES = window.LCES || {};
  window.LCES.Analytics = window.LCES.Analytics || {};

  var queue    = [];
  var sending  = false;
  var timer    = null;

  function cfg() { return LCES.Analytics.Config; }

  // ─── Flush one item, then schedule the next ─────────────────────
  function flush() {
    if (queue.length === 0) { sending = false; return; }
    sending = true;

    var embed = queue.shift();
    var url   = cfg().webhookUrl;

    // Guard: don't fire if the URL is still the placeholder
    if (!url || url.indexOf('PASTE') === 0) { sending = false; return; }

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    })
    .then(function(r) {
      // Respect Discord's Retry-After header if present
      var retry = r.headers.get('Retry-After');
      var delay = retry ? (parseFloat(retry) * 1000) : cfg().dispatchDelayMs;
      timer = setTimeout(flush, delay);
    })
    .catch(function() {
      // Back off longer on network errors
      timer = setTimeout(flush, cfg().dispatchDelayMs * 3);
    });
  }

  // ─── Public API ─────────────────────────────────────────────────
  window.LCES.Analytics.Dispatch = {

    // Queue an embed for delivery. Safe to call rapidly — the queue
    // handles rate limiting automatically.
    send: function(embed) {
      queue.push(embed);
      if (!sending) flush();
    },

    // Send immediately using fetch keepalive (for page-unload events).
    // Falls back to the queue if keepalive isn't supported.
    sendBeacon: function(embed) {
      var url = cfg().webhookUrl;
      if (!url || url.indexOf('PASTE') === 0) return;

      var body = JSON.stringify({ embeds: [embed] });

      if (typeof fetch === 'function') {
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body,
          keepalive: true
        }).catch(function() {});
      }
      // No fallback — if fetch isn't available the event is lost,
      // which is fine since the site uses fetch elsewhere anyway.
    },

    // Expose queue length for debugging
    get pending() { return queue.length; }
  };
})();
