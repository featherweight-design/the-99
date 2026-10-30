from ck import *

FIRST_PAID = "Uses a paid credit. 0 of 5 free · reset at 2:01 AM · 114 paid."
AGAIN_PAID = "Replaces these suggestions and uses a paid credit. 0 of 5 free · reset at 2:01 AM · 114 paid."


def sc_press(blocked, desk=False):
    if blocked:
        st = "color:var(--fg-disabled);border:1px solid var(--border-strong)"
    else:
        st = "color:var(--accent);border:1px solid var(--accent)"
    w = "width:auto;padding:0 20px;height:42px" if desk else "width:100%;height:44px"
    return (f'<span style="{st};{w};border-radius:8px;display:flex;align-items:center;justify-content:center;'
            f'font:600 {"14px" if desk else "13.5px"} \'IBM Plex Sans\',sans-serif;flex:none">Suggest changes</span>')


def sc_note(text, desk=False, center=True):
    al = "left" if desk else "center"
    fs = "11px" if desk else "9.5px"
    return f'<span style="display:block;text-align:{al};font:{fs}/1.55 \'IBM Plex Mono\',monospace;color:var(--fg-faint)">{linkify(text)}</span>'


def suggested(state, desk=False):
    lead = ("No games logged yet, so we will read this list, the recommended mix and what you own, "
            "and suggest up to five cards to add and five to cut.")
    blocked = state == "L4"
    text = AGAIN_PAID if state == "L3" else C["line.spent"]
    gm = ""
    if state == "L4":
        gm = (f'<div style="display:flex;justify-content:{"flex-start" if desk else "center"}">{getmore(desk=desk)}</div>')
    if desk:
        act = (f'<div style="display:flex;align-items:center;gap:18px;margin-top:14px">{sc_press(blocked, True)}'
               f'<div style="max-width:420px">{sc_note(text, True)}</div></div>{gm}')
        pad = "22px 28px 24px"
    else:
        act = f'<div style="display:flex;flex-direction:column;gap:8px;margin-top:14px">{sc_press(blocked)}{sc_note(text)}</div>{gm}'
        pad = "16px 16px 18px"
    return (f'<div style="padding:{pad}"><h3 class="disp" style="margin:0;font-size:{19 if desk else 17}px;font-weight:600">Suggested changes</h3>'
            f'<p class="lead" style="margin-top:8px">{lead}</p>{act}</div>')


def synopsis(state, desk=False):
    blocked = state == "L4"
    note = FIRST_PAID if state == "L3" else C["line.spent"]
    pst = "color:var(--fg-disabled)" if blocked else "color:var(--fg)"
    press = (f'<span style="display:inline-flex;align-items:center;justify-content:center;min-height:{36 if desk else 44}px;'
             f'{"width:auto" if desk else "width:100%"};border:1px solid var(--border-strong);border-radius:8px;padding:0 16px;font:500 13px \'IBM Plex Sans\',sans-serif;{pst};flex:none">Write a new overview</span>')
    nt = f'<span style="font:10.5px/1.55 \'IBM Plex Mono\',monospace;color:var(--fg-faint)">{linkify(note)}</span>'
    gm = getmore(desk=desk) if blocked else ""
    row = (f'<div style="display:flex;{"flex-direction:row;align-items:center;gap:16px;flex-wrap:wrap" if desk else "flex-direction:column;gap:9px"};margin-top:6px">{press}{nt}</div>')
    text = ("A Golgari graveyard engine that wins by attrition: Meren returns a creature each end step, "
            "sacrifice outlets turn every chump block into value, and Grave Pact punishes boards.")
    return (f'<div style="padding:{"22px 28px 24px" if desk else "16px 16px 18px"}">'
            f'<span class="k">Overview</span><p style="margin:8px 0 12px;font-size:{14 if desk else 13.5}px;line-height:1.6;color:var(--fg-body)">{text}</p>'
            f'<p style="margin:0;font-size:13px;color:var(--fg-faint)">This overview was written before your latest changes.</p>{row}{gm}</div>')


def tabs(on, desk=False):
    pad = "padding:0 28px" if desk else ""
    return ('<div class="dtabs" style="' + pad + '">' + "".join(
        f'<span class="{"on" if t == on else ""}">{t}{"<small>99</small>" if t == "Cards" else ""}</span>'
        for t in ["Overview", "Cards", "Analysis", "Games"]) + '</div>')


INV = [
    ("Suggested changes", "tuning panel", "<code>first</code> / <code>again</code>", "centered under the press on the phone, left on desktop"),
    ("Deck synopsis", "Overview tab", "<code>first</code>; no note while free credits are left (as shipped)", "under the note"),
    ("Proposed cuts", "Analysis · Tuning", "<code>standing</code> under <code>CreditButton</code>", "under the line (Credit-Line board)"),
    ("Help me choose’s read", "fits view", "<code>standing</code>, <code>first</code>, read band’s <code>again</code>", "under the line"),
    ("Intake read", "intake read panel", "<code>standing</code>", "under the line"),
    ("Analysis banner", "Analysis tab head", "<code>spent</code>", "under the line"),
    ("Method notice", "Overview, method changed", "<code>first</code>", "under the line"),
    ("Empty analysis", "Analysis, no reading yet", "<code>first</code>", "under the line"),
    ("Read band", "fits view, stale read", "<code>again</code>", "under the line"),
]


def board():
    ph, dk = [], []
    for st, lab in [("L3", "free spent, paid held"), ("L4", "out of credits, payments on")]:
        ph.append(frame(f"Suggested changes · {st} · {lab} · 390",
                        f'<div class="cropped" style="width:390px">{tabs("Analysis")}{suggested(st)}</div>',
                        "The shipped outline press. Its line is centered on the phone, so <code>Get more credits</code> is too." if st == "L4" else
                        "The press is live. <code>first</code> and <code>again</code> say <code>uses a paid credit</code> instead of <code>uses a credit</code>, then the free count and the paid total."))
        ph.append(frame(f"Deck synopsis · {st} · 390",
                        f'<div class="cropped" style="width:390px">{tabs("Overview")}{synopsis(st)}</div>',
                        "The synopsis shows no note while free credits are left (as shipped); once they’re spent, the note appears with the paid wording." if st == "L3" else
                        "Out of credits: the shipped spent note, then the link under it."))
        dk.append(frame(f"Suggested changes · {st} · desktop", f'<div class="cropped" style="width:760px">{tabs("Analysis", True)}{suggested(st, True)}</div>', "", width=760))
        dk.append(frame(f"Deck synopsis · {st} · desktop", f'<div class="cropped" style="width:760px">{tabs("Overview", True)}{synopsis(st, True)}</div>', "", width=760))
    body = (
        board_head("Buying credits R1 · §1 · in place", "The same line on every spending surface",
                   "Nothing on a spending surface is redrawn except the line’s words and the one link under it. These four frames show the two other press shapes "
                   "(the outline press and the synopsis row) in L3 and L4; the CreditButton surfaces follow the Credit-Line board exactly. "
                   "Engineering owns the full route and width inventory (the brief); the table says what each surface takes.")
        + '<div class="sec"><h3>Inventory</h3>' + table(INV, ["Surface", "Where", "Draws today", "Get more credits sits"]) + '</div>'
        + '<div class="sec"><h3>Phone · 390</h3><div class="frames">' + "".join(ph) + '</div></div>'
        + '<div class="sec"><h3>Desktop</h3><div class="frames">' + "".join(dk) + '</div></div>'
        + '<div class="note" style="max-width:1600px"><b>The paid prefixes</b><ul>'
          f'<li><code>first</code> with paid next: <code>{FIRST_PAID}</code></li>'
          f'<li><code>again</code> with paid next: <code>{AGAIN_PAID}</code></li>'
          '<li>With free credits left, both keep today’s words; the paid total joins the end as in L2.</li></ul></div>'
    )
    return doc("Buying credits · surfaces", body, 1700, 2400)
