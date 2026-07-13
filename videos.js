// Video Gallery & Lightbox — Evidence Locker
(function() {
  var container = document.getElementById('media-gallery-container');
  if (!container) return;

  var DATA_URL = 'videos.json';

  function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/&/g, '&amp;');
  }

  function buildCard(video, index) {
    var thumb = video.youtubeId
      ? 'https://img.youtube.com/vi/' + encodeURIComponent(video.youtubeId) + '/hqdefault.jpg'
      : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    var badge = index + 1;
    return '<div class="media-card" data-id="' + escapeAttr(video.youtubeId) + '" data-title="' + escapeAttr(video.title) + '">' +
        '<div class="card-thumb-wrap">' +
          '<img src="' + escapeAttr(thumb) + '" alt="' + escapeAttr(video.title) + '" loading="lazy">' +
          '<div class="card-overlay"><span class="play-icon">&#9654;</span></div>' +
          '<span class="card-badge">EVIDENCE #' + badge + '</span>' +
        '</div>' +
        '<div class="card-title">' + escapeAttr(video.title) + '</div>' +
      '</div>';
  }

  function renderGallery(videos) {
    var valid = [];
    for (var i = 0; i < videos.length; i++) {
      if (videos[i].youtubeId && videos[i].title) {
        valid.push(videos[i]);
      }
    }

    if (valid.length === 0) {
      container.innerHTML = '<p style="color:var(--text-dim);font-size:0.8rem;text-align:center;padding:0.5rem 0;">No evidence logged yet. Add YouTube links to <code style="font-family:\'Share Tech Mono\',monospace;color:var(--blue-bright);">videos.json</code>.</p>';
      return;
    }

    var html = '<div class="media-gallery">';
    for (var j = 0; j < valid.length; j++) {
      html += buildCard(valid[j], j);
    }
    html += '</div>';
    container.innerHTML = html;

    var cards = container.querySelectorAll('.media-card');
    for (var k = 0; k < cards.length; k++) {
      cards[k].addEventListener('click', openLightbox);
    }
  }

  function openLightbox(e) {
    var card = e.currentTarget;
    var videoId = card.getAttribute('data-id');
    var title = card.getAttribute('data-title');
    if (!videoId) return;

    var lb = document.getElementById('lightbox');
    var iframe = lb.querySelector('.lightbox-video-wrapper iframe');
    var lbTitle = lb.querySelector('.lightbox-title');

    iframe.src = 'https://www.youtube.com/embed/' + encodeURIComponent(videoId) + '?autoplay=1&rel=0';
    lbTitle.textContent = title;
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    var lb = document.getElementById('lightbox');
    lb.classList.remove('open');
    document.body.style.overflow = '';
    var iframe = lb.querySelector('.lightbox-video-wrapper iframe');
    iframe.src = '';
  }

  // Fetch and render
  fetch(DATA_URL)
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(renderGallery)
    .catch(function() {
      container.innerHTML = '<p style="color:var(--text-dim);font-size:0.8rem;text-align:center;padding:0.5rem 0;">Could not load evidence locker. Ensure <code style="font-family:\'Share Tech Mono\',monospace;color:var(--blue-bright);">videos.json</code> is present on the server.</p>';
    });

  // Inject lightbox markup into body
  var lbHTML =
    '<div id="lightbox" class="lightbox">' +
      '<div class="lightbox-content">' +
        '<button class="lightbox-close" aria-label="Close video">&times;</button>' +
        '<span class="lightbox-title"></span>' +
        '<div class="lightbox-video-wrapper">' +
          '<iframe src="" allow="autoplay; encrypted-media" allowfullscreen></iframe>' +
        '</div>' +
        '<div class="lightbox-tip">Press <kbd style="font-family:\'Share Tech Mono\',monospace;color:var(--white-dim);">Esc</kbd> to close</div>' +
      '</div>' +
    '</div>';

  document.body.insertAdjacentHTML('beforeend', lbHTML);

  // Close lightbox handlers
  var lb = document.getElementById('lightbox');
  var closeBtn = lb.querySelector('.lightbox-close');

  closeBtn.addEventListener('click', closeLightbox);

  // Click backdrop to close
  lb.addEventListener('click', function(e) {
    if (e.target === lb) closeLightbox();
  });

  // Escape key to close
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' || e.key === 'Esc') closeLightbox();
  });
})();
