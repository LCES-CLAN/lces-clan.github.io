// Shared re-enlistment form — loaded on index.html and guestbook.html
(function() {

  // ════════════════════════════════════════════════════════════════
  //  Form endpoint + Turnstile site key
  // ════════════════════════════════════════════════════════════════
  // Injected at deploy time via GitHub Actions. These are PUBLIC values.
  // The form posts to a Cloudflare Worker, which verifies the Turnstile
  // CAPTCHA server-side and forwards to a private Discord webhook. The
  // webhook URL itself never appears here.
  var FORM_ENDPOINT = '';
  var TURNSTILE_SITE_KEY = '';

  // ─── State ───
  var turnstileLoaded = false;

  // ─── Inject styles ───
  var s = document.createElement('style');
  s.textContent = '.turnstile-row{margin:0.5rem 0;display:flex;justify-content:center}' +
    '.hp-field{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;opacity:0}' +
    '.char-count{display:block;font-family:"Share Tech Mono",monospace;font-size:0.55rem;color:var(--text-dim);text-align:right;margin-top:0.15rem}' +
    '.char-count.warn{color:#e8a040}' +
    '.char-count.danger{color:#c55}';
  document.head.appendChild(s);

  // ─── Load Turnstile script (once) and render the widget ───
  function loadTurnstile(cb) {
    if (turnstileLoaded && window.turnstile && window.turnstile.render) { cb(); return; }
    if (window.__tsLoading) return; // already loading; cb fires via onload below
    window.__tsLoading = true;
    var el = document.createElement('script');
    el.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    el.async = true;
    el.onload = function() {
      turnstileLoaded = true;
      cb();
    };
    el.onerror = function() { window.__tsLoading = false; };
    document.head.appendChild(el);
  }

  function renderTurnstile() {
    var container = document.getElementById('turnstile-container');
    if (!container) return;
    if (!TURNSTILE_SITE_KEY) {
      container.innerHTML = '<span style="font-family:\'Share Tech Mono\',monospace;font-size:0.6rem;color:#c55">Security check not configured.</span>';
      return;
    }
    loadTurnstile(function() {
      if (window.turnstile && window.turnstile.render && !container.hasChildNodes()) {
        window.turnstile.render(container, { sitekey: TURNSTILE_SITE_KEY, theme: 'dark' });
      }
    });
  }

  function getTurnstileToken() {
    return (window.turnstile && window.turnstile.getResponse) ? (window.turnstile.getResponse() || '') : '';
  }

  function resetTurnstile() {
    if (window.turnstile && window.turnstile.reset) {
      try { window.turnstile.reset(); } catch (e) {}
    }
  }

  // ─── Update submit button ───
  function updateBtn() {
    var btn = document.querySelector('.btn-submit');
    if (!btn) return;
    var gtEl = document.getElementById('gt-original');
    var hasGt = gtEl && gtEl.value && gtEl.value.trim() !== '';
    btn.disabled = !hasGt;
    btn.title = hasGt ? '' : 'Enter your original gamertag first';
  }

  // ─── Check extra fields ───
  function hasExtra() {
    var ids = ['gt-current', 'steam-id', 'discord-tag', 'email', 'platform-xbox', 'platform-pc', 'message'];
    for (var i = 0; i < ids.length; i++) {
      var f = document.getElementById(ids[i]);
      if (!f) continue;
      if (f.type === 'checkbox') { if (f.checked) return true; }
      else if (f.value && f.value.trim() !== '') return true;
    }
    return false;
  }

  // ─── Validate ───
  function validate() {
    var fb = document.getElementById('form-feedback');
    if (TURNSTILE_SITE_KEY && !getTurnstileToken()) { fb.textContent = 'Complete the security check first.'; fb.style.color = '#c55'; return false; }
    if (!hasExtra()) { fb.textContent = 'Fill in at least one extra field.'; fb.style.color = '#c55'; return false; }
    fb.textContent = ''; fb.style.color = ''; return true;
  }

  // ─── Submit to the Worker ───
  function submitForm(d) {
    if (!FORM_ENDPOINT) return fakeSubmit(d);
    return fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d)
    }).then(function(r) {
      return r.json().catch(function() { return {}; }).then(function(body) {
        if (!r.ok || body.ok !== true) {
          var msg = (body && body.error) ? body.error : ('HTTP ' + r.status);
          throw new Error(msg);
        }
        return true;
      });
    });
  }

  function fakeSubmit(d) { return new Promise(function(r) { setTimeout(r, 1200, true); }); }

  // ─── Form submit handler ───
  window.handleReEnlist = function(e) {
    e.preventDefault();
    if (!validate()) return;
    var form = e.target, fb = document.getElementById('form-feedback'), btn = form.querySelector('.btn-submit'), orig = btn.textContent;
    btn.textContent = 'Transmitting...'; btn.disabled = true; fb.textContent = 'Sending...'; fb.style.color = '#6680a0';
    var d = {
      gt: (document.getElementById('gt-original') || {}).value || '',
      cur: (document.getElementById('gt-current') || {}).value || '',
      steam: (document.getElementById('steam-id') || {}).value || '',
      disc: (document.getElementById('discord-tag') || {}).value || '',
      email: (document.getElementById('email') || {}).value || '',
      plat: [], msg: (document.getElementById('message') || {}).value || '',
      turnstile: getTurnstileToken(),
      website: (document.getElementById('hp-website') || {}).value || ''
    };
    if (document.getElementById('platform-xbox') && document.getElementById('platform-xbox').checked) d.plat.push('Xbox');
    if (document.getElementById('platform-pc') && document.getElementById('platform-pc').checked) d.plat.push('PC');
    if (d.plat.length) d.plat = d.plat.join(' + '); else d.plat = '';
    submitForm(d).then(function() {
      btn.textContent = 'Re-enlisted!'; fb.textContent = '10-4. Now get to your beat, rookie.'; fb.style.color = 'var(--green)';
      if (window.LCES && window.LCES.trackFormSubmit) window.LCES.trackFormSubmit();
      setTimeout(function() { btn.textContent = orig || 'SUBMIT'; btn.disabled = true; fb.textContent = ''; form.reset(); resetTurnstile(); updateBtn(); }, 3000);
    }).catch(function(err) {
      btn.textContent = 'Error'; fb.textContent = 'Failed to send' + (err && err.message ? ' (' + err.message + ')' : '') + '.'; fb.style.color = '#c55';
      resetTurnstile();
      setTimeout(function() { btn.textContent = orig || 'SUBMIT'; updateBtn(); }, 2500);
    });
  };

  // ─── Inject form ───
  var c = document.getElementById('enlist-form');
  if (c) {
    c.innerHTML =
      '<form class="form-section" onsubmit="handleReEnlist(event)">' +
        '<p class="form-subtitle">Just fill in what you know &mdash; you can always share more details later.</p>' +
        '<div class="form-row">' +
          '<div class="field"><label for="gt-original">Original Xbox Gamertag(s)<span style="color:var(--green);opacity:0.7">*</span></label><input id="gt-original" type="text" maxlength="75" placeholder="e.g. xX_LCES0ffic3r_Xx" required></div>' +
          '<div class="field"><label for="gt-current">Current Xbox Gamertag(s)<span class="optional"> — optional</span></label><input id="gt-current" type="text" maxlength="50" placeholder="e.g. MyNewGamertag2026"></div>' +
        '</div>' +
        '<div class="form-row">' +
          '<div class="field"><label for="steam-id">Steam ID/Friend Code <span class="optional"> — optional</span></label><input id="steam-id" type="text" maxlength="50" placeholder="e.g. 76561198036277522 or 123456789"></div>' +
          '<div class="field"><label for="discord-tag">Discord Username <span class="optional"> — optional</span></label><input id="discord-tag" type="text" maxlength="50" placeholder="e.g. @username"></div>' +
        '</div>' +
        '<div class="form-row">' +
          '<div class="field"><label for="email">Email Address <span class="optional"> — optional</span></label><input id="email" type="email" maxlength="100" placeholder="e.g. user@example.com"></div>' +
          '<div class="field"><label>I own GTA IV on <span class="optional"> — optional</span></label><div class="checkbox-group"><label><input type="checkbox" id="platform-xbox"> Xbox</label><label><input type="checkbox" id="platform-pc"> PC</label></div></div>' +
        '</div>' +
        '<div class="field"><label for="message">Message <span class="optional"> — optional</span></label><textarea id="message" maxlength="2800" placeholder="Memories, stories, what you&rsquo;ve been up to the last 15 years&hellip;"></textarea><span class="char-count" id="char-count">0 / 2800</span></div>' +
        '<div class="turnstile-row"><div id="turnstile-container"></div></div>' +
        '<div class="hp-field" aria-hidden="true"><label for="hp-website">Website</label><input id="hp-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>' +
        '<div class="form-footer" style="display:flex;gap:0.75rem;flex-wrap:wrap;align-items:center;margin-top:0.25rem;"><button type="submit" class="btn btn-submit" disabled>SUBMIT</button><span class="form-feedback" id="form-feedback"></span><span class="form-note">&#x1f512; Your info will be sent to the clan Discord and used to contact you about patrols.</span></div>' +
      '</form>';
    var msgEl = document.getElementById('message');
    var countEl = document.getElementById('char-count');
    if (msgEl && countEl) {
      msgEl.addEventListener('input', function() {
        var len = msgEl.value.length;
        countEl.textContent = len + ' / 2800';
        countEl.className = 'char-count' + (len > 2700 ? ' danger' : len > 2400 ? ' warn' : '');
      });
    }
    var gtEl = document.getElementById('gt-original');
    if (gtEl) {
      gtEl.addEventListener('input', updateBtn);
    }
    renderTurnstile();
  }

})();
