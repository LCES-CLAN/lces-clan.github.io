// Shared Discord CTA section — loaded on guestbook.html and 404.html
(function() {
  var html =
    '<section id="discord" class="cta-panel panel reveal">' +
      '<img src="assets/discord.png" alt="Discord" class="badge-icon discord-icon">' +
      '<h2>CODE 3, CLEAR THE COMMS!!</h2>' +
      '<p>LCES operations are coordinated over Discord. <br>Join the server to collect your badge and gun.</p>' +
      '<div class="cta-buttons">' +
        '<a href="https://discord.gg/gn2ASjNZc4" target="_blank" rel="noopener" class="btn">LCES Discord</a>' +
      '</div>' +
    '</section>';

  var el = document.getElementById('discord-cta');
  if (el) el.outerHTML = html;
})();
