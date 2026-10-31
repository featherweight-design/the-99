"""Rule 0 revisions (account 2, 2026-10-31): shared helpers. Boards lift frames from the shipped handoff boards on main
(design/design_handoff_the99_rule_zero, design_handoff_the99_menu_home), redrawn in the Low Sun theme the captures use,
with the shipped shell (tab bar and rail end on Friends, ? in the header)."""
import re, os
D = os.environ.get("DESIGN", "/home/user/the-99/design")
RZ = 'design_handoff_the99_rule_zero/'


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


def frame(s, needle):
    i = s.find(needle)
    assert i >= 0, needle
    j = s.rfind('<div class="fr"', 0, i)
    return block(s, j)


def first(s, start_pat, tag="div"):
    i = s.find(start_pat)
    assert i >= 0, start_pat
    return block(s, i, tag)


def sub1(s, old, new):
    assert old in s, old[:160]
    return s.replace(old, new, 1)


# Neon Rain (the account 1 boards) -> Low Sun (the captures and the account 2 Home boards).
THEME = [('#0E0F14', '#14110E'), ('#16181F', '#1E1A15'), ('#191B22', '#211D18'), ('#12141B', '#1A1611'), ('#101219', '#18140F'),
         ('#13151C', '#1B1712'), ('#20222A', '#29241F'), ('#181C26', '#2B241B'), ('#262A35', '#3A3229'), ('#343843', '#494037'),
         ('#E6E8F0', '#EDE6D8'), ('#B1B6C7', '#C0B8A6'), ('#959AAD', '#A59C89'), ('#6F7486', '#948B78'), ('#606476', '#6E6654'),
         ('#7D8294', '#8A8170'), ('#FF4D9A', '#CF8745'), ('rgba(255,77,154', 'rgba(207,135,69'), ('rgba(32,34,42', 'rgba(41,36,31'),
         ('rgba(14,15,20', 'rgba(20,17,14'), ('#0A0B0F', '#0D0B09'), ('#111319', '#17130F'), ('#E0913C', '#DEAA29')]


def retheme(s):
    for a, b in THEME:
        s = re.sub(re.escape(a), b, s, flags=re.I)
    s = s.replace("'Chakra Petch',sans-serif", "'Cinzel',serif").replace("'Chakra Petch'", "'Cinzel'")
    s = s.replace('family=Chakra+Petch:wght@500;600;700&amp;', '')
    s = re.sub(r'src="art/(?!rz-)', 'src="art/rz-', s)
    return s


FRIENDS = ('<svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" '
           'stroke-linejoin="round" aria-hidden="true"><circle cx="7.6" cy="7.4" r="2.7"/><path d="M2.8 16.4c.5-2.9 2.4-4.5 4.8-4.5s4.3 1.6 '
           '4.8 4.5"/><path d="M12.4 4.9a2.4 2.4 0 1 1 1.3 4.5"/><path d="M14.6 11.6c1.5.5 2.4 1.9 2.7 4"/></svg>')
DISC = '<circle cx="10" cy="10" r="6.8"/><path d="M10 6.4 12.8 10 10 13.6 7.2 10z"/></svg>'


def shellfix(s, active='Friends'):
    """The shipped shell: Discover left the bar, Friends joined it at the end; ? sits beside search."""
    s = re.sub(r'<span><svg[^>]*>' + re.escape(DISC) + r'Discover</span>(<span>.*?Decks</span>)',
               lambda m: m.group(1) + f'<span class="{"on" if active == "Friends" else ""}">{FRIENDS}Friends</span>', s)
    s = re.sub(r'<span class="rsl"><svg[^>]*>' + re.escape(DISC) + r'</span>(<span class="rsl">.*?</svg></span>)(<div class="rfoot">)',
               lambda m: m.group(1) + f'<span class="rsl {"on" if active == "Friends" else ""}">{FRIENDS}</span>' + m.group(2), s)
    s = s.replace('<div class="rfoot">', '<div class="rfoot"><span class="zhq">?</span>')
    s = re.sub(r'(<div class="clu"><span class="sic"[^>]*>.*?</svg></span>)', r'\1<span class="zq">?</span>', s)
    return s


def rz(name):
    return shellfix(retheme(load(RZ + name)))


def mh():
    return load('design_handoff_the99_menu_home/Home-States.dc.html')


Z_CSS = """<style>
.zhq{width:30px;height:30px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);font:500 14px 'IBM Plex Sans';margin-bottom:10px}
.zq{width:38px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-body);font:500 16px 'IBM Plex Sans';margin-right:4px}
.zbh{display:flex;flex-direction:column;gap:9px;max-width:1600px}
.zbh .zk{display:flex;align-items:center;gap:10px;font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.zbh .zk .tag{background:var(--accent);color:#14110E;border-radius:5px;padding:4px 8px;font-weight:600}
.zbh h2{margin:0;font:700 30px 'Cinzel',serif;color:var(--fg)}
.zbh p{margin:0;font-size:14px;line-height:1.6;color:var(--fg-body);max-width:1400px;text-wrap:pretty}
.zbh p b{color:var(--fg)}
.zbh code,.zcap code,.zrule code{font:12px 'IBM Plex Mono';color:var(--fg-muted)}
.zfr{display:flex;flex-direction:column;gap:12px;flex:none}
.zfr>.zl{font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint);line-height:1.5}
.zfr>.zl b{color:var(--accent);font-weight:600}
.zfr>.zcap{margin:0;font-size:13px;line-height:1.55;color:var(--fg-muted);text-wrap:pretty}
.zfr>.zcap b{color:var(--fg);font-weight:600}
.zrow{display:flex;gap:44px;align-items:flex-start;flex-wrap:nowrap}
.zrule{border:1px solid var(--border-strong);border-radius:12px;background:var(--surface);padding:20px 24px;max-width:1500px}
.zrule h4{margin:0 0 10px;font:600 15px 'IBM Plex Sans';color:var(--fg)}
.zrule ol,.zrule ul{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px;font-size:13.5px;line-height:1.55;color:var(--fg-body)}
.zrule b{color:var(--fg)}
.zd{font:600 9px 'IBM Plex Mono';letter-spacing:.06em;color:#0D0B09;background:#8FA6BE;border-radius:3px;padding:1px 5px;margin-left:6px;vertical-align:2px}
.znew{outline:1.5px dashed rgba(207,135,69,.8);outline-offset:3px;border-radius:10px}
.zold{outline:1.5px dashed rgba(198,83,63,.85);outline-offset:3px;border-radius:8px}
</style>"""

DRAFT = '<span class="zd">DRAFT</span>'


def head(kick, title, lede, tag="R1"):
    return (f'<div class="zbh"><div class="zk"><span class="tag">{tag}</span>{kick}</div><h2>{title}</h2>'
            f'<p>{lede}</p></div>')


def fr(lab, inner, cap="", w=None):
    c = f'<p class="zcap">{cap}</p>' if cap else ""
    st = f' style="width:{w}px"' if w else ""
    return f'<div class="zfr"{st}><div class="zl">{lab}</div>{inner}{c}</div>'


def row(*frames, gap=44):
    return f'<div class="zrow" style="gap:{gap}px">' + "".join(frames) + '</div>'


def rule(h, items, ordered=True):
    t = 'ol' if ordered else 'ul'
    lis = "".join(f"<li>{x}</li>" for x in items)
    return f'<div class="zrule"><h4>{h}</h4><{t}>{lis}</{t}></div>'


def doc(title, helm, body, width, height=1000, board_style=""):
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>{helm}{Z_CSS}</helmet>
<div class="board" style="width:{width}px;{board_style}">{body}</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{width},"height":{height}}}}}'>
class Component extends DCLogic {{
renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
"""
