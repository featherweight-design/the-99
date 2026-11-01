"""4 · Home: an open table you are seated at leads Home, phone and desktop."""
import lib as L, re
S = L.mh()
PH_BUSY = L.first(L.frame(S, '<b>A busy feed</b> · 390'), '<div class="ph"')
PH_DAY = L.first(L.frame(S, '<b>A normal day</b> · 390'), '<div class="ph"')
DK_BUSY = L.first(L.frame(S, '<b>A busy feed</b> · 1300'), '<div class="dk"')
TC_OLD = L.first(PH_BUSY, '<div class="tc"')
DTC_OLD = L.first(DK_BUSY, '<div class="tc"')

CSS = """<style>
.tc.ztc{gap:10px}
.dk .tc.zw{flex-direction:row;align-items:center;gap:22px;padding:16px 18px}
.dk .tc.zw .zl1{display:flex;flex-direction:column;gap:8px;flex:none;width:230px}
.dk .tc.zw p{flex:1;min-width:0;margin:0}
.dk .tc.zw .ba{width:auto;flex:none;height:40px;font-size:13.5px}
.tc .zini{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font:500 11px 'IBM Plex Mono';color:var(--fg-muted);background:var(--elevated);border:1px solid var(--border-strong)}
.zstack{display:flex;flex-direction:column;gap:10px}
.new:not(.znew),.later{outline:none!important}
.later::after{display:none}
.tc.zold{outline:1.5px dashed rgba(198,83,63,.85)}
</style>"""

FACES = ['rz-ghalta.jpg', 'rz-zimone.jpg', 'rz-ashling.jpg', 'rz-gisa.jpg']
CLOSE = 'open until 6:00 am tomorrow'
BODY = {
    'seated': f'Colin seated you with <b>Ghalta Stompy</b>. 4 seated, {CLOSE}.',
    'own': f'You’re seated with <b>Ghalta Stompy</b>. 4 seated, {CLOSE}.',
    'wait': f'Colin seated you. Pick your deck at the table. 4 seated, {CLOSE}.',
    'tue': f'Peter seated you with <b>Sai Thopters</b>. 3 seated, {CLOSE}.',
}


def faces(waiting=False, imgs=FACES):
    out = []
    for i, f in enumerate(imgs):
        if waiting and i == 0:
            out.append('<span class="zini">HH</span>')
        else:
            out.append(f'<span class="face" style="width:30px;height:30px;border-radius:8px"><img src="art/{f}" alt=""></span>')
    return '<div class="fc">' + ''.join(out) + '</div>'


def card(kind, wide=False, pod='Thursday night', imgs=FACES):
    blur = '<div class="blur"><img src="art/rz-ghalta.jpg" alt=""><img src="art/rz-zimone.jpg" alt=""></div>'
    head = f'<span class="k">Tonight’s table</span><h3>{pod}</h3>{faces(kind == "wait", imgs)}'
    if wide:
        return (f'<div class="tc ztc zw znew">{blur}<div class="zl1">{head}</div><p>{BODY[kind]}</p>'
                '<span class="ba">Open the table</span></div>')
    return f'<div class="tc ztc znew">{blur}{head}<p>{BODY[kind]}</p><span class="ba">Open the table</span></div>'


def phone_top(c, src=PH_BUSY):
    x = src.replace(TC_OLD, '', 1) if TC_OLD in src else src
    return L.sub1(x, '<div class="hb">', '<div class="hb">' + c)


def desk_top(c):
    x = DK_BUSY.replace(DTC_OLD, '', 1)
    return L.sub1(x, '<div class="cl">', '<div class="cl">' + c)


def build():
    now_p = PH_BUSY.replace('<div class="tc"', '<div class="tc zold"', 1)
    now_d = DK_BUSY.replace('<div class="tc"', '<div class="tc zold"', 1)
    two = '<div class="zstack">' + card('seated') + card('tue', pod='Tuesday crew', imgs=['rz-sai.jpg', 'rz-jace.jpg', 'rz-rootha.jpg']) + '</div>'
    body = L.head('4 · Home · Tonight’s table leads',
                  'Seated at an open table, it is the first thing on Home',
                  'Ruling 4: when you are seated at an open table, its card sits at the top of Home on the phone and on desktop. Today <code>HomeTableCard</code> heads the Friends section, which on the phone falls below the lead, Pick up where you left off and What’s new (the busy feed: about 1,900px down), and a friend missed it. The dashed blue line on each phone is its fold (844 less the tab bar). '
                  'Drawn over the shipped Home (direction B, the Menu and Home boards). The closing time is the new expiry’s (6:00 am).')
    body += L.row(
        L.fr('<b>Now</b> · 390 · busy feed', now_p, 'The card at the head of Friends, after the lead, four decks and five feed rows.', 390),
        L.fr('<b>H1</b> · 390 · Colin seated you', phone_top(card('seated')),
             '<b>Under the page head, above everything.</b> The shipped card, unchanged in form, leaves Friends and comes first: above the lead story and any strip (welcome credits, signature, New in the app, a precon receipt). Setter, seats and closing time as shipped (<code>entry.homeBody</code>).', 390),
        L.fr('<b>H2</b> · 390 · you set it', phone_top(card('own')),
             'The setter gets the same card in the same place, with <code>entry.homeBodyOwn</code>.', 390),
        L.fr('<b>H3</b> · 390 · seated, no deck yet', phone_top(card('wait')),
             'Seated and waiting to pick: <code>entry.homeBodyWaiting</code>; your face is your initials until your seat has a deck. <i>Open the table</i> lands on the table, where Change deck is on your seat.', 390))
    body += L.row(
        L.fr('<b>H4</b> · 390 · no open table · unchanged', PH_DAY, '<b>No table, no gap.</b> Home is exactly as shipped: the slot is absent, not kept.', 390),
        L.fr('<b>H5</b> · 390 · two tables tonight', phone_top(two),
             '<b>Two pods, two cards.</b> A pod has one open table, but you can be seated in two pods’ tables. Both cards lead, stacked 10px apart, the one closing first on top (then the newer seat). Rare; nothing collapses.', 390))
    body += L.row(L.fr('<b>Now</b> · 1300 · busy feed', now_d, 'The card at the head of the right column’s Friends, under Commitments.', 1300))
    body += L.row(L.fr('<b>H6</b> · 1300 · Colin seated you', desk_top(card('seated', True)),
                       '<b>Top of the main column, one row.</b> The same parts laid across: kicker, pod and faces on the left (230), the sentence, then <i>Open the table</i> at its own width. It sits above the lead; the right column is unchanged and no longer holds the card.', 1300))
    body += L.row(L.fr('<b>H7</b> · 1300 · you set it', desk_top(card('own', True)), 'The setter’s sentence.', 1300))
    body += L.row(L.fr('<b>H8</b> · 1300 · seated, no deck yet', desk_top(card('wait', True)), 'Waiting to pick.', 1300))
    body += L.row(
        L.fr('<b>H9</b> · 390 · seated while on Home', phone_top(card('seated'), PH_DAY),
             '<b>On Home the card is the notice.</b> When the seat reaches a Home that is open (the notice’s arrival, Notice board), Home refreshes its tables and the card appears at the top. No toast over it: one event, one sign.', 390),
        L.fr('<b>H11</b> · 390 · Home open when the table closed', phone_top(card('seated')),
             '<b>Until the next look.</b> Home is not polled, so a Home left open keeps the card after a Close or the morning end. On focus or the next load it is gone (H4, no gap). Pressed before that, <i>Open the table</i> lands on the closed table (Table board, C4 or C5).', 390))
    body += L.row(L.fr('<b>H10</b> · 1300 · seated while on Home', desk_top(card('seated', True)),
                       'The same on desktop: Home refreshes and the row card arrives at the top of the main column.', 1300))
    body += L.rule('The calls', [
        '<b>Placement:</b> first in Home’s body on the dashboard, before the precon receipt, the welcome, signature and arrivals strips and the lead (<code>Dashboard</code>: render <code>tables</code> first instead of inside Friends). On a first-run Home it leads too, above the checklist (<code>FirstRunChecklist</code>’s <code>tables</code> moves to the top). The Friends section no longer draws it.',
        '<b>Desktop form:</b> one row in the main column (from <code>xl</code>, where Home has two columns); below that the phone’s stacked card. Same component, a row layout at that width.',
        '<b>Closing time:</b> the same <code>closesWhen</code>, now the next 6:00 am in the host’s zone (lane a6): <i>open until 6:00 am tomorrow</i>; after midnight, <i>open until 6:00 am</i>.',
        '<b>Several:</b> one card per table you are seated at, soonest closing first. Read per request, as shipped (readiness G10 holds).',
        '<b>Gone:</b> after Close or at the morning end the card is absent on the next Home load; a Home that was open when it happened is H11 below.'])
    return L.doc('Rule 0 revisions · Home', L.helmet(S) + CSS, body, 2000)
