// Shared Discord CTA section — loaded on guestbook.html and 404.html
(function() {
  var el = document.getElementById('discord-cta');
  if (!el) return;

  var html =
    '<section id="discord" class="cta-panel panel reveal">' +
      '<img src="assets/discord.png" alt="Discord" class="badge-icon discord-icon">' +
      '<h2>CODE 3, CLEAR THE COMMS!!</h2>' +
      '<p>LCES operations are coordinated over Discord. <br>Join the server to collect your badge and gun.</p>' +
      '<div class="discord-stats" id="discord-stats"></div>' +
      '<div class="cta-buttons">' +
        '<a href="https://discord.gg/gn2ASjNZc4" target="_blank" rel="noopener" class="btn btn-discord">LCES Discord</a>' +
      '</div>' +
    '</section>';

  el.outerHTML = html;

  // Fetch live stats from stats.json
  fetch('data/stats.json')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var guild = Object.values(data)[0];
      if (!guild) return;

      var onlineCount = guild.online_members || 0;
      var voiceCount = guild.voice_members || 0;

      var statsEl = document.getElementById('discord-stats');
      if (!statsEl) return;

      if (onlineCount >= 3) {
        statsEl.innerHTML += '<span class="discord-stat online-stat">' +
          onlineCount + (onlineCount === 1 ? ' member' : ' members') + ' online now!</span>';
      }
      if (voiceCount > 0) {
        statsEl.innerHTML += '<span class="discord-stat voice-stat">' +
          voiceCount + (voiceCount === 1 ? ' member' : ' members') + ' in voice chat</span>';
      }
    })
    .catch(function() {
      // Stats unavailable — silently ignore
    });
})();
