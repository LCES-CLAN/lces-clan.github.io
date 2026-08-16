// LCES Guestbook relay — Cloudflare Worker
//
// Receives guestbook/re-enlistment form submissions, verifies a Cloudflare
// Turnstile CAPTCHA server-side, filters spam, rate-limits by IP, and only
// then forwards a Discord embed to the private webhook.
//
// The Discord webhook URL and the Turnstile secret key are kept as Worker
// secrets and are NEVER exposed to the browser. This is what stops people
// from grabbing the webhook URL out of the public site and spamming it.

const TURNSTILE_VERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Origins allowed to call this Worker. The form lives on both of these.
const ALLOWED_ORIGINS = [
  'https://lcesclan.net',
  'https://www.lcesclan.net',
  'https://lces-clan.github.io',
];

// ─── Rate limiting (in-memory, per isolate) ──────────────────────────
// First line of defence only; Turnstile is the real gate. A simple
// sliding window: MAX_PER_WINDOW submissions per WINDOW_MS per IP.
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_PER_WINDOW = 5;
const hits = new Map();

// ─── Content filter ──────────────────────────────────────────────────
// Blocks invite links and mass-pings, which is exactly the spam seen.
const BANNED_PATTERNS = [
  /discord\.gg\//i,
  /discord\.com\/invite/i,
  /discordapp\.com\/invite/i,
  /@everyone/i,
  /@here/i,
];

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(origin) },
  });
}

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin || ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function allowedOrigin(request) {
  const origin = request.headers.get('Origin') || '';
  return ALLOWED_ORIGINS.includes(origin) ? origin : null;
}

async function verifyTurnstile(token, ip, secret) {
  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', token);
  if (ip) body.set('remoteip', ip);
  const res = await fetch(TURNSTILE_VERIFY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const data = await res.json().catch(() => ({}));
  return !!(data && data.success === true);
}

function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) return true;
  arr.push(now);
  hits.set(ip, arr);
  return false;
}

function clip(v, max) {
  return String(v == null ? '' : v).slice(0, max);
}

function buildEmbed(d) {
  const fields = [];
  if (d.gt) fields.push({ name: 'OG Gamertag', value: clip(d.gt, 75), inline: true });
  if (d.cur) fields.push({ name: 'New Gamertag', value: clip(d.cur, 50), inline: true });
  if (d.steam) fields.push({ name: 'Steam', value: clip(d.steam, 50), inline: true });
  if (d.disc) fields.push({ name: 'Discord', value: clip(d.disc, 50), inline: true });
  if (d.email) fields.push({ name: 'Email', value: clip(d.email, 100), inline: true });
  if (d.plat) fields.push({ name: 'Platforms', value: clip(d.plat, 50), inline: true });
  if (d.msg) fields.push({ name: 'Message', value: clip(d.msg, 2800) });
  return {
    title: 'New Guestbook Submission',
    color: 3066993,
    fields,
    timestamp: new Date().toISOString(),
    footer: { text: 'Re-enlistment Form' },
  };
}

export default {
  async fetch(request, env) {
    const origin = allowedOrigin(request);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    if (request.method !== 'POST') {
      return json({ ok: false, error: 'method not allowed' }, 405, origin);
    }

    if (new URL(request.url).pathname !== '/submit') {
      return json({ ok: false, error: 'not found' }, 404, origin);
    }

    // Only known origins may submit. Browsers send Origin; curl/scripts don't.
    if (!origin) {
      return json({ ok: false, error: 'forbidden' }, 403, origin);
    }

    let d;
    try {
      d = await request.json();
    } catch (e) {
      return json({ ok: false, error: 'invalid json' }, 400, origin);
    }

    // Honeypot: real users never see/fill this. Bots do. Pretend success,
    // but don't send anything to Discord.
    if (d.website) {
      return json({ ok: true }, 200, origin);
    }

    const gt = String(d.gt || '').trim();
    if (!gt) {
      return json({ ok: false, error: 'gamertag required' }, 400, origin);
    }

    if (!env.TURNSTILE_SECRET_KEY) {
      return json({ ok: false, error: 'server not configured' }, 500, origin);
    }

    // Server-side CAPTCHA verification — this is the real bot gate.
    const token = String(d.turnstile || '');
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const human = await verifyTurnstile(token, ip, env.TURNSTILE_SECRET_KEY);
    if (!human) {
      return json({ ok: false, error: 'captcha failed' }, 400, origin);
    }

    // Content filter
    const allText = [d.gt, d.cur, d.steam, d.disc, d.email, d.plat, d.msg].join(' ');
    if (BANNED_PATTERNS.some((re) => re.test(allText))) {
      return json({ ok: false, error: 'message blocked' }, 400, origin);
    }

    // Rate limit
    if (rateLimited(ip)) {
      return json({ ok: false, error: 'too many submissions' }, 429, origin);
    }

    if (!env.DISCORD_WEBHOOK_URL) {
      return json({ ok: false, error: 'server not configured' }, 500, origin);
    }

    const resp = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [buildEmbed(d)] }),
    });

    if (!resp.ok) {
      return json({ ok: false, error: 'discord ' + resp.status }, 502, origin);
    }

    return json({ ok: true }, 200, origin);
  },
};
