#!/usr/bin/env python3
"""
Send officer profile messages to a Discord webhook as embeds.

Reads roster/profiles/{badge}.json files and posts any messages submitted
since the last run as individual Discord embeds — one per entry — in
chronological order (oldest first).

A state file (roster/last-run.json) records the timestamp of the most
recent submittedAt seen, so each run only picks up genuinely new entries.

Usage:
    python roster/message_webhook.py                   normal run
    python roster/message_webhook.py --force           send ALL messages (ignore last-run)
    python roster/message_webhook.py --dry-run         preview without sending
    python roster/message_webhook.py --webhook <url>   override webhook URL

The webhook URL is loaded from (in priority order):
    1. --webhook CLI argument
    2. GUESTBOOK_WEBHOOK_URL in the project-root .env file
    3. GUESTBOOK_WEBHOOK_URL / DISCORD_GUESTBOOK_WEBHOOK_URL environment variable
"""

import json
import os
import sys
import glob
import urllib.request
import urllib.error
from datetime import datetime, timezone

# ── Paths ────────────────────────────────────────────────────────────
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROFILES_DIR = os.path.join(_SCRIPT_DIR, "profiles")
ROSTER_PATH = os.path.join(_SCRIPT_DIR, "roster.json")
STATE_FILE = os.path.join(_SCRIPT_DIR, "last-run.json")

DEFAULT_MESSAGE = "Signed the guestbook."


# ── Roster helpers ─────────────────────────────────────────────────

def load_roster_status():
    """Return dict {badge: status} from roster.json."""
    if not os.path.exists(ROSTER_PATH):
        print(f"  [!] Roster not found: {ROSTER_PATH}")
        return {}
    with open(ROSTER_PATH, "r") as f:
        data = json.load(f)
    return {e["badge"]: e.get("status", "mia") for e in data}


# ── State management ─────────────────────────────────────────────────

def load_state():
    """Return the last-run state dict (creates one if missing)."""
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    return {"lastRun": None, "lastSubmittedAt": None}


def save_state(state):
    """Persist state to roster/last-run.json."""
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)
        f.write("\n")


# ── Webhook helpers ──────────────────────────────────────────────────

def load_webhook_url():
    """Resolve the Discord webhook URL from CLI, .env, or environment."""
    # 1. CLI: --webhook <url>
    for i, arg in enumerate(sys.argv):
        if arg == "--webhook" and i + 1 < len(sys.argv):
            return sys.argv[i + 1]

    # 2. .env file in project root
    root_dir = os.path.dirname(_SCRIPT_DIR)
    env_path = os.path.join(root_dir, ".env")
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line.startswith("GUESTBOOK_WEBHOOK_URL=") or line.startswith("export GUESTBOOK_WEBHOOK_URL="):
                    prefix = "export " if line.startswith("export ") else ""
                    return line[len(prefix + "GUESTBOOK_WEBHOOK_URL="):].strip().strip('"').strip("'")

    # 3. Environment variable
    return os.environ.get("GUESTBOOK_WEBHOOK_URL") or os.environ.get("DISCORD_GUESTBOOK_WEBHOOK_URL")


def send_embed(webhook_url, embed):
    """POST a single embed object to the Discord webhook.  Returns HTTP status."""
    payload = json.dumps({"embeds": [embed]}).encode("utf-8")
    req = urllib.request.Request(
        webhook_url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "LCES-MessageBot/1.0 (https://lcesclan.net)",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        body = "<empty>"
        try:
            body = e.read().decode()
        except Exception:
            pass
        print(f"  [X] HTTP {e.code}: {e.reason}")
        print(f"      Body: {body}")
        return e.code
    except urllib.error.URLError as e:
        print(f"  [X] Network error: {e.reason}")
        return -1


# ── Main logic ───────────────────────────────────────────────────────

def main():
    force = "--force" in sys.argv
    dry_run = "--dry-run" in sys.argv

    # ── Resolve webhook URL ──────────────────────────────────────────
    if dry_run:
        url = None  # no real requests will be made
    else:
        url = load_webhook_url()
        if not url or "YOUR_WEBHOOK" in url:
            print("  [!] No Discord webhook URL configured.\n")
            print("  Create a .env file in the project root with:")
            print("    GUESTBOOK_WEBHOOK_URL=https://discord.com/api/webhooks/...\n")
            print("  Or pass the URL directly:")
            print("    python roster/message_webhook.py --webhook https://discord.com/api/webhooks/...")
            sys.exit(1)

    # ── Load last-run state ──────────────────────────────────────────
    state = load_state()
    last_ts = state.get("lastSubmittedAt") if not force else None

    if not os.path.isdir(PROFILES_DIR):
        print(f"  [!] Profiles directory not found: {PROFILES_DIR}")
        sys.exit(1)

    # ── Load roster for active-officer default messages ──────────────
    roster_status = load_roster_status()

    # ── Gather messages ──────────────────────────────────────────────
    files = sorted(glob.glob(os.path.join(PROFILES_DIR, "*.json")))
    entries = []

    for filepath in files:
        basename = os.path.basename(filepath)
        name = os.path.splitext(basename)[0]
        if not name.isdigit():
            continue  # skip README.md landing here, etc.

        try:
            with open(filepath, "r") as f:
                data = json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            print(f"  [!] Skipping {basename}: {e}")
            continue

        badge = int(name)
        gamertag = data.get("oldGamertag", "Unknown")
        message = (data.get("message") or "").strip()
        submitted_at = data.get("submittedAt")

        # Handle entries with no message
        if not message:
            status = roster_status.get(badge, "mia")
            if status == "active":
                message = DEFAULT_MESSAGE
            else:
                continue  # non-active + no message → skip

        # Only pick up entries newer than the last run
        if last_ts and submitted_at and submitted_at <= last_ts:
            continue

        entries.append({
            "badge": badge,
            "gamertag": gamertag,
            "discord": data.get("discord"),
            "message": message,
            "submittedAt": submitted_at,
        })

    if not entries:
        print("  No new messages to send.")
        return

    # Sort chronologically (oldest first)
    entries.sort(key=lambda e: e.get("submittedAt") or "")

    print(f"  {'[DRY-RUN] ' if dry_run else ''}{'FORCED — ' if force else ''}"
          f"Sending {len(entries)} new message(s)...\n")

    run_ts = datetime.now(timezone.utc).isoformat()
    newest_ts = state.get("lastSubmittedAt")
    ok_count = 0
    fail_count = 0

    for i, entry in enumerate(entries, 1):
        badge = entry["badge"]
        gamertag = entry["gamertag"]
        submitted_at = entry["submittedAt"]
        discord = entry.get("discord")
        message = entry["message"]

        # Human-friendly timestamp for the embed footer
        if submitted_at:
            try:
                dt = datetime.fromisoformat(submitted_at.replace("Z", "+00:00"))
                formatted_ts = dt.strftime("%B %d, %Y at %I:%M %p UTC")
            except (ValueError, AttributeError):
                formatted_ts = submitted_at
        else:
            formatted_ts = "Unknown date"

        # ── Build the Discord embed ──────────────────────────────────
        description = message

        embed = {
            "author": {
                "name": f"Badge #{badge} — {gamertag}",
            },
            "description": description,
            "color": 0x1E90FF,  # dodger blue
            "footer": {
                "text": f"Submitted {formatted_ts}",
            },
        }

        # Use the submittedAt as the embed timestamp (shows in Discord UI)
        # Discord requires a valid ISO 8601 timestamp; normalize the source
        # timestamp in case it has a non-zero-padded hour like T2:01 instead of T02:01.
        if submitted_at:
            try:
                dt = datetime.fromisoformat(submitted_at.replace("Z", "+00:00"))
                embed["timestamp"] = dt.isoformat()
            except (ValueError, AttributeError):
                pass  # omit timestamp rather than risk a malformed one

        # Add Discord username as a field if available
        if discord:
            embed["fields"] = [
                {"name": "Discord", "value": discord, "inline": True},
            ]

        # ── Send ─────────────────────────────────────────────────────
        tag = f"#{badge} ({gamertag})"
        if dry_run:
            print(f"  [{i}/{len(entries)}] [DRY-RUN] Would send {tag}")
            print(f"      {formatted_ts}")
            print(f"      {message[:80]}{'...' if len(message) > 80 else ''}")
            print()
            ok_count += 1
        else:
            print(f"  [{i}/{len(entries)}] Sending {tag}...", end=" ")
            status = send_embed(url, embed)
            if status in (200, 204):
                print("OK")
                ok_count += 1
            else:
                print(f"FAILED (status {status})")
                fail_count += 1
                continue  # skip tracking newest_ts for failed sends

        # ── Track the newest submittedAt (only for successfully sent messages) ──
        if submitted_at and (newest_ts is None or submitted_at > newest_ts):
            newest_ts = submitted_at

    # ── Persist updated state ────────────────────────────────────────
    if not dry_run:
        state["lastRun"] = run_ts
        if newest_ts:
            state["lastSubmittedAt"] = newest_ts
        save_state(state)

    print(f"\n  {'[DRY-RUN] ' if dry_run else ''}Done: {ok_count} sent, {fail_count} failed")
    if newest_ts:
        print(f"  Last submittedAt recorded: {newest_ts}")


if __name__ == "__main__":
    main()
