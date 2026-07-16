// LCES Analytics — Entry Point
// Orchestrates all modules. This is the only script the HTML pages load directly.
// Requires (in order): config.js, visitor.js, whitelist.js, dispatch.js, tracker.js
(function() {
  'use strict';

  var NS = window.LCES.Analytics;

  // ─── Guard: check all modules loaded ────────────────────────────
  if (!NS.Config || !NS.Visitor || !NS.Whitelist || !NS.Dispatch || !NS.Tracker || !NS.BotFilter) {
    console.warn('[LCES Analytics] Module(s) missing — analytics disabled.');
    return;
  }

  var Config   = NS.Config;
  var Visitor  = NS.Visitor;
  var Whitelist = NS.Whitelist;
  var BotFilter = NS.BotFilter;
  var Tracker  = NS.Tracker;

  // ─── Self-Whitelist Check ───────────────────────────────────────
  // If the visitor is the site owner, stop here.
  if (Whitelist.isWhitelisted()) return;

  // ─── Page View ──────────────────────────────────────────────────
  var snap = Visitor.snapshot();

  // ─── Bot / Crawler Check ────────────────────────────────────────
  // Two conservative layers: UA pattern matching (zero false positives
  // — no real browser calls itself "googlebot") and heuristic scoring
  // (threshold ≥5 — catches obvious bots without risking real members).
  if (BotFilter.isBot(snap)) {
    return;
  }

  Visitor.getGeo().then(function(geo) {
    Tracker.pageView(geo, snap);
    // Stash geo on the namespace for later use by hooks
    NS._geo = geo;
  });

  // ─── Scroll Depth Tracking ──────────────────────────────────────
  var maxScroll = 0;
  var scrollTimer = null;

  window.addEventListener('scroll', function() {
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;
    var pct = Math.min(Math.round((window.scrollY / docHeight) * 100), 100);
    if (pct > maxScroll) maxScroll = pct;
  }, { passive: true });

  // ─── Session Summary on Page Unload ─────────────────────────────
  window.addEventListener('beforeunload', function() {
    var embed = Tracker.sessionSummary(maxScroll);
    if (embed) NS.Dispatch.sendBeacon(embed);
  });

  // ─── Page-Specific Hooks ────────────────────────────────────────

  // Officer Roster — track badge row clicks via event delegation
  var rosterBody = document.getElementById('roster-body');
  if (rosterBody) {
    rosterBody.addEventListener('click', function(e) {
      var row = e.target.closest('tr');
      if (!row) return;
      var badgeCell = row.querySelector('.badge-num');
      var gtCell = row.querySelector('.gamertag');
      if (!badgeCell) return;
      var badgeNum = badgeCell.textContent.replace('#', '').trim();
      var gamertag = gtCell ? gtCell.textContent.trim() : '';
      Tracker.badgeClick(badgeNum, gamertag);
    });
  }

  // Re-enlistment Form — track start and submit
  var formContainer = document.getElementById('enlist-form');
  if (formContainer) {
    var enlistFormFocused = false;
    formContainer.addEventListener('focusin', function() {
      if (!enlistFormFocused) {
        enlistFormFocused = true;
        Tracker.formStart();
      }
    });
  }

  // Discord links — track clicks via event delegation
  document.addEventListener('click', function(e) {
    var link = e.target.closest('a[href*="discord.gg"]');
    if (!link) return;
    var source = link.closest('section');
    var sectionId = source ? (source.id || source.className.split(' ')[0] || 'unknown') : 'unknown';
    Tracker.discordClick(sectionId);
  });

  // ─── Expose Public Hooks ────────────────────────────────────────
  // Other scripts can call these: window.LCES.trackFormSubmit()
  window.LCES.trackFormSubmit = function() { Tracker.formSubmit(); };
  window.LCES.trackVideoPlay  = function(title) { Tracker.videoPlay(title); };
  window.LCES.trackBadgeClick = function(num, tag) { Tracker.badgeClick(num, tag); };

  // Whitelist toggle
  window.LCES.unwhitelist = function() { Whitelist.deactivate(); };

})();
