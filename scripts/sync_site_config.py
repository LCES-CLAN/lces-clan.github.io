#!/usr/bin/env python3
"""
Site config sync — bakes values from scripts/site-config.js into the static HTML.

`scripts/site-config.js` is the single source of truth for shared links (the
Discord invite). The runtime script fills those links in the browser, but the
HTML also keeps a real `href` on every `data-discord-link` anchor so the links
still work with JavaScript disabled. This script rewrites those hrefs from the
config so the two never drift apart.

Usage:
    python scripts/sync_site_config.py           Rewrite stale hrefs
    python scripts/sync_site_config.py --check   Exit 1 if any page is stale
"""

import re
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONFIG = ROOT / 'scripts' / 'site-config.js'

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')


def read_invite():
    """Pull the discordInvite value out of site-config.js."""
    text = CONFIG.read_text(encoding='utf-8')
    match = re.search(r"discordInvite\s*:\s*['\"]([^'\"]+)['\"]", text)
    if not match:
        sys.exit('  [!] Could not find discordInvite in ' + str(CONFIG))
    return match.group(1)


def stamp_href(tag, invite):
    """Return the <a> tag with its href pointed at the configured invite."""
    if re.search(r'\shref\s*=', tag):
        return re.sub(r'\shref\s*=\s*"[^"]*"', ' href="' + invite + '"', tag)
    return tag.replace('data-discord-link', 'data-discord-link href="' + invite + '"')


def main():
    check_only = '--check' in sys.argv
    invite = read_invite()
    stale = []

    for page in sorted(ROOT.glob('*.html')):
        html = page.read_text(encoding='utf-8')
        new_html = re.sub(
            r'<a\b[^>]*\bdata-discord-link\b[^>]*>',
            lambda m: stamp_href(m.group(0), invite),
            html,
        )
        if new_html == html:
            continue
        stale.append(page.name)
        if not check_only:
            page.write_text(new_html, encoding='utf-8')

    if check_only:
        if stale:
            print('  [!] Stale Discord hrefs in: ' + ', '.join(stale))
            print('      Run: python scripts/sync_site_config.py')
            sys.exit(1)
        print('  [OK] All pages match scripts/site-config.js')
        return

    if stale:
        for name in stale:
            print('  [OK] ' + name)
    else:
        print('  [–] All pages already match scripts/site-config.js')


if __name__ == '__main__':
    main()
