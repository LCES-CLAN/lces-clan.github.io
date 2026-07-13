// Shared navigation bar — loaded on every page
(function() {
  var page = window.location.pathname.split('/').pop() || 'index.htm';

  var links = [
    { href: 'index.htm',   label: 'Home' },
    { href: 're-enlist.htm', label: 'Re-enlist', cta: true },
    { href: 'officers.htm', label: 'Officers' },
    { href: 'https://www.tapatalk.com/groups/lces', label: 'Forums Archive', external: true },
    { href: 'https://discord.gg/gn2ASjNZc4', label: 'Discord', external: true }
  ];

  var html = '<nav class="nav-bar">';
  for (var i = 0; i < links.length; i++) {
    var link = links[i];
    var cls = [];
    if (!link.external && link.href === page) cls.push('active');
    if (link.cta) cls.push('nav-cta');
    var classAttr = cls.length ? ' class="' + cls.join(' ') + '"' : '';
    var target = link.external ? ' target="_blank" rel="noopener"' : '';
    html += '<a href="' + link.href + '"' + classAttr + target + '>' + link.label + '</a>';
  }
  html += '</nav>';

  var el = document.getElementById('navbar');
  if (el) el.outerHTML = html;
})();
