#!/usr/bin/env python3
"""
Post the LCES officer roster to a Discord webhook.

Reads roster/roster.json (the master file with uncensored gamertags)
and sends the roster in batches of 25 badges per message.

Usage:
    1. Set ROSTER_WEBHOOK_URL in .env (or pass via --webhook)
    2. python roster/discord_webhook.py

The first message includes a header with a generation timestamp.
The last message includes a legend explaining the status emojis.

"Go to Top" link (two passes):
    The link to the top of the channel doesn't exist until the roster has
    been posted, so it can't be supplied during that run. Do it afterwards:

        python roster/discord_webhook.py                 pass 1: post roster
        # → copy the message link in Discord (right-click → Copy Message Link)
        python roster/discord_webhook.py --gototop     pass 2: post just:
            # ⤴️ [Go to Top](<message-link>)

    --gototop posts ONLY that one message; the roster is not re-sent.
    Leave it bare to paste the link when prompted, or pass it inline:
        python roster/discord_webhook.py --gototop --go-to-top <message-link>

    --go-to-top on its own (without --gototop) still works during a full
    run, for cases where the link already exists — a pinned message, or the
    previous run's header.

Format per badge:
    🟢 **`#  3`** — stevenkb6720               (active — green, only badge bold)
    🔵 **`# 17`** — PTY997/xXPTY997Xx          (replied — blue, only badge bold)
    🟣 **`#  4`** — CALIKILLER33               (detected — purple, only badge bold)
    ⚫ **`#  1`** — Harper HFD/NC…              (mia — black, only badge bold)
    ⚫ **`#  6`** — RESERVED                   (reserved — white, only badge bold)

    10‑4 (replied) and 10‑8 (active) officers get the entire line bolded:
    **🟢 `# 63` — l33t 0wn3r/Genetically…**    (10‑8 — entire line bold)
"""

import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime

# ── Configuration ──────────────────────────────────────────────────
# Webhook URL is loaded from .env (ROSTER_WEBHOOK_URL) — see .env.example.
# Can also pass via --webhook <url> CLI argument.

CHUNK_SIZE = 25       # badges per message
MAX_CONTENT_LEN = 2000 # Discord webhook character limit
MAX_GT_LEN = 28       # max gamertag chars before truncation with "…"

# Posted as a standalone message after the roster with --go-to-top <link>.
GO_TO_TOP_TEMPLATE = "# ⤴️ [Go to Top]({link})"

# Map status → (emoji,)
STATUS_MAP = {
    "active":   "🟢",
    "replied":  "🔵",
    "detected": "🟣",
    "mia":      "⚫",
}


def truncate(text, max_len=MAX_GT_LEN):
    """Truncate with ellipsis if longer than max_len."""
    if len(text) > max_len:
        return text[: max_len - 1] + "…"
    return text


def format_entry(entry):
    """Return a single Discord‑formatted line for one badge entry.

    Badge number is shown in a code block (no leading zeroes, space-padded),
    and only the badge number is bolded — unless the officer is 10‑4 (replied)
    or 10‑8 (active), in which case the entire line is bolded.
    """
    badge = entry["badge"]
    gamertag = entry.get("gamertag", entry.get("display", ""))
    status = entry.get("status", "")

    # Format badge as inline code, right-aligned with spaces, no leading zeroes
    # Max badge is 253 → 3-digit width
    badge_code = f"`#{badge:>3}`"
    badge_bold = f"**{badge_code}**"

    emoji = STATUS_MAP.get(status, "⚫")
    gt_part = truncate(gamertag)

    # Reserved entries
    if entry.get("display") == "RESERVED":
        return f"⚫ {badge_bold} RESERVED"

    # 10‑4 (replied) or 10‑8 (active): entire line bold
    if status in ("active", "replied"):
        return f"**{emoji} {badge_code} {gt_part}**"

    # Normal: only badge number is bolded
    return f"{emoji} {badge_bold} {gt_part}"


def build_header():
    """Return the roster header with generation timestamp."""
    now = datetime.now()
    return (
        "### ━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "## 📋  **List of Badge Numbers**\n"
        f"### 🕐  Generated {now.strftime('%B %d, %Y')}\n"
        "### ━━━━━━━━━━━━━━━━━━━━━━━━━"
    )


def build_footer():
    """Return the footer containing the legend and reserved notice."""
    return ("_ _\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            "*Unused/RESERVED badge #'s not shown.*\n"
            "**__LEGEND:__**\n"
            "🟢  **10-8**   — Badge reclaimed, on-duty\n"
            "🔵  **10-4**  — Acknowledged, replied\n"
            "🟣  **10-2** — Spotted online, no contact yet\n"
            "⚫  **10-1**      — Missing in action, no contact\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━━━")


def send_webhook(url, content):
    """POST content as a Discord webhook message."""
    payload = json.dumps({"content": content}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
                "Content-Type": "application/json",
                "User-Agent": "LCES-RosterBot/1.0 (https://lcesclan.net)"
            },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        print(f"  [X] HTTP {e.code}: {e.reason}")
        print(f"      Body: {e.read().decode()}")
        return e.code
    except urllib.error.URLError as e:
        print(f"  [X] Network error: {e.reason}")
        return -1


def build_go_to_top(link):
    """Return the 'Go to Top' message body for a pasted Discord message link.

    The link is supplied by the user (right-click the message → Copy Message
    Link) because a fresh webhook post cannot know its own message URL.
    Returns None when `link` is blank, so callers can skip sending anything.
    """
    link = (link or "").strip().strip("<>").strip()
    if not link:
        return None
    return GO_TO_TOP_TEMPLATE.format(link=link)


def send_go_to_top(url, link):
    """Post the 'Go to Top' message after the roster.  Returns HTTP status/None."""
    content = build_go_to_top(link)
    if content is None:
        return None
    return send_webhook(url, content)


def get_arg_value(flag):
    """Read `--flag value` or `--flag=value` out of sys.argv.

    Returns None when the flag is absent, "" when it is present without a value.
    """
    for i, arg in enumerate(sys.argv):
        if arg == flag:
            if i + 1 < len(sys.argv) and not sys.argv[i + 1].startswith("--"):
                return sys.argv[i + 1]
            return ""
        if arg.startswith(flag + "="):
            return arg[len(flag) + 1:]
    return None


def collect_go_to_top_link(force_prompt=False):
    """Return the pasted 'Go to Top' message link, or None when there isn't one.

    Reads --go-to-top / --go-to-top=<link>. A bare flag (or `force_prompt`)
    prompts for the link, since the user copies it out of Discord by hand.
    Angle brackets from Discord's "Copy Message Link" are stripped.
    """
    link = get_arg_value("--go-to-top")
    if link is None:
        if not force_prompt:
            return None
        link = ""

    if link == "":
        try:
            link = input("  Paste the 'Go to Top' message link (Enter to skip): ")
        except EOFError:
            link = ""

    link = (link or "").strip().strip("<>").strip()
    return link or None


def send_only_go_to_top():
    """Post just the 'Go to Top' message. Returns a process exit code.

    Used by --gototop as a second pass, once the roster is already up and
    the message link can finally be copied. Sends nothing else.
    """
    link = collect_go_to_top_link(force_prompt=True)
    if not link:
        print("  [!] No message link given — nothing to send.")
        return 1

    url = load_webhook_url()
    if not url or "YOUR_WEBHOOK" in url:
        print("  [!] No Discord webhook URL configured.")
        print("    Set ROSTER_WEBHOOK_URL in .env, or pass --webhook <url>.")
        return 1

    print("  Posting 'Go to Top' link…", end=" ")
    status = send_go_to_top(url, link)
    if status in (200, 204):
        print("OK")
        return 0
    print(f"Failed (status {status})")
    return 1


def load_webhook_url():
    """Read webhook URL from .env, env var, or --webhook CLI arg."""
    # Priority 1: CLI --webhook argument
    cli_url = get_arg_value("--webhook")
    if cli_url:
        return cli_url

    # Priority 2: .env file in project root
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(script_dir)  # project root
    env_path = os.path.join(root_dir, ".env")
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line.startswith("ROSTER_WEBHOOK_URL=") or line.startswith("export ROSTER_WEBHOOK_URL="):
                    prefix = "export " if line.startswith("export ") else ""
                    return line[len(prefix + "ROSTER_WEBHOOK_URL="):].strip().strip('"').strip("'")

    # Priority 3: environment variable
    env_url = os.environ.get("ROSTER_WEBHOOK_URL") or os.environ.get("DISCORD_ROSTER_WEBHOOK_URL")
    if env_url:
        return env_url

    return None


def main():
    # ── Pass 2: post only the "Go to Top" message ───────────────────
    # Checked first so the roster is never re-sent in this mode.
    if get_arg_value("--gototop") is not None:
        sys.exit(send_only_go_to_top())

    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_file = os.path.join(script_dir, "roster.json")

    if not os.path.exists(data_file):
        print(f"  [!] Not found: {data_file}")
        sys.exit(1)

    with open(data_file, "r") as f:
        data = json.load(f)

    url = load_webhook_url()
    if not url or "YOUR_WEBHOOK" in url:
        print("  [!] No Discord webhook URL configured.")
        print()
        print("  Create a .env file in the project root with:")
        print("    ROSTER_WEBHOOK_URL=https://discord.com/api/webhooks/...")
        print()
        print("  See .env.example for the format, then:")
        print("    cp .env.example .env")
        print("    # edit .env with your real webhook URL")
        print("    python roster/discord_webhook.py")
        print()
        print("  Or pass the URL directly:")
        print("    python roster/discord_webhook.py --webhook https://discord.com/api/webhooks/...")
        sys.exit(1)

    # Build lines, filtering out RESTRICTED (10-7 / RESERVED) badges.
    # Sort by badge number to maintain roster order.
    sorted_data = sorted(data, key=lambda e: e["badge"])
    lines = []
    for entry in sorted_data:
        if entry.get("display") == "RESERVED":
            continue
        lines.append(format_entry(entry))

    # Split into chunks and send
    total = len(lines)
    raw_chunks = [lines[i: i + CHUNK_SIZE] for i in range(0, total, CHUNK_SIZE)]

    # If the last chunk is a tail (< CHUNK_SIZE), try to squeeze it into the
    # previous chunk if there's enough room within Discord's 2000 char limit.
    chunks = []
    for c in raw_chunks:
        if chunks and len(c) < CHUNK_SIZE:
            # Check if merging into the previous chunk fits the char limit
            merged = chunks[-1] + c
            if len("\n".join(merged)) <= MAX_CONTENT_LEN:
                chunks[-1] = merged
                continue
        chunks.append(c)

    # ── Decorate first and last chunks with header and footer ──
    header = build_header()
    footer = build_footer()

    if chunks:
        # Prepend header to the first chunk
        first_with_header = header + "\n" + "\n".join(chunks[0])
        if len(first_with_header) <= MAX_CONTENT_LEN:
            chunks[0] = [header] + chunks[0]
        else:
            # Header alone should always fit, but just in case
            chunks.insert(0, [header])

        # Append footer to the last chunk (or as its own chunk if it doesn't fit)
        last_with_footer = "\n".join(chunks[-1]) + "\n" + footer
        if len(last_with_footer) <= MAX_CONTENT_LEN:
            chunks[-1].append(footer)
        else:
            chunks.append([footer])

    print(f"  Sending {total} badges in {len(chunks)} message(s)…")

    for i, chunk in enumerate(chunks, 1):
        content = "\n".join(chunk)
        print(f"  [{i}/{len(chunks)}] Sending {len(chunk)} lines…")
        status = send_webhook(url, content)
        if status == 204 or status == 200:
            print("    OK")
        else:
            print(f"    Failed (status {status})")
            # Continue sending remaining chunks anyway

    # ── Optional "Go to Top" link message ────────────────────────────
    # The link points at the first message of the run, so the script can't
    # build it itself (a webhook post doesn't return its own message URL).
    # Pass it with --go-to-top <link>, or leave the flag bare to paste it now.
    top_link = collect_go_to_top_link()

    if top_link:
        print("  Posting 'Go to Top' link…", end=" ")
        status = send_go_to_top(url, top_link)
        if status in (200, 204):
            print("OK")
        elif status is not None:
            print(f"Failed (status {status})")


if __name__ == "__main__":
    main()
