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


def load_webhook_url():
    """Read webhook URL from .env, env var, or --webhook CLI arg."""
    # Priority 1: CLI --webhook argument
    if len(sys.argv) > 1 and sys.argv[1] == "--webhook" and len(sys.argv) > 2:
        return sys.argv[2]

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


if __name__ == "__main__":
    main()
