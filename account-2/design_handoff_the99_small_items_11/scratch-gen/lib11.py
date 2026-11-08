"""Small items 11 (account 2, 2026-11-08): shared helpers. Each board takes the helmet of ONE shipped handoff board
(its own CSS, so every drawn piece is the shipped drawing) plus lib10's board chrome (fr9 frames, labels, captions).
New pieces carry the dashed copper outline (.new9)."""
import os, re
from lib10 import head, fr, frames, sec, rule, DRAFT, FONTS, CHROME, helmet
D = os.environ.get("DESIGN", "/home/user/the-99/design")


def src(rel):
    return open(f"{D}/{rel}").read()


def src_helmet(rel):
    h = helmet(src(rel))
    # drop the source's font link: CHROME's FONTS carries the same three families
    return re.sub(r'<link[^>]*fonts.googleapis[^>]*>', '', h)


EXTRA = """<style>
.board .frames9{align-items:flex-start}
.board .fr9>.cap9{max-width:none}
.board .ann{font:600 9.5px 'IBM Plex Mono',monospace;letter-spacing:.06em;color:#0D0B09;background:#8FA6BE;border-radius:3px;padding:1px 6px;white-space:nowrap}
.board .pin{position:absolute;z-index:80;font:600 9.5px 'IBM Plex Mono',monospace;letter-spacing:.06em;color:#0D0B09;background:#8FA6BE;border-radius:3px;padding:2px 6px;white-space:nowrap;pointer-events:none}
.board .both{box-shadow:0 0 0 1.5px #8FA6BE !important}
.board .callout{border:1px solid var(--border-strong);border-radius:12px;background:#15120F;padding:16px 20px;font-size:13px;line-height:1.6;color:var(--fg-body);max-width:1240px}
.board .callout b{color:var(--fg)}
.board .callout ul{margin:6px 0 0;padding-left:18px}.board .callout li{margin:3px 0}
</style>"""


def doc(title, helm, body, width, height=1000):
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>{FONTS}{helm}{CHROME}{EXTRA}</helmet>
<div class="board" style="width:{width}px">{body}</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{width},"height":{height}}}}}'>
class Component extends DCLogic {{
renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
"""


def callout(html):
    return f'<div class="callout">{html}</div>'


# ---- shared deck-page pieces (Pass Sheet board's classes) ---------------------------------------------------------
WM = ('<div class="mhd"><div class="wm"><span class="the">THE</span><span class="mk"><span class="dia"><i></i><i></i><i></i></span>'
      '<span class="nn">99</span></span></div><span class="av">HH</span></div>')
RAIL_ICONS = ['<path d="M3 11l9-7 9 7v9H3z"/>', '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
              '<path d="M3 18l3-10 6 5 6-5 3 10z"/>', '<path d="M12 3l9 9-9 9-9-9z"/>', '<path d="M7 3h10v18H7z"/>']


def rail(on=4):
    s = '<div class="rail"><div class="lg"><span class="dia"><i></i><i></i><i></i></span>99</div>'
    for i, p in enumerate(RAIL_ICONS):
        s += (f'<span class="sl{" on" if i == on else ""}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" '
              f'stroke="currentColor" stroke-width="1.8" aria-hidden="true">{p}</svg></span>')
    return s + '</div>'


PIP = {'W': 'var(--w)', 'U': 'var(--u)', 'B': 'var(--b)', 'R': 'var(--r)', 'G': 'var(--g)'}


def pips(cost):
    """'2UU' -> the row's mana marks: a grey number disc, then one pip per coloured symbol."""
    out = '<span style="display:inline-flex;gap:3px;align-items:center">'
    num = ''.join(ch for ch in cost if ch.isdigit())
    if num:
        out += f'<span class="mnum">{num}</span>'
    for ch in cost:
        if ch in PIP:
            out += f'<span class="mpip" style="background:{PIP[ch]}"></span>'
    return out + '</span>'


def crow(name, cost, owned=True, cls='', extra=''):
    return (f'<div class="crow {cls}"><span class="ow{"" if owned else " no"}"></span><span class="nb"><span class="nm">{name}</span>{extra}</span>'
            f'<span class="pt">{pips(cost)}</span><span class="x">✕</span></div>')


def drow(name, cost, owned=True, cls=''):
    """A desktop decklist row (.row in the 3-column .dgrp)."""
    return (f'<div class="row {cls}"><span class="ow{"" if owned else " no"}"></span><span class="nm">{name}</span>'
            f'{pips(cost)}<span class="x">✕</span></div>')
