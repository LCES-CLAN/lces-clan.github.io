#!/usr/bin/env python3
"""
Video Scanner — auto-discovers video folders & files in assets/videos/.

Usage:
    python scripts/scan_videos.py              Scan & generate everything
    python scripts/scan_videos.py --dry        Preview without writing
    python scripts/scan_videos.py --force      Regenerate existing index.json too

What it does:
    1. Scans every subfolder under assets/videos/
    2. Finds video files (.mp4, .webm, .ogg, .mov)
    3. Generates index.json for any folder that lacks one
    4. Updates media.html's window.__mediaCategories to include all folders

Just drag-drop folders and video files, then run this script. No JSON editing required.
"""

import json
import os
import re
import sys

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_DIR = os.path.dirname(_SCRIPT_DIR)  # Project root
_VIDEOS_DIR = os.path.join(_PROJECT_DIR, 'assets', 'videos')
_MEDIA_HTML = os.path.join(_PROJECT_DIR, 'media.html')

# Force UTF-8 output on all platforms (fixes cp1252 issues on Windows)
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
elif hasattr(sys.stdout, 'buffer'):
    # Python < 3.7 fallback
    sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', closefd=False)

# Recognised video file extensions
VIDEO_EXTENSIONS = {'.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'}


# ─── Helpers ────────────────────────────────────────────────────────

def fmt(s):
    return f"\033[1m{s}\033[0m"


def get_folder_title(folder_name):
    """Convert a folder name into a readable display title."""
    t = folder_name.replace('-', ' ').replace('_', ' ').strip()
    # Capitalise each word
    return ' '.join(w[0].upper() + w[1:] for w in t.split() if w)


def scan_video_folders():
    """Scan assets/videos/ and return a list of folder-info dicts."""
    if not os.path.isdir(_VIDEOS_DIR):
        print(f"  [!] Directory not found: {_VIDEOS_DIR}")
        return []

    folders = []
    for entry in sorted(os.listdir(_VIDEOS_DIR)):
        fpath = os.path.join(_VIDEOS_DIR, entry)
        if not os.path.isdir(fpath):
            continue

        has_json = os.path.isfile(os.path.join(fpath, 'index.json'))

        # Gather video files (skip index.json itself)
        video_files = []
        for f in sorted(os.listdir(fpath)):
            if f == 'index.json':
                continue
            ext = os.path.splitext(f)[1].lower()
            if ext in VIDEO_EXTENSIONS:
                video_files.append(f)

        folders.append({
            'folder': entry,
            'title': get_folder_title(entry),
            'video_files': video_files,
            'has_json': has_json,
        })
    return folders


def generate_index_json(fi, dry_run=False, force=False):
    """Generate index.json for a folder that has no index.json yet.

    Returns True if a file was (or would be) written.
    """
    if fi['has_json'] and not force:
        return False
    if not fi['video_files']:
        return False

    videos = []
    for fn in fi['video_files']:
        name_no_ext = os.path.splitext(fn)[0]
        videos.append({
            'title': name_no_ext,
            'source': 'local',
            'localPath': f'assets/videos/{fi["folder"]}/{fn}',
        })

    data = {'title': fi['title'], 'videos': videos}

    if dry_run:
        names = [v['title'] for v in videos]
        print(f"  [~] Would generate: {fi['folder']}/index.json  ({len(videos)} video(s): {', '.join(names)})")
        return True

    dst = os.path.join(_VIDEOS_DIR, fi['folder'], 'index.json')
    with open(dst, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
        f.write('\n')
    print(f"  [OK] Generated {fi['folder']}/index.json  ({len(videos)} video(s))")
    return True


# ─── media.html update ──────────────────────────────────────────────

def extract_categories_from_html(html):
    """Parse the existing window.__mediaCategories array from media.html.

    Returns a list of category dicts, or an empty list if not found.
    """
    # Find the opening [ after window.__mediaCategories
    idx = html.find('window.__mediaCategories')
    if idx == -1:
        return [], idx
    brace = html.find('[', idx)
    if brace == -1:
        return [], idx

    # Walk balanced brackets so we capture the whole array literal
    depth = 0
    end = brace
    for i in range(brace, len(html)):
        ch = html[i]
        if ch == '[':
            depth += 1
        elif ch == ']':
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    if depth != 0:
        return [], idx  # unbalanced – bail

    raw = html[brace:end]

    # Strip JavaScript comments and trailing commas so json.loads can cope
    cleaned = re.sub(r'//[^\n]*', '', raw)
    cleaned = re.sub(r',\s*([\]}])', r'\1', cleaned)

    try:
        cats = json.loads(cleaned)
        if isinstance(cats, list):
            return cats, idx
        return [], idx
    except json.JSONDecodeError:
        return [], idx


def build_updated_categories(existing_cats, discovered_folders):
    """Merge discovered folder names into the existing category list.

    Existing entries are kept as-is (preserving custom config like title, files).
    New folders are appended as simple {"folder": name} entries.
    """
    result = list(existing_cats)
    seen = {c['folder'] for c in existing_cats if 'folder' in c}

    added = 0
    for fi in discovered_folders:
        if fi['folder'] not in seen:
            result.append({'folder': fi['folder']})
            seen.add(fi['folder'])
            added += 1
    return result, added


def render_categories_js(cats):
    """Turn a list of category dicts into the JavaScript array literal."""
    lines = ['    window.__mediaCategories = [']
    for i, c in enumerate(cats):
        # Simple serialisation: only serialise folder for plain entries
        # to keep the output clean. Custom keys (title, files) are preserved.
        comma = ',' if i < len(cats) - 1 else ''
        lines.append(f'      {json.dumps(c, indent=None)}{comma}')
    lines.append('    ];')
    return '\n'.join(lines)


def update_media_html(discovered_folders, dry_run=False):
    """Patch the window.__mediaCategories block inside media.html."""
    if not os.path.isfile(_MEDIA_HTML):
        print(f"  [!] media.html not found at {_MEDIA_HTML}")
        return False

    with open(_MEDIA_HTML, 'r', encoding='utf-8') as f:
        html = f.read()

    existing_cats, anchor = extract_categories_from_html(html)
    if anchor == -1:
        print(f"  [!] Could not find window.__mediaCategories in media.html")
        return False

    print(f"  Found {len(existing_cats)} existing category(ies) in media.html")

    new_cats, added = build_updated_categories(existing_cats, discovered_folders)
    new_block = render_categories_js(new_cats)

    # Replace the old window.__mediaCategories = [...] line(s)
    # Find the end of the statement (the ; that closes the assignment)
    stmt_start = html.rfind('window.__mediaCategories', 0, anchor)
    if stmt_start == -1:
        stmt_start = anchor  # fallback
    stmt_end = html.find(';', anchor)
    if stmt_end == -1:
        stmt_end = len(html)

    before = html[:stmt_start]
    after = html[stmt_end + 1:]

    new_html = before + new_block + after

    if added:
        print(f"  [+] Added {added} new folder(s) to media.html categories")

    if new_html == html:
        print(f"  [–] No changes to media.html")
        return True

    if dry_run:
        print(f"  [~] Would update media.html categories ({len(new_cats)} total)")
        return True

    with open(_MEDIA_HTML, 'w', encoding='utf-8') as f:
        f.write(new_html)
    print(f"  [OK] Updated media.html ({len(new_cats)} categories)")
    return True


# ─── Main ───────────────────────────────────────────────────────────

def main():
    dry_run = '--dry' in sys.argv or '--dry-run' in sys.argv
    force = '--force' in sys.argv

    sep = '─' * 50
    print(f"\n  {sep}")
    print(f"  {fmt('LCES Video Scanner')}")
    print(f"  {sep}")

    folders = scan_video_folders()
    if not folders:
        print(f"  No video folders found under {_VIDEOS_DIR}")
        print()
        return

    print(f"\n  Found {fmt(str(len(folders)))} folder(s):\n")

    any_gen = False
    missing_json = 0

    for fi in folders:
        status_icon = '✓' if fi['has_json'] else '·'
        n = len(fi['video_files'])
        if n:
            file_list = ', '.join(fi['video_files'])
            info = f"{n} file(s): {file_list}"
        else:
            info = 'empty'

        print(f"    {status_icon} {fi['folder']:<30} {info}")

        if not fi['has_json'] and fi['video_files']:
            missing_json += 1
            if generate_index_json(fi, dry_run, force):
                any_gen = True

    if force and not dry_run:
        # Regenerate existing ones too
        for fi in folders:
            if fi['has_json'] and fi['video_files']:
                if generate_index_json(fi, dry_run, force):
                    any_gen = True

    print()

    if missing_json or force:
        update_media_html(folders, dry_run)
        if force and not dry_run:
            print(f"  (--force: regenerated index.json even where one already existed)")
    else:
        print(f"  All folders already have index.json. Nothing to generate.")
        update_media_html(folders, dry_run)

    if dry_run:
        print(f"\n  {fmt('Dry run')} — no files written. Run without --dry to apply.\n")
    else:
        print(f"  {fmt('Done.')}\n")


if __name__ == '__main__':
    main()
