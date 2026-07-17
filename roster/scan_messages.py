#!/usr/bin/env python3
"""
Scan officer profile JSONs for non-empty message fields
and generate roster/messages-data.js for the live site.

Usage:
    python roster/scan_messages.py
"""

import json
import os
import glob

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROFILES_DIR = os.path.join(_SCRIPT_DIR, "profiles")
OUT_PATH = os.path.join(_SCRIPT_DIR, "messages-data.js")


def main():
    if not os.path.isdir(PROFILES_DIR):
        print(f"  [!] Profiles directory not found: {PROFILES_DIR}")
        return

    messages = {}
    files = sorted(glob.glob(os.path.join(PROFILES_DIR, "*.json")))

    for filepath in files:
        basename = os.path.basename(filepath)
        # Skip template / non-numeric files
        name = os.path.splitext(basename)[0]
        if not name.isdigit():
            continue

        try:
            with open(filepath, "r") as f:
                data = json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            print(f"  [!] Could not read {basename}: {e}")
            continue

        badge = int(name)  # badge is the filename (e.g., 063.json → 63)
        msg = data.get("message", "")
        if msg and msg.strip():
            messages[badge] = msg.strip()

    # Write messages-data.js
    with open(OUT_PATH, "w") as f:
        f.write("// LCES Officer Messages — auto-generated from roster/profiles/*.json\n")
        f.write("// Regenerate with: python roster/scan_messages.py\n")
        f.write("window.__messagesData = " + json.dumps(messages, indent=2) + ";\n")
        f.write("\n")

    print(f"  [OK] Exported {len(messages)} message(s) to {OUT_PATH}")


if __name__ == "__main__":
    main()
