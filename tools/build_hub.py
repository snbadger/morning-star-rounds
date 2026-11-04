#!/usr/bin/env python3
"""Render the Staff Apps hub and the README App Registry from apps.json.

    python3 tools/build_hub.py          # writes index.html and README.md in the repo root
    python3 tools/build_hub.py --check  # exit 1 if either file is out of date

apps.json is the single registry: each app has an optional `tile` (hub tile) and an optional
`registry` row (README table). Tiles with "more": true fold into "More tools" on shared iPads.
"""
import json, pathlib, sys, html

ROOT = pathlib.Path(__file__).resolve().parent.parent
REG = json.loads((ROOT / 'apps.json').read_text())
TEMPLATE = (ROOT / 'tools' / 'hub.template.html').read_text()
README_START, README_END = '<!-- REGISTRY:START (generated from apps.json by tools/build_hub.py) -->', '<!-- REGISTRY:END -->'


def tile_html(a, indent='      '):
    t = a['tile']
    attrs = [f'class="tile{" leader" if t["group"] in ("leader", "hr") else ""}"', f'href="{t["href"]}"', f'data-id="{a["id"]}"', f'data-group="{t["group"]}"']
    if t.get('tile_id'): attrs.append(f'id="{t["tile_id"]}"')
    if t.get('onclick'): attrs.append(f'onclick="{t["onclick"]}"')
    if t.get('more'): attrs.append('data-more')
    badge = f'<span class="tbadge" id="{t["badge"]}"></span>' if t.get('badge') else ''
    return (f'{indent}<a {" ".join(attrs)}><span class="tile-icon"><i data-lucide="{t["icon"]}"></i><span class="fb">{t["fb"]}</span></span>'
            f'<span class="name">{t["name"]}</span><span class="desc">{t["desc"]}</span>{badge}</a>')


def build_index():
    tiles = {}
    for a in REG['apps']:
        if 'tile' in a: tiles.setdefault(a['tile']['group'], []).append(a)
    groups = []
    for g in REG['groups']:
        if g.get('gate'): continue
        body = '\n'.join(tile_html(a) for a in tiles.get(g['id'], []))
        groups.append(f'    <section class="section" data-group="{g["id"]}">\n'
                      f'      <div class="section-title">{html.escape(g["title"])}</div>\n'
                      f'      <div class="grid cols-3">\n{body}\n      </div>\n    </section>')
    out = (TEMPLATE.replace('{{GROUPS}}', '\n\n'.join(groups))
                   .replace('{{LEADER_TILES}}', '\n'.join(tile_html(a) for a in tiles.get('leader', [])))
                   .replace('{{HR_TILES}}', '\n'.join(tile_html(a) for a in tiles.get('hr', []))))
    assert '{{' not in out
    return out


def build_readme(current):
    rows = ['| App | URL | Audience | Data | Status |', '|-----|-----|----------|------|--------|']
    for a in REG['apps']:
        r = a.get('registry')
        if r: rows.append(f'| {r["app"]} | {r["url"]} | {r["audience"]} | {r["data"]} | {r["status"]} |')
    block = README_START + '\n' + '\n'.join(rows) + '\n' + README_END
    if README_START in current:
        i = current.index(README_START); j = current.index(README_END) + len(README_END)
        return current[:i] + block + current[j:]
    # first run: replace the hand-maintained table under "## App Registry"
    lines = current.split('\n')
    h = next(i for i, l in enumerate(lines) if l.startswith('## App Registry'))
    s = next(i for i in range(h, len(lines)) if lines[i].startswith('| App '))
    e = s
    while e < len(lines) and lines[e].startswith('|'): e += 1
    return '\n'.join(lines[:s] + [block] + lines[e:])


if __name__ == '__main__':
    check = '--check' in sys.argv
    targets = {ROOT / 'index.html': build_index(), ROOT / 'README.md': build_readme((ROOT / 'README.md').read_text())}
    stale = [p.name for p, txt in targets.items() if not p.exists() or p.read_text() != txt]
    if check:
        print('out of date: ' + ', '.join(stale) if stale else 'up to date'); sys.exit(1 if stale else 0)
    for p, txt in targets.items(): p.write_text(txt)
    print('wrote', ', '.join(p.name for p in targets))
