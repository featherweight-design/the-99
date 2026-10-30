from ck import *
from b_line import dtabs_ph, cuts_offer, dk_crop


def del_body(plan=74, packs=40):
    total = plan + packs
    cells = []
    if plan:
        cells.append(f'<span>Plan<b>{plan}</b><em>roll over while subscribed</em></span>')
    if packs:
        cells.append(f'<span>Packs<b>{packs}</b><em>never expire</em></span>')
    says = C["del.says"] if plan and packs else (
        f"Deleting your account forfeits them. Nothing else in Manage account touches them.")
    return (f'<div class="split">{"".join(cells)}</div><p>{says}</p>'
            f'<p class="mute">{C["del.refund"]}</p>'
            f'<span class="pbtn f" style="margin-top:4px">{C["del.go"]}</span>'), total


def interstitial(plan=74, packs=40, desk_=False):
    body, total = del_body(plan, packs)
    return sheet(f"You have {total} paid credits", body, desk_=desk_)


def row_option():
    # the brief's proposal, a row under Friends: drawn for comparison only
    return (f'<div class="scr"></div><div class="amsh"><div class="grab"></div>{id_block(None)}{theme_chips()}'
            '<div class="mi"><span><i></i>About</span><span><i></i>Friends</span>'
            '<span class="new"><i></i>Credits<em style="margin-left:auto;font:normal 11px \'IBM Plex Mono\',monospace;color:var(--fg-faint)">117</em></span>'
            '<span><i></i>Manage account</span><span><i class="dg"></i>Sign out</span></div></div>')


def board():
    page_bg = dtabs_ph() + cuts_offer(cbutton("Look deeper"), cline(C["line.withPaid"], new=False))
    dk_bg = '<div style="padding:30px 40px">' + dk_crop(cbutton("Look deeper", desk=True), cline(C["line.withPaid"], new=False)) + '</div>'
    menu = ('<div class="frames">'
            + frame("A1 · Account menu, holding credits · 390", mphone(page_bg, h=844, check="scroll", over=menu_sheet(C["menu.entry"])),
                    "<b>Call:</b> no new row. The balance sits in the identity block, under the email, as one accent line: the whole line goes to <code>/credits</code> (44px tall on the phone). "
                    "It’s a fact about you, so it lives with your name, and the menu’s list stays About, Friends, Manage account, Sign out.")
            + frame("A2 · Never bought, payments on · 390", mphone(page_bg, h=844, check="scroll", over=menu_sheet(C["menu.entryFree"])),
                    "The free count is the way in to buying. Payments off with nothing ever bought: the line is absent (§6a).")
            + frame("A3 · Option: a row, as the brief proposed · 390", mphone(page_bg, h=844, check="scroll", over=row_option()),
                    "For comparison only. It would be a fifth row, which your standing rule says not to add. A1 keeps the list as it is.")
            + '</div><div class="frames" style="margin-top:44px">'
            + frame("A1 · desktop popover", desk(dk_bg, h=820, check="scroll", menu=True,
                                                 over=menu_pop(C["menu.entry"])), "The popover above the rail’s avatar, 300px as shipped.", width=1300)
            + '</div>')
    dele = ('<div class="frames">'
            + frame("D1 · Manage account, holding paid credits · 390", mphone(page_bg, h=844, check="scroll", over=interstitial()),
                    "The press on Manage account opens this first (the SocialModal sheet). It names the balance by source, says deleting forfeits it, "
                    "and points at the 14-day refund before anyone deletes. One press continues to Clerk’s page; ✕ stays.")
            + frame("D2 · Packs only · 390", mphone(page_bg, h=844, check="scroll", over=interstitial(plan=0, packs=40)),
                    "The split shows only what’s held. Shown whether payments are on or off for the reader.")
            + '</div><div class="frames" style="margin-top:44px">'
            + frame("D1 · desktop", desk(dk_bg, h=820, check="scroll",
                                          over=interstitial(desk_=True)), "The 440 modal, at 12% from the top as shipped.", width=1300)
            + '</div>')
    body = (
        board_head("Buying credits R1 · §2 entry and §7", "The account menu’s entry, and the deletion warning",
                   "Where the billing page is reached from, and the one warning that has to sit outside it. Deletion happens on Clerk’s hosted page, which we can’t change, "
                   "so the warning sits on the hand-off: <code>Manage account</code> shows it first whenever the reader holds paid credits. No paid credits, no interstitial: the press goes straight to Clerk as today.")
        + '<div class="sec"><h3>The entry</h3>' + menu + '</div>'
        + '<div class="sec"><h3>§7 · The deletion warning</h3>' + dele + '</div>'
    )
    return doc("Buying credits · menu and deletion", body, 2770, 4000)
