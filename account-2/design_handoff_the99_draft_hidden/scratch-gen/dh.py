"""Draft deck hidden row R1 (account 2, 2026-11-18): issue #2988.

Drawn with the friend decks kit (design-assets account-2/design_handoff_the99_friend_decks/scratch-gen), which
draws the shipped deck header, /decks tiles, the 186px ⋯ panel and /settings in Low Sun. The one new part is the
`why` block that replaces the ticked, locked "Hidden from friends" row when Settings hides the deck.
Copy is DRAFT for /copy-review except shipped strings (Commit as v1, the Settings rows).
"""
import os, sys, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit, parts as P, fdk as F
from kit import doc, board_head, frame, frames, phone, desk

B = {"Home": 2}
kit.CSS += r"""
.mnu .why{display:block;text-align:left;padding:10px 13px 11px;border-top:1px solid var(--elevated)}
.mnu .why:first-child{border-top:0}
.mnu .why b{display:block;font:500 14px 'IBM Plex Sans';color:var(--fg)}
.dk .mnu .why b{font-size:13px}
.mnu .why em{display:block;margin-top:3px;font:normal 12.5px/1.45 'IBM Plex Sans';color:var(--fg-muted);white-space:normal}
.dk .mnu .why em{font-size:12px}
.mnu span.go{padding:8px 13px;white-space:normal}
.mnu span.go .t2{padding:0;border:0;min-height:0;display:flex;flex-direction:column;align-items:flex-start;text-align:left;gap:2px;flex:1;min-width:0}
.mnu span.go .t2 span,.mnu span.go .t2 small{display:block;min-height:0;padding:0;border:0}
.mnu span.go .t2 small{font:10.5px 'IBM Plex Mono';color:var(--fg-muted)}
.mnu span.go.acc{color:var(--accent-text);font-weight:500}
.mnu span.go.acc i{margin-left:auto;font-style:normal}
.mnu.was{opacity:.92}
.ck.lit{background:var(--elevated);border-radius:8px;margin:0 -10px;padding-left:40px!important;padding-right:10px;box-shadow:inset 0 0 0 1px var(--border-strong)}
.cmp{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:28px;max-width:1500px}
.cmp .note{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px 20px;font-size:14px;line-height:1.55;color:var(--fg-body)}
.cmp .note b{color:var(--fg)}
.cmp .note h4{margin:0 0 8px;font:500 10.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
table.vt{border-collapse:collapse;font-size:13.5px;max-width:1500px;color:var(--fg-body)}
table.vt th,table.vt td{text-align:left;vertical-align:top;padding:10px 16px;border-top:1px solid var(--border)}
table.vt th{font:500 10.5px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
table.vt td b{color:var(--fg);font-weight:500}
"""

# The four reasons Settings can hide a deck (settingsHideDeck), each with what it can honestly offer.
WHY = {
    "draft-full": ("It’s a draft. Friends see it once you commit it.",
                   [("acc", "Commit as v1", None), ("", "Show drafts to friends", "In Settings")]),
    "draft-short": ("It’s a draft with 64 of 99 cards. Friends see it once it’s full and committed.",
                    [("", "Show drafts to friends", "In Settings")]),
    "new": ("It has no cards yet. Friends see it once it’s full and committed.",
            [("", "Show drafts to friends", "In Settings")]),
    "building": ("It’s short, 92 of 99 cards. Friends see it once it’s full again.",
                 [("", "Show decks I’m building", "In Settings")]),
    "all-off": ("Friends can’t see any of your decks.",
                [("", "Show my decks to friends", "In Settings")]),
}


def why_rows(kind):
    line, acts = WHY[kind]
    out = [f'<div class="why"><b>Hidden from friends</b><em>{line}</em></div>']
    for cls, label, sub in acts:
        if sub:
            out.append(f'<span class="go {cls}"><span class="t2"><span>{label}</span><small>{sub} ›</small></span></span>')
        else:
            out.append(f'<span class="go {cls}">{label}<i>›</i></span>')
    return "".join(out)


def menu(where="header", why=None, locked=False):
    rows = [] if where == "header" else ["Update from a list", "Rename", "Export"]
    rows += ["Move · Thursday decks", "HIDE", "Delete"]
    out = []
    for r in rows:
        if r == "HIDE" and why:
            out.append(why_rows(why))
        elif r == "HIDE" and locked:
            out.append('<span class="new bys" style="border-radius:0"><span class="t2"><span>Hidden from friends</span>'
                       '<small>Set in Settings ›</small></span><i class="bx on lk"></i></span>')
        elif r == "HIDE":
            out.append('<span>Hidden from friends<i class="bx"></i></span>')
        else:
            out.append(f'<span class="{"dg" if r == "Delete" else ""}">{r}</span>')
    return "".join(out)


STATUS = {  # pill, count, bar %, bar colour
    "draft-full": ("Draft", 99, 100), "draft-short": ("Draft", 64, 65), "new": ("New", 0, 0),
    "building": ("Building", 92, 93), "all-off": ("To buy", 99, 100)}


def header_phone(kind, open_=True, why=True):
    """The shipped deck header (owner_phone) with this deck's status, and its ⋯ open."""
    st, n, pct = STATUS[kind]
    h = F.owner_phone(menu="on" if open_ else None)
    h = h.replace(f'<span class="pill" style="{F.pill_style("To buy")}">To buy</span><span class="bchip"><i></i>Upgraded</span>',
                  f'<span class="pill" style="{F.pill_style(st)}">{st}</span>' + ('<span class="bchip"><i></i>Upgraded</span>' if kind == "all-off" else ""))
    bar_c = "var(--fg-muted)" if st in ("Draft", "New") else F.STATUS[st][0]
    h = h.replace('<i style="width:100%;background:var(--accent)"></i></span><b>99 <span>/99</span></b>',
                  f'<i style="width:{pct}%;background:{bar_c}"></i></span><b>{n} <span>/99</span></b>')
    if kind == "draft-full":  # FirstCommitOffer, the header's primary, before ⋯ (spine-mobile.tsx)
        h = h.replace('<span class="gb2 sq on">…</span>',
                      '<span class="bp" style="height:44px;font-size:12.5px;border-radius:8px;padding:0 11px;flex:none;white-space:nowrap">Commit as v1</span><span class="gb2 sq on">…</span>')
    if open_:
        h = re.sub(r'(<div class="mnu"[^>]*>).*?(</div></div></div><div class="otabs">)',
                   lambda m: m.group(1) + (menu("header", kind) if why else menu("header", locked=True)) + m.group(2), h, count=1, flags=re.S)
    return h


def p(kind, why=True):
    return phone(header_phone(kind, why=why) + ("" if kind == "new" else F.owner_list()), "Decks", badges=B, h=844)


def settings_landing(desk_=False):
    s = F.settings_with_decks(desk_).replace('<section class="sec new">', '<section class="sec">')
    s = s.replace('<div class="ck sub2"><span class="box"></span><span class="ct"><b>Include drafts',
                  '<div class="ck sub2 lit"><span class="box"></span><span class="ct"><b>Include drafts', 1)
    s = s.replace("Off: a deck shows once its list is full.</span>", "Off: a deck shows once its list is full and committed.</span>")
    return s


def main():
    cmp = ('<div class="cmp">'
           '<div class="note"><h4>Shipped</h4>A deck Settings hides draws <b>Hidden from friends</b> ticked and locked, “Set in Settings ›” under it. '
           'It looks like a box you can untick. The press opens the top of /settings. It never says why this deck is hidden, or what would show it.</div>'
           '<div class="note"><h4>R1</h4>No box. In its place the panel says <b>Hidden from friends</b> and why, in one line from the deck’s status, '
           'then a row for each way out the player really has. <b>Commit as v1</b> only when the deck can commit (full, nothing unresolved). '
           'The Settings row lands on the exact toggle. A deck hidden on its own keeps today’s checkbox.</div></div>')
    body = (board_head("Draft deck hidden row · R1 · #2988", "Say why a deck is hidden, and offer the real ways out",
                       "Hugh’s principle: don’t give the player something they can’t do; if they can’t, tell them why. The deck page header’s ⋯ at 390, "
                       "Low Sun, over the shipped header and the shipped 186px panel.", tag="R1")
            + cmp
            + frames(frame("<b>Shipped</b> · Draft, full", p("draft-full", why=False),
                           "Today: a ticked box that can’t be unticked."),
                     frame("<b>R1</b> · Draft, full", p("draft-full"),
                           "It can commit, so it offers <b>Commit as v1</b> (accent, the header’s own words, to <code>/decks/{id}/changes?commit=1</code>) and the Settings toggle."),
                     frame("<b>R1</b> · Draft, short", p("draft-short"),
                           "It can’t commit yet (commit needs a full list), so no Commit row: the line says what it takes. One way out: Settings."),
                     gap=40)
            + frames(frame("<b>R1</b> · Building", p("building"),
                           "Committed and short. The Settings row names the other half of the same toggle."),
                     frame("<b>R1</b> · New", p("new"),
                           "No cards yet. Same row as a short draft."),
                     frame("<b>R1</b> · Friends see no decks", p("all-off"),
                           "Settings’ first box is off, so every deck is hidden whatever its status. Any status, here To buy."),
                     gap=40))
    return doc("Why a draft deck stays hidden", body, 1490)


def where():
    F.MINE[2] = ("Rootha Spells", "Rootha, Mastering the Moment", "crop-rootha.jpg", "Draft", 99, 0, "UR")
    dp = F.decks_page(True, hidden=(), key=False, menu=None)
    j = dp.rfind('<div class="dtl">')
    dp = dp[:j] + '<div class="dtl" style="overflow:visible;z-index:5;position:relative">' + dp[j + len('<div class="dtl">'):]
    # Rootha Spells as a full draft, its tile ⋯ open with the R1 rows
    i = dp.rfind('<div class="ft">')
    dp = dp[:i] + f'<div class="mnu" style="right:10px;top:42px">{menu("tile", "draft-full")}</div>' + dp[i:]
    dp = dp.replace('<span class="dots">…</span><div class="lb"><h3>Rootha Spells', '<span class="dots on">…</span><div class="lb"><h3>Rootha Spells', 1)
    rows = [
        ("Draft, full and resolved", "It’s a draft. Friends see it once you commit it.", "Commit as v1 · Show drafts to friends"),
        ("Draft, short or unresolved", "It’s a draft with {n} of {size} cards. Friends see it once it’s full and committed.", "Show drafts to friends"),
        ("New (no cards)", "It has no cards yet. Friends see it once it’s full and committed.", "Show drafts to friends"),
        ("Building", "It’s short, {n} of {size} cards. Friends see it once it’s full again.", "Show decks I’m building"),
        ("Friends can see my decks is off", "Friends can’t see any of your decks.", "Show my decks to friends"),
        ("Hidden on its own (flag)", "Shipped checkbox row, clearable.", "Untick"),
    ]
    tb = ('<table class="vt"><tr><th>Deck</th><th>Line under Hidden from friends (DRAFT copy)</th><th>Rows offered</th></tr>'
          + "".join(f"<tr><td><b>{a}</b></td><td>{b}</td><td>{c}</td></tr>" for a, b, c in rows) + "</table>")
    body = (board_head("Draft deck hidden row · R1", "The /decks tile, and where the Settings row lands",
                       "The same rows in the tile’s ⋯ (one component, both surfaces). The Settings row opens <code>/settings#settings-decks</code>, scrolled to "
                       "Your decks, and washes the toggle it named for 2s so the eye finds it. Nothing flips from the menu: Settings stays the one place "
                       "for account rules.", tag="R1")
            + frames(frame("<b>/decks</b> · 1300 · tile ⋯ on a full draft", desk(dp, "Decks", badges=B, h=640),
                           "At desktop the panel’s 38px rows; the line wraps in the 186px width."),
                     frame("<b>/settings#settings-decks</b> · 1300", desk(settings_landing(True), "Home", badges=B, h=1420),
                           "Landed on Your decks with <b>Include drafts and decks I’m building</b> washed. Nothing else on the page changes."), gap=40)
            + tb)
    return doc("Where the rows go", body, 2840)


BOARDS = [("Main", main, "Why it’s hidden"), ("Desktop", where, "Tile and Settings")]

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "out"
    os.makedirs(out, exist_ok=True)
    for n, fn, _ in BOARDS:
        open(f"{out}/{n}.dc.html", "w").write(fn()); print("wrote", n)
