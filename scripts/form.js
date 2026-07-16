// Shared re-enlistment form — loaded on index.html and guestbook.html
(function() {

  // ════════════════════════════════════════════════════════════════
  //  Discord Webhook URL
  // ════════════════════════════════════════════════════════════════
  var WEBHOOK_URL = 'https://discord.com/api/webhooks/1526034307125215355/9WvOLTIWGVvtziJVrzYEH7N5psqc6P1L5gYCRiYU1Ysaq5Vg0MwiUL05aVWXcon8-PJQ';

  // ════════════════════════════════════════════════════════════════
  //  TRIVIA CAPTCHA QUESTIONS
  // ════════════════════════════════════════════════════════════════
  var CAPTCHA_QUESTIONS = [
    { q: "What color did the crook team play as?", a: ["Orange","Blue","Green","Red"], ok: 0 },
    { q: "Where did debriefs take place?", a: ["At the scene of the crime","In the game lobby","At the PD","On the forums"], ok: 2 },
    { q: "What did we call our game sessions?", a: ["RPs","Shifts","Beats","Patrols"], ok: 3 },
    { q: "Which platform was LCES active on?", a: ["PlayStation 3","Xbox 360","PC","Nintendo Wii"], ok: 1 },
    { q: "What color did the cop team play as?", a: ["White","Orange","Purple","Red"], ok: 1 }
  ];

  // ─── State ───
  var captchaPassed = false;
  var curQ = null;

  // ─── Inject captcha styles ───
  var s = document.createElement('style');
  s.textContent = '.trivia-captcha{margin:0.5rem 0;padding:0.35rem 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}' +
    '.tc-row{display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap}' +
    '.tc-label{font-family:"Share Tech Mono",monospace;font-size:0.55rem;color:var(--text-dim);white-space:nowrap}' +
    '.tc-q{font-family:"Inter",sans-serif;font-size:0.72rem;color:var(--text-bright)}' +
    '.tc-opts{display:flex;gap:0.25rem;flex-wrap:wrap}' +
    '.tc-opt{padding:0.15rem 0.45rem;cursor:pointer;border:1px solid var(--border);border-radius:3px;background:rgba(0,0,0,0.15);font-family:"Share Tech Mono",monospace;font-size:0.65rem;color:var(--text);transition:background 0.15s,border-color 0.15s}' +
    '.tc-opt:hover{border-color:var(--blue-dim)}' +
    '.tc-opt.ok{border-color:var(--green);background:rgba(46,204,64,0.15);color:var(--green)}' +
    '.tc-opt.no{border-color:#c33;background:rgba(204,51,51,0.1);color:#c55}' +
    '.tc-opt.dis{pointer-events:none;opacity:0.5}' +
    '.tc-fb{font-family:"Share Tech Mono",monospace;font-size:0.6rem}' +
    '.tc-fb.ok{color:var(--green)}' +
    '.tc-fb.no{color:#c55}';
  document.head.appendChild(s);

  // ─── Pick a random question ───
  function pickQ() {
    if (!CAPTCHA_QUESTIONS || CAPTCHA_QUESTIONS.length === 0) return null;
    return CAPTCHA_QUESTIONS[Math.floor(Math.random() * CAPTCHA_QUESTIONS.length)];
  }

  // ─── Render captcha ───
  function renderCaptcha() {
    var el = document.getElementById('trivia-captcha');
    if (!el) return;
    curQ = pickQ();
    captchaPassed = false;
    if (!curQ) { el.innerHTML = '<span class="tc-fb no">No questions loaded.</span>'; return; }
    var h = '<div class="tc-row"><span class="tc-label">&#x1F512; CAPTCHA</span><span class="tc-q">' + esc(curQ.q) + '</span></div>' +
      '<div class="tc-row"><span class="tc-opts" id="tc-opts">';
    curQ.a.forEach(function(o, i) { h += '<span class="tc-opt" data-i="' + i + '" onclick="window.__ans(' + i + ')">' + esc(o) + '</span>'; });
    h += '</span><span class="tc-fb" id="tc-fb"></span></div>';
    el.innerHTML = h;
    updateBtn();
  }

  // ─── Escape HTML ───
  function esc(s) { var d = document.createElement('div'); d.appendChild(document.createTextNode(s)); return d.innerHTML; }

  // ─── Handle answer ───
  window.__ans = function(i) {
    if (captchaPassed || !curQ) return;
    var opts = document.querySelectorAll('.tc-opt');
    var fb = document.getElementById('tc-fb');
    opts.forEach(function(o) { o.classList.add('dis'); });
    if (i === curQ.ok) {
      opts[i].classList.add('ok');
      captchaPassed = true;
      if (fb) { fb.innerHTML = '&#x2713; Correct'; fb.className = 'tc-fb ok'; }
      updateBtn();
    } else {
      opts[i].classList.add('no');
      if (fb) { fb.innerHTML = '&#x2717; Try again'; fb.className = 'tc-fb no'; }
      setTimeout(function() {
        opts.forEach(function(o) { o.classList.remove('dis', 'no', 'ok'); });
        if (fb) { fb.textContent = ''; fb.className = 'tc-fb'; }
      }, 800);
    }
  };

  // ─── Update submit button ───
  function updateBtn() {
    var btn = document.querySelector('.btn-reenlist');
    if (!btn) return;
    btn.disabled = !captchaPassed;
    btn.title = captchaPassed ? '' : 'Answer the captcha first';
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
    if (!captchaPassed) { fb.textContent = 'Answer the captcha first.'; fb.style.color = '#c55'; return false; }
    if (!hasExtra()) { fb.textContent = 'Fill in at least one extra field.'; fb.style.color = '#c55'; return false; }
    fb.textContent = ''; fb.style.color = ''; return true;
  }

  // ─── Submit to Discord ───
  function submitDiscord(d) {
    if (!WEBHOOK_URL) return fakeSubmit(d);
    var emb = { title: 'New Guestbook Submission', color: 3066993, fields: [], timestamp: new Date().toISOString(), footer: { text: 'Re-enlistment Form' } };
    if (d.gt) emb.fields.push({ name: 'OG Gamertag', value: d.gt, inline: true });
    if (d.cur) emb.fields.push({ name: 'New Gamertag', value: d.cur, inline: true });
    if (d.steam) emb.fields.push({ name: 'Steam', value: d.steam, inline: true });
    if (d.disc) emb.fields.push({ name: 'Discord', value: d.disc, inline: true });
    if (d.email) emb.fields.push({ name: 'Email', value: d.email, inline: true });
    if (d.plat) emb.fields.push({ name: 'Platforms', value: d.plat, inline: true });
    if (d.msg) emb.fields.push({ name: 'Message', value: d.msg });
    return fetch(WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ embeds: [emb] }) }).then(function(r) { if (!r.ok) throw Error('Webhook ' + r.status); return true; });
  }

  function fakeSubmit(d) { return new Promise(function(r) { setTimeout(r, 1200, true); }); }

  // ─── Form submit handler ───
  window.handleReEnlist = function(e) {
    e.preventDefault();
    if (!validate()) return;
    var form = e.target, fb = document.getElementById('form-feedback'), btn = form.querySelector('.btn-reenlist'), orig = btn.textContent;
    btn.textContent = 'Transmitting...'; btn.disabled = true; fb.textContent = 'Sending...'; fb.style.color = '#6680a0';
    var d = {
      gt: (document.getElementById('gt-original') || {}).value || '',
      cur: (document.getElementById('gt-current') || {}).value || '',
      steam: (document.getElementById('steam-id') || {}).value || '',
      disc: (document.getElementById('discord-tag') || {}).value || '',
      email: (document.getElementById('email') || {}).value || '',
      plat: [], msg: (document.getElementById('message') || {}).value || ''
    };
    if (document.getElementById('platform-xbox') && document.getElementById('platform-xbox').checked) d.plat.push('Xbox');
    if (document.getElementById('platform-pc') && document.getElementById('platform-pc').checked) d.plat.push('PC');
    if (d.plat.length) d.plat = d.plat.join(' + '); else d.plat = '';
    submitDiscord(d).then(function() {
      btn.textContent = 'Re-enlisted!'; fb.textContent = '10-4. Now get to your beat, rookie.'; fb.style.color = 'var(--green)';
      if (window.LCES && window.LCES.trackFormSubmit) window.LCES.trackFormSubmit();
      setTimeout(function() { btn.textContent = orig || 'SUBMIT'; btn.disabled = true; fb.textContent = ''; form.reset(); captchaPassed = false; curQ = null; renderCaptcha(); updateBtn(); }, 3000);
    }).catch(function() {
      btn.textContent = 'Error'; fb.textContent = 'Failed to send.'; fb.style.color = '#c55';
      setTimeout(function() { btn.textContent = orig || 'SUBMIT'; btn.disabled = !captchaPassed; }, 2000);
    });
  };

  // ─── Inject form ───
  var c = document.getElementById('enlist-form');
  if (c) {
    c.innerHTML =
      '<form class="form-section" onsubmit="handleReEnlist(event)">' +
        '<div class="form-row">' +
          '<div class="field"><label for="gt-original">Original Xbox Gamertag <span style="color:var(--green);opacity:0.7">*</span></label><input id="gt-original" type="text" placeholder="e.g. xX_LCES0ffic3r_Xx" required></div>' +
          '<div class="field"><label for="gt-current">Current Xbox Gamertag <span class="optional">(optional)</span></label><input id="gt-current" type="text" placeholder="e.g. MyNewGamertag2026"></div>' +
        '</div>' +
        '<div class="form-row">' +
          '<div class="field"><label for="steam-id">Steam ID/Friend Code <span class="optional">(optional)</span></label><input id="steam-id" type="text" placeholder="e.g. 76561198036277522 or 123456789"></div>' +
          '<div class="field"><label for="discord-tag">Discord Username <span class="optional">(optional)</span></label><input id="discord-tag" type="text" placeholder="e.g. @username"></div>' +
        '</div>' +
        '<div class="form-row">' +
          '<div class="field"><label for="email">Email Address <span class="optional">(optional)</span></label><input id="email" type="email" placeholder="e.g. user@example.com"></div>' +
          '<div class="field"><label>I own GTA IV on: <span class="optional">(optional)</span></label><div class="checkbox-group"><label><input type="checkbox" id="platform-xbox"> Xbox</label><label><input type="checkbox" id="platform-pc"> PC</label></div></div>' +
        '</div>' +
        '<div class="field"><label for="message">Message <span class="optional">(optional)</span></label><textarea id="message" placeholder="Memories, stories, what you&rsquo;ve been up to the last 15 years&hellip;"></textarea></div>' +
        '<div class="trivia-captcha" id="trivia-captcha"><span class="tc-fb">Loading...</span></div>' +
        '<div class="form-footer" style="display:flex;gap:0.75rem;flex-wrap:wrap;align-items:center;margin-top:0.25rem;"><button type="submit" class="btn btn-reenlist" disabled>SUBMIT</button><span class="form-feedback" id="form-feedback"></span></div>' +
        '<span class="form-note">&#x1f512; Your info will be sent to the clan Discord and used to contact you about patrols.</span>' +
      '</form>';
    renderCaptcha();
  }

})();
