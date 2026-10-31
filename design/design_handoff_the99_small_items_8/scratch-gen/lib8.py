"""Small items 8 (account 2, 2026-10-31): shared helpers. Boards are lifted from the shipped handoff boards on main
(design/design_handoff_the99_*), each one over its own source's styles, then changed where the item needs it."""
import re, os
D = os.environ.get("DESIGN", "/home/user/the-99/design")


def load(rel):
    return open(f"{D}/{rel}").read()


def helmet(s):
    return s[s.find('<helmet>') + 8:s.find('</helmet>')]


def block(s, start, tag="div"):
    d = 0
    for m in re.finditer(r'<(/?)%s\b' % tag, s[start:]):
        d += -1 if m.group(1) else 1
        if d == 0:
            return s[start:s.find('>', start + m.start()) + 1]
    raise ValueError("unbalanced")


def frame_by_label(s, needle):
    """The `<div class="fr">` holding a label that contains `needle`."""
    i = s.find(needle)
    assert i >= 0, needle
    j = s.rfind('<div class="fr"', 0, i)
    return block(s, j)


def inner(div):
    """A div's contents without its own tags."""
    return div[div.find('>') + 1:-6]


def sub1(s, old, new):
    assert old in s, old[:120]
    return s.replace(old, new, 1)


def head(kick, title, lede, tag="R1"):
    return (f'<div class="bh"><div class="kick"><span class="tag">{tag}</span>{kick}</div><h2>{title}</h2>'
            f'<p>{lede}</p></div>')


def fr(lab, inner_html, cap="", style=""):
    c = f'<p class="cap">{cap}</p>' if cap else ""
    return f'<div class="fr"{style}><div class="lab">{lab}</div>{inner_html}{c}</div>'


def rule(h, items):
    lis = "".join(f"<li>{x}</li>" for x in items)
    return f'<div class="rule8"><h4>{h}</h4><ol>{lis}</ol></div>'


RULE_CSS = """<style>
.rule8{border:1px solid var(--border-strong);border-radius:12px;background:var(--surface);padding:20px 24px;max-width:1240px}
.rule8 h4{margin:0 0 10px;font:600 15px 'IBM Plex Sans';color:var(--fg)}
.rule8 ol{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px;font-size:13.5px;line-height:1.55;color:var(--fg-body)}
.rule8 b{color:var(--fg)}
.rule8 code{font:12px 'IBM Plex Mono';color:var(--fg-muted)}
.draft8{font:600 9px 'IBM Plex Mono';letter-spacing:.06em;color:#0D0B09;background:#8FA6BE;border-radius:3px;padding:1px 5px;margin-left:6px;vertical-align:2px}
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
<helmet>{helm}{RULE_CSS}</helmet>
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
