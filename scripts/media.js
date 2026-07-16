// Media Page — Category Video Galleries
// Reads per-folder index.json files from assets/videos/{folder}/index.json.
// Category folders are defined in media.html via window.__mediaCategories.
// Each folder's index.json can override titles, order, and YouTube embeds.
(function() {
  var container = document.getElementById('media-categories');
  if (!container) return;

  var MAX_VISIBLE = 8;

  function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/&/g, '&amp;');
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function getEmbedUrl(videoId) {
    var origin = window.location.origin;
    return 'https://www.youtube-nocookie.com/embed/' +
      encodeURIComponent(videoId) +
      '?autoplay=1&rel=0&modestbranding=1&origin=' +
      encodeURIComponent(origin);
  }

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

  function loadVideo(categoryId, index, videos) {
    if (index < 0 || index >= videos.length) return;
    var video = videos[index];

    var player = document.getElementById('media-player-' + categoryId);
    if (player) player.innerHTML = buildPlayerContent(video);

    var titleEl = document.getElementById('media-title-' + categoryId);
    if (titleEl) titleEl.textContent = video.title;

    var thumbs = document.querySelectorAll('#media-cat-' + categoryId + ' .media-thumb');
    for (var i = 0; i < thumbs.length; i++) {
      thumbs[i].classList.toggle('active', i === index);
      thumbs[i].setAttribute('aria-current', i === index ? 'true' : 'false');
    }

    if (thumbs[index]) {
      thumbs[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    var link = document.getElementById('media-ytlink-' + categoryId);
    if (link) {
      if (video.source !== 'local' && video.youtubeId) {
        link.href = 'https://www.youtube.com/watch?v=' + encodeURIComponent(video.youtubeId);
        link.style.display = '';
      } else {
        link.style.display = 'none';
      }
    }

    var prev = document.getElementById('media-prev-' + categoryId);
    var next = document.getElementById('media-next-' + categoryId);
    if (prev) prev.disabled = index === 0;
    if (next) next.disabled = index === videos.length - 1;

    container.setAttribute('data-index-' + categoryId, index);

    if (window.LCES && window.LCES.trackVideoPlay) window.LCES.trackVideoPlay(video.title);
  }

  function renderCategory(category, idx) {
    var videos = category.videos || [];
    if (videos.length === 0) return '';

    var catId = 'cat' + idx;
    var overflow = videos.length > MAX_VISIBLE;

    var thumbsHtml = '';
    for (var j = 0; j < videos.length; j++) {
      var v = videos[j];
      var thumbUrl = '';
      if (v.source !== 'local' && v.youtubeId) {
        thumbUrl = 'https://img.youtube.com/vi/' +
          encodeURIComponent(v.youtubeId) + '/hqdefault.jpg';
      } else {
        thumbUrl = 'assets/videos/' + category.folder + '/thumb-' + j + '.jpg';
      }
      var hiddenClass = (overflow && j >= MAX_VISIBLE) ? ' media-thumb-hidden' : '';
      thumbsHtml +=
        '<button type="button" class="media-thumb' + (j === 0 ? ' active' : '') + hiddenClass +
        '" data-index="' + j + '"' +
        ' aria-current="' + (j === 0 ? 'true' : 'false') + '"' +
        ' aria-label="Play: ' + escapeAttr(v.title) + '">' +
          '<img src="' + thumbUrl + '" alt="" loading="lazy">' +
          '<span class="media-thumb-num">' + (j + 1) + '</span>' +
        '</button>';
    }

    var firstVideo = videos[0];
    var hasYtLink = firstVideo.source !== 'local' && firstVideo.youtubeId;
    var ytHref = hasYtLink
      ? 'https://www.youtube.com/watch?v=' + encodeURIComponent(firstVideo.youtubeId)
      : '';

    var expandHtml = '';
    if (overflow) {
      expandHtml =
        '<div class="media-expand-wrap">' +
          '<button type="button" class="media-expand-btn" data-cat="' + catId +
          '" aria-expanded="false">' +
            'SHOW ALL ' + videos.length + ' VIDEOS &blacktriangledown;' +
          '</button>' +
        '</div>';
    }

    return '' +
      '<div class="panel media-category" id="media-cat-' + catId + '">' +
        '<div class="panel-label">' + escapeHtml(category.title || category.folder) + '</div>' +
        '<div class="media-player" id="media-player-' + catId + '">' +
          buildPlayerContent(firstVideo) +
        '</div>' +
        '<div class="media-bar">' +
          '<button type="button" class="media-prev" id="media-prev-' + catId +
          '" disabled aria-label="Previous video">&larr;</button>' +
          '<span class="media-title" id="media-title-' + catId + '">' +
          escapeHtml(firstVideo.title) + '</span>' +
          '<button type="button" class="media-next" id="media-next-' + catId +
          '" aria-label="Next video">&rarr;</button>' +
        '</div>' +
        '<div class="media-thumbnails">' +
          thumbsHtml +
        '</div>' +
        '<div class="media-actions">' +
          '<a class="media-watch-link" id="media-ytlink-' + catId +
          '" href="' + ytHref + '" target="_blank" rel="noopener"' +
          (hasYtLink ? '' : ' style="display:none"') +
          '>Watch on YouTube &nearr;</a>' +
        '</div>' +
        expandHtml +
      '</div>';
  }

  function bindEvents(categoryId, videos) {
    var catEl = document.getElementById('media-cat-' + categoryId);
    if (!catEl) return;

    var prevBtn = document.getElementById('media-prev-' + categoryId);
    var nextBtn = document.getElementById('media-next-' + categoryId);
    if (prevBtn) {
      prevBtn.addEventListener('click', function() {
        var idx = parseInt(container.getAttribute('data-index-' + categoryId), 10) || 0;
        if (idx > 0) loadVideo(categoryId, idx - 1, videos);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        var idx = parseInt(container.getAttribute('data-index-' + categoryId), 10) || 0;
        if (idx < videos.length - 1) loadVideo(categoryId, idx + 1, videos);
      });
    }

    var thumbs = catEl.querySelectorAll('.media-thumb');
    for (var k = 0; k < thumbs.length; k++) {
      thumbs[k].addEventListener('click', function() {
        var idx = parseInt(this.getAttribute('data-index'), 10);
        var cur = parseInt(container.getAttribute('data-index-' + categoryId), 10) || 0;
        if (idx === cur) {
          loadVideo(categoryId, idx, videos);
        } else {
          loadVideo(categoryId, idx, videos);
        }
      });
    }

    var expandBtn = catEl.querySelector('.media-expand-btn');
    if (expandBtn) {
      expandBtn.addEventListener('click', function() {
        var hidden = catEl.querySelectorAll('.media-thumb-hidden');
        var isExpanded = this.getAttribute('aria-expanded') === 'true';
        if (isExpanded) {
          for (var h = 0; h < hidden.length; h++) {
            hidden[h].classList.add('media-thumb-hidden');
          }
          this.setAttribute('aria-expanded', 'false');
          this.innerHTML = 'SHOW ALL ' + videos.length + ' VIDEOS &blacktriangledown;';
        } else {
          for (var h = 0; h < hidden.length; h++) {
            hidden[h].classList.remove('media-thumb-hidden');
          }
          this.setAttribute('aria-expanded', 'true');
          this.innerHTML = 'SHOW LESS &blacktriangle;';
        }
      });
    }

    catEl.setAttribute('tabindex', '0');
    catEl.addEventListener('keydown', function(e) {
      var idx = parseInt(container.getAttribute('data-index-' + categoryId), 10) || 0;
      if (e.key === 'ArrowLeft' && idx > 0) {
        e.preventDefault();
        loadVideo(categoryId, idx - 1, videos);
      } else if (e.key === 'ArrowRight' && idx < videos.length - 1) {
        e.preventDefault();
        loadVideo(categoryId, idx + 1, videos);
      }
    });

    container.setAttribute('data-index-' + categoryId, '0');
  }

  function loadAllCategories() {
    var categories = window.__mediaCategories || [];
    if (!categories.length) {
      container.innerHTML =
        '<div class="panel">' +
          '<div class="panel-label">NO EVIDENCE</div>' +
          '<p style="color:var(--text-dim);font-size:0.8rem;text-align:center;padding:1rem;">' +
          'No media categories defined. Add entries to ' +
          '<code>window.__mediaCategories</code> in media.html.</p>' +
        '</div>';
      return;
    }

    // Fetch each folder's index.json in parallel
    var fetches = [];
    for (var i = 0; i < categories.length; i++) {
      var folder = categories[i].folder;
      var url = 'assets/videos/' + folder + '/index.json';
      fetches.push(
        fetch(url)
          .then(function(res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
          })
          .then(function(data) {
            return { folder: folder, title: data.title, videos: data.videos || [] };
          })
          .catch(function() {
            return { folder: folder, title: folder, videos: [] };
          })
      );
    }

    Promise.all(fetches).then(function(results) {
      var html = '';
      for (var j = 0; j < results.length; j++) {
        html += renderCategory(results[j], j);
      }

      if (!html) {
        container.innerHTML =
          '<div class="panel">' +
            '<div class="panel-label">NO EVIDENCE</div>' +
            '<p style="color:var(--text-dim);font-size:0.8rem;text-align:center;padding:1rem;">' +
            'No videos found in any category. Add videos to your ' +
            '<code>assets/videos/*/index.json</code> files.</p>' +
          '</div>';
        return;
      }

      container.innerHTML = html;

      for (var k = 0; k < results.length; k++) {
        bindEvents('cat' + k, results[k].videos || []);
      }
    });
  }

  loadAllCategories();
})();
