# Friend trades handoff (2026-11-27, Hugh approved R11): the final boards, every frame re-rendered from the final code.
# Run from the scratch root: python3 dz/boards_final.py final handoff  (frames in final/<id>-<desk|phone>.webp)
import json, sys
src = open("dz/boards_r2.py").read()
head = src[:src.index("BOARDS = [")].replace("R2 · 2026-11-27", "HANDOFF · 2026-11-27")
head = head.replace('B = dict(l.split() for l in open(f"{ART}/blobs.txt"))', 'B = {k: k + ".webp" for k in json.load(open(f"{ART}/sizes.json"))}')
head = head.replace("/_blob/{B[", "art/{B[")
exec(head)

BOARDS = [
 ("Spares.dc.html", "A friend's Spares tab", "Trades live on the friend's Spares tab; there is no Trade tab. The strip stays Decks, Wishlist, Spares. Top to bottom: the Trades with Colin box (only when a trade is live), the Wanted call-out (the Wishlist tab's You have it parts), the All / You want switch with the key line, the shipped search, Filters and Sort, then the tiles. A tile ends in at most two half-width chips: a gray count with no icon ('1 spare', Collection's quantity ink), and why you want it ('Wishlist' with a bookmark, plus a dashed dot when a deck also needs it; or 'A deck' with the dashed dot). While your ask is open, or after a yes, the count chip says 'Asked' (accent) or 'Agreed' (success) instead.", [
   ("S0", "S0 · Colin's Spares tab, no trade yet", "Wanted: 'Colin has 4 cards you want' (bookmark) and 'Colin wants 2 of your spares' (two-people glyph in fact blue) with a Trade press. All 12."),
   ("S0w", "S0w · You want · 4, with asks", "The switch on You want. Miku: Asked | Wishlist. Sai: Agreed | A deck."),
   ("S4", "S4 · With trades open", "Trades with Colin heads the tab: one row per live trade (TradeRows), each with its press. Foot: Propose another trade."),
   ("S9", "S9 · Your offer is waiting (the cap)", "One unanswered offer per friend (Q10). Propose another trade is held, with 'Resolve your open trade before proposing another.' Accepted trades don't count toward the cap."),
 ]),
 ("Ask.dc.html", "Asking for a spare stays first", "Pressing a tile opens the shipped spares sheet. Ask stays the primary press; Trade sits beside it, quiet (outline), with the how-line 'Ask and they give it to you. Trade to offer one of your spares for it.' A friend you already have an unanswered offer with shows 'Offer waiting' in place of Trade. The same sheet opens from a deck or All shopping.", [
   ("S1", "S1 · Press a spare on Colin's tab", "Colin: Trade, Ask. The 'wants your Lathliss' line uses the spare glyph in fact ink."),
   ("D1", "D1 · The same sheet from All shopping", "Colin: Trade, Ask. Chris: Offer waiting, Ask."),
 ]),
 ("Propose.dc.html", "Proposing a trade: one sheet", "Trade opens the trade sheet: 'Propose a trade to Colin' (two sides, each with its own total, the store provenance once), then the picker. The picker's switch is a bare SegmentedSwitch (Colin's spares / Your spares), a line on wishlist matches (listed first), and the key line ('wants it', 'already offered'). Each tile: the card, Add 10px under it ('✓ In the trade' once picked, ringed), then one line of half-width chips. Wants (fact blue, two-people glyph) only ever names this trade's friend. Offered (muted, out-arrow) names the one friend, or 'N friends' for several; on a phone a several-friends chip drops its arrow so 'N friends' fits (10.5px text under 375 wide). Chips are filtered, so a lone Offered slides left. The Offered chip is a press: a popover 'Also in your offers to' lists each friend with 'Waiting · N days left' and Open ›. A spare may be in two offers (Q9).", [
   ("S2", "S2 · Propose a trade, nothing picked yet", "Empty sides are card slots with +; the foot says what Send waits on."),
   ("S3", "S3 · Picking your side", "Ghalta from Colin, Lathliss from you: Send offer, 'Colin has 14 days to answer.'"),
   ("S3t", "S3t · The picker, drawn whole", "Lathliss: Colin. Dina: Colin | 2 friends. Zimone: Max, on the left."),
   ("S3p", "S3p · Offered pressed", "Dina's '2 friends' open: Peter, Waiting · 12 days left, Open ›. Chris, Waiting · 9 days left, Open ›."),
 ]),
 ("Answer.dc.html", "Reading and answering a trade", "Every trade opens in the same sheet. Yes, No and Counter sit side by side, with the days left to their right (no added height). A counter marks cards ADDED (ringed) and TAKEN OUT (faded), with 'was $N' under each total. A card that left the friend's spares shows a danger-tint ⊘ badge on the card itself ('No longer available'), not a line of text.", [
   ("S5", "S5 · Colin's offer", "Yes, No, Counter, 13 days left."),
   ("T5", "T5 · Colin's counter", "ADDED and TAKEN OUT, was lines, 'Replaces your offer of Nov 24.'"),
   ("S8", "S8 · Your counter, being made", "The picker under the box; Send counter, Keep their offer."),
   ("S7", "S7 · Needs a look", "Sai is no longer available: the badge on the card. Yes is held until the trade changes; No and Counter stay."),
 ]),
 ("Waiting.dc.html", "Waiting, accepted and traded", "Your own offer reads 'Your offer' with the days left, Withdraw and 'Waiting on Colin.' Accepted: Mark traded and Rescind trade side by side. Each side marks it traded; once both have, the sheet reads Traded, and the collection does not change on its own.", [
   ("T6", "T6 · Your offer, waiting on Colin", "Days left in the band; Withdraw."),
   ("S6", "S6 · Accepted", "Mark traded and Rescind trade side by side."),
   ("T8", "T8 · Colin marked it traded", "Mark traded, with the line naming Colin's mark."),
   ("T8b", "T8b · You marked it traded", "Waiting on Colin to mark it too."),
   ("T9", "T9 · Traded", "'Traded Nov 27. Your collection stays as it is until you change it.' Propose a new trade."),
 ]),
 ("FromDeck.dc.html", "Trading from a deck or All shopping", "Trade in the spares sheet opens the trade sheet over the list, so you never leave the deck or the cart. The card you pressed is already on the friend's side and the picker opens on your spares. After Send: Done (stay) or Open the trade › (the friend's Spares tab, with ‹ All shopping or ‹ the deck's name as its back link).", [
   ("D2", "D2 · Trade with Colin, from All shopping", "Ghalta on Colin's side; picking yours."),
   ("D3", "D3 · Ready to send", "Lathliss picked: Send offer."),
   ("D4", "D4 · Sent", "'Offer sent to Colin', with where it now lives. Done, Open the trade ›."),
 ]),
 ("MakeTrade.dc.html", "Make it a trade from a Yes", "When you say Yes to a friend's ask, the receipt reads 'You're giving Lathliss to Peter' and offers Make it a trade ›, which opens the trade sheet with your yes on your side (YOUR YES). The yes stands whatever they answer. Days left sit right of Yes and No on every request row.", [
   ("A0", "A0 · Friends, Waiting on you", "Peter's ask: Yes, No, days left to the right."),
   ("A1", "A1 · After Yes", "The receipt with Make it a trade ›."),
   ("A2", "A2 · The same receipt leading Home", "What's new carries the trade rows in flow."),
   ("A3", "A3 · Make it a trade with Peter", "Lathliss as YOUR YES; pick what you'd like back."),
   ("H1", "H1 · A spare request in What's new", "Days left beside Yes and No."),
 ]),
 ("Lists.dc.html", "Trades lists, Home and Settings", "Friends > Requests gains a Trades tab: five rows (waiting on you first), then a foot naming the rest, which live in Request history > Trades. Home leads with an offer waiting on you; feed kind trade has one row per push (offer, counter, accept, decline). Settings gets a Trades row, on by default in app and push.", [
   ("L1", "L1 · Thirteen trades, seven waiting on you", "Five shown; the foot names the rest."),
   ("L2", "L2 · More trades, none of them waiting", ""),
   ("E3", "E3 · No trades yet", "The Requests box's empty state."),
   ("RH", "RH · Request history › Trades", "Every trade, live and ended."),
   ("N2", "N2 · An offer leading Home", ""),
   ("ST", "ST · Settings › Notifications", "The Trades row."),
 ]),
]

MAIN_W = 1500
def main():
    p = lambda t: f'<p style="margin: 0; font-size: 16px; line-height: 1.6; color: #cfc7b8">{t}</p>'
    sec = lambda t: f'<p style="margin: 26px 0 0; {NEW}">{e(t)}</p>'
    li = lambda items: '<ul style="margin: 0; padding-left: 22px; display: flex; flex-direction: column; gap: 8px; font-size: 16px; line-height: 1.55; color: #cfc7b8">' + "".join(f"<li>{e(x)}</li>" for x in items) + "</ul>"
    parts = [
      f'<p style="{NEW}">FRIEND TRADES · HANDOFF · 2026-11-27</p>',
      '<p style="margin: 0; font-size: 40px; font-weight: 700">Friend trades</p>',
      p("Approved by Hugh after eleven rounds (R1 to R11). Every frame here is rendered from main with scratch-gen/proposal.diff applied, at 1300 and 390 css px; sheets are drawn whole. README.md has the calls, STATES.md the states and strings, READINESS.md the verdict."),
      sec("BOARDS"),
      li(["Spares: the friend's Spares tab, Trades with X, Wanted, the two tile chips, the cap",
          "Ask: the spares sheet, Ask primary, Trade quiet",
          "Propose: the trade sheet and its picker, the Wants and Offered chips, the Offered popover",
          "Answer: offer, counter, making a counter, needs a look",
          "Waiting: your offer, accepted, marked traded, traded",
          "FromDeck: trading from a deck or All shopping",
          "MakeTrade: Make it a trade from a Yes; days left beside Yes and No",
          "Lists: Friends › Trades, Request history › Trades, Home, Settings"]),
      sec("DECIDED"),
      li(["No Trade tab: trades live on the friend's Spares tab",
          "Q9: a spare may sit in two offers; the picker shows who else it's offered to",
          "Q10: one unanswered offer per friend; accepted trades don't count",
          "Numbers always carry a word ('2 friends', '1 spare')"]),
    ]
    H = 980
    body = f'<div style="width: {MAIN_W}px; min-height: {H}px; padding: 56px 64px 64px; {ROOT}; display: flex; flex-direction: column; gap: 14px">' + "".join(parts) + "</div>\n"
    open(f"{OUT}/project/Main.dc.html", "w").write(HEAD.format(t="Friend trades") + body + FOOT.format(w=MAIN_W, h=H))
    return MAIN_W, H

idx = {"title": "Friend trades", "boards": {}, "order": []}
mw, mh = main()
idx["boards"]["Main.dc.html"] = {"x": 0, "y": 0, "w": mw, "h": mh, "title": "Friend trades"}; idx["order"].append("Main.dc.html")
x, y, rowh = mw + 100, 0, mh
for name, title, lead, rows in BOARDS:
    w, h = board(name, title, lead, rows)
    if x + w > 8000: x, y, rowh = 0, y + rowh + 140, 0
    idx["boards"][name] = {"x": x, "y": y, "w": w, "h": h, "title": title}; idx["order"].append(name)
    x += w + 100; rowh = max(rowh, h)
json.dump(idx, open(f"{OUT}/project/canvas.json", "w"), indent=1)
print({k: (v["x"], v["y"], v["w"], v["h"]) for k, v in idx["boards"].items()})
