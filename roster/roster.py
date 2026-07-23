#!/usr/bin/env python3
"""
Roster Manager — CLI tool for managing officers badge data (roster/roster.json)

Usage:
    python roster/roster.py list                             Show all badges
    python roster/roster.py add <gamertag> [--status s]      Add new entry (censored)
    python roster/roster.py bulk-import <file>               Import all gamertags from
                            [--reclaim 1,3,5]                a text file (one per line)
    python roster/roster.py reclaim <badge#> [--gamertag t]  Mark badge reclaimed
    python roster/roster.py edit <badge#> [--status s]       Change status or display
                            [--display d]
    python roster/roster.py delete <badge#>                  Remove a badge entry
    python roster/roster.py export                           Generate roster/roster-data.js (gamertags for active only)

Status values: active, mia, replied, detected

Examples:
    python roster/roster.py add "xX_LCES_0wn3r_Xx"
    python roster/roster.py bulk-import old_roster.txt --reclaim 1
    python roster/roster.py reclaim 1 --gamertag "xX_LCES_Own3r_Xx"
    python roster/roster.py edit 2 --display "LCES_***_2008" --status replied
    python roster/roster.py list
"""

import json
import sys
import os

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(_SCRIPT_DIR, "roster.json")

# ─── Helpers ────────────────────────────────────────────────────────

def load():
    if not os.path.exists(DATA_FILE):
        print(f"  [!] {DATA_FILE} not found — starting fresh.")
        return []
    try:
        with open(DATA_FILE, "r") as f:
            data = json.load(f)
        # Normalize legacy statuses
        for entry in data:
            if entry.get("status") == "reclaimed":
                entry["status"] = "active"
            if entry.get("status") == "pending":
                entry["status"] = "mia"
            if entry.get("status") == "tenfour":
                entry["status"] = "replied"
        return data
    except json.JSONDecodeError as e:
        print(f"  [X] Could not read {DATA_FILE}: {e}")
        print("      Fix the file or delete it to start fresh.")
        sys.exit(1)

def save(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    print(f"  [OK] Saved to {DATA_FILE}")

def next_badge(data):
    return max((e["badge"] for e in data), default=0) + 1

def find(data, badge_num):
    for e in data:
        if e["badge"] == badge_num:
            return e
    return None

def censor_display(gamertag, keep_front=3, keep_back=2):
    """Show first N and last N chars, censor the middle."""
    # Don't censor reserved entries
    if 'reserved' in gamertag.lower():
        return gamertag
    if len(gamertag) <= keep_front + keep_back + 1:
        return gamertag[:keep_front] + "█" * (len(gamertag) - keep_front)
    mid = len(gamertag) - keep_front - keep_back
    return gamertag[:keep_front] + "█" * mid + gamertag[-keep_back:]

def status_dot(status):
    dots = {"active": "\033[92m*\033[0m", "replied": "\033[94m*\033[0m", "detected": "\033[93m*\033[0m", "mia": "\033[94m*\033[0m"}
    return dots.get(status, "\033[90m*\033[0m")

def fmt(s):
    return f"\033[1m{s}\033[0m"

def pop_flags(args):
    """Separate --flag value pairs from positional arguments."""
    pos = []
    flags = {}
    i = 0
    while i < len(args):
        if args[i].startswith("--") and i + 1 < len(args) and not args[i + 1].startswith("--"):
            flags[args[i][2:]] = args[i + 1]
            i += 2
        else:
            pos.append(args[i])
            i += 1
    return pos, flags

# ─── Commands ───────────────────────────────────────────────────────

def cmd_list(args):
    data = load()
    if not data:
        print("  No badges in roster.")
        return
    print(f"\n  {fmt('Badge')}  {'Gamertag':<25} {'Status':<10}  Display")
    print(f"  {'-'*5}  {'-'*25} {'-'*10}  {'-'*30}")
    for e in sorted(data, key=lambda x: x["badge"]):
        d = e.get("display", e["gamertag"])
        styled = f"\033[2m{d}\033[0m" if "█" in d else f"\033[92m{d}\033[0m"
        print(f"  #{e['badge']:03d}    {e['gamertag']:<25} {status_dot(e['status'])} {e['status']:<7}  {styled}")
    active_count = sum(1 for e in data if e["status"] == "active")
    print(f"\n  {active_count} of {len(data)} badge(s) active\n")

def cmd_add(args):
    pos, flags = pop_flags(args)
    if not pos:
        print("  Usage: python roster/roster.py add <gamertag> [--status active|mia|replied|detected] [--display <text>]")
        return
    gamertag = pos[0]
    status = flags.get("status", "mia").lower()
    if status not in ("active", "mia", "replied", "detected"):
        print(f"  [!] Invalid status '{status}'. Use: active, mia, replied, detected")
        return
    display = flags.get("display")
    data = load()
    badge = next_badge(data)
    if display is None:
        display = gamertag if status == "active" else censor_display(gamertag)
    data.append({"badge": badge, "gamertag": gamertag, "display": display, "status": status})
    save(data)
    print(f"  [OK] Added #{badge:03d}: {gamertag} ({status})")

def cmd_reclaim(args):
    pos, flags = pop_flags(args)
    if not pos:
        print("  Usage: python roster/roster.py reclaim <badge#> [--gamertag <tag>]")
        return
    try:
        badge_num = int(pos[0])
    except ValueError:
        print(f"  [!] Invalid badge number: {pos[0]}")
        return
    data = load()
    entry = find(data, badge_num)
    if not entry:
        print(f"  [!] Badge #{badge_num:03d} not found.")
        return
    if "gamertag" in flags:
        entry["gamertag"] = flags["gamertag"]
    entry["display"] = entry["gamertag"]
    entry["status"] = "active"
    save(data)
    print(f"  [OK] Badge #{badge_num:03d} reclaimed as '{entry['gamertag']}'")

def cmd_edit(args):
    pos, flags = pop_flags(args)
    if not pos:
        print("  Usage: python roster/roster.py edit <badge#> [--status active|mia|replied|detected] [--display <text>]")
        return
    try:
        badge_num = int(pos[0])
    except ValueError:
        print(f"  [!] Invalid badge number: {pos[0]}")
        return
    data = load()
    entry = find(data, badge_num)
    if not entry:
        print(f"  [!] Badge #{badge_num:03d} not found.")
        return
    if "status" in flags:
        s = flags["status"].lower()
        if s in ("active", "mia", "replied", "detected"):
            entry["status"] = s
        else:
            print(f"  [!] Invalid status '{s}'")
            return
    if "display" in flags:
        entry["display"] = flags["display"]
    save(data)
    print(f"  [OK] Badge #{badge_num:03d} updated.")

def cmd_bulk_import(args):
    pos, flags = pop_flags(args)
    if not pos:
        print("  Usage: python roster/roster.py bulk-import <file> [--reclaim 1,3,5]")
        print("  File format: one gamertag per line. Lines starting with # are ignored.")
        return
    
    filepath = pos[0]
    if not os.path.exists(filepath):
        print(f"  [!] File not found: {filepath}")
        return
    
    # Parse which badge numbers to reclaim (comma-separated)
    reclaim_set = set()
    if "reclaim" in flags:
        try:
            reclaim_set = set(int(x.strip()) for x in flags["reclaim"].split(","))
        except ValueError:
            print("  [!] Invalid --reclaim format. Use comma-separated numbers, e.g. --reclaim 1,3,5")
            return
    
    # Read gamertags from file
    gamertags = []
    with open(filepath, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                gamertags.append(line)
    
    if not gamertags:
        print("  [!] No gamertags found in file.")
        return
    
    print(f"  Read {len(gamertags)} gamertag(s) from {filepath}")
    
    # Build new roster — start from scratch
    data = []
    for i, gt in enumerate(gamertags):
        badge_num = i + 1
        if badge_num in reclaim_set:
            entry = {"badge": badge_num, "gamertag": gt, "display": gt, "status": "active"}
        else:
            entry = {"badge": badge_num, "gamertag": gt, "display": censor_display(gt), "status": "mia"}
        data.append(entry)
    
    save(data)
    reclaimed = len(reclaim_set)
    censored = len(gamertags) - reclaimed
    print(f"  [OK] Imported {len(gamertags)} badge(s): {reclaimed} reclaimed, {censored} censored")

def cmd_export(args):
    """
    Generate roster/roster-data.js from roster/roster.json for public deployment.
    Only active officers include their full gamertag.
    """
    data = load()
    clean = []
    for entry in data:
        # Normalize legacy statuses
        status = entry["status"]
        if status == "reclaimed":
            status = "active"
        if status == "pending":
            status = "mia"
        if status == "tenfour":
            status = "replied"
        e = {
            "badge": entry["badge"],
            "display": entry["display"],
            "status": status
        }
        if status == "active":
            e["gamertag"] = entry["gamertag"]
        clean.append(e)
    out_path = os.path.join(_SCRIPT_DIR, "roster-data.js")
    with open(out_path, "w") as f:
        f.write("// LCES Roster Data — public snapshot (gamertag shown only for active officers)\n")
        f.write("// roster.json is the master file — NOT deployed to GitHub Pages.\n")
        f.write("// Regenerate this file with: python roster/roster.py export\n")
        f.write("window.__rosterData = " + json.dumps(clean, indent=2) + ";\n")
        f.write("\n")
    print(f"  [OK] Exported {len(clean)} entries to {out_path}")


def cmd_delete(args):
    pos, flags = pop_flags(args)
    if not pos:
        print("  Usage: python roster/roster.py delete <badge#>")
        return
    try:
        badge_num = int(pos[0])
    except ValueError:
        print(f"  [!] Invalid badge number: {pos[0]}")
        return
    data = load()
    entry = find(data, badge_num)
    if not entry:
        print(f"  [!] Badge #{badge_num:03d} not found.")
        return
    c = input(f"  Delete #{badge_num:03d} '{entry['gamertag']}'? (y/N): ").strip().lower()
    if c == "y":
        data = [e for e in data if e["badge"] != badge_num]
        save(data)
        print(f"  [OK] Badge #{badge_num:03d} deleted.")
    else:
        print("  Cancelled.")

# ─── Dispatch ───────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]
    if not args or args[0] in ("help", "--help", "-h"):
        print(__doc__)
        return
    cmd = args[0]
    cmd_args = args[1:]
    cmds = {"list": cmd_list, "add": cmd_add, "bulk-import": cmd_bulk_import, "reclaim": cmd_reclaim, "edit": cmd_edit, "export": cmd_export, "delete": cmd_delete}
    if cmd in cmds:
        cmds[cmd](cmd_args)
    else:
        print(f"  [!] Unknown command: {cmd}")
        print("  Run 'python roster/roster.py' for usage.")

if __name__ == "__main__":
    main()
