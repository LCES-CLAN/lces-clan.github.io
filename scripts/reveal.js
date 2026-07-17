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

  // Allow dynamically injected content to opt-in to the reveal observer
  window.observeReveal = observeReveal;
})();
