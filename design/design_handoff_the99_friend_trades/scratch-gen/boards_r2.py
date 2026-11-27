# Friend trades R2 (2026-11-27): writes the canvas index and every board. Frames are /_blob webp uploads of the SSR
# renders (art/blobs.txt), drawn at CSS size (art/sizes.json, half the 2x shot).
import json, html, os, sys
ART, OUT = sys.argv[1], sys.argv[2]
B = dict(l.split() for l in open(f"{ART}/blobs.txt"))
SZ = json.load(open(f"{ART}/sizes.json"))
os.makedirs(f"{OUT}/project", exist_ok=True)
def e(s): return html.escape(s, quote=True)
HEAD = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>{t}</title>\n<script src="./support.js"></script>\n</head>\n<body>\n<x-dc>\n<helmet>\n<style>\nbody{{margin:0}}\n</style>\n</helmet>\n'
FOOT = '</x-dc>\n<script type="text/x-dc" data-dc-script data-props=\'{{"$preview":{{"width":{w},"height":{h}}}}}\'>\nclass Component extends DCLogic {{\nrenderVals() {{ return {{}}; }}\n}}\n</script>\n</body>\n</html>\n'
ROOT = "box-sizing: border-box; background: #161412; color: #e9e3d8; font-family: system-ui, -apple-system, sans-serif"
MONO = "margin: 0; font-family: ui-monospace, monospace; font-size: 12px; letter-spacing: .1em; color: #9a917f"
NEW = "margin: 0; font-family: ui-monospace, monospace; font-size: 11px; letter-spacing: .12em; color: #e0a15e"

def row(fid, title, sub):
    dw, dh = SZ[f"{fid}-desk"]; pw, ph = SZ[f"{fid}-phone"]
    cols = []
    for dev, w, h, lab in (("desk", dw, dh, "Desktop"), ("phone", pw, ph, "Phone")):
        cols.append(f'<div style="display: flex; flex-direction: column; gap: 10px; width: {w}px"><p style="{MONO}">{fid} · {lab.upper()}</p>'
                    f'<img src="/_blob/{B[fid + "-" + dev]}" alt="{e(title)}, {lab.lower()}" style="width: {w}px; height: {h}px; border-radius: 10px; display: block"></div>')
    lines = 1 + len(sub) // 190
    x = (f'<div style="display: flex; flex-direction: column; gap: 14px">'
         f'<p style="margin: 0; font-size: 22px; font-weight: 700">{e(title)}</p>'
         f'<p style="margin: 0; font-size: 15px; line-height: 1.55; color: #b9b1a3; max-width: 1700px">{e(sub)}</p>'
         f'<div style="display: flex; gap: 60px; align-items: flex-start">{"".join(cols)}</div></div>')
    return x, 29 + 14 + 24 * lines + 14 + 24 + max(dh, ph)

def board(name, title, lead, rows):
    parts, H = [], 0
    if lead:
        parts.append(f'<div style="display: flex; flex-direction: column; gap: 10px"><p style="{NEW}">R2 · 2026-11-27</p><p style="margin: 0; font-size: 30px; font-weight: 700">{e(title)}</p><p style="margin: 0; font-size: 16px; line-height: 1.6; color: #cfc7b8; max-width: 1700px">{e(lead)}</p></div>')
        H += 20 + 10 + 40 + 10 + 26 * (1 + len(lead) // 180) + 70
    for r in rows:
        x, h = row(*r); parts.append(x); H += h
    W = 64 + 1300 + 60 + 390 + 64
    H = int(48 + 64 + H + 70 * (len(rows) - 1) + 200)
    body = f'<div style="width: {W}px; min-height: {H}px; padding: 48px 64px 64px; {ROOT}; display: flex; flex-direction: column; gap: 70px">' + "".join(parts) + "</div>\n"
    open(f"{OUT}/project/{name}", "w").write(HEAD.format(t=e(title)) + body + FOOT.format(w=W, h=H))
    return W, H

BOARDS = [
 ("Merge.dc.html", "One Spares tab: the trade lives where the spares are", "Spares and Trade were two tabs over the same cards, so R2 folds them into one. The strip is back to Decks, Wishlist, Spares. Each spare tile keeps its Ask (press the card) and gains + Trade under it. Once a trade has a card, its box heads the tab and a switch (Colin's spares, Your spares) sits over the shipped search and filters, so you pick both sides from the same grid. While a trade waits on you, the Spares figure carries the accent diamond. /friends/{id}/trade goes away; links that pointed there open /friends/{id}/spares.", [
   ("M0", "M0 · Colin's Spares tab, no trade yet", "The shipped tab: the line now reads 'Press one to ask for it, or add it to a trade.' Every tile has + Trade beside its count. Nothing else is added until you pick."),
   ("M1", "M1 · Two of Colin's, one of yours: Propose a trade to Colin", "The R1 box heads the tab. The switch is on Colin's spares; picked tiles are ringed with ✓ In the trade. Send offer sits in the box's foot."),
   ("M1b", "M1b · Nothing on your side yet, switched to Your spares", "The same grid lists your spares. Send waits until both sides have a card, and the foot line says what it waits on."),
 ]),
 ("FromDeck.dc.html", "From a deck or All shopping: trade without leaving", "The spares sheet a deck row or an All shopping row opens now has Trade beside Ask on each friend. Trade pushes a trade body inside the same sheet (← Friends' spares goes back): the card you need is already on the friend's side, and the picker opens on your spares. Send offer turns the sheet into its receipt. Done closes it and you're still on the list; Open the trade goes to the friend's Spares tab, whose back link names where you came from. A friend you already have a live trade with shows Trade open › instead (one trade per pair, Q2). The deck page's stand-ins sheet lists the same friend rows, so it gets the same Trade press.", [
   ("D0", "D0 · All shopping, as shipped", "Rows with a friend's spare carry the shipped spare press. Nothing here changes."),
   ("D1", "D1 · The sheet: Trade beside Ask", "Colin has no trade with you, so Trade. Chris has one live, so Trade open ›. Ask is unchanged."),
   ("D2", "D2 · Trade with Colin, in the sheet", "Ghalta (the card you pressed) is on Colin's side. The picker opens on your spares, three across on a phone, four on desktop. You can switch to Colin's spares to add more of his."),
   ("D3", "D3 · Lathliss picked: Send offer", "The box totals each side as R1 does. Send offer appears once both sides have a card."),
   ("D4", "D4 · Sent", "The sheet's receipt says where the trade now lives. Done closes the sheet; you never left the list."),
   ("D5", "D5 · Open the trade: Colin's Spares tab, back to All shopping", "Opened from the sheet, the back link reads ‹ All shopping (or ‹ the deck's name from a deck page) in place of ‹ Friends."),
 ]),
 ("MakeTrade.dc.html", "Make it a trade: the Yes, the receipt, the trade", "R1's Ask back, renamed and drawn end to end (items 2 and 3). Peter asks for your spare Lathliss. You say Yes. The receipt, now 'You're giving Lathliss to Peter', offers Make it a trade ›. That opens Peter's Spares tab with Lathliss on your side, marked YOUR YES, and the box explains why it's there. You pick what you'd like back from Peter's spares and Send. The yes stands whatever Peter answers.", [
   ("A0", "A0 · Friends, Waiting on you: Peter's ask", "As shipped: Yes, No and the days left."),
   ("A1", "A1 · After Yes: the receipt with Make it a trade ›", "'You're sparing' is gone: 'You're giving Lathliss to Peter'. Make it a trade › is the receipt's one press."),
   ("A2", "A2 · The same receipt leading Home, with trade rows in What's new", "The full Home page: the lead's filled press is Make it a trade ›; below it, What's new carries the four trade feed rows in flow."),
   ("A3", "A3 · Make it a trade with Peter", "Lathliss sits on your side as YOUR YES, with the line 'Lathliss is the yes you already gave Peter. It sits here so the two read as one trade. Pick what you'd like back.' The foot: Send, and 'Peter has 14 days to answer. Your yes on Lathliss stands either way.'"),
 ]),
 ("Answer.dc.html", "Offers, counters and needs a look: Counter in the Yes and No row", "Item 4: Counter now sits in the same AnswerPresses row as Yes and No, before the days left, drawn as No's twin in accent ink. Needs a look (T10) shows Yes held, since the trade can't be accepted as it is, with No and Counter live.", [
   ("M3", "M3 (T3) · Colin's offer to you", "Yes · No · Counter · 13 days left. The tiles below still ask; the line says to counter to change the cards."),
   ("M5", "M5 (T5) · Peter's counter to your offer", "The same row, then 'Replaces your offer of Nov 24.'"),
   ("M10", "M10 (T10) · Needs a look: Sai is no longer available", "The card tag and every line now say 'No longer available' (item 5). Yes is held; No and Counter work."),
   ("M4", "M4 (T4) · Your counter, being made", "Composing again: the tiles take + Trade, and the switch is on Your spares."),
   ("M6", "M6 (T6) · Your offer to Max, waiting", "Withdraw and Waiting on Max, as R1."),
 ]),
 ("Accepted.dc.html", "Accepted, marked traded, traded", "The R1 states, now on the Spares tab.", [
   ("M7", "M7 (T7) · Chris accepted", "Mark traded, the hand-over line, Call it off."),
   ("M8", "M8 (T8) · Colin marked it traded", "The Spares figure carries the diamond: this waits on you."),
   ("M8b", "M8b · You marked it traded", "Waiting on Colin."),
   ("M9", "M9 (T9) · Traded by both", "The success wash. The tiles take + Trade again, so a new trade can start from the grid."),
 ]),
 ("Trades.dc.html", "The Trades list: five, then the rest in Request history", "Item 6. The Requests box's Trades tab lists five trades, the ones waiting on you first. Past five, the box's foot says how many more there are, and how many of them wait on you, beside the existing Request history › link. Request history gains a Trades tab with every trade, live and ended (G5).", [
   ("L1", "L1 · Thirteen trades, seven waiting on you", "Five rows, then '◆ 2 more waiting on you · 8 in all' and Request history ›. Friends stays in view on a phone."),
   ("L2", "L2 · More trades, none of them waiting", "The foot reads '4 more trades' in muted ink."),
   ("RH", "RH · Request history › Trades", "Every trade in the Trades row's form. Ended trades clear with ✕ as before."),
   ("E3", "E3 · No trades yet", "The empty copy names all three ways in: a friend's Spares tab, Trade on a deck's spare, and Make it a trade."),
 ]),
 ("HomeSettings.dc.html", "Home, Settings and an empty side", "", [
   ("N2", "N2 · An offer leading Home", "The whole page: Colin's offer leads, What's new below."),
   ("S1", "S1 · Settings, the whole page", "Store, Notifications with the Trades row (on in app and push), Spares, Kept back, Your decks."),
   ("E1", "E1 · You have no spares to offer", "Max's tab with the switch on Your spares: what a spare is, in the shipped empty block."),
 ]),
]

MAIN_W = 1500
def main():
    sec = lambda t: f'<p style="margin: 28px 0 0; {NEW}">{e(t)}</p>'
    p = lambda t, c="#cfc7b8": f'<p style="margin: 0; font-size: 16px; line-height: 1.6; color: {c}">{t}</p>'
    li = lambda items: '<ul style="margin: 0; padding-left: 22px; display: flex; flex-direction: column; gap: 8px; font-size: 16px; line-height: 1.55; color: #cfc7b8">' + "".join(f"<li>{x}</li>" for x in items) + "</ul>"
    b = lambda t: f'<b style="color: #e9e3d8">{e(t)}</b>'
    parts = [
      f'<p style="{NEW}">FRIEND TRADES · R2 · 2026-11-27</p>',
      '<p style="margin: 0; font-size: 40px; font-weight: 700">Friend trades, round 2</p>',
      p("R2 of PR #3401, picked up from the other account's R1 and your R1 feedback, plus your two asks from this morning. Every frame is the shipped app rendered from main with the proposal applied, as a full page at 390 and 1300."),
      sec("WHAT CHANGED"),
      li([
        b("One Spares tab.") + " Trade folds into Spares: the strip is Decks, Wishlist, Spares again. Tiles keep Ask and gain + Trade; the trade box heads the tab once it has a card.",
        b("Trade from a deck or All shopping.") + " Trade sits beside Ask in the spares sheet, and the whole trade is made in that sheet. You never leave the list. Open the trade gets a back link to where you came from.",
        b("Make it a trade") + " replaces Ask back, drawn end to end: the Yes, the receipt, then the trade with your yes card marked YOUR YES and a line saying why it's there.",
        b("“You’re giving Lathliss to Peter”") + " replaces “You’re sparing…”. Copy pass: the Yes and No labels for screen readers now say “Yes, give Lathliss to Peter” and “No, keep Lathliss”. “X can spare Y” and “to spare” stay, as they read naturally.",
        b("Counter in the Yes and No row") + " on T3, T5 and T10. On needs a look, Yes is held.",
        b("“No longer available”") + " on the card tag and in every needs-a-look line.",
        b("Trades list capped at five,") + " with “◆ 2 more waiting on you · 8 in all” beside Request history ›, and a Trades tab in Request history (G5).",
        b("Full pages") + " around everything: Friends, Home, the friend page, All shopping, Request history and Settings.",
      ]),
      sec("ASK BACK: NAME OPTIONS (ITEM 3)"),
      li([b("Make it a trade (drawn, recommended).") + " Says what happens: your yes becomes one side of a trade.",
          b("Ask for one back.") + " Plain, but reads as a second ask, not a trade.",
          b("Trade for it.") + " Short, but on a receipt for a card you gave it's unclear what “it” is. I've used plain “Trade” for the sheet press instead."]),
      sec("QUESTIONS FOR YOU"),
      li([b("Q5. The yes card in Make it a trade.") + " Drawn (recommended): Lathliss sits on your side, marked YOUR YES, so the two asks read as one trade (Colin's example from the brief). The other way: the trade lists only what you'd like back and the yes stands alone, but then nothing links the two.",
          b("Q6. The tab's name.") + " Drawn (recommended): it stays “Spares”, with the accent diamond when a trade waits on you. The other way: “Spares & trades”.",
          b("Q7. A live trade and the grid.") + " Drawn: while a trade is sent or waiting, tiles only ask, and the line says to Counter to change cards. Composing (a draft, a counter, after Traded) brings + Trade back.",
          b("Q8. The sheet from a deck") + " opens the picker on your spares, since the card you need is already on their side. Their spares are one press away on the switch."]),
      sec("STILL OPEN"),
      p("Engineering gaps G1 to G4 and G6 from R1. The /trade route goes away (G7): old links redirect to /spares. The trade sheet needs the friend's spares read in the sheet (G8), the same read the Spares tab makes. The build prompt needs updating after you approve."),
    ]
    H = 1900
    body = f'<div style="width: {MAIN_W}px; min-height: {H}px; padding: 56px 64px 64px; {ROOT}; display: flex; flex-direction: column; gap: 14px">' + "".join(parts) + "</div>\n"
    open(f"{OUT}/project/Main.dc.html", "w").write(HEAD.format(t="Friend trades R2") + body + FOOT.format(w=MAIN_W, h=H))
    return MAIN_W, H

idx = {"v": 3, "createdOnFiles": {"v": 1, "at": "2026-11-27T16:00:00Z"}, "title": "Friend trades R2", "launch": {"view": "canvas"}, "pages": [], "boards": {}, "order": [], "notes": {}, "designSystems": []}
mw, mh = main()
idx["boards"]["Main.dc.html"] = {"x": 0, "y": 0, "w": mw, "h": mh, "title": "Main · what changed, names, questions"}
idx["order"].append("Main.dc.html")
x, y, rowh = mw + 80, 0, mh
SPLIT = []
for name, title, lead, rows in BOARDS:
    chunks, cur, tot = [], [], 300 if lead else 0
    for r in rows:
        hh = max(SZ[r[0] + "-desk"][1], SZ[r[0] + "-phone"][1]) + 180
        if cur and tot + hh > 7400:
            chunks.append(cur); cur, tot = [], 0
        cur.append(r); tot += hh
    chunks.append(cur)
    for k, c in enumerate(chunks):
        SPLIT.append((name if k == 0 else name.replace(".dc.html", f"-{k + 1}.dc.html"), title if k == 0 else f"{title} (cont.)", lead if k == 0 else "", c))
for i, (name, title, lead, rows) in enumerate(SPLIT):
    w, h = board(name, title, lead, rows)
    if x + w > 6000:
        x, y, rowh = 0, y + rowh + 120, 0
    idx["boards"][name] = {"x": x, "y": y, "w": w, "h": h, "title": title}
    idx["order"].append(name)
    x += w + 80; rowh = max(rowh, h)
json.dump(idx, open(f"{OUT}/project/canvas.json", "w"), indent=1)
print({k: (v["x"], v["y"], v["w"], v["h"]) for k, v in idx["boards"].items()})
