// LCES Analytics — Event Tracker
// Builds rich Discord embeds for each event type and hands them to Dispatch.
// Single responsibility: format events as embeds. No DOM hooks, no sending logic.
(function() {
  window.LCES = window.LCES || {};
  window.LCES.Analytics = window.LCES.Analytics || {};

  // ─── Embed Colors ───────────────────────────────────────────────
  var C = {
    blue:    3447003,   // page views
    green:   3066993,   // badge clicks, form submits
    gold:    15844367,  // form starts
    orange:  15105570,  // discord clicks
    grey:    9807270,   // session summaries
    purple:  10181046   // video plays
  };

  // ─── Shared footer ──────────────────────────────────────────────
  var FOOTER = { text: 'LCES-26 Analytics' };

  // ─── Helpers ────────────────────────────────────────────────────

  // Format geolocation into a single readable string
  function fmtLocation(geo) {
    if (!geo || geo.ip === 'unknown') return 'Unknown';
    var parts = [];
    if (geo.city)    parts.push(geo.city);
    if (geo.region && geo.region !== geo.city) parts.push(geo.region);
    if (geo.country) parts.push(geo.country);
    var loc = parts.join(', ') || 'Unknown';
    // Append ISP/org if available
    if (geo.org) loc += '  •  ' + geo.org;
    return loc;
  }

  // Spoiler-wrap IP for privacy (hidden by default in Discord)
  function fmtIP(ip) {
    return ip ? ('||' + ip + '||') : '||unknown||';
  }

  function pageLabel(page) {
    var labels = LCES.Analytics.Config.pageLabels;
    return labels[page] || page;
  }

  // ─── Tracker Object ─────────────────────────────────────────────
  window.LCES.Analytics.Tracker = {

    // Session start timestamp (used for duration calculations)
    _sessionStart: Date.now(),

    // ── Helper: get the visitor ID for any event ───────────────────
    _vid: function() {
      var v = LCES.Analytics.Visitor;
      return v && v.getId ? v.getId() : '?';
    },

    // ── Page View ──────────────────────────────────────────────────
    pageView: function(geo, snapshot) {
      var label = pageLabel(snapshot.page);
      LCES.Analytics.Dispatch.send({
        title: '👁️  Page View',
        color: C.blue,
        fields: [
          { name: 'Page',      value: label,              inline: true  },
          { name: 'Visitor',   value: '`' + snapshot.visitorId + '`', inline: true },
          { name: 'IP',        value: fmtIP(geo.ip),      inline: true  },
          { name: 'Location',  value: fmtLocation(geo),    inline: true  },
          { name: 'Referrer',  value: snapshot.referrer,   inline: false },
          { name: 'Browser',   value: snapshot.parsedUA,   inline: true  },
          { name: 'Screen',    value: snapshot.screen,     inline: true  },
          { name: 'Timezone',  value: snapshot.timezone,   inline: true  }
        ],
        timestamp: snapshot.timestamp,
        footer: FOOTER
      });
    },

    // ── Badge Click (roster page) ──────────────────────────────────
    badgeClick: function(badgeNum, gamertag) {
      LCES.Analytics.Dispatch.send({
        title: '🔍  Badge Lookup',
        color: C.green,
        fields: [
          { name: 'Visitor', value: '`' + this._vid() + '`', inline: true },
          { name: 'Badge #' + badgeNum, value: gamertag || '(censored)', inline: true }
        ],
        timestamp: new Date().toISOString(),
        footer: FOOTER
      });
    },

    // ── Form Started ───────────────────────────────────────────────
    formStart: function() {
      LCES.Analytics.Dispatch.send({
        title: '📝  Re-enlistment Form Started',
        color: C.gold,
        fields: [
          { name: 'Visitor', value: '`' + this._vid() + '`', inline: true }
        ],
        timestamp: new Date().toISOString(),
        footer: FOOTER
      });
    },

    // ── Form Submitted ─────────────────────────────────────────────
    formSubmit: function() {
      LCES.Analytics.Dispatch.send({
        title: '✅  Re-enlistment Form Submitted',
        color: C.green,
        fields: [
          { name: 'Visitor', value: '`' + this._vid() + '`', inline: true }
        ],
        timestamp: new Date().toISOString(),
        footer: FOOTER
      });
    },

    // ── Discord Link Clicked ───────────────────────────────────────
    discordClick: function(source) {
      LCES.Analytics.Dispatch.send({
        title: '💬  Discord Link Clicked',
        color: C.orange,
        fields: [
          { name: 'Visitor', value: '`' + this._vid() + '`', inline: true },
          { name: 'From', value: source || 'unknown', inline: true }
        ],
        timestamp: new Date().toISOString(),
        footer: FOOTER
      });
    },

    // ── Video Played ───────────────────────────────────────────────
    videoPlay: function(title) {
      LCES.Analytics.Dispatch.send({
        title: '▶️  Video Played',
        color: C.purple,
        fields: [
          { name: 'Visitor', value: '`' + this._vid() + '`', inline: true },
          { name: 'Title', value: title || 'unknown', inline: true }
        ],
        timestamp: new Date().toISOString(),
        footer: FOOTER
      });
    },

    // ── Session Summary (sent on page unload) ──────────────────────
    sessionSummary: function(maxScrollPct) {
      var duration = Math.round((Date.now() - this._sessionStart) / 1000);
      // Only report sessions longer than 3 seconds with meaningful scroll
      if (duration < 3 || maxScrollPct < 10) return null;

      var label = pageLabel(location.pathname.split('/').pop() || 'index.html');
      return {
        title: '📋  Session Summary',
        color: C.grey,
        fields: [
          { name: 'Visitor',  value: '`' + this._vid() + '`',          inline: true },
          { name: 'Page',     value: label,                              inline: true },
          { name: 'Duration', value: duration + 's',                     inline: true },
          { name: 'Scrolled', value: maxScrollPct + '%',                 inline: true }
        ],
        timestamp: new Date().toISOString(),
        footer: FOOTER
      };
    }
  };
})();
