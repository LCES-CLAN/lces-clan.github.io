// Media Page — Category Video Galleries
// Reads per-folder index.json files from assets/videos/{folder}/index.json.
// Category folders are defined in media.html via window.__mediaCategories.
// Each folder's index.json can override titles, order, and YouTube embeds.
//
// YouTube Playlist Support:
//   Set "playlistId" in your index.json to auto-fetch videos from a YouTube playlist.
//   The system tries three methods in order:
//     1. YouTube Data API v3 (requires YOUTUBE_API_KEY below)
//     2. RSS feed via CORS proxy (no key needed, but less reliable)
//     3. Manual "videos" array in index.json (always takes precedence)
//
// Get a free API key: https://console.cloud.google.com/apis/credentials
//   -> Create project -> Enable "YouTube Data API v3" -> Create API key

(function() {
  var container = document.getElementById('media-categories');
  if (!container) return;

  // ── Configuration ──────────────────────────────────────────────────
  // Set your YouTube Data API v3 key here for reliable playlist fetching.
  // Leave empty to rely on RSS-feed fallback (no key needed).
  var YOUTUBE_API_KEY = window.__YOUTUBE_API_KEY || '';

  // Public CORS proxy used as fallback when no API key is configured.
  // You can override this via window.__CORS_PROXY.
  var CORS_PROXY = window.__CORS_PROXY || 'https://api.allorigins.win/raw?url=';

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

    // Ensure every video has a title (fallback if missing)
    for (var i = 0; i < videos.length; i++) {
      if (!videos[i].title) {
        videos[i].title = videos[i].youtubeId || 'Untitled';
      }
    }

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
        // Fallback: oEmbed failed, use a generic title
        if (!video.title) video.title = 'Untitled';
      });
  }

  // Batch-fetch missing titles for all YouTube videos across all categories.
  function fetchMissingTitles(results) {
    var fetches = [];
    for (var r = 0; r < results.length; r++) {
      var videos = results[r].videos || [];
      for (var v = 0; v < videos.length; v++) {
        if (!videos[v].title && videos[v].youtubeId) {
          fetches.push(fetchYouTubeTitle(videos[v]));
        }
      }
    }
    return fetches.length ? Promise.all(fetches) : Promise.resolve();
  }

  // ── YouTube Playlist Fetching ──────────────────────────────────────
  // Fetches videos from a YouTube playlist using a three-tier approach:
  //   1. YouTube Data API v3 (if API key is set)
  //   2. RSS feed via CORS proxy (no key needed)
  //   3. Returns empty array if all methods fail
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

    // Run: API first, fallback to RSS, last resort empty array
    return tryYouTubeAPI().catch(function(apiErr) {
      console.warn('[media.js] YouTube API failed, trying RSS feed fallback:', apiErr.message);
      return tryRSSFeed().catch(function(rssErr) {
        console.error('[media.js] RSS feed fallback also failed:', rssErr.message);
        return [];
      });
    });
  }

  // Merges playlist videos into the category, avoiding duplicates by YouTube ID.
  // Manually listed videos (from index.json "videos") come first.
  function mergePlaylistVideos(category, playlistVideos) {
    var existingIds = {};
    var merged = [];

    // Manual videos first (they take visual priority)
    for (var i = 0; i < category.videos.length; i++) {
      var v = category.videos[i];
      if (v.youtubeId) existingIds[v.youtubeId] = true;
      merged.push(v);
    }

    // Append playlist videos that aren't duplicates
    for (var j = 0; j < playlistVideos.length; j++) {
      var pv = playlistVideos[j];
      if (!existingIds[pv.youtubeId]) {
        existingIds[pv.youtubeId] = true;
        merged.push(pv);
      }
    }

    return merged;
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
      // IIFE captures the full category config per iteration
      (function(catConfig) {
        var folder = catConfig.folder;
        var url = 'assets/videos/' + folder + '/index.json';
        fetches.push(
          fetch(url)
            .then(function(res) {
              if (!res.ok) throw new Error('HTTP ' + res.status);
              return res.json();
            })
            .then(function(data) {
              var category = {
                folder: folder,
                title: data.title || catConfig.title || folder,
                videos: data.videos || []
              };

              // If the index.json specifies a playlistId, fetch the playlist
              if (data.playlistId) {
                return fetchPlaylistVideos(data.playlistId).then(function(playlistVideos) {
                  category.videos = mergePlaylistVideos(category, playlistVideos);
                  return category;
                });
              }

              return category;
            })
            .catch(function() {
              // No index.json found — use files from the HTML category config
              var files = catConfig.files || [];
              var generatedVideos = [];
              for (var f = 0; f < files.length; f++) {
                generatedVideos.push({
                  title: files[f].replace(/\.[^.]+$/, ''),
                  source: 'local',
                  localPath: 'assets/videos/' + folder + '/' + files[f]
                });
              }
              return {
                folder: folder,
                title: catConfig.title || folder,
                videos: generatedVideos
              };
            })
        );
      })(categories[i]);
    }

    Promise.all(fetches).then(function(results) {
      // Fetch missing YouTube titles before rendering
      return fetchMissingTitles(results).then(function() {
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
    });
  }

  loadAllCategories();
})();
