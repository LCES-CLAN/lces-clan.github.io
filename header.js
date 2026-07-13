// Shared header + status bar + typewriter — loaded on every page
(function() {
  var el = document.getElementById('header');
  if (!el) return;
  var title = el.getAttribute('data-title') || 'LCES CLAN 2026';

  var html =
      '<header class="hero">' +
        '<div class="banner"><a href="./"><img src="BANNER.png" alt="LCES banner"></a></div>' +
        '<h1 class="subtitle"><span class="type-target">' + title + '</span></h1>' +
      '</header>' +
      '<div class="status-bar">' +
        '<span class="stat"><span class="dot dot-yellow blink"></span> System Booting</span>' +
        '<span class="stat"><span class="dot dot-blue"></span> Badges Issued: <strong style="color:var(--text-bright)" id="badge-count">...</strong></span>' +
        '<span class="stat"><span class="dot dot-green"></span> Officers 10-8</span>' +
        '<span class="stat"><span class="dot dot-blue blink-slow"></span> Recruiting old friends</span>' +
      '</div>' +
      '<nav id="navbar"></nav>';

  el.outerHTML = html;

  // ─── Typewriter effect ───
  var sub = document.querySelector('.hero .subtitle .type-target');
  if (sub) {
    var orig = sub.textContent;
    sub.textContent = '';
    var i = 0, running = true;

    function type() {
      if (!running) return;
      if (i < orig.length) {
        sub.textContent += orig.charAt(i);
        i++;
        setTimeout(type, 40 + Math.random() * 30);
      } else {
        sub.style.borderRight = '2px solid var(--blue-bright)';
        sub.style.animation = 'caret 1s step-end infinite';
      }
    }

    setTimeout(type, 400);
  }

  // ─── Inject caret keyframes (once) ───
  if (!document.getElementById('caret-style')) {
    var cs = document.createElement('style');
    cs.id = 'caret-style';
    cs.textContent = '@keyframes caret{0%,100%{border-color:var(--blue-bright)}50%{border-color:transparent}}';
    document.head.appendChild(cs);
  }
})();
