#!/usr/bin/env python3
"""
Fix badge numbering issues in roster.json.

Problems found:
1. Badge 69 doesn't exist in canon (68→70), but roster.json has halo12master at 69
2. Canon Unit 238 is an empty slot, but roster.json has no entry for it
3. Missing entries for 254-260 (retired/grey slots)
"""
import json

DATA_FILE = "roster.json"

# Load roster.json
with open(DATA_FILE, "r") as f:
    data = json.load(f)

print(f"Loaded {len(data)} entries from {DATA_FILE}")

# Sort by badge
data.sort(key=lambda e: e["badge"])

# — Step 1: Find and remove badge 69 (extra entry — halo12master) —
# In canon: Unit 68 → Unit 70, no Unit 69
badge69 = [e for e in data if e["badge"] == 69]
if badge69:
    print(f"  [FIX] Removing badge 69: {badge69[0]['gamertag']} (doesn't exist in canon)")
    data = [e for e in data if e["badge"] != 69]
else:
    print("  [OK] Badge 69 not found — good")

# — Step 2: Insert missing entry for canon Unit 238 (empty slot) —
# Current entries sorted by badge (after removal):
data.sort(key=lambda e: e["badge"])

# Find the index where x ToXiC x ReCoN is and insert after it
for i, e in enumerate(data):
    if e["gamertag"] == "x ToXiC x ReCoN":
        insert_idx = i + 1
        # Check if the next entry is already SupaWhiteyMan (meaning the empty slot is missing)
        if insert_idx < len(data) and "SupaWhiteyMan" in data[insert_idx]["gamertag"]:
            print(f"  [FIX] Inserting empty entry for canon Unit 238 (after x ToXiC x ReCoN)")
            data.insert(insert_idx, {
                "badge": 0,  # will be renumbered
                "gamertag": "",
                "display": "",
                "status": "pending"
            })
        else:
            print("  [OK] Empty slot for canon 238 already exists — good")
        break

# — Step 3: Renumber all badges sequentially from 1 —
for i, e in enumerate(data):
    old_badge = e["badge"]
    e["badge"] = i + 1
    if old_badge != e["badge"]:
        print(f"  [REN] Entry #{old_badge} ({e['gamertag'][:20]:<20}) → badge {e['badge']}")

# — Step 4: Add empty entries for 254-260 (retired slots) —
# The canon list has Units 254-260 as empty/grey (retired)
current_max = max(e["badge"] for e in data) if data else 0
needed = range(current_max + 1, 261)  # up to 260
added = 0
for b in needed:
    data.append({
        "badge": b,
        "gamertag": "",
        "display": "",
        "status": "pending"
    })
    added += 1

if added:
    print(f"  [FIX] Added {added} empty entries for badges 254-260")

# — Save —
data.sort(key=lambda e: e["badge"])
with open(DATA_FILE, "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")

print(f"\n  [OK] Saved {len(data)} entries to {DATA_FILE}")
print(f"  Badge range: {data[0]['badge']} – {data[-1]['badge']}")
