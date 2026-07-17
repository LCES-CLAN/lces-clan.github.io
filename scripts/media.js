// Media Page — Category Video Galleries
// Reads per-folder index.json files from assets/videos/{folder}/index.json.
// Category folders are defined in media.html via window.__mediaCategories.
// Each folder's index.json can override titles, order, and YouTube embeds.
//
// YouTube Playlist Support:
//   Set "playlistId" in your index.json to auto-fetch videos from a YouTube playlist.
//   The system tries two methods in order:
//     1. YouTube Data API v3 (requires YOUTUBE_API_KEY below)
//     2. RSS feed (direct fetch — YouTube RSS supports CORS)
//     3. Manual "videos" array in index.json (always takes precedence)
//
//   Manual entries can sit before (default) or after the playlist by
//   adding a per-entry "position": "after". Manual entries always win
//   over the playlist on duplicate youtubeId.
//
// Get a free API key: https://console.cloud.google.com/apis/credentials
//   -> Create project -> Enable "YouTube Data API v3" -> Create API key

(function() {
  var container = document.getElementById('media-categories');
  if (!container) return;

  // ── Configuration ──────────────────────────────────────────────────
  // YouTube API key for playlist fetching. Override via window.__YOUTUBE_API_KEY.
  var YOUTUBE_API_KEY = window.__YOUTUBE_API_KEY || 'AIzaSyAbKuQszn8X-cdQE17GfJCGVqzlPUB3mOk';

  var MAX_VISIBLE = 8;

  // Shared external-link icon SVG used by both renderCategory and loadVideo.
  var EXTERNAL_LINK_ICON = '<svg class="media-title-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';

  function escapeAttr(str) {
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
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

  // Returns the best available title for a video, falling back to the
  // YouTube ID (or "Untitled") so the UI never shows blank text.
  function getVideoTitle(video) {
    return video.title || video.youtubeId || 'Untitled';
  }

  function loadVideo(categoryId, index, videos) {
    if (index < 0 || index >= videos.length) return;
    var video = videos[index];

    var player = document.getElementById('media-player-' + categoryId);
    if (player) player.innerHTML = buildPlayerContent(video);

    var titleEl = document.getElementById('media-title-' + categoryId);
    if (titleEl) {
      if (video.source !== 'local' && video.youtubeId) {
        titleEl.innerHTML = escapeHtml(getVideoTitle(video)) + EXTERNAL_LINK_ICON;
        titleEl.href = 'https://www.youtube.com/watch?v=' + encodeURIComponent(video.youtubeId);
        titleEl.target = '_blank';
        titleEl.rel = 'noopener';
      } else {
        titleEl.innerHTML = escapeHtml(getVideoTitle(video));
        titleEl.removeAttribute('href');
        titleEl.removeAttribute('target');
        titleEl.removeAttribute('rel');
      }
    }

    var thumbs = document.querySelectorAll('#media-cat-' + categoryId + ' .media-thumb');
    for (var i = 0; i < thumbs.length; i++) {
      thumbs[i].classList.toggle('active', i === index);
      thumbs[i].setAttribute('aria-current', i === index ? 'true' : 'false');
    }

    if (thumbs[index]) {
      thumbs[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
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

    // Stagger the reveal animation slightly for categories that are already
    // in the viewport on load, but keep delays small so scrolling feels snappy.
    var revealDelay = idx < 4 ? ' style="transition-delay:' + (idx * 0.08) + 's"' : '';

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
        ' aria-label="Play: ' + escapeAttr(getVideoTitle(v)) + '">' +
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
      '<div class="panel media-category reveal" id="media-cat-' + catId + '"' + revealDelay + '>' +
        '<div class="panel-label">' + escapeHtml(category.title || category.folder) + '</div>' +
        '<div class="media-player" id="media-player-' + catId + '">' +
          buildPlayerContent(firstVideo) +
        '</div>' +
        '<div class="media-bar">' +
          '<button type="button" class="media-prev" id="media-prev-' + catId +
          '" disabled aria-label="Previous video">&larr;</button>' +
          '<a class="media-title media-title-link" id="media-title-' + catId + '"' +
          ' href="' + ytHref + '"' +
          (hasYtLink ? ' target="_blank" rel="noopener"' : '') + '>' +
          escapeHtml(getVideoTitle(firstVideo)) + EXTERNAL_LINK_ICON +
          '</a>' +
          '<button type="button" class="media-next" id="media-next-' + catId +
          '" aria-label="Next video">&rarr;</button>' +
        '</div>' +
        '<div class="media-thumbnails">' +
          thumbsHtml +
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
  // Updates the data model and, if the video is currently selected, the DOM.
  function fetchYouTubeTitle(video, catIdx, videoIdx) {
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
        // Fallback: oEmbed failed, show the youtubeId as the title
        if (!video.title) video.title = video.youtubeId;
      })
      .then(function() {
        // If this video is the currently selected one for its category,
        // update the visible title text without touching the player.
        if (catIdx === null || catIdx === undefined || videoIdx === null || videoIdx === undefined) return;
        var catId = 'cat' + catIdx;
        var currentIdx = parseInt(container.getAttribute('data-index-' + catId), 10) || 0;
        if (currentIdx === videoIdx) {
          var titleEl = document.getElementById('media-title-' + catId);
          if (titleEl) {
            titleEl.innerHTML = escapeHtml(video.title) + EXTERNAL_LINK_ICON;
          }
        }
      });
  }

  // ── YouTube Playlist Fetching ──────────────────────────────────────
  // Fetches videos from a YouTube playlist using a three-tier approach:
  //   1. YouTube Data API v3 (if API key is set)
  //   2. RSS feed via CORS proxy (no key needed)
  //   3. Returns empty array if all methods fail

  // AbortController-based timeout for fetch (falls back gracefully in
  // older browsers that don't support AbortController).
  function fetchWithTimeout(url, timeoutMs) {
    var controller;
    var signal;
    var timeoutId;
    try {
      controller = new AbortController();
      signal = controller.signal;
      timeoutId = setTimeout(function() { controller.abort(); }, timeoutMs);
    } catch (e) {
      // AbortController not supported — proceed without timeout
      return fetch(url);
    }
    return fetch(url, { signal: signal }).then(function(res) {
      clearTimeout(timeoutId);
      return res;
    }, function(err) {
      clearTimeout(timeoutId);
      throw err;
    });
  }

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

      return fetchWithTimeout(url, 10000)
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

    // Tier 2: RSS feed — direct fetch (YouTube RSS supports CORS)
    function tryRSSFeed() {
      var rssUrl = 'https://www.youtube.com/feeds/videos.xml?playlist_id=' +
        encodeURIComponent(playlistId);

      return fetchWithTimeout(rssUrl, 5000)
        .then(function(res) {
          if (!res.ok) throw new Error('RSS fetch returned HTTP ' + res.status);
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

  // Normalize a video entry so every downstream lookup can rely on a single
  // canonical `youtubeId` key. Accepts common casing typos (e.g. `youtubeID`)
  // so a hand-typed field name doesn't silently disable title auto-fill,
  // thumbnails, the embed URL, or the Watch link. This mutates only the
  // in-memory copy loaded from the JSON fetch; the on-disk file is unchanged.
  function normalizeVideo(v) {
    if (!v) return v;
    if (!v.youtubeId) v.youtubeId = v.youtubeID;
    return v;
  }

  // Merges playlist videos into the category. Each manual entry in
  // index.json "videos" can carry an optional "position" field:
  //   "before" (default) — appears at the top, before the playlist
  //   "after"             — appears at the bottom, after the playlist
  // Manual entries always win on duplicate youtubeId — the matching
  // playlist entry is dropped so the author's override wins.
  function mergePlaylistVideos(category, playlistVideos) {
    var before = [];
    var after = [];
    var existingIds = {};
    var merged;

    // Bucket manual entries by position; record intent for dedup.
    for (var i = 0; i < category.videos.length; i++) {
      var v = category.videos[i];
      if (v.youtubeId) existingIds[v.youtubeId] = true;
      if (v.position === 'after') {
        after.push(v);
      } else {
        // "before", undefined, or any unknown value → top of the list
        before.push(v);
      }
    }

    merged = before.slice();

    // Append playlist videos that aren't already covered by manual intent.
    for (var j = 0; j < playlistVideos.length; j++) {
      var pv = playlistVideos[j];
      if (!existingIds[pv.youtubeId]) {
        existingIds[pv.youtubeId] = true;
        merged.push(pv);
      }
    }

    // Cap with manual "after" entries.
    for (var k = 0; k < after.length; k++) merged.push(after[k]);

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

    var total = categories.length;

    // pendingData[idx] = null (fetching), category object (resolved), or
    // { hidden: true } for hidden categories.
    var pendingData = new Array(total);
    var resolvedCount = 0;
    var skeletonsRendered = 0;
    var titlesFetched = false;
    var observer;
    var SENTINEL_ID = 'media-lazy-sentinel';

    // ── Per‑category skeleton ──────────────────────────────────────
    function renderSkeleton(catConfig, idx) {
      var revealDelay = idx < 4 ? ' style="transition-delay:' + (idx * 0.08) + 's"' : '';
      return '<div class="panel media-category media-cat-skeleton reveal" id="media-cat-cat' + idx + '"' + revealDelay + '>' +
        '<div class="panel-label">' + escapeHtml(catConfig.title || catConfig.folder) + '</div>' +
        '<div class="media-player">' +
          '<div class="cat-spinner-wrap"><div class="cat-spinner"></div></div>' +
        '</div>' +
        '<div class="media-bar" style="opacity:0.35">' +
          '<button type="button" class="media-prev" disabled aria-label="Previous">&larr;</button>' +
          '<span class="media-title">Loading\u2026</span>' +
          '<button type="button" class="media-next" disabled aria-label="Next">&rarr;</button>' +
        '</div>' +
      '</div>';
    }

    // ── Replace a skeleton with real content ───────────────────────
    function upgradeSkeleton(idx, category) {
      var skeleton = document.getElementById('media-cat-cat' + idx);
      if (!skeleton) return;
      var html = renderCategory(category, idx);
      var temp = document.createElement('div');
      temp.innerHTML = html;
      var realEl = temp.firstChild;
      skeleton.parentNode.replaceChild(realEl, skeleton);
      bindEvents('cat' + idx, category.videos || []);
    }

    // ── Lazy skeleton rendering ────────────────────────────────────
    function renderNext() {
      // Skip categories we already know are hidden
      while (skeletonsRendered < total && pendingData[skeletonsRendered] && pendingData[skeletonsRendered].hidden) {
        skeletonsRendered++;
      }

      if (skeletonsRendered >= total) {
        cleanup();
        return;
      }

      var idx = skeletonsRendered;
      var data = pendingData[idx];
      var html = data ? renderCategory(data, idx) : renderSkeleton(categories[idx], idx);

      // Skip categories that produced no HTML (zero videos after merge)
      if (!html) {
        skeletonsRendered++;
        renderNext();
        return;
      }

      var sentinel = document.getElementById(SENTINEL_ID);

      if (sentinel) {
        sentinel.insertAdjacentHTML('beforebegin', html);
      } else {
        container.innerHTML = html +
          '<div id="' + SENTINEL_ID + '" class="media-load-more">' +
            '<div class="cat-spinner"></div>' +
            '<span class="media-load-text">Loading more evidence\u2026</span>' +
          '</div>';
      }

      if (data) bindEvents('cat' + idx, data.videos || []);
      skeletonsRendered++;

      if (skeletonsRendered >= total) cleanup();
    }

    function cleanup() {
      var s = document.getElementById(SENTINEL_ID);
      if (s) s.remove();
      if (observer) observer.disconnect();
      tryFetchMissingTitles();
    }

    // ── Finalise once everything is settled ───────────────────────
    function tryFetchMissingTitles() {
      if (titlesFetched) return;
      if (resolvedCount < total) return;
      titlesFetched = true;

      // Check whether every category ended up hidden
      var anyVisible = false;
      for (var ri = 0; ri < total; ri++) {
        if (pendingData[ri] && !pendingData[ri].hidden) { anyVisible = true; break; }
      }
      if (!anyVisible) {
        container.innerHTML =
          '<div class="panel">' +
            '<div class="panel-label">NO EVIDENCE</div>' +
            '<p style="color:var(--text-dim);font-size:0.8rem;text-align:center;padding:1rem;">' +
            'No videos found in any category. Add videos to your ' +
            '<code>assets/videos/*/index.json</code> files.</p>' +
          '</div>';
        return;
      }

      // Fetch missing YouTube titles, using original indices so
      // DOM IDs ("cat" + ri) match what renderCategory produced.
      var fetches = [];
      for (var ri = 0; ri < total; ri++) {
        var category = pendingData[ri];
        if (!category || category.hidden) continue;
        var videos = category.videos || [];
        for (var v = 0; v < videos.length; v++) {
          if (!videos[v].title && videos[v].youtubeId) {
            fetches.push(fetchYouTubeTitle(videos[v], ri, v));
          }
        }
      }
      if (fetches.length) Promise.all(fetches);
    }

    // ── Kick off parallel fetches ──────────────────────────────────
    for (var i = 0; i < total; i++) {
      (function(catConfig, idx) {
        var folder = catConfig.folder;
        var url = 'assets/videos/' + folder + '/index.json';

        fetch(url)
          .then(function(res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
          })
          .then(function(data) {
            var category = {
              folder: folder,
              title: data.title || catConfig.title || folder,
              videos: (data.videos || []).map(normalizeVideo),
              hidden: data.hidden === true
            };

            if (data.playlistId) {
              return fetchPlaylistVideos(data.playlistId).then(function(playlistVideos) {
                category.videos = mergePlaylistVideos(category, playlistVideos);
                return category;
              });
            }

            return category;
          })
          .catch(function() {
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
          .then(function(category) {
            pendingData[idx] = category;
            resolvedCount++;

            if (category.hidden) {
              var skel = document.getElementById('media-cat-cat' + idx);
              if (skel) skel.remove();
            } else {
              upgradeSkeleton(idx, category);
            }

            tryFetchMissingTitles();
          });
      })(categories[i], i);
    }

    // ── Render the first skeleton immediately ──────────────────────
    renderNext();

    // ── Lazily render remaining skeletons on scroll ────────────────
    if (skeletonsRendered < total) {
      var sentinel = document.getElementById(SENTINEL_ID);
      if (sentinel) {
        observer = new IntersectionObserver(function(entries) {
          if (entries[0].isIntersecting) renderNext();
        }, { rootMargin: '0px 0px 75px 0px' });
        observer.observe(sentinel);
      }
    }
  }

  loadAllCategories();
})();
