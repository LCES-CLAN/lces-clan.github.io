// Shared scroll reveal observer — loaded on pages with .reveal elements
(function() {
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  function observeReveal(el) {
    if (el) observer.observe(el);
  }

  document.querySelectorAll('.reveal').forEach(observeReveal);

  // Observe all .panel elements: light up when centered in viewport (mobile/tablet)
  var centerObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      entry.target.classList.toggle('centered', entry.isIntersecting);
    });
  }, { rootMargin: '-42.5% 0px -42.5% 0px' });
  document.querySelectorAll('.panel').forEach(function(el) { centerObserver.observe(el); });

  // Automatically observe any .reveal elements injected after page load
  // (e.g. the media page's dynamically generated category panels).
  if (window.MutationObserver) {
    var bodyObserver = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType !== 1) return;
          if (node.classList && node.classList.contains('reveal')) {
            observeReveal(node);
          }
          if (node.querySelectorAll) {
            node.querySelectorAll('.reveal').forEach(observeReveal);
          }
        });
      });
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });
  }
})();
