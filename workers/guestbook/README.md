# LCES Guestbook relay (Cloudflare Worker)

This Worker is the server-side relay for the guestbook / re-enlistment form.
It verifies a Cloudflare Turnstile CAPTCHA server-side, filters spam, and
forwards a Discord embed to a **private** webhook URL. The webhook URL and
the Turnstile secret never reach the browser, so nobody can scrape them out
of the public site and spam the channel.

## One-time setup

### 1. Cloudflare Turnstile (free CAPTCHA)

1. Sign in to the [Cloudflare dashboard](https://dash.cloudflare.com) (free account).
2. Go to **Turnstile** → **Add site**.
3. Name it `lces-guestbook`, and under **Hostnames** add BOTH:
   - `lcesclan.net`
   - `lces-clan.github.io`
4. Copy the **Site key** (public) and the **Secret key** (private).

### 2. Deploy the Worker

From this directory:

```bash
npx wrangler login
npx wrangler secret put DISCORD_WEBHOOK_URL   # paste your (new) Discord webhook URL
npx wrangler secret put TURNSTILE_SECRET_KEY  # paste the Turnstile secret key
npx wrangler deploy
```

**Windows (cmd) users:** the `# ...` comments above are bash syntax — cmd treats
each word after `#` as an extra argument and the command errors out with
`Unknown arguments`. Run each command **without** the comment and paste the
value when prompted:

```cmd
npx wrangler secret put DISCORD_WEBHOOK_URL
npx wrangler secret put TURNSTILE_SECRET_KEY
```

Also, when `npx wrangler deploy` asks *"Would you like to register a workers.dev
subdomain now?"*, answer **yes** — without a workers.dev subdomain the deploy
has nowhere to publish and will fail at the end.

Note the URL it prints, e.g. `https://lces-guestbook.your-subdomain.workers.dev`.
The form will POST to `https://lces-guestbook.your-subdomain.workers.dev/submit`.

> Optional: to serve it from your own domain (`https://lcesclan.net/...`) add a
> custom domain/route to the Worker in the Cloudflare dashboard. Not required.

### 3. Point the site at the Worker

Add two **GitHub Actions variables** (repo → Settings → Secrets and variables →
Actions → Variables tab — *not* Secrets, since these are public):

| Variable              | Value                                              |
| --------------------- | -------------------------------------------------- |
| `FORM_ENDPOINT_URL`   | `https://lces-guestbook.your-subdomain.workers.dev/submit` |
| `TURNSTILE_SITE_KEY`  | the Turnstile **site** key                         |

Then push to `main` (or run the deploy workflow). The workflow injects these
into `scripts/form.js`.

### 4. Regenerate the Discord webhook (important)

The old webhook URL was exposed publicly and is compromised. In Discord,
delete the old guestbook webhook and create a new one, then update the
`DISCORD_WEBHOOK_URL` Worker secret with the new URL:

```bash
npx wrangler secret put DISCORD_WEBHOOK_URL
```

## How it works

```
browser ──(Turnstile token + form data)──▶ Worker /submit
                                            │ verify Turnstile (server-side)
                                            │ honeypot + content filter + rate limit
                                            ▼
                                          Discord webhook (secret, private)
```

The Discord webhook URL is no longer in `scripts/form.js` (or anywhere in the
repo). `deploy.yml` only injects the public Worker URL and Turnstile site key.
