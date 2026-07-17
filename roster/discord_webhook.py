#!/usr/bin/env python3
"""
Post the LCES officer roster to a Discord webhook.

Reads roster/roster.json (the master file with uncensored gamertags)
and sends the roster in batches of 25 badges per message.

Usage:
    1. Set WEBHOOK_URL below (or pass via --webhook)
    2. python roster/discord_webhook.py

Format per badge:
    🟢 **#003 — stevenkb6720** `10-8`     (active — green, bold)
    🔵 **#017 — PTY997/xXPTY997Xx** `10-4`  (replied — blue, bold)
    🟡 #004 — CALIKILLER33 `10-2`           (detected — yellow)
    🔴 #001 — Harper HFD/NC... `10-1`       (mia — red, truncated)
    ⚪ #006 — RESERVED `10-7`               (reserved — white)
"""

import json
import os
import sys
import urllib.request
import urllib.error

# ── Configuration ──────────────────────────────────────────────────
# Replace this with your actual Discord webhook URL.
WEBHOOK_URL = "https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN"

CHUNK_SIZE = 25       # badges per message
MAX_GT_LEN = 55       # max gamertag chars before truncation with "..."

# Map status → (emoji, status_label, bold?)
STATUS_MAP = {
    "active":   ("🟢", "10-8", True),
    "replied":  ("🔵", "10-4", True),
    "detected": ("🟡", "10-2", False),
    "mia":      ("🔴", "10-1", False),
}


def truncate(text, max_len=MAX_GT_LEN):
    """Truncate with ellipsis if longer than max_len."""
    if len(text) > max_len:
        return text[: max_len - 1] + "…"
    return text


def format_entry(entry):
    """Return a single Discord‑formatted line for one badge entry."""
    badge = entry["badge"]
    gamertag = entry.get("gamertag", entry.get("display", ""))
    status = entry.get("status", "")

    # Reserved entries
    if entry.get("display") == "RESERVED":
        return f"⚪ #{badge:03d} — RESERVED `10-7`"

    info = STATUS_MAP.get(status)
    if not info:
        return f"⚪ #{badge:03d} — {truncate(gamertag)} `???`"

    emoji, label, bold = info
    gt_part = truncate(gamertag)

    if bold:
        return f"{emoji} **#{badge:03d} — {gt_part}** `{label}`"
    else:
        return f"{emoji} #{badge:03d} — {gt_part} `{label}`"


def send_webhook(url, content):
    """POST content as a Discord webhook message."""
    payload = json.dumps({"content": content}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
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


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_file = os.path.join(script_dir, "roster.json")

    if not os.path.exists(data_file):
        print(f"  [!] Not found: {data_file}")
        sys.exit(1)

    with open(data_file, "r") as f:
        data = json.load(f)

    # Parse --webhook argument
    url = WEBHOOK_URL
    if len(sys.argv) > 1 and sys.argv[1] == "--webhook" and len(sys.argv) > 2:
        url = sys.argv[2]

    if "YOUR_WEBHOOK" in url:
        print("  [!] Please set WEBHOOK_URL in the script or pass --webhook <url>")
        print("  Usage: python roster/discord_webhook.py --webhook https://discord.com/api/webhooks/...")
        sys.exit(1)

    # Build lines, filtering out RESERVED entries (or keep them — your call).
    # Sort by badge number to maintain roster order.
    sorted_data = sorted(data, key=lambda e: e["badge"])
    lines = []
    for entry in sorted_data:
        lines.append(format_entry(entry))

    # Split into chunks and send
    total = len(lines)
    chunks = [lines[i: i + CHUNK_SIZE] for i in range(0, total, CHUNK_SIZE)]
    print(f"  Sending {total} badges in {len(chunks)} message(s)…")

    for i, chunk in enumerate(chunks, 1):
        content = "\n".join(chunk)
        print(f"  [{i}/{len(chunks)}] Sending {len(chunk)} badges…")
        status = send_webhook(url, content)
        if status == 204 or status == 200:
            print(f"    OK")
        else:
            print(f"    Failed (status {status})")
            # Continue sending remaining chunks anyway


if __name__ == "__main__":
    main()
