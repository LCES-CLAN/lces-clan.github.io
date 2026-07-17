#!/usr/bin/env python3
"""
Video Scanner — auto-discovers video folders & files in assets/videos/.

Usage:
    python scripts/scan_videos.py         Scan & generate everything

What it does:
    1. Scans every subfolder under assets/videos/
    2. Finds video files (.mp4, .webm, .ogg, .mov)
    3. Generates index.json for any folder that lacks one
    4. Updates media.html's window.__mediaCategories to include all folders

Just drag-drop folders and video files, then run this script. No JSON editing required.

If you want to customise a category (YouTube videos, playlists, custom titles),
just create an assets/videos/<folder>/index.json manually — the script won't touch it.
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
    sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', closefd=False)

# Recognised video file extensions
VIDEO_EXTENSIONS = {'.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'}


# ─── Helpers ────────────────────────────────────────────────────────

def fmt(s):
    return f"\033[1m{s}\033[0m"


def get_folder_title(folder_name):
    """Convert a folder name into a readable display title.

    Strips optional numbering prefix like [1], [2] etc.
    """
    t = folder_name.replace('-', ' ').replace('_', ' ').strip()
    # Remove [N] or [N] prefix for cleaner titles
    t = re.sub(r'^\[\d+\]\s*', '', t)
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


def generate_index_json(fi, dry_run=False):
    """Generate index.json for a folder that has no index.json yet.

    Skips folders that already have an index.json (preserves manual overrides
    with YouTube videos, playlists, custom titles, etc.).
    Returns True if a file was (or would be) written.
    """
    if fi['has_json']:
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

def extract_script_block(html):
    """Find the <script> block containing window.__mediaCategories.

    Returns (script_content, start_index, end_index) or None.
    start/end point to the entire opening/closing <script> tags.
    """
    marker = 'window.__mediaCategories'
    idx = html.find(marker)
    if idx == -1:
        return None

    # Walk backwards to find the opening <script>
    start = html.rfind('<script', 0, idx)
    if start == -1:
        return None

    # Walk forwards to find the closing </script>
    end = html.find('</script>', idx)
    if end == -1:
        return None
    end += len('</script>')

    return html[start:end], start, end


def render_categories_js(cats):
    """Turn a list of category dicts into a JS array literal (indented to match style)."""
    lines = ['    window.__mediaCategories = [']
    for i, c in enumerate(cats):
        comma = ',' if i < len(cats) - 1 else ''
        # Pretty-print with spaces for readability
        items = []
        for k, v in c.items():
            items.append(f'"{k}": {json.dumps(v)}')
        inner = ', '.join(items)
        lines.append(f'      {{ {inner} }}{comma}')
    lines.append('    ];')
    return '\n'.join(lines)


def update_media_html(discovered_folders, dry_run=False):
    """Patch the window.__mediaCategories script block inside media.html."""
    if not os.path.isfile(_MEDIA_HTML):
        print(f"  [!] media.html not found at {_MEDIA_HTML}")
        return False

    with open(_MEDIA_HTML, 'r', encoding='utf-8') as f:
        html = f.read()

    block = extract_script_block(html)
    if not block:
        print(f"  [!] Could not find window.__mediaCategories <script> block in media.html")
        return False

    script_content, script_start, script_end = block

    # Replace categories entirely with what's on disk
    print(f"  Found {len(discovered_folders)} folder(s) on disk")

    new_cats = [
        {'folder': fi['folder'], 'title': fi['title']}
        for fi in discovered_folders
    ]
    new_script_content = render_categories_js(new_cats)

    # Preserve indentation by matching the original script's leading whitespace
    orig_lines = script_content.split('\n')
    base_indent = ''
    for line in orig_lines:
        stripped = line.strip()
        if stripped and not stripped.startswith('//') and 'window.__mediaCategories' not in stripped:
            base_indent = line[:len(line) - len(line.lstrip())]
            break
    if not base_indent:
        base_indent = '  '  # fallback

    # Indent the new content to match
    new_indented = '\n'.join(
        (base_indent + line) if line.strip() else line
        for line in new_script_content.split('\n')
    )

    # Preserve the original indentation before the <script> tag
    line_start = html.rfind('\n', 0, script_start)
    tag_indent = html[line_start + 1:script_start] if line_start != -1 else ''

    new_html = html[:script_start] + tag_indent + '<script>\n' + new_indented + '\n' + tag_indent + '</script>' + html[script_end:]

    if new_html == html:
        print(f"  [\u2013] No changes to media.html")
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

    sep = '\u2500' * 50
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
        status_icon = '\u2713' if fi['has_json'] else '\u00b7'
        n = len(fi['video_files'])
        if n:
            file_list = ', '.join(fi['video_files'])
            info = f"{n} file(s): {file_list}"
        else:
            info = 'empty'

        print(f"    {status_icon} {fi['folder']:<30} {info}")

        if not fi['has_json'] and fi['video_files']:
            missing_json += 1
            if generate_index_json(fi, dry_run):
                any_gen = True

    print()

    if missing_json:
        update_media_html(folders, dry_run)
    else:
        print(f"  All folders already have index.json. Nothing to generate.")

        # Still update media.html in case new folders appeared without videos
        update_media_html(folders, dry_run)

    if dry_run:
        print(f"\n  {fmt('Dry run')} \u2014 no files written. Run without --dry to apply.\n")
    else:
        print(f"  {fmt('Done.')}\n")


if __name__ == '__main__':
    main()
