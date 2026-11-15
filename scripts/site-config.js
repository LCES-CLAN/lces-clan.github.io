// LCES site config — single source of truth for shared site-wide links.
// Edit a value here and every place that reads it updates.
window.LCES_SITE = {
  // Discord invite — used by the navbar, the in-page CTA buttons, and the
  // shared Discord section on guestbook.html / 404.html.
  discordInvite: 'https://discord.gg/pq2WMBCzEF'
};

// Applies the configured invite to every <a data-discord-link> in the page.
(function () {
  function applyDiscordLinks() {
    var invite = (window.LCES_SITE && window.LCES_SITE.discordInvite) || '';
    if (!invite) return;
    var links = document.querySelectorAll('a[data-discord-link]');
    for (var i = 0; i < links.length; i++) {
      links[i].setAttribute('href', invite);
    }
  }

  window.LCES_SITE.applyDiscordLinks = applyDiscordLinks;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyDiscordLinks);
  } else {
    applyDiscordLinks();
  }
})();
