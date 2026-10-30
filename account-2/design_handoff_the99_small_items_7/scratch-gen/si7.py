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

/* ---------- si7 addendum: dates ---------- */
.d7{background:var(--bg);border:1px solid var(--border-strong);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:8px}
.d7 .hd{font:500 9.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint);padding-bottom:4px}
.g7{display:flex;align-items:center;gap:14px;min-height:52px;border-radius:9px;padding:8px 12px 8px 14px;background:var(--surface);border:1px solid var(--border)}
.g7 .r{flex:none;width:26px;height:26px;border-radius:7px;border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;font:600 12px 'IBM Plex Mono';color:var(--fg-body)}
.g7 .r.w{border-color:var(--success);color:var(--success)}
.g7 .m{flex:none;font:11px 'IBM Plex Mono';color:var(--fg-faint);font-variant-numeric:tabular-nums}
.g7 .m.was{outline:1.5px dashed var(--warning);outline-offset:3px}
.g7 .v{flex:none;width:44px;font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.g7 .k{flex:1;min-width:0;display:flex;gap:6px;flex-wrap:wrap}
.g7 .k span{border-radius:99px;padding:4px 11px 4px 8px;font:10.5px 'IBM Plex Mono';background:var(--elevated);color:var(--fg-body)}
.g7 .x{flex:none;width:30px;height:30px;border-radius:7px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font:13px 'IBM Plex Mono';color:var(--fg-locked)}
.bd7{display:flex;flex-wrap:wrap;gap:6px}
.bd7 li{list-style:none;display:flex;flex-direction:column;align-items:center;gap:3px}
.bd7 b{width:30px;height:30px;border-radius:5px;display:flex;align-items:center;justify-content:center;font:600 11.5px 'IBM Plex Mono';background:var(--surface-inset);color:var(--fg-body);border:1px solid var(--border-strong)}
.bd7 b.w{background:color-mix(in oklab,var(--success) 22%,transparent);border-color:var(--success);color:var(--success)}
.bd7 small{font:9.5px 'IBM Plex Mono';color:var(--fg-muted);white-space:nowrap}
.bd7.was small{outline:1px dashed var(--warning)}
.bd7 ol,.bd7{margin:0;padding:0}
.sp7{font:10.5px 'IBM Plex Mono';color:var(--fg-muted);display:flex;justify-content:space-between}
.tip7{position:relative;align-self:flex-start;margin-top:-2px;margin-left:72px;background:var(--elevated);border:1px solid var(--border-strong);border-radius:6px;padding:4px 8px;font:10.5px 'IBM Plex Mono';color:var(--fg)}
.ft7{font:11px/1.7 'IBM Plex Mono';color:var(--fg-muted);background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px 12px}
.ft7 .sg{white-space:nowrap}
.ft7 .dot{color:var(--fg-faint)}
.ft7 .dang{outline:1.5px dashed var(--warning);outline-offset:1px}
.ft7 u{color:var(--accent-text);text-decoration:none}
/* crash + standalone report */
.cr7{display:flex;justify-content:center;padding:22px 0 0}
.cr7 .wm7{display:flex;flex-direction:column;align-items:center;gap:2px}
.cr7 .wm7 em{font-style:normal;font-size:9px;letter-spacing:3px;color:var(--accent-text)}
.cr7 .wm7 b{font:700 26px/1 'Cinzel',serif;color:var(--fg)}
.rp7{flex:1;display:flex;flex-direction:column;padding:18px 16px}
.dk .rp7{align-items:center;padding:40px}
.rp7 .in7{width:100%;max-width:520px}
.rp7 .bk7{font:500 13px 'IBM Plex Sans';color:var(--accent-text);min-height:44px;display:flex;align-items:center}
.rp7 h1{margin:4px 0 12px;font:700 22px 'Cinzel',serif;color:var(--fg)}
.code7{margin-top:10px;font:11px 'IBM Plex Mono';color:var(--fg-faint)}

/* ---------- si7: sign in / sign up ---------- */
.s7err{margin-top:8px;font-size:13px;line-height:1.45;color:var(--danger);text-align:left}
.jfld.s7bad{border-color:var(--danger);color:var(--fg)}
.jcode.s7bad span{border-color:var(--danger)}
.s7legal{display:flex;justify-content:center;gap:16px;margin-top:14px;font:11.5px 'IBM Plex Mono';color:var(--fg-muted)}
.s7legal a{color:var(--fg-muted);text-decoration:underline;text-underline-offset:3px}
.jform .s7hint{margin-top:6px;font-size:12.5px;line-height:1.45;color:var(--fg-muted)}
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


KICK = "Small items 7 · R2 · account 2 · 2026-10-30"


# ---------------------------------------------------------------- Main
@board("Main", "Small items 7 · the calls", 1612)
def main():
    h = bh(KICK, "Undrawn states, two errata, and an addendum",
           "The parts the shipped handoffs left undrawn across the flyer admin, Suggested changes v2, the cart, the tuning hub, sign-in and About, "
           "then the addendum (Suggested changes v2 at turn-on, month-first dates, Report a problem). Each is drawn at 390 and 1300 on its board, "
           "over the shipped screens. Everything else builds from the existing boards. Strings marked draft go through /copy-review. "
           "Approved by Hugh 2026-10-30.")
    calls = note("The calls", "<ol>"
                 "<li><b>Flyer admin</b> (board 1). Launch date: a second row on the launch list card, blank allowed, Save only while changed, Saved + Clear. "
                 "No codes: the admin’s muted empty line; the launch list card stays. Revoke failing: an inline alert in the dialog, refused vs lost touch. "
                 "CSV: <code>email, store, code, added_at</code>, oldest first, <code>the-99-launch-list-YYYY-MM-DD.csv</code>. Print, revoked: no Print or QR, flyer dimmed.</li>"
                 "<li><b>2-credit cue</b> (SC-Cost). Past 10 the stepper gets a <b>2 credits</b> tag; the cost line names source and count; with only the free run the press goes off "
                 "with <b>Change to 10</b> and <b>Get more credits</b>. The tile tag reads “1 credit · 2 above 10”.</li>"
                 "<li><b>Cart, two toasts</b> (Cart-Toasts). Neither wins: on a phone a failed ask stacks 10px above the receipt, which keeps the floor (it holds Undo). "
                 "At most one of each; when the receipt goes, the alert drops to its own place. Desktop unchanged (the slots never meet).</li>"
                 "<li><b>Proposed cuts, short</b> (Cuts-Short). The held height stays (no jump). Recommended B: an “Other tools” tile row fills the space under the notice. C, plain, is the fallback.</li>"
                 "<li><b>Sign in and sign up</b> (Sign-In). In the newcomer frame, on /join’s email-and-code flow, no password. Sign-in: email, code, in; a proven email with no account is offered one. "
                 "Sign-up: email, code, first name, Home; Terms and Privacy under the form.</li>"
                 "<li><b>About, the cart entry</b> (About-Cart). The entry captures the cart (<code>p-cart</code>, <code>d-cart</code>) with five pins; Shop all decks becomes the way-in sentence; ? on the cart lands here.</li></ol>")
    add = note("Addendum", "<ol>"
               "<li><b>The left line beside the 2-credit cue</b>: it keeps counting credits, never runs; above 10 it adds what the run leaves (“5 of 5 free left, 3 after this run”). SC-Cost E.</li>"
               "<li><b>A saved v2 run with v2 off</b>: confirmed as built. It opens read-only like an old run in History: no Apply, Undo or pick, no extra line explaining why.</li>"
               "<li><b>Results’ sticky list head</b>: confirmed as built, opaque on <code>--surface-sunken</code>, as History’s (#2491). The board’s missing fill was an omission.</li>"
               "<li><b>About at v2 turn-on</b>: one entry, not two (it is one tool). The Suggested changes label takes <code>variantOn: SUGGESTED_CHANGES_V2_ENABLED</code>, so turning v2 on marks it New for everyone. "
               "The credits row “1 or 2 credits” is confirmed. Try it shots regenerate at turn-on, as planned.</li>"
               "<li><b>Game history’s 132 slot</b> widens to 156 on desktop (Dates). The year stays off in the current year, on otherwise.</li>"
               "<li><b>Stats beads</b>: no date under a bead. The row is dated once, under its first and last bead; a bead’s date shows on hover or focus and to a screen reader.</li>"
               "<li><b>The phone deck foot</b>: each segment carries its leading “·” and never breaks inside, so no dot dangles.</li>"
               "<li><b>Crash screen and /report</b> (Report-Crash). Wordmark over the shipped error notice; <b>Report a problem</b> goes to a standalone /report with the shipped form and the error code.</li>"
               "<li><b>What’s new, closed offer on the phone</b>: confirmed as shipped in #2476 (Pick layered above the ✕, positions unchanged).</li></ol>")
    errata = note("Errata, recorded", "<ol>"
                  "<li><b>(a) Friend page order</b> (#2444): Decks, Wishlist, Spares, opening on Decks. Redrawn on Friend-Order. <code>ERRATUM-friend-order.md</code>.</li>"
                  "<li><b>(b) Suggested changes v2</b> (#2452): “Why these cards” is its own small call once both lists are final, with no visual change (<code>ERRATUM-why-these-cards.md</code>).</li></ol>"
                  "<h4 style=\"margin-top:12px\">Open, not blocking</h4><ol><li>What reads the flyer launch date (the launch email, /join’s ended states)? Drawn as the field only.</li>"
                  "<li>Sign-in methods beyond the email code (Google, passkeys) are a Clerk setting; if any are turned on they need their own small board.</li></ol>")
    return h + f'<div class="notes">{calls}{add}{errata}</div>'


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


# ---------------------------------------------------------------- 5 Sign in, sign up
def s7card(kind):
    if kind == "in":
        return F.card_back("Welcome back")
    return F.card_face(rules="Build Commander decks from the cards you already own.").replace("From a flyer", "The 99")


LEGAL = '<div class="s7legal"><a>Terms</a><a>Privacy</a></div>'


def auth_state(st):
    email_fld = '<span class="jfld on">sam@example.com</span>'
    code_form = lambda bad=False: ('<div class="jform"><div class="jcode' + (' s7bad' if bad else '') + '">'
                                   + "".join(f"<span>{d}</span>" for d in ("480261" if bad else "4802")) + ('' if bad else '<span class="e">·</span>' * 2) + '</div>'
                                   + ('<p class="s7err" role="alert">That code isn’t right. Check the email and try again.</p>' if bad else '')
                                   + '<span class="jbtn"' + ('' if bad else ' style="opacity:.6"') + '>Confirm</span>'
                                   '<div class="jlinks"><span class="cool">Send a new code in 0:41</span><span>Use a different email</span></div></div>')
    code_body = 'We sent a 6-digit code to <em>sam@example.com</em>. It works for 10 minutes.'
    if st == "in":
        form = f'<div class="jform"><label>Your email</label>{email_fld}<span class="jbtn">Send code</span></div>'
        return s7card("in") + F.jcol("Sign in to The 99", "Type your email. We’ll send it a code, and the code signs you in.", form,
                                     ) + '<p class="jquiet">New to The 99? <a>Make an account</a></p>'
    if st == "in-code":
        return s7card("in") + F.jcol("Check your email", code_body, code_form())
    if st == "in-bad":
        return s7card("in") + F.jcol("Check your email", code_body, code_form(True))
    if st == "in-none":
        form = ('<div class="jform"><span class="jbtn">Make an account with this email</span>'
                '<div class="jlinks"><span>Use a different email</span></div></div>')
        return s7card("in") + F.jcol("No account for that email", '<em>sam@example.com</em> isn’t on The 99 yet. The code proved it’s yours, so you can make one now.', form)
    if st == "up":
        form = f'<div class="jform"><label>Your email</label>{email_fld}<span class="jbtn">Send code</span></div>'
        return (s7card("up") + F.jcol("Make your account", "Type your own email. We’ll send it a code to check it’s yours, then you’ll make your account.", form,
                                      "You start with 15 welcome credits and 3 invites for your friends.")
                + LEGAL + '<p class="jquiet">Already on The 99? <a>Sign in</a></p>')
    if st == "up-name":
        form = ('<div class="jform"><label>Your first name</label><span class="jfld on">Sam</span>'
                '<p class="s7hint">Friends see it on your signature card. Change it any time in Settings.</p>'
                '<span class="jbtn">Make my account</span></div>')
        return s7card("up").replace('<div class="cc tilt">', '<div class="cc tilt" style="position:relative">', 1).replace(
            '</div>', '</div>', 1) + F.jcol("That’s your email", "Now the name your friends will know you by.", form) + LEGAL
    if st == "up-have":
        form = '<div class="jform"><span class="jbtn">Sign in</span><div class="jlinks"><span>Use a different email</span></div></div>'
        return s7card("in") + F.jcol("You already have an account", '<em>sam@example.com</em> is already on The 99. The code proved it’s yours, so Sign in goes straight in.', form)
    raise ValueError(st)


def auth_phone(st):
    return kit.phone(f'<div class="jn">{auth_state(st)}</div>', h=844, hdr=False, tabs=False)


def auth_desk(st, h=780):
    return f'<div class="dk" style="width:1300px;height:{h}px"><div class="main"><div class="jn">{auth_state(st)}</div></div></div>'


@board("Sign-In", "5 · Sign in and sign up in the app’s own frame", 3100)
def sign_in():
    h = bh("5 · /sign-in, /sign-up · replaces Clerk’s hosted pages at public launch", "Sign in and sign up, in the app’s own frame",
           "Drawn in the frame the newcomer pages already use (/join, the invite-only /sign-up): the card, one column, the brass button, "
           "the quiet line under it. Both run on the code flow /join ships: email, a 6-digit code, then in. No password. "
           "Sign-in lands on the page that sent the reader there, or Home; sign-up lands on Home with the welcome strip.")
    row1 = frames(frame(lab("S1", "sign in · 390"), auth_phone("in"), "From the signed-out landing’s <b>Sign in</b>, or any page that needs it."),
                  frame(lab("S2", "the code · 390"), auth_phone("in-code"), "The /join code step as shipped: Confirm wakes at six digits; the resend cools for a minute."),
                  frame(lab("S3", "a wrong code · 390"), auth_phone("in-bad"), "The shipped <code>codeWrong</code> line under the boxes. An expired code says <code>codeExpired</code> there instead."),
                  frame(lab("S4", "no account · 390"), auth_phone("in-none"), "Proven, but nobody has that email: offer to make the account then, without a second code."),
                  frame(lab("S5", "sign in · 1300"), auth_desk("in")))
    row2 = frames(frame(lab("U1", "sign up · 390"), auth_phone("up"), "The invite-only /sign-up becomes this at launch. Terms and Privacy sit under the form, as on every sign-in surface."),
                  frame(lab("U2", "the code"), '<div style="width:390px;font-size:13.5px;line-height:1.55;color:var(--fg-muted)">Same as S2 and S3.</div>'),
                  frame(lab("U3", "your name · 390"), auth_phone("up-name"), "Clerk’s first name, the one the app already reads for the profile. The only extra step."),
                  frame(lab("U4", "already have one · 390"), auth_phone("up-have"), "The email is already on The 99. The code proved it, so one press signs in."),
                  frame(lab("U5", "sign up · 1300"), auth_desk("up")))
    return h + row1 + row2


# ---------------------------------------------------------------- Addendum A: dates
def grow(meta, was=False, w=None, ph=False):
    st = f' style="width:{w}px"' if w else ""
    k = '<span>Ramp early</span><span>Mana screw</span>'
    if ph:
        return (f'<div class="g7" style="flex-wrap:wrap;min-height:64px"><span class="r w">W</span><span class="m{" was" if was else ""}">{meta}</span>'
                f'<span class="v">v3</span><span class="x" style="margin-left:auto;width:44px;height:44px">✕</span><div class="k" style="flex-basis:100%">{k}</div></div>')
    return (f'<div class="g7"><span class="r w">W</span><span class="m{" was" if was else ""}"{st}>{meta}</span><span class="v">v3</span>'
            f'<div class="k">{k}</div><span class="x">✕</span></div>')


def glog(rows, width, ph=False):
    return f'<div class="d7" style="width:{width}px"><span class="hd">Games · 14 logged</span>{rows}</div>'


DATES = [("Jan 4", "W"), ("Dec 31, 2025", "W"), ("Dec 20, 2025", "L")]


def beads(was, ph):
    data = [("W", "Oct 2"), ("L", "Oct 9"), ("W", "Oct 16"), ("L", "Oct 23"), ("W", "Nov 6"), ("W", "Dec 31")]
    n = 6
    if was:
        li = "".join(f'<li><b class="{"w" if r == "W" else ""}">{r}</b><small>{d}{", 2025" if i > 3 else ""}</small></li>' for i, (r, d) in enumerate(data[:n]))
        return f'<div class="d7" style="width:{358 if ph else 560}px"><span class="hd">Every game</span><ol class="bd7 was" style="gap:6px">{li}</ol></div>'
    li = "".join(f'<li><b class="{"w" if r == "W" else ""}">{r}</b></li>' for r, d in data[:n])
    return (f'<div class="d7" style="width:{358 if ph else 560}px"><span class="hd">Every game</span><ol class="bd7">{li}</ol>'
            '<div class="sp7" style="width:' + str(6 * 36 - 6) + 'px"><span>Oct 2, 2025</span><span>Dec 31, 2025</span></div>'
            + ('' if ph else '<span class="tip7">L · Oct 9, 2025</span>') + '</div>')


def foot(was):
    if was:
        return ('<div class="ft7" style="width:358px">v3 · committed Dec 31, 2025 <span class="dang">·</span><br>2 proxies · <u>from the precon ▾</u></div>')
    return ('<div class="ft7" style="width:358px"><span class="sg">v3 · committed Dec 31, 2025</span> '
            '<span class="sg"><span class="dot">·</span>&nbsp;2 proxies</span> <span class="sg"><span class="dot">·</span>&nbsp;<u>from the precon ▾</u></span></div>')


@board("Dates", "A5–A7 · Month-first dates in the three fixed slots", 2400)
def dates():
    h = bh("Addendum · 5, 6, 7 · game-history-row, deck-stats-results, todo-foot", "Month-first dates keep their year, and the slots make room",
           "With dates month first (“Dec 31, 2025”), three fixed slots overflow. The year stays wherever it shows today, because a date from another year "
           "is ambiguous without it; the current year is still dropped where the log already drops it. Each slot is drawn as it overflows now, then the call.")
    cur = [("Jan 4", True), ("Dec 31, 2025", False), ("Dec 20, 2025", False)]
    now_dk = glog("".join(grow(f"4-player · {d}", was=not c, w=132) for d, c in cur), 900)
    new_dk = glog("".join(grow(f"4-player · {d}", w=156) for d, c in cur), 900)
    new_ph = glog("".join(grow(f"4-player · {d}", ph=True) for d, c in cur), 390)
    a = frames(frame(lab("5", "now · 1300 · game history, the 132 slot"), now_dk, "“4-player · Dec 31, 2025” wraps to two lines in 132px (dashed)."),
               frame(lab("5", "call · 1300 · the slot is 156"), new_dk, "156 holds the longest meta, “4-player · Dec 31, 2025”, at 11px mono on one line. The version stamp and the marks keep one vertical."),
               frame(lab("5", "call · 390"), new_ph, "Phone is unchanged: the meta sizes to its text on line one, the marks wrap to line two."))
    b = frames(frame(lab("6", "now · 390 · beads with a date each"), beads(True, True), "A date under each 30px bead is wider than the bead: the beads spread and neighbouring dates run together."),
               frame(lab("6", "call · 390"), beads(False, True), "No date under a bead. The row is dated once, under its ends: the first game and the last. Each bead keeps its date for a screen reader, as shipped."),
               frame(lab("6", "call · 1300"), beads(False, False), "On desktop a bead’s date shows on hover or focus (the shipped tooltip), result first."))
    c = frames(frame(lab("7", "now · 390 · deck foot"), foot(True), "The line wraps after the “·”, which dangles at the end of line one."),
               frame(lab("7", "call · 390"), foot(False), "Each segment keeps its own leading “·” and never breaks inside, so a wrap starts the next line with “· 2 proxies”. Desktop has room on one line and is unchanged."))
    return h + a + b + c


# ---------------------------------------------------------------- Addendum B: crash screen and standalone report
def crash(desk):
    body = ('<div class="cr7"><span class="wm7"><em>◆ ◆ ◆</em><b>99</b></span></div>'
            + F.error_screen(desk).replace("Tell us what happened", "Report a problem")
            + '<p class="code7" style="text-align:center;padding-bottom:24px">error 7f3a91c2</p>')
    if desk:
        return f'<div class="dk" style="width:1300px;height:720px"><div class="main" style="display:flex;flex-direction:column">{body}</div></div>'
    return kit.phone(f'<div style="display:flex;flex-direction:column;min-height:100%">{body}</div>', h=844, hdr=False, tabs=False)


def report_page(desk, state="empty"):
    inner = ('<div class="cr7"><span class="wm7"><em>◆ ◆ ◆</em><b>99</b></span></div><div class="rp7"><div class="in7">'
             '<span class="bk7">‹ Back home</span><h1>Report a problem</h1>' + F.report_form(state, False)
             + ('<p class="code7">Sent with error 7f3a91c2</p>' if state != "sent" else "") + '</div></div>')
    if desk:
        return f'<div class="dk" style="width:1300px;height:820px"><div class="main" style="display:flex;flex-direction:column">{inner}</div></div>'
    return kit.phone(inner, h=844, hdr=False, tabs=False)


@board("Report-Crash", "A8 · The crash screen and a standalone report page", 2600)
def report_crash():
    h = bh("Addendum · 8 · global-error, /report", "When the whole app falls over, Report a problem still works",
           "The crash screen draws without the app shell (the shell is what failed), so it can’t open the in-app sheet. It shows the shipped error notice "
           "under the wordmark, and its link goes to <b>/report</b>: the same form on a page of its own, which also works signed out. "
           "The error code rides along in the link and is sent with the report.")
    a = frames(frame(lab("C1", "crash · 390"), crash(False), "The shipped ErrorNotice (Try again, Back home), with the wordmark in place of the shell. The link reads <b>Report a problem</b>, as the About index does."),
               frame(lab("C2", "crash · 1300"), crash(True)))
    b = frames(frame(lab("R1", "/report · 390"), report_page(False), "The shipped form, whole, in the newcomer frame. ‹ Back home leaves without sending."),
               frame(lab("R2", "sent · 390"), report_page(False, "sent"), "The shipped sent state; Close becomes the way home."),
               frame(lab("R3", "/report · 1300"), report_page(True, "typed")))
    return h + a + b


BOARDS = [(n, (lambda n=n: doc(W[n][1], W[n][0](), W[n][2])), W[n][1]) for n in W]
