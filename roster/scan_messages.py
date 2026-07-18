#!/usr/bin/env python3
"""
Scan officer profile JSONs for message fields and generate
roster/messages-data.js for the live site.

Active officers who signed the guestbook but left no message are
included with the default message "Signed the guestbook." and flagged
with isDefault: true so the frontend can render them in italics.

Usage:
    python roster/scan_messages.py
"""

import json
import os
import glob

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROFILES_DIR = os.path.join(_SCRIPT_DIR, "profiles")
ROSTER_PATH = os.path.join(_SCRIPT_DIR, "roster.json")
OUT_PATH = os.path.join(_SCRIPT_DIR, "messages-data.js")

DEFAULT_MESSAGE = "Signed the guestbook."


def load_roster_status():
    """Return dict {badge: status} from roster.json."""
    if not os.path.exists(ROSTER_PATH):
        print(f"  [!] Roster not found: {ROSTER_PATH}")
        return {}
    with open(ROSTER_PATH, "r") as f:
        data = json.load(f)
    return {e["badge"]: e.get("status", "mia") for e in data}


def main():
    if not os.path.isdir(PROFILES_DIR):
        print(f"  [!] Profiles directory not found: {PROFILES_DIR}")
        return

    roster_status = load_roster_status()

    entries = []
    files = sorted(glob.glob(os.path.join(PROFILES_DIR, "*.json")))

    for filepath in files:
        basename = os.path.basename(filepath)
        name = os.path.splitext(basename)[0]
        if not name.isdigit():
            continue

        try:
            with open(filepath, "r") as f:
                data = json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            print(f"  [!] Could not read {basename}: {e}")
            continue

        badge = int(name)
        msg = data.get("message", "")
        status = roster_status.get(badge, "mia")

        if msg and msg.strip():
            # Has a real message
            entry = {
                "badge": badge,
                "message": msg.strip(),
                "submittedAt": data.get("submittedAt", None),
            }
            entries.append(entry)
        elif status == "active":
            # Active officer signed the guestbook but wrote no message
            entry = {
                "badge": badge,
                "message": DEFAULT_MESSAGE,
                "submittedAt": data.get("submittedAt", None),
                "isDefault": True,
            }
            entries.append(entry)
        # Non-active + no message → skip silently (they only submitted a form, nothing to show)

    # Sort newest-first by submittedAt; entries without a date go last,
    # then fall back to badge number ascending for ties.
    def sort_key(e):
        ts = e.get("submittedAt")
        if ts is None:
            return (0, -e["badge"])
        return (1, ts, -e["badge"])

    entries.sort(key=sort_key, reverse=True)

    # Write messages-data.js
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write("// LCES Officer Messages -- auto-generated from roster/profiles/*.json\n")
        f.write("// Regenerate with: python roster/scan_messages.py\n")
        f.write("// Sorted by submittedAt descending (newest first), badge asc for ties\n")
        f.write("// isDefault: true -> frontend should render in italics (placeholder message)\n")
        f.write("window.__messagesData = " + json.dumps(entries, indent=2) + ";\n")
        f.write("\n")

    default_count = sum(1 for e in entries if e.get("isDefault"))
    real_count = len(entries) - default_count
    print(f"  [OK] Exported {real_count} message(s) + {default_count} default(s) to {OUT_PATH}")


if __name__ == "__main__":
    main()
