// Evidence Locker — Inline Video Player with Navigation
(function() {
  var container = document.getElementById('media-gallery-container');
  if (!container) return;

  var DATA_URL = 'videos.json';
  var videosList = [];
  var currentIndex = 0;

  function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/&/g, '&amp;');
  }

  function getEmbedUrl(videoId) {
    var origin = window.location.origin;
    return 'https://www.youtube-nocookie.com/embed/' +
      encodeURIComponent(videoId) +
      '?autoplay=1&rel=0&modestbranding=1&origin=' +
      encodeURIComponent(origin);
  }

  // Build the player (iframe or <video>) based on the video's source field
  function buildPlayerContent(video) {
    if (video.source === 'local' && video.localPath) {
      return '<video controls autoplay playsinline preload="auto">' +
        '<source src="' + escapeAttr(video.localPath) + '" type="video/mp4">' +
        'Your browser does not support the video element.' +
        '</video>';
    }
    return '<iframe src="' + getEmbedUrl(video.youtubeId) + '"' +
      ' allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>';
  }

  function loadVideo(index) {
    if (index < 0 || index >= videosList.length) return;
    currentIndex = index;
    var video = videosList[index];

    // Replace the entire player contents
    var player = container.querySelector('.evidence-player');
    player.innerHTML = buildPlayerContent(video);

    // Update title
    container.querySelector('.evidence-title').textContent = video.title;

    // Update thumbnail active states
    var thumbs = container.querySelectorAll('.evidence-thumb');
    for (var i = 0; i < thumbs.length; i++) {
      thumbs[i].classList.toggle('active', i === index);
      thumbs[i].setAttribute('aria-current', i === index ? 'true' : 'false');
    }

    // Scroll active thumbnail into view
    if (thumbs[index]) {
      thumbs[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    // Update "Watch on YouTube" link
    var link = container.querySelector('.evidence-watch-link');
    link.href = 'https://www.youtube.com/watch?v=' + encodeURIComponent(video.youtubeId);

    // Enable/disable nav buttons
    container.querySelector('.evidence-prev').disabled = index === 0;
    container.querySelector('.evidence-next').disabled = index === videosList.length - 1;

    // Analytics hook
    if (window.LCES && window.LCES.trackVideoPlay) window.LCES.trackVideoPlay(video.title);
  }

  function render(videos) {
    var valid = [];
    for (var i = 0; i < videos.length; i++) {
      if (videos[i].youtubeId && videos[i].title) {
        valid.push(videos[i]);
      }
    }
    videosList = valid;

    if (valid.length === 0) {
      container.innerHTML =
        '<p style="color:var(--text-dim);font-size:0.8rem;text-align:center;padding:0.5rem 0;">' +
        'No evidence logged yet. Add YouTube links to ' +
        '<code style="font-family:\'Share Tech Mono\',monospace;color:var(--blue-bright);">videos.json</code>.' +
        '</p>';
      return;
    }

    // Build thumbnail HTML
    var thumbsHtml = '';
    for (var j = 0; j < valid.length; j++) {
      var thumbUrl = 'https://img.youtube.com/vi/' +
        encodeURIComponent(valid[j].youtubeId) + '/hqdefault.jpg';
      thumbsHtml +=
        '<button type="button" class="evidence-thumb' + (j === 0 ? ' active' : '') +
        '" data-index="' + j + '"' +
        ' aria-current="' + (j === 0 ? 'true' : 'false') + '"' +
        ' aria-label="Play: ' + escapeAttr(valid[j].title) + '">' +
          '<img src="' + thumbUrl + '" alt="" loading="lazy">' +
          '<span class="evidence-thumb-num">' + (j + 1) + '</span>' +
        '</button>';
    }

    var firstVideo = valid[0];

    container.innerHTML =
      '<div class="evidence-player">' +
        buildPlayerContent(firstVideo) +
      '</div>' +
      '<div class="evidence-bar">' +
        '<button type="button" class="evidence-prev" disabled aria-label="Previous video">&larr;</button>' +
        '<span class="evidence-title">' + escapeAttr(firstVideo.title) + '</span>' +
        '<button type="button" class="evidence-next" aria-label="Next video">&rarr;</button>' +
      '</div>' +
      '<div class="evidence-thumbnails">' +
        thumbsHtml +
      '</div>' +
      '<div class="evidence-actions">' +
        '<a class="evidence-watch-link" href="https://www.youtube.com/watch?v=' +
        encodeURIComponent(firstVideo.youtubeId) +
        '" target="_blank" rel="noopener">Watch on YouTube &nearr;</a>' +
      '</div>';

    // ─── Event Binding ───

    container.querySelector('.evidence-prev').addEventListener('click', function() {
      if (currentIndex > 0) loadVideo(currentIndex - 1);
    });

    container.querySelector('.evidence-next').addEventListener('click', function() {
      if (currentIndex < videosList.length - 1) loadVideo(currentIndex + 1);
    });

    var thumbBtns = container.querySelectorAll('.evidence-thumb');
    for (var k = 0; k < thumbBtns.length; k++) {
      thumbBtns[k].addEventListener('click', function() {
        var idx = parseInt(this.getAttribute('data-index'), 10);
        if (idx === currentIndex) {
          // Restart current video — rebuild the player
          loadVideo(currentIndex);
        } else {
          loadVideo(idx);
        }
      });
    }

    // Keyboard: left/right arrows when the section is focused
    container.setAttribute('tabindex', '0');
    container.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault();
        loadVideo(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < videosList.length - 1) {
        e.preventDefault();
        loadVideo(currentIndex + 1);
      }
    });
  }

  // Fetch video data
  fetch(DATA_URL)
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(render)
    .catch(function() {
      container.innerHTML =
        '<p style="color:var(--text-dim);font-size:0.8rem;text-align:center;padding:0.5rem 0;">' +
        'Could not load evidence locker. Ensure ' +
        '<code style="font-family:\'Share Tech Mono\',monospace;color:var(--blue-bright);">videos.json</code>' +
        ' is present on the server.</p>';
    });
})();
