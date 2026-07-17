// Inline Video Player with Navigation — supports YouTube playlists via index.json.
// Set "playlistId" in assets/videos/{category}/index.json to auto-fetch videos
// from a YouTube playlist. Falls back from YouTube Data API to RSS feed, and
// manual "videos" entries are always merged in first.
(function() {
  var container = document.getElementById('media-gallery-container');
  if (!container) return;

  var category = container.getAttribute('data-category') || 'promotional';
  var DATA_URL = 'assets/videos/' + category + '/index.json';
  var videosList = [];
  var currentIndex = 0;

  // ── Configuration ────────────────────────────────────────────────
  var YOUTUBE_API_KEY = window.__YOUTUBE_API_KEY || '';
  var CORS_PROXY = window.__CORS_PROXY || 'https://api.allorigins.win/raw?url=';

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

    // Update "Watch on YouTube" link (hide for local videos)
    var link = container.querySelector('.evidence-watch-link');
    if (video.source !== 'local' && video.youtubeId) {
      link.href = 'https://www.youtube.com/watch?v=' + encodeURIComponent(video.youtubeId);
      link.style.display = '';
    } else {
      link.style.display = 'none';
    }

    // Enable/disable nav buttons
    container.querySelector('.evidence-prev').disabled = index === 0;
    container.querySelector('.evidence-next').disabled = index === videosList.length - 1;

    // Analytics hook
    if (window.LCES && window.LCES.trackVideoPlay) window.LCES.trackVideoPlay(video.title);
  }

  // ── YouTube Title Fetching (oEmbed — no API key needed) ────────────
  // Fetches a video's title from YouTube when the JSON doesn't provide one.
  function fetchYouTubeTitle(video) {
    var url = 'https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=' +
      encodeURIComponent(video.youtubeId) + '&format=json';
    return fetch(url)
      .then(function(res) {
        if (!res.ok) throw new Error('oembed HTTP ' + res.status);
        return res.json();
      })
      .then(function(data) {
        if (data.title) video.title = data.title;
      })
      .catch(function() {
        if (!video.title) video.title = video.youtubeId;
      });
  }

  function fetchMissingTitles(videos) {
    var fetches = [];
    for (var v = 0; v < videos.length; v++) {
      if (!videos[v].title && videos[v].youtubeId) {
        fetches.push(fetchYouTubeTitle(videos[v]));
      }
    }
    return fetches.length ? Promise.all(fetches) : Promise.resolve();
  }

  // ── YouTube Playlist Fetching ──────────────────────────────────────
  function fetchPlaylistVideos(playlistId) {
    // Tier 1: YouTube Data API v3
    function tryYouTubeAPI() {
      if (!YOUTUBE_API_KEY) {
        return Promise.reject(new Error('No API key configured'));
      }
      var url = 'https://www.googleapis.com/youtube/v3/playlistItems' +
        '?part=snippet' +
        '&maxResults=50' +
        '&playlistId=' + encodeURIComponent(playlistId) +
        '&key=' + encodeURIComponent(YOUTUBE_API_KEY);

      return fetch(url)
        .then(function(res) {
          if (!res.ok) throw new Error('YouTube API returned HTTP ' + res.status);
          return res.json();
        })
        .then(function(data) {
          if (!data.items || !data.items.length) {
            throw new Error('No items returned from YouTube API');
          }
          return data.items.map(function(item) {
            var snippet = item.snippet;
            return {
              title: snippet.title,
              youtubeId: snippet.resourceId.videoId,
              source: 'youtube'
            };
          });
        });
    }

    // Tier 2: RSS feed via CORS proxy
    function tryRSSFeed() {
      var rssUrl = 'https://www.youtube.com/feeds/videos.xml?playlist_id=' +
        encodeURIComponent(playlistId);
      var proxyUrl = CORS_PROXY + encodeURIComponent(rssUrl);

      return fetch(proxyUrl)
        .then(function(res) {
          if (!res.ok) throw new Error('RSS proxy returned HTTP ' + res.status);
          return res.text();
        })
        .then(function(xmlText) {
          var parser = new DOMParser();
          var xml = parser.parseFromString(xmlText, 'text/xml');
          var entries = xml.querySelectorAll('entry');
          if (!entries.length) throw new Error('No entries in RSS feed');

          var videos = [];
          for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            var titleEl = entry.querySelector('title');
            // YouTube RSS uses the yt:videoId namespace element.
            // Use getElementsByTagName for reliable XML namespace handling.
            var videoIdEl = entry.getElementsByTagName('yt:videoId')[0] || entry.getElementsByTagName('videoId')[0];
            if (titleEl && videoIdEl) {
              videos.push({
                title: titleEl.textContent,
                youtubeId: videoIdEl.textContent,
                source: 'youtube'
              });
            }
          }
          if (!videos.length) throw new Error('Could not parse any videos from RSS feed');
          return videos;
        });
    }

    return tryYouTubeAPI().catch(function(apiErr) {
      console.warn('[videos.js] YouTube API failed, trying RSS feed fallback:', apiErr.message);
      return tryRSSFeed().catch(function(rssErr) {
        console.error('[videos.js] RSS feed fallback also failed:', rssErr.message);
        return [];
      });
    });
  }

  function render(videos) {
    var valid = [];
    for (var i = 0; i < videos.length; i++) {
      var v = videos[i];
      // Accept YouTube videos (have youtubeId) OR local videos (have localPath)
      if (v.title && (v.youtubeId || (v.source === 'local' && v.localPath))) {
        valid.push(v);
      }
    }
    videosList = valid;

    if (valid.length === 0) {
      container.innerHTML =
        '<p style="color:var(--text-dim);font-size:0.8rem;text-align:center;padding:0.5rem 0;">' +
        'No evidence logged yet. Add videos to ' +
        '<code style="font-family:\'Share Tech Mono\',monospace;color:var(--blue-bright);">assets/videos/' + category + '/index.json</code>.' +
        '</p>';
      return;
    }

    // Build thumbnail HTML
    var thumbsHtml = '';
    for (var j = 0; j < valid.length; j++) {
      var v = valid[j];
      var thumbUrl = '';
      if (v.source !== 'local' && v.youtubeId) {
        thumbUrl = 'https://img.youtube.com/vi/' +
          encodeURIComponent(v.youtubeId) + '/hqdefault.jpg';
      } else {
        thumbUrl = 'assets/videos/' + category + '/thumb-' + j + '.jpg';
      }
      thumbsHtml +=
        '<button type="button" class="evidence-thumb' + (j === 0 ? ' active' : '') +
        '" data-index="' + j + '"' +
        ' aria-current="' + (j === 0 ? 'true' : 'false') + '"' +
        ' aria-label="Play: ' + escapeAttr(v.title) + '">' +
          '<img src="' + thumbUrl + '" alt="" loading="lazy">' +
          '<span class="evidence-thumb-num">' + (j + 1) + '</span>' +
        '</button>';
    }

    var firstVideo = valid[0];
    var hasYtLink = firstVideo.source !== 'local' && firstVideo.youtubeId;
    var ytHref = hasYtLink
      ? 'https://www.youtube.com/watch?v=' + encodeURIComponent(firstVideo.youtubeId)
      : '';

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
        '<a class="evidence-watch-link" href="' + ytHref + '" target="_blank" rel="noopener"' +
        (hasYtLink ? '' : ' style="display:none"') +
        '>Watch on YouTube &nearr;</a>' +
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

  // Build fallback videos from container's data-files attribute (no index.json needed)
  function getFallbackVideos() {
    var filesAttr = container.getAttribute('data-files');
    if (!filesAttr) return null;
    try {
      var files = JSON.parse(filesAttr);
      if (!files || !files.length) return null;
      var videos = [];
      for (var f = 0; f < files.length; f++) {
        videos.push({
          title: files[f].replace(/\.[^.]+$/, ''),
          source: 'local',
          localPath: 'assets/videos/' + category + '/' + files[f]
        });
      }
      return videos;
    } catch (e) {
      return null;
    }
  }

  // Fetch video data — reads the category folder's index.json
  fetch(DATA_URL)
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function(data) {
      // If a playlistId is specified, fetch playlist videos and merge
      if (data.playlistId) {
        return fetchPlaylistVideos(data.playlistId).then(function(playlistVideos) {
          // Merge: manual videos first, then playlist (skip duplicates)
          var existingIds = {};
          var merged = [];
          var manualVideos = data.videos || [];
          for (var m = 0; m < manualVideos.length; m++) {
            if (manualVideos[m].youtubeId) existingIds[manualVideos[m].youtubeId] = true;
            merged.push(manualVideos[m]);
          }
          for (var p = 0; p < playlistVideos.length; p++) {
            if (!existingIds[playlistVideos[p].youtubeId]) {
              existingIds[playlistVideos[p].youtubeId] = true;
              merged.push(playlistVideos[p]);
            }
          }
          return merged;
        });
      }
      return data.videos || [];
    })
    .then(function(videos) {
      if (!videos || videos.length === 0) {
        throw new Error('No videos in ' + category + ' category');
      }
      // Fetch missing YouTube titles before rendering
      return fetchMissingTitles(videos).then(function() {
        render(videos);
      });
    })
    .catch(function() {
      // No index.json found — fall back to data-files attribute
      var fallbackVideos = getFallbackVideos();
      if (fallbackVideos && fallbackVideos.length) {
        render(fallbackVideos);
      } else {
        container.innerHTML =
          '<p style="color:var(--text-dim);font-size:0.8rem;text-align:center;padding:0.5rem 0;">' +
          'Could not load evidence locker. Ensure ' +
          '<code style="font-family:\'Share Tech Mono\',monospace;color:var(--blue-bright);">assets/videos/' + category + '/index.json</code>' +
          ' exists and has videos.</p>';
      }
    });
})();
