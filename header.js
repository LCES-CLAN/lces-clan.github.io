// Shared header + status bar + typewriter — loaded on every page
(function() {
  var el = document.getElementById('header');
  if (!el) return;
  var title = el.getAttribute('data-title') || 'LCES CLAN 2026';

  // ─── Inject animation keyframes BEFORE elements enter the DOM ───
  if (!document.getElementById('caret-style')) {
    var cs = document.createElement('style');
    cs.id = 'caret-style';
    cs.textContent = '@keyframes caret{0%,100%{border-color:var(--blue-bright)}50%{border-color:transparent}}@keyframes pulse-glow{0%,100%{box-shadow:0 0 35px rgba(46,204,64,1),0 0 90px rgba(46,204,64,0.85),0 0 160px rgba(46,204,64,0.55),0 0 240px rgba(46,204,64,0.30)}50%{box-shadow:0 0 28px rgba(46,204,64,0.80),0 0 65px rgba(46,204,64,0.55),0 0 110px rgba(46,204,64,0.30),0 0 170px rgba(46,204,64,0.15)}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0.25}}';
    document.head.appendChild(cs);
  }

  var html =
      '<header class="hero">' +
        '<div class="banner"><a href="./"><img src="BANNER.png" alt="LCES banner"></a></div>' +
        '<h1 class="subtitle"><span class="type-target">' + title + '</span></h1>' +
      '</header>' +
      '<div class="status-bar">' +
        '<span class="stat"><span class="dot dot-yellow blink"></span> System booting</span>' +
        // '<span class="stat"><span class="dot dot-10-2"></span> Badges issued: <strong style="color:var(--text-bright)" id="badge-count">...</strong></span>' +
        '<span class="stat"><span class="dot dot-10-8"></span> Officers 10-8</span>' +
        '<span class="stat"><span class="dot dot-10-2"></span> Recruiting old friends</span>' +
      '</div>' +
      '<nav id="navbar"></nav>';

  el.outerHTML = html;

  // ─── Force animation reflow on status-bar dots ───
  var dots = document.querySelectorAll('.status-bar .dot-10-8, .status-bar .dot-10-2');
  for (var d = 0; d < dots.length; d++) dots[d].offsetHeight;

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

  // ─── 10-8 signal dips — brief opacity/glow drop for realistic radio effect ───
  setTimeout(function() {
    var dot108 = document.querySelector('.status-bar .dot-10-8');
    if (!dot108) return;
    (function schedule() {
      var delay = 600 + Math.random() * 2400;
      setTimeout(function() {
        dot108.style.opacity = '0.25';
        dot108.style.boxShadow = '0 0 4px rgba(46,204,64,0.3)';
        var dipDuration = 30 + Math.random() * 40;
        setTimeout(function() {
          dot108.style.opacity = '';
          dot108.style.boxShadow = '';
          schedule();
        }, dipDuration);
      }, delay);
    })();
  }, 100);
})();
