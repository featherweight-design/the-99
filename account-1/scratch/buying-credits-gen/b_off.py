from ck import *
from b_line import ph_crop, cuts_offer

NF = ('<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px;height:100%;'
      'background:radial-gradient(520px 300px at 50% 70%,color-mix(in oklab,var(--accent) 7%,transparent),transparent 70%)">'
      '<span class="disp" style="font-size:48px;font-weight:900;color:var(--elevated);letter-spacing:.04em;line-height:1">404</span>'
      '<h1 class="disp" style="margin:2px 0 0;font-size:21px;font-weight:700">There’s no page here.</h1>'
      '<p style="margin:10px 0 0;font-size:13.5px;line-height:1.6;color:var(--fg-body);max-width:300px">I checked. Twice. Probably a typo in the URL.</p>'
      '<div style="display:flex;flex-direction:column;gap:12px;margin-top:24px;width:200px"><span class="pbtn f" style="font-size:13px">Back home</span>'
      '<span class="pbtn n" style="font-size:13px">View decks</span></div></div>')

BLOCKED = dict(bal=balance((3, 5), plan=74, packs=0, new=False), plan="active", blocked=True)
OFF = dict(bal=balance((3, 5), plan=74, packs=40, new=False), plan="active", buy=False)
OFF_C = dict(bal=balance((3, 5), plan=74, packs=40, plan_ends=True, new=False), plan="cancelled", buy=False)
OFF_BAL = dict(bal=balance((3, 5), packs=40, new=False), plan="none", buy=False,
               hist=[("Oct 2", C["hist.pack"], "$5.00", "40 credits"), ("Sep 18", C["hist.pack"], "$5.00", "40 credits")])


def board():
    blk = ('<div class="frames">'
           + frame("B1 · Blocked by a dispute · 390 · full length", mphone(page(**BLOCKED), h=None),
                   "The buy controls (packs, subscribing, Keep my plan) are replaced by one calm band with the support address. "
                   "The revoked credits are simply gone from the count (Packs reads 0 here: those were the disputed pack’s). The plan can still be cancelled and its card updated. "
                   "No other page says anything; credit lines read as usual, and <code>Get more credits</code> still leads here, where the pause is explained.")
           + frame("B1 · desktop", desk(page(**BLOCKED), h=None), "", width=1300) + '</div>')
    off_none = ('<div class="frames">'
                + frame("O1 · Off, nothing ever bought · the line", ph_crop(cuts_offer(cbutton("Look deeper", spent=True), cline(C["line.spent"]))),
                        "Exactly as shipped: no <code>Get more credits</code>, no disabled stand-in.")
                + frame("O1 · the account menu", mphone("", h=844, check="scroll", over=menu_sheet(None)),
                        "No credits line in the menu.")
                + frame("O1 · /credits", mphone(NF, h=844), "The route is not found (the shipped 404), so a stale link lands somewhere true.")
                + '</div>')
    off_some = ('<div class="frames">'
                + frame("O2 · Off, with a plan · 390 · full length", mphone(page(**OFF), h=None),
                        "The reduced page: balances, Your plan with Cancel plan and Update card, history and the refund line. No packs on sale, no Subscribe. The menu entry stays.")
                + frame("O3 · Off, plan cancelled · 390 · full length", mphone(page(**OFF_C), h=None),
                        "Keep my plan is a purchase, so it goes too; the expiry is still said on the card and in the cell.")
                + frame("O4 · Off, packs only · 390 · full length", mphone(page(**OFF_BAL), h=None),
                        "A pack balance outlives the switch: the page stays for the balance and the receipts. With nothing to buy, the page has no offers section at all.")
                + '</div>'
                + '<div class="frames" style="margin-top:44px">' + frame("O2 · desktop", desk(page(**OFF), h=None), "", width=1300) + '</div>')
    body = (
        board_head("Buying credits R1 · §5 and §6", "Disputed or blocked, and payments switched off",
                   "Both take buying away and leave everything else. The rule for both: <b>absent, never disabled</b>. No greyed buy button, no teaser, no “coming soon”.")
        + '<div class="sec"><h3>§5 · Disputed or blocked</h3>' + blk + '</div>'
        + '<div class="sec"><h3>§6a · Payments off, and the reader has never paid: nothing changes</h3>' + off_none + '</div>'
        + '<div class="sec"><h3>§6b · Payments off, and the reader has a plan, a balance or receipts</h3>' + off_some + '</div>'
    )
    return doc("Buying credits · blocked and off", body, 2770, 6000)
