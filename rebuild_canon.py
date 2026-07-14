#!/usr/bin/env python3
"""
Rebuild roster.json from the canon LCES unit list.

The canon list (from the user) is authoritative for which gamertag
belongs at which badge number. Existing statuses and display names
are preserved by matching gamertag.

Usage: python rebuild_canon.py
"""

import json
import os
import sys

DATA_FILE = "roster.json"

# ─── Canon mapping: badge -> gamertag ───────────────────────────────
# Parsed from the user's canon list. RESERVED = slot is intentionally
# empty. The gamertag is the "official" owner of that badge.
CANON = {
    1: "NC Sheriff",
    2: "huskerguy7",
    3: "stevenkb6720",
    4: "CALIKILLER33",
    5: "Chad4887",
    6: "RESERVED",
    7: "Berget13",
    8: "RESERVED",
    9: "JJMON100",
    10: "DrGreenthumb49",
    11: "RESERVED",
    12: "RESERVED",
    13: "Kill2thrill0",
    14: "Melodik",
    15: "RESERVED",
    16: "JonnyAndrews",
    17: "PTY997",
    18: "Naytt",
    19: "Tepus Mori",
    20: "Brynley",
    21: "Ewest",
    22: "ChevyRacing88",
    23: "GTS6",
    24: "AlphaSierra172",
    25: "REAPER MC",
    26: "Cpt Reynolds SC",
    27: "Reap the Ghost",
    28: "DeathBringer93",
    29: "lonesoldier12",
    30: "Starbug",
    31: "skrilla93",
    32: "pow3rhous3",
    33: "DevenOB",
    34: "Stevo123abc",
    35: "scaledwag",
    36: "ll Carroll ll",
    37: "CowboyD Eng6ine",
    38: "V Taylor V",
    39: "tomster2807",
    40: "adirtyhobo",
    41: "crasha9",
    42: "burtoni uk",
    43: "DrewCephus",
    44: "downmaster",
    45: "Anditek",
    46: "kgp1191",
    47: "Killa0611",
    48: "Born A Sniper",
    49: "infamousdirt",
    50: "Guyana503Official",
    51: "Prerecordedlive",
    52: "Homeless Box",
    53: "Alkal1neTri0",
    54: "STRYKER397",
    55: "darkmotive",
    56: "Mr. Slappy",
    57: "Bob123",
    58: "redwards",
    59: "Young Gangstars",
    60: "Von Schmitt",
    61: "FDMT18",
    62: "police182",
    63: "l33t 0wn3r",
    64: "Kfperin",
    65: "Serimos6",
    66: "johnnygta4",
    67: "lockxxheed",
    68: "FeArLeS InFern0",
    # 69 is SKIPPED in canon (68 -> 70)
    69: "RESERVED",
    70: "halo12master",
    71: "Yankees2122",
    72: "BBF15",
    73: "Low Rent9",
    74: "R0CKSTAR3N3RGY",
    75: "Lance1031",
    76: "Hawk0251",
    77: "Delta Roughneks",
    78: "Firemike47",
    79: "HAZARDtehFrea",
    80: "dukheddd",
    81: "Deblo",
    82: "jaycat",
    83: "didikong420",
    84: "budatoker 305",
    85: "PLASMASTORM",
    86: "hoffasgrave",
    87: "GreekStallion",
    88: "Viperfella",
    89: "MR FMM GENERAL",
    90: "BLAZ3D 863",
    91: "x O Ramirez x",
    92: "o4wheelerd",
    93: "FMMGENERAL",
    94: "MontrealFan94",
    95: "dave1208",
    96: "oRAWLIKESTEAKo",
    97: "Quietchaos2",
    98: "Officer Joey 016",
    99: "Rondel Jonathan",
    100: "darza310",
    101: "reaper0322",
    102: "xlair",
    103: "alexbeast5226",
    104: "RESERVED",
    105: "DUT00",
    106: "x iSniped x",
    107: "XxVinny13",
    108: "Pyro1145",
    109: "A-Rod",
    110: "USmarshal505",
    111: "iSank",
    112: "Youngster809",
    113: "Ed251191",
    114: "dallashero421",
    115: "cheesemonkyman",
    116: "XxB ROD116xX",
    117: "iMurder Scrubs",
    118: "SoulSniper",
    119: "MR.PALOS",
    120: "carver60",
    121: "delta echo",
    122: "Vanillaohman44",
    123: "apollosky",
    124: "The Jackel 1739",
    125: "plumpinator",
    126: "GDN smp91",
    127: "Scheffy1777",
    128: "Officer Tischler",
    129: "GMR2GMR",
    130: "lbj2372",
    131: "DirtyHarry",
    132: "Aqua Swede",
    133: "zipperman",
    134: "ziggy",
    135: "Peter Boii",
    136: "Dudrick",
    137: "NYPD12293",
    138: "XxBrAdMaN94xX",
    139: "WPPD 13",
    140: "pieterXBoss",
    141: "cavs4life776",
    142: "bobasarus7",
    143: "Honorordeath999",
    144: "Aim2Gain",
    145: "callumv/xSXYBRITx",
    146: "VoltaicYapper",
    147: "Gixxerlover1",
    148: "juliankern",
    149: "Beon 911",
    150: "PVfirefighter38",
    151: "PoliceExplorer9",
    152: "firecop41617/iceman61741",
    153: "longhorn400",
    154: "C H I2 iii S x",
    155: "liftoff",
    156: "caspa156",
    157: "cbassmiami",
    158: "skiledkilla117",
    159: "Xtromist",
    160: "Maurice el jefe",
    161: "DsL Quality",
    162: "ACanadianDude",
    163: "GONZOAB/iCory Gunz",
    164: "mitchell1621",
    165: "NullLimitless",
    166: "xWel5hA55a55inx",
    167: "Original Fusion",
    168: "xRIPx Chief",
    169: "Nah goo yen",
    170: "daveted788",
    171: "APDExplorer10",
    172: "JJ306",
    173: "Royale Bond 007",
    174: "zan2000",
    175: "Jesse JK Kraft",
    176: "RollinPCH",
    177: "N2L Fatality",
    178: "Boboape9966",
    179: "matty92ace",
    180: "DGowns",
    181: "VR9497",
    182: "UGC Sure Shot",
    183: "ITZ ROGUESTATUS",
    184: "TheoxyCrash95",
    185: "Hel Destruction",
    186: "HBR x BlitZz",
    187: "slickspencer8",
    188: "ThaSituation188",
    189: "Schonely88",
    190: "NiteFlash91",
    191: "marshmallowbomb",
    192: "Jake232",
    193: "SnoopShady420",
    194: "racer0940",
    195: "Emoney562",
    196: "BGowns",
    197: "fishforlife2468",
    198: "Spoonz_Elite",
    199: "UnitX22",
    200: "oooHAYABUSAooo",
    201: "Negative Risk",
    202: "XX86SNIPE86XX",
    203: "Dinozzo x187x",
    204: "killarob917",
    205: "ASOC xGENERALx",
    206: "Officer Adam",
    207: "Patrick1237",
    208: "munoz 001",
    209: "SRidgeway3",
    210: "Misslemoose",
    211: "wwiifanatic28",
    212: "desert eagle158",
    213: "x THE GREASER x",
    214: "Jo3yDud3x23",
    215: "MAGMUHH",
    216: "xUSMC SSGTx",
    217: "Capt Daisy",
    218: "vVJeSUSFrEaKVv",
    219: "JPM007",
    220: "MHTBravo",
    221: "LoganB613",
    222: "xXManATeeXx",
    223: "Bronz186",
    224: "BLUEelmoZZZZZ",
    225: "Pure VVebbster",
    226: "x SteaD",
    227: "The Boss3185",
    228: "TF 141 Stephen",
    229: "NSJ bped",
    230: "Pwnisher James",
    231: "Frostman100",
    232: "TyBacca20",
    233: "Chazzy B",
    234: "BACKDRAFT 5163",
    235: "Manny Year13",
    236: "RESERVED",    # "Reserved for Recruit"
    237: "x ToXiC x ReCoN",
    238: "RESERVED",    # empty slot
    239: "SupaWhiteyMan",
    240: "Tryhard Enigma",
    241: "Combat Carlton",
    242: "NotAHeroBassist",
    243: "Dilated420",
    244: "PietThePenguin",
    245: "Byzantine95",
    246: "JSFxDovahkiin",
    247: "RESERVED",
    248: "Bks05",
    249: "ScramblesRSG",
    250: "Devil Dogs101",
    251: "groom112",
    252: "FaTaLiTy FlAmE",
    253: "Chrome Cracker",
    # 254-260 retired/grey — empty slots, status pending
    254: "RESERVED",
    255: "RESERVED",
    256: "RESERVED",
    257: "RESERVED",
    258: "RESERVED",
    259: "RESERVED",
    260: "RESERVED",
}


def censor_display(gamertag, keep_front=3, keep_back=2):
    """Censor middle characters, matching roster.py behavior."""
    if 'reserved' in gamertag.lower():
        return gamertag
    if len(gamertag) <= keep_front + keep_back + 1:
        return gamertag[:keep_front] + "*" * (len(gamertag) - keep_front)
    mid = len(gamertag) - keep_front - keep_back
    return gamertag[:keep_front] + "*" * mid + gamertag[-keep_back:]


def load_existing():
    """Load existing roster.json, return dict of badge -> entry."""
    if not os.path.exists(DATA_FILE):
        print(f"  [!] {DATA_FILE} not found.")
        return {}
    with open(DATA_FILE, "r") as f:
        data = json.load(f)
    return {e["badge"]: e for e in data}


def build_roster(existing):
    """
    Build the corrected roster from the canon mapping.
    
    For each canon badge:
      - Look up the entry in existing by matching gamertag
      - If found, preserve its display and status
      - If not found (new gamertag), generate display via censor function
      - For RESERVED entries, use display="RESERVED", status="pending"
    """
    # Build reverse lookup: gamertag -> entry (from existing roster)
    gt_to_entry = {}
    for e in existing.values():
        gt = e["gamertag"]
        if gt not in gt_to_entry:
            gt_to_entry[gt] = e

    roster = []
    for badge in sorted(CANON.keys()):
        canon_gt = CANON[badge]

        if canon_gt == "RESERVED":
            # Canon says this slot is reserved/empty
            entry = {
                "badge": badge,
                "gamertag": "RESERVED",
                "display": "RESERVED",
                "status": "pending"
            }
        else:
            # Look up in existing roster by gamertag match
            existing_entry = gt_to_entry.get(canon_gt)
            if existing_entry:
                entry = {
                    "badge": badge,
                    "gamertag": canon_gt,
                    "display": existing_entry["display"],
                    "status": existing_entry["status"]
                }
            else:
                # New gamertag not in existing roster — generate display
                entry = {
                    "badge": badge,
                    "gamertag": canon_gt,
                    "display": censor_display(canon_gt),
                    "status": "pending"
                }

        roster.append(entry)

    return roster


def main():
    existing_by_badge = load_existing()
    print(f"  [OK] Loaded {len(existing_by_badge)} existing entries from {DATA_FILE}")

    roster = build_roster(existing_by_badge)
    print(f"  [OK] Built {len(roster)} entries from canon list (badges 1–260)")

    # Sort by badge for clean output
    roster.sort(key=lambda e: e["badge"])

    # Save
    with open(DATA_FILE, "w") as f:
        json.dump(roster, f, indent=2)
        f.write("\n")

    print(f"  [OK] Saved {len(roster)} entries to {DATA_FILE}")
    print(f"  Badge range: {roster[0]['badge']} – {roster[-1]['badge']}")

    # Summary of changes
    old_badges = set(existing_by_badge.keys())
    new_badges = set(e["badge"] for e in roster)

    added = new_badges - old_badges
    removed = old_badges - new_badges
    if added:
        print(f"  [ADD] Badges added: {sorted(added)}")
    if removed:
        print(f"  [DEL] Badges removed: {sorted(removed)}")

    # Show changes where gamertag moved
    moves = 0
    for b in sorted(old_badges & new_badges):
        old = existing_by_badge[b]
        new = next(e for e in roster if e["badge"] == b)
        if old["gamertag"] != new["gamertag"]:
            moves += 1
            if moves <= 20:
                print(f"  [MOV] Badge {b:03d}: '{old['gamertag']}' -> '{new['gamertag']}'")
    if moves > 20:
        print(f"  [MOV] ... and {moves - 20} more badge changes")


if __name__ == "__main__":
    main()
