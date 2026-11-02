"""Small items 10 (account 2, 2026-11-02): shared helpers. Boards lift frames from the shipped handoff boards on main
(design/design_handoff_the99_*) and from design-assets where a frame was drawn there first. Each source keeps its own
styles: `scope()` rewrites a board's helmet CSS under a wrapper class, so frames from several boards sit on one board."""
import re, os
D = os.environ.get("DESIGN", "/home/user/the-99/design")
SRC = os.environ.get("SRC10", "/home/user/w/src")


def load(rel):
    p = rel if rel.startswith('/') else (f"{D}/{rel}" if os.path.exists(f"{D}/{rel}") else f"{SRC}/{rel}")
    return open(p).read()


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
    i = s.find(needle)
    assert i >= 0, needle
    j = s.rfind('<div class="fr"', 0, i)
    return block(s, j)


def screen(fr):
    """The drawn screen inside a frame: everything between the label and the caption."""
    a = fr.find('</div>', fr.find('class="lab"')) + 6
    b = fr.rfind('<p class="cap">')
    return fr[a:b if b > 0 else -6]


def sub1(s, old, new):
    assert old in s, old[:160]
    return s.replace(old, new, 1)


def cut(s, start_marker, tag="div"):
    """Remove the element that starts at `start_marker`."""
    i = s.find(start_marker)
    assert i >= 0, start_marker[:120]
    return s[:i] + s[i + len(block(s, i, tag)):]


# ---- CSS scoping -------------------------------------------------------------------------------------------------
def _split_rules(css):
    out = []; i = 0; n = len(css)
    while i < n:
        j = css.find('{', i)
        if j < 0:
            break
        sel = css[i:j].strip()
        d = 1; k = j + 1
        while k < n and d:
            if css[k] == '{': d += 1
            elif css[k] == '}': d -= 1
            k += 1
        out.append((sel, css[j + 1:k - 1])); i = k
    return out


def _scope_css(css, sc):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    res = []
    for sel, body in _split_rules(css):
        if sel.startswith('@media') or sel.startswith('@supports') or sel.startswith('@container'):
            res.append(f'{sel}{{{_scope_css(body, sc)}}}')
        elif sel.startswith('@'):
            res.append(f'{sel}{{{body}}}')
        else:
            sels = []
            for x in sel.split(','):
                x = x.strip()
                if x in ('body', 'html', ':root'):
                    continue
                if x == '.board':
                    v = ';'.join(d for d in body.split(';') if d.strip().startswith('--'))
                    res.append(f'.{sc}{{{v}}}')
                    continue
                x = re.sub(r'^(\.board|body|html|:root)\s*>?\s*', '', x) if re.match(r'^(\.board|body|html|:root)[\s>]', x) else x
                sels.append(f'.{sc} {x}')
            if sels:
                res.append(f"{','.join(sels)}{{{body}}}")
    return '\n'.join(res)


def scope(helm, sc):
    links = ''.join(re.findall(r'<link[^>]*>', helm))
    css = ''.join(re.findall(r'<style[^>]*>(.*?)</style>', helm, flags=re.S))
    return links + f'<style>{_scope_css(css, sc)}</style>'


def wrap(sc, html):
    return f'<div class="{sc}" style="display:contents">{html}</div>'


# ---- board chrome ------------------------------------------------------------------------------------------------
CHROME = """<style>
body{margin:0;background:#0D0B09}
.board{--bg:#14110E;--surface:#1E1A15;--surface-raised:#211D18;--surface-rail:#1A1611;--surface-sunken:#18140F;--elevated:#29241F;--border:#2B241B;--border-strong:#3A3229;--fg:#EDE6D8;--fg-body:#C0B8A6;--fg-muted:#A59C89;--fg-faint:#948B78;--accent:#CF8745;--accent-text:#CF8745;--success:#6FA368;--warning:#DEAA29;--danger:#C6533F;
 box-sizing:border-box;padding:48px 56px 64px;background:#0D0B09;font-family:'IBM Plex Sans',sans-serif;color:var(--fg);display:flex;flex-direction:column;gap:34px}
.board *{box-sizing:border-box}
.board .bh{display:flex;flex-direction:column;gap:9px;max-width:1500px}
.board .kick{display:flex;align-items:center;gap:10px;font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.board .kick .tag{background:var(--accent);color:#14110E;border-radius:5px;padding:4px 8px;font-weight:600}
.board .bh h2{margin:0;font:700 30px 'Cinzel',serif;color:var(--fg)}
.board .bh p{margin:0;font-size:14px;line-height:1.6;color:var(--fg-body);max-width:1240px;text-wrap:pretty}
.board .bh p b{color:var(--fg)}
.board code{font:12px 'IBM Plex Mono',monospace;color:var(--fg-muted)}
.board .frames9{display:flex;gap:44px;flex-wrap:wrap;row-gap:56px;align-items:flex-start}
.board .fr9{display:flex;flex-direction:column;gap:10px;flex:none}
.board .lab9{font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.board .lab9 b{color:var(--accent-text);font-weight:600}
.board .lab9 .now{color:var(--fg-muted);border:1px solid var(--border-strong);border-radius:4px;padding:1px 5px;margin-right:6px}
.board .lab9 .rec{color:#14110E;background:var(--accent);border-radius:4px;padding:1px 5px;margin-right:6px}
.board .cap9{margin:0;font-size:12.5px;line-height:1.55;color:var(--fg-body);max-width:420px;text-wrap:pretty}
.board .cap9 b{color:var(--fg)}
.board .sec9{font:600 11px 'IBM Plex Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--accent-text);border-top:1px solid var(--border);padding-top:18px;max-width:1880px}
.board .rule8{border:1px solid var(--border-strong);border-radius:12px;background:var(--surface);padding:20px 24px;max-width:1240px}
.board .rule8 h4{margin:0 0 10px;font:600 15px 'IBM Plex Sans';color:var(--fg)}
.board .rule8 ol{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px;font-size:13.5px;line-height:1.55;color:var(--fg-body)}
.board .rule8 b{color:var(--fg)}
.board .draft8{font:600 9px 'IBM Plex Mono';letter-spacing:.06em;color:#0D0B09;background:#8FA6BE;border-radius:3px;padding:1px 5px;margin-left:6px;vertical-align:2px}
.board .new9{outline:1.5px dashed var(--accent);outline-offset:3px;border-radius:6px}
.board .hc10 .new,.board .gh10 .new,.board .gh10 .seg span.nw{outline:0}
</style>"""
FONTS = '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&amp;family=IBM+Plex+Mono:wght@400;500;600&amp;family=Cinzel:wght@600;700;800&amp;display=swap" rel="stylesheet">'
DRAFT = '<span class="draft8">DRAFT</span>'


def head(kick, title, lede, tag="R1"):
    return (f'<div class="bh"><div class="kick"><span class="tag">{tag}</span>{kick}</div><h2>{title}</h2>'
            f'<p>{lede}</p></div>')


def fr(lab, inner_html, cap="", sc=None, w=None):
    c = f'<p class="cap9" style="max-width:{w or 420}px">{cap}</p>' if cap else ""
    body = wrap(sc, inner_html) if sc else inner_html
    return f'<div class="fr9"><div class="lab9">{lab}</div>{body}{c}</div>'


def frames(*xs, gap=44):
    return f'<div class="frames9" style="gap:{gap}px">' + ''.join(xs) + '</div>'


def sec(t):
    return f'<div class="sec9">{t}</div>'


def rule(h, items):
    lis = "".join(f"<li>{x}</li>" for x in items)
    return f'<div class="rule8"><h4>{h}</h4><ol>{lis}</ol></div>'


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
<helmet>{FONTS}{helm}{CHROME}</helmet>
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


def zframe(s, needle):
    i = s.find(needle)
    assert i >= 0, needle
    j = s.rfind('<div class="zfr"', 0, i)
    return block(s, j)


def zscreen(s, needle):
    f = zframe(s, needle)
    a = f.find('</div>', f.find('class="zl"')) + 6
    b = f.rfind('<p class="zcap"')
    return f[a:b if b > 0 else -6]


def frame9(s, needle):
    i = s.find(needle)
    assert i >= 0, needle
    j = s.rfind('<div class="fr9"', 0, i)
    return block(s, j)


def screen9(f):
    """The drawn screen in a Small items 9 frame (fr9: label, screen, caption)."""
    a = f.find('</div>', f.find('class="lab9"')) + 6
    b = f.rfind('<p class="cap9"')
    return f[a:b if b > 0 else -6]


# ---- the one toast (item 2): the shipped ToastFrame `center` ----------------------------------------------------
def toast(text, action=None, phone=True, close=False, inline=False, new=True):
    """The shipped shared toast (`edit-toast.tsx` ToastFrame, placement center): 420 max, calc(100% - 32px) on a phone,
    radius 10, --elevated on --border-strong, 13.5 --fg, bottom centre of the WINDOW (16px over the tab bar on a phone,
    24px from the foot from md). The action is a plain text press: --accent-text 600 13.5, underlined at 2px, 44px tall."""
    pos = ('position:relative;width:420px;' if inline else
           f'position:absolute;left:50%;transform:translateX(-50%);bottom:{90 if phone else 24}px;width:calc(100% - 32px);max-width:420px;')
    act = ''
    if action:
        act = ('<span style="flex:none;display:inline-flex;align-items:center;min-height:44px;padding:0 12px;'
               "font:600 13.5px 'IBM Plex Sans',sans-serif;color:var(--accent-text);text-decoration:underline;text-underline-offset:2px\">"
               f'{action}</span>')
    if close:
        act += ('<span style="flex:none;display:flex;align-items:center;justify-content:center;width:44px;height:44px;'
                "font:15px 'IBM Plex Mono',monospace;color:var(--fg-faint)\">✕</span>")
    nw = ' new9' if new else ''
    return (f'<div class="t10{nw}" role="alert" style="{pos}z-index:60;box-sizing:border-box;display:flex;align-items:center;gap:14px;'
            'padding:4px 6px 4px 16px;border-radius:10px;border:1px solid var(--border-strong);background:var(--elevated);'
            'box-shadow:0 12px 40px rgba(0,0,0,.5)">'
            f"<span style=\"flex:1;min-width:0;padding:8px 0;font:13.5px/1.35 'IBM Plex Sans',sans-serif;color:var(--fg)\">{text}</span>{act}</div>")


def centre_line(h=None):
    """A measuring line down the middle of a desktop frame: the window's centre."""
    return ('<div aria-hidden="true" style="position:absolute;left:50%;top:0;bottom:0;width:0;border-left:1px dashed rgba(143,166,190,.75);z-index:70;pointer-events:none">'
            "<span style=\"position:absolute;top:10px;left:6px;white-space:nowrap;font:600 10px 'IBM Plex Mono',monospace;letter-spacing:.08em;"
            'color:#0D0B09;background:#8FA6BE;border-radius:3px;padding:2px 6px">WINDOW CENTER · 650</span></div>')


def unmark(h):
    """Earlier rounds' new-marks off (their dashed outlines); this round marks its own with .new9."""
    return h.replace('outline:1.5px dashed rgba(207,135,69,.9);outline-offset:-4px;border-radius:6px', '')
