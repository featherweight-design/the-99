"""Small items 7 (account 2, 2026-10-30): the undrawn parts of the flyer admin on /admin/invites, plus the friend
page order erratum. Built over the flyer trial kit (fly.py and the announcements kit), same Low Sun tokens.

Admin pieces follow main: setting-dialog.tsx (field FIELD, Save/Cancel, inline role=alert line), invite-tree.tsx
(muted empty line), model-confirm.tsx (dialog failure stays in the dialog), copy/admin.ts (saveFailed, unknown).
Friend page: app/friends/[publicId]/(tabs)/layout.tsx + friend-strip.tsx after #2444. Every new string is a draft
for /copy-review.
"""
import kit, fly as F, fdk as FD
from kit import frame, frames, doc

kit.CSS += r"""
/* ---------- si7: launch list card with the launch date ---------- */
.s7lc .s7top{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:14px;min-height:56px;padding:10px 10px 10px 16px}
.s7lc .s7top b{display:block;font:600 14px 'IBM Plex Sans';color:var(--fg)}
.s7lc .s7top .mt{display:block;margin-top:3px}
.s7ld{display:grid;grid-template-columns:120px 200px minmax(0,1fr) auto;align-items:center;gap:14px;min-height:60px;padding:10px 10px 10px 16px;border-top:1px solid var(--border)}
.s7ld label{font:600 13px 'IBM Plex Sans';color:var(--fg)}
.s7in{height:38px;border-radius:8px;border:1px solid var(--border-strong);background:var(--surface-sunken);display:flex;align-items:center;gap:8px;padding:0 10px 0 12px;font:14px 'IBM Plex Sans';color:var(--fg)}
.s7in.ph0{color:var(--fg-faint)}
.s7in.on{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
.s7in svg{margin-left:auto;color:var(--fg-faint);flex:none}
.s7ld small{font-size:12px;line-height:1.5;color:var(--fg-muted);text-wrap:pretty}
.s7ld .s7st{font:11px 'IBM Plex Mono';color:var(--fg-faint);white-space:nowrap}
.s7ld .acts{align-items:center;gap:10px}
.s7al{grid-column:1/-1;margin:-2px 0 2px;font-size:13px;color:var(--danger)}
.ph .s7lc .s7top{grid-template-columns:minmax(0,1fr);gap:4px;padding:12px 14px 4px}
.ph .s7lc .s7top .acts{justify-content:flex-start;margin:0 0 0 -6px}
.ph .s7lc .s7top .tb{min-height:44px}
.ph .s7ld{grid-template-columns:minmax(0,1fr);gap:6px;padding:12px 14px 14px}
.ph .s7in{height:44px;font-size:16px}
.ph .s7ld .acts{justify-content:flex-start;margin:0 0 -8px -6px}
.ph .s7ld .acts .tb{min-height:44px}
.ph .s7ld .s7row{display:flex;align-items:center;gap:10px}
/* empty section */
.s7emp{padding:18px 16px;font-size:13px;line-height:1.6;color:var(--fg-muted);text-wrap:pretty}
/* revoke failure */
.cfm .mb p.s7al{margin:12px 0 0;font-size:13px;color:var(--danger)}
/* csv */
.s7file{width:1300px;border:1px solid var(--border-strong);border-radius:12px;background:var(--surface);overflow:hidden}
.s7file .fh{display:flex;align-items:center;gap:12px;height:48px;padding:0 16px;background:var(--surface-rail);border-bottom:1px solid var(--border)}
.s7file .fh b{font:500 13px 'IBM Plex Mono';color:var(--fg)}
.s7file .fh small{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.s7grid{display:grid;grid-template-columns:44px minmax(0,1.5fr) minmax(0,1.1fr) 110px minmax(0,1.2fr);font:12.5px 'IBM Plex Mono';color:var(--fg-body)}
.s7grid span{padding:9px 12px;border-bottom:1px solid var(--border);border-left:1px solid var(--border);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.s7grid span.n{border-left:0;color:var(--fg-faint);text-align:right;background:var(--surface-rail)}
.s7grid span.h{color:var(--fg);font-weight:600;background:var(--surface-rail)}
.s7grid span.e{color:var(--fg-faint)}
.s7raw{margin:0;padding:14px 16px;font:12px/1.7 'IBM Plex Mono';color:var(--fg-body);white-space:pre;background:var(--surface-sunken);border-top:1px solid var(--border)}
.s7cols{width:1300px}
/* print, revoked */
.pvb .s7rv{font:11px 'IBM Plex Mono';color:var(--fg-muted)}
.pvb .code.s7x{color:var(--fg-muted)}
.pvs .wrap.s7dim{opacity:.32;filter:grayscale(.6)}
.s7pvp{width:390px;border-radius:34px;border:1px solid var(--border-strong);background:#2a2622;overflow:hidden;display:flex;flex-direction:column}
.s7pvp .pvb{height:auto;flex-wrap:wrap;gap:6px 12px;padding:16px 16px 14px}
.s7pvp .pvb a{min-height:44px;display:inline-flex;align-items:center;flex-basis:100%}
.s7pvp .pvb small{flex-basis:100%;text-wrap:pretty}
.s7pvp .pvs{padding:22px 0 26px}
.s7pvp .pvs .wrap{width:306px;height:396px}
.s7pvp .pvs .wrap .fly{transform:scale(.375)}
.s7pvp .s7bt{display:flex;gap:10px;flex-basis:100%;margin-top:4px}
.s7pvp .s7bt .bg,.s7pvp .s7bt .bp{flex:1;height:44px}
"""

CAL = '<path d="M4 5.5h12v11H4z"/><path d="M4 8.8h12"/><path d="M7.2 3.6v3.2M12.8 3.6v3.2"/>'
HELP = "Optional. Leave it blank until the date is firm."


def ldate(state, phone=False, err=False):
    """The launch date row: empty, typed (Save), saved (Clear), cleared."""
    val = {"empty": "", "typed": "11 / 20 / 2026", "saved": "11 / 20 / 2026", "cleared": ""}[state]
    field = (f'<span class="s7in{" ph0" if not val else ""}{" on" if state == "typed" else ""}">{val or "mm / dd / yyyy"}{kit.ico(CAL, 17)}</span>')
    st = {"saved": '<span class="s7st">Saved</span>', "cleared": '<span class="s7st">Cleared</span>'}.get(state, "")
    acts = {"typed": '<span class="tb">Save</span>', "saved": '<span class="tb">Clear</span>'}.get(state, "")
    al = '<p class="s7al" role="alert">Didn’t save. Nothing changed.</p>' if err else ""
    if phone:
        tail = f'<div class="s7row">{st}<span class="acts">{acts}</span></div>' if (st or acts) else ""
        return f'<div class="s7ld new">'.replace(' new', '') + f'<label>Launch date</label>{field}<small>{HELP}</small>{al}{tail}</div>'
    return f'<div class="s7ld"><label>Launch date</label>{field}<small>{HELP}</small><span class="acts">{st}{acts}</span>{al}</div>'


def lcard(state="empty", n=23, phone=False, err=False):
    if n:
        meta = "emails left on used-up and ended flyers · Knight Moves Cafe 19 · Pizza Pod test 4"
        csv = '<span class="acts"><span class="tb">Download CSV</span></span>'
    else:
        meta = "no emails yet · a used-up or ended flyer asks for one"
        csv = ""
    top = f'<div class="s7top"><span><b>Launch list · {n}</b><span class="mt">{meta}</span></span>{csv}</div>'
    return f'<div class="acard s7lc">{top}{ldate(state, phone, err)}</div>'


def head(n_live=3, empty=False):
    small = ("none yet · from your invites, 37 left" if empty else
             f"{n_live} live · from your invites, 37 left · 23 on the launch list")
    return f'<div class="sech2"><div class="t"><h2>Flyer codes</h2><small>{small}</small></div><a>New flyer code</a></div>'


EMPTY = '<div class="acard"><p class="s7emp">No flyer codes yet. Make one for a store, then print its flyer.</p></div>'
TREE_H = '<div class="sech2"><div class="t"><h2>Who invited whom</h2><small>founders · accounts from before launch</small></div></div>'


def tree_plain():
    rows = F.tree_rows()
    # no flyer node: drop the flyer row and its three sign-ups
    parts = rows.split('<div class="tr">')
    keep = [parts[0], parts[1], parts[-1]]
    return '<div class="tr">'.join(keep)


def bh(k, t, c):
    return kit.board_head(k, t, c, tag="R1")


def note(h, body):
    return f'<div class="note"><h4>{h}</h4>{body}</div>'


def lab(n, t):
    return f'<b>{n}</b> · {t}'


W = {}


def board(name, title, width):
    def deco(fn):
        W[name] = (fn, title, width)
        return fn
    return deco


KICK = "Small items 7 · R1 · account 2 · 2026-10-30"


# ---------------------------------------------------------------- Main
@board("Main", "Small items 7 · the calls", 1612)
def main():
    h = bh(KICK, "The flyer admin’s missing parts",
           "Five parts of the Flyer codes section on /admin/invites that the flyer trial boards left undrawn, each at 390 and 1300, "
           "drawn over the approved Admin boards (flyer trial 4, 5, 6). Everything else on /admin/invites builds now from those boards. "
           "Plus the two errata, recorded; the friend page is redrawn in its shipped order.")
    calls = note("Design’s calls", "<ol>"
                 "<li><b>Launch date</b> is a second row on the launch list card: label, a date field (the shipped admin field, 38 / 44 tall), "
                 "one help line. Blank is a real value. <b>Save</b> shows only while the field differs from what’s saved; once saved, the row says "
                 "<i>Saved</i> and offers <b>Clear</b>, which saves a blank. A refused save is the shipped admin line <i>Didn’t save. Nothing changed.</i> (board 1).</li>"
                 "<li><b>No codes</b> is the admin’s muted empty line inside the section’s card, with New flyer code where it always is. The launch "
                 "list card stays (its date can be set before the first code); with no emails it has no Download CSV. The tree has no flyer node (board 2).</li>"
                 "<li><b>Revoke failing</b> keeps the dialog open with an inline alert above the buttons, as admin dialogs do (setting-dialog, model-confirm), "
                 "not the player toast: the person is mid-decision in a dialog. Two lines: refused, and lost touch (board 3).</li>"
                 "<li><b>CSV</b>: <code>email, store, code, added_at</code>, oldest first, one row per address; filename "
                 "<code>the-99-launch-list-2026-11-02.csv</code> (the day it’s downloaded, UTC) (board 4).</li>"
                 "<li><b>Print, revoked</b>: the page still opens from an old link or Back, but the bar loses Print and Download QR, says when it was "
                 "revoked, and the flyer shows dimmed for reference. Printing anyway prints nothing (board 5).</li></ol>")
    errata = note("Errata, recorded", "<ol>"
                  "<li><b>(a) Friend page order</b> (#2444): the strip reads <b>Decks, Wishlist, Spares</b> and the page opens on Decks "
                  "(<code>/friends/[publicId]</code>). Redrawn on board 6; earlier friend page boards (social R1/R2, menu and Home, friend decks, "
                  "spare requests, signature card, push) now read in this order, Decks first. <code>ERRATUM-friend-order.md</code>.</li>"
                  "<li><b>(b) Suggested changes v2</b> (#2452): “Why these cards” is written by its own small call once both lists are final, "
                  "not inside the cuts call. No visual change; the boards hold. <code>ERRATUM-why-these-cards.md</code>.</li></ol>")
    gaps = note("For engineering", "<ol>"
                "<li><b>Launch date</b> is the setting PR 4 adds: a nullable date. These boards draw only the field; what reads it is PR 4’s, unchanged here.</li>"
                "<li><b>Revoke</b> takes Hugh’s <code>invites:</code> lock (per #2435). A refusal leaves the row as it was; a lost reply refreshes the list under the dialog.</li>"
                "<li><b>CSV</b>: RFC 4180, UTF-8, header row always; a cell starting with <code>= + - @</code> gets a leading <code>'</code>. "
                "<code>store</code> and <code>code</code> are blank for an address left on a code nobody made.</li>"
                "<li><b>Print</b> for a revoked code: no Print or Download QR; <code>@media print</code> hides the flyer.</li></ol>")
    qs = note("For Hugh", "<ol>"
              "<li><b>What the launch date drives.</b> The brief and PR 1 name the setting but not its reader, so these boards draw the field only. "
              "If it should show somewhere (the launch email, the /join ended states), say where and it gets its own small board.</li>"
              "<li><b>Revoke failure in the dialog, not a toast.</b> Recommended, to match the admin’s other dialogs; the flyer handoff’s toast rule stays for player screens.</li></ol>")
    return h + f'<div class="notes">{calls}{errata}{gaps}{qs}</div>'


# ---------------------------------------------------------------- 1 Launch date
@board("Launch-Date", "1 · Launch date on the launch list card", 2756)
def launch_date():
    h = bh("1 · /admin/invites · the launch list card", "The launch date, set or left blank",
           "A second row on the launch list card. The field is the shipped admin field; blank is allowed and is the starting state. "
           "Save appears only while the field differs from what’s saved. Once saved: <b>Saved</b> and <b>Clear</b>. Clear saves a blank and says <b>Cleared</b>. "
           "A refused save keeps what was typed and shows the shipped line <i>Didn’t save. Nothing changed.</i>")
    body = lambda st, err=False: head() + F.codes_table(F.CODES[:2]) + lcard(st, err=err)
    d = [frame(lab("D1", "empty"), F.admin_desk(body("empty"), h=610)),
         frame(lab("D2", "typed, not saved"), F.admin_desk(body("typed"), h=610)),
         frame(lab("D3", "set and saved"), F.admin_desk(body("saved"), h=610)),
         frame(lab("D4", "cleared"), F.admin_desk(body("cleared"), h=610)),
         frame(lab("D5", "save refused"), F.admin_desk(body("typed", True), h=650))]
    pb = lambda st, err=False: head() + F.codes_phone(F.CODES[:1]) + lcard(st, phone=True, err=err)
    p = [frame(lab("P1", "empty"), F.admin_phone(pb("empty"))),
         frame(lab("P2", "typed, not saved"), F.admin_phone(pb("typed"))),
         frame(lab("P3", "set and saved"), F.admin_phone(pb("saved"))),
         frame(lab("P4", "cleared"), F.admin_phone(pb("cleared")))]
    return h + frames(*d[:2]) + frames(*d[2:4]) + frames(d[4], *p[:2]) + frames(*p[2:])


# ---------------------------------------------------------------- 2 No codes
@board("No-Codes", "2 · Flyer codes, none yet", 1960)
def no_codes():
    h = bh("2 · /admin/invites · zero codes", "Before the first flyer",
           "The section keeps its head and New flyer code; its card holds the admin’s muted empty line (as the tree’s own empty line). "
           "The launch list card stays so the date can be set early; with no emails there’s nothing to download. The tree has no flyer node.")
    body = head(empty=True) + EMPTY + lcard("empty", n=0) + TREE_H + tree_plain()
    pbody = head(empty=True) + EMPTY + lcard("empty", n=0, phone=True)
    return h + frames(frame(lab("E1", "desktop"), F.admin_desk(body)), frame(lab("E2", "phone"), F.admin_phone(pbody, h=844)))


# ---------------------------------------------------------------- 3 Revoke failed
def confirm_fail(desk=True, lost=False, top=150):
    line = ("Lost touch with the server, so it may have revoked. Check the list before trying again." if lost
            else "Couldn’t revoke the code, so nothing changed. Try again.")
    al = f'<p class="s7al" role="alert">{line}</p>'
    c = F.confirm(desk, top)
    return c.replace("no longer works.</p>", "no longer works.</p>" + al, 1)


@board("Revoke-Failed", "3 · When revoking fails", 2020)
def revoke_failed():
    h = bh("3 · /admin/invites · Revoke, failed", "When a revoke doesn’t go through",
           "The dialog stays open with what it said, and an alert line under the lead, as the shipped admin dialogs do. "
           "<b>Revoke code</b> stays the way to try again; Keep it and ✕ close it. Refused: nothing changed. Lost touch: it may have gone through, "
           "so the list under the dialog refreshes and the line says to check it.")
    page = lambda: F.codes_head() + F.codes_table()
    d1 = frame(lab("R1", "refused"), F.admin_desk(page(), h=640, over=confirm_fail(True, False, 170)))
    p1 = frame(lab("R2", "refused, phone"), F.admin_phone(F.codes_head() + F.codes_phone(), over=confirm_fail(False, False)))
    p2 = frame(lab("R3", "lost touch, phone"), F.admin_phone(F.codes_head() + F.codes_phone(), over=confirm_fail(False, True)))
    return h + frames(d1) + frames(p1, p2)


# ---------------------------------------------------------------- 4 CSV
ROWS = [("ana.r@example.com", "Knight Moves Cafe", "KNT3HZ", "2026-10-31T18:02:11Z"),
        ("bmorales@example.net", "Knight Moves Cafe", "KNT3HZ", "2026-10-31T19:40:57Z"),
        ("dev.k@example.org", "Pizza Pod test", "PZA9TC", "2026-11-01T02:15:30Z"),
        ("jo@example.com", "", "", "2026-11-01T14:08:03Z"),
        ("lee.t@example.com", "Knight Moves Cafe", "KNT3HZ", "2026-11-02T09:51:44Z")]
FILE = "the-99-launch-list-2026-11-02.csv"


@board("CSV", "4 · The launch list CSV", 1412)
def csv_b():
    h = bh("4 · /admin/invites · Download CSV", "What the launch list downloads",
           "Download CSV on the launch list card saves one file. Four columns in this order, one row per address, oldest first. "
           "<b>store</b> is the label Hugh gave the code; <b>code</b> the six characters; both blank for an address left on a code nobody made. "
           "<b>added_at</b> is ISO 8601 in UTC. The header row is always there.")
    cells = '<span class="n"></span>' + "".join(f'<span class="h">{c}</span>' for c in ["email", "store", "code", "added_at"])
    for i, r in enumerate(ROWS, 1):
        cells += f'<span class="n">{i}</span>' + "".join(f'<span class="{"" if v else "e"}">{v}</span>' for v in r)
    raw = "email,store,code,added_at\n" + "\n".join(",".join(r) for r in ROWS)
    f = (f'<div class="s7file"><div class="fh"><b>{FILE}</b><small>23 rows · UTF-8 · comma</small></div>'
         f'<div class="s7grid">{cells}</div><pre class="s7raw">{raw}\n…</pre></div>')
    cols = ('<table class="tbl s7cols"><tr><th>#</th><th>Column</th><th>What</th><th>Example</th></tr>'
            '<tr><td>1</td><td><b>email</b></td><td>The address as saved (lower-cased).</td><td><code>ana.r@example.com</code></td></tr>'
            '<tr><td>2</td><td><b>store</b></td><td>The flyer code’s store label; blank if the code was unknown.</td><td><code>Knight Moves Cafe</code></td></tr>'
            '<tr><td>3</td><td><b>code</b></td><td>The flyer code it came through; blank if unknown.</td><td><code>KNT3HZ</code></td></tr>'
            '<tr><td>4</td><td><b>added_at</b></td><td>When it was left, ISO 8601, UTC.</td><td><code>2026-10-31T18:02:11Z</code></td></tr></table>')
    card = F.admin_desk(head() + lcard("saved"), h=420)
    pcard = F.admin_phone(head() + lcard("saved", phone=True))
    return (h + frames(frame(lab("C1", "the file"), f), ) + frames(frame(lab("C2", "the columns"), cols))
            + frames(frame(lab("C3", "where it’s pressed"), card)) + frames(frame(lab("C4", "phone"), pcard)))


# ---------------------------------------------------------------- 5 Print, revoked
def print_revoked():
    return (f'<div class="pv"><div class="pvb"><a>‹ Invites</a><b>Pizza Pod test</b><span class="code s7x">PZA9TC</span>'
            '<small class="s7rv">Revoked Nov 2. This code no longer signs anyone up, so there’s nothing to print.</small><span class="sp"></span></div>'
            f'<div class="pvs"><div class="wrap s7dim">{F.flyer().replace(F.CODE, "PZA9TC")}</div></div></div>')


def print_phone(revoked=True):
    if revoked:
        bar = ('<div class="pvb"><a>‹ Invites</a><b>Pizza Pod test</b><span class="code s7x">PZA9TC</span>'
               '<small class="s7rv">Revoked Nov 2. This code no longer signs anyone up, so there’s nothing to print.</small></div>')
        fl = f'<div class="wrap s7dim">{F.flyer().replace(F.CODE, "PZA9TC")}</div>'
    else:
        bar = (f'<div class="pvb"><a>‹ Invites</a><b>{F.STORE}</b><span class="code">{F.CODE}</span>'
               '<small>Letter · black ink on coloured paper · the toolbar doesn’t print</small>'
               '<span class="s7bt"><span class="bg">Download QR</span><span class="bp">Print</span></span></div>')
        fl = f'<div class="wrap">{F.flyer()}</div>'
    return f'<div class="s7pvp">{bar}<div class="pvs">{fl}</div></div>'


@board("Print-Revoked", "5 · The print page, revoked", 1412)
def print_rev():
    h = bh("5 · /admin/invites/flyers/[code] · revoked", "Printing a revoked code",
           "Revoked rows have no Print, but the page still opens from an old link or Back. The bar keeps the way back, the store and the code (muted), "
           "and says when it was revoked; Print and Download QR are gone. The flyer stays, dimmed, so Hugh can see which one it was. "
           "Printing anyway gives a blank page. At 390 the live page is drawn beside it for comparison.")
    return (h + frames(frame(lab("V1", "revoked, desktop"), print_revoked()))
            + frames(frame(lab("V2", "revoked, phone"), print_phone(True)), frame(lab("V3", "live, phone, for comparison"), print_phone(False))))


# ---------------------------------------------------------------- 6 Friend page order (erratum a)
TABS = [("decks", "Decks"), ("wish", "Wishlist"), ("spares", "Spares")]


def friend_decks(desk):
    import re, parts as P
    decks = FD.COLIN if desk else FD.COLIN[:2]
    out = FD.decks_tab(decks, desk, counts={"spares": 6, "wish": 12, "decks": 4})
    strip = P.place_strip("decks", TABS, {"spares": 6, "wish": 12, "decks": 4})
    out = re.sub(r'<nav class="ps new">.*?</nav>', lambda m: strip, out, count=1, flags=re.S)
    return out.replace('class="dts new"', 'class="dts"')


@board("Friend-Order", "6 · Erratum (a): the friend page order", 1820)
def friend_order():
    h = bh("6 · /friends/[publicId] · erratum (a), #2444", "A friend’s page opens on Decks",
           "As shipped in #2444: the strip reads <b>Decks, Wishlist, Spares</b>, and the bare page is Decks. Nothing else on the page changes. "
           "Earlier boards that drew Spares first now read in this order.")
    return h + frames(frame(lab("F1", "phone"), kit.phone(friend_decks(False), active="Friends")),
                      frame(lab("F2", "desktop"), kit.desk(friend_decks(True), active="Friends")))


BOARDS = [(n, (lambda n=n: doc(W[n][1], W[n][0](), W[n][2])), W[n][1]) for n in W]
