import re, lib11 as L, lib10, kit as K

SRC = f"{K.ANN}/Lead-Story.dc.html"
HELM = L.src_helmet(SRC)

def andr(head, title, body, img=None):
    big = f'<img class="big" src="art/{img}" alt="">' if img else ''
    return (f'<div class="and"><div class="ah"><img src="art/app-icon.png" alt="">The 99 · {head}</div><div class="ab"><div class="tx"><b>{title}</b>'
            f'<span>{body}</span></div></div>{big}</div>')

def ios(when, title, body):
    return (f'<div class="ntf"><img class="ai" src="art/app-icon.png" alt=""><div class="tx"><div class="tp"><span>The 99</span><small>{when}</small></div>'
            f'<div class="bd"><b>{title}</b><br>{body}</div></div></div>')

T1 = ("Pre-queue opens at 11 a.m.", "Secret Lair x Avatar: The Last Airbender. On sale at 12 p.m. on the US store.")
T2 = ("On sale at 12 p.m.", "Secret Lair: Ultimate Edition, on the US store.")
T3 = ("Pre-queue opens at 8 a.m. PT", "Secret Lair x Avatar: The Last Airbender. On sale at 9 a.m. PT on the US store.")

ROWS = [
    ('<b>Pre-queue named</b>', 'Pre-queue opens at {queue}', '{title}. On sale at {sale} on the US store.', 'Sent 15 to 0 minutes before the pre-queue opens.'),
    ('<b>No pre-queue</b>', 'On sale at {sale}', '{title}, on the US store.', 'Sent 15 to 0 minutes before the sale.'),
    ('<b>Device zone unknown</b> (none stored, or the default UTC)', 'Pre-queue opens at 8 a.m. PT', '{title}. On sale at 9 a.m. PT on the US store.', 'The store’s zone, labelled, in both times.'),
    ('<b>A time on another day</b> than the push (a 12 a.m. pre-queue, sent 11:45 p.m.)', 'Pre-queue opens Tue at 12 a.m.', '{title}. On sale Tue at 1 a.m. on the US store.', 'The weekday joins any time that is not today in the device’s zone.'),
]

NEVER = [
    '<b>No hour in the post:</b> nothing sends. The announcement’s own push already went when the post arrived; the row says <i>time to be announced</i>.',
    '<b>A time changed before the push went:</b> it goes at the new time, with the new words. <b>After:</b> nothing more is sent (once per drop, as built).',
    '<b>The sale has begun</b> by the flush: dropped, never sent late.',
    '<b>No second push at the sale.</b> One per drop: the pre-queue is the moment to act, and a second buzz an hour later says what the first already did.',
    '<b>Secret Lair push off</b> in Settings: neither the announcement nor this.',
]

def build():
    S = [L.head('Drop alerts · R1 · account 2 · 2026-11-10 · call 3 · the push',
                'The hour is the headline',
                'One push per drop, as engineering built it: when the pre-queue opens, or the sale with none. The time leads the title, because the time is the news: '
                'the drop itself was announced, and pushed, days ago. Times are in the device’s zone with no label, since the phone already lives in it. '
                'Through the overnight hold (Hugh). Tap and image as the announcement push: the post, through its out route, and its hero where the system '
                'shows one. Copy is DRAFT for /copy-review.')]
    shade = (f'<div class="shade" style="position:relative"><div class="sb"><span>10:47</span><span>Mon, Nov 16</span></div>'
             f'{andr("now", *T1, img="hero-aang.jpg")}{andr("Thu", *T2)}</div>')
    lock = (f'<div class="lks"><div class="clk"><small>Monday 16 November</small><b>10:47</b></div><div class="stk">{ios("now", *T1)}</div>'
            f'<div class="hint">Tap to open the post</div><span class="slab" style="left:16px;top:16px">iPHONE LOCK SCREEN · APPROX.</span></div>')
    lock2 = (f'<div class="lks"><div class="clk"><small>Monday 16 November</small><b>7:47</b></div><div class="stk">{ios("now", *T3)}</div>'
             f'<div class="hint">Tap to open the post</div><span class="slab" style="left:16px;top:16px">iPHONE LOCK SCREEN · APPROX.</span></div>')
    S.append(L.frames(
        L.fr('<b>Push</b> · Android shade · New York', shade,
             'Mon 10:47 a.m.: the Avatar drop, its pre-queue at 11, with the hero. Under it Thursday’s, a drop with no pre-queue and no hero, so no image.', w=390),
        L.fr('<b>Push</b> · iPhone lock screen · New York', lock, 'iOS shows no image. One push for the drop, tagged by its own key, so it never replaces the announcement’s.', w=390),
        L.fr('<b>Push</b> · device zone unknown', lock2, 'The store’s zone, labelled: <i>8 a.m. PT</i>. A Pacific device gets the same words without the label.', w=390),
    ))
    trs = ''.join(f'<tr><td>{a}</td><td><b>{b}</b></td><td>{c}</td><td>{d}</td></tr>' for a, b, c, d in ROWS)
    S.append(f'<table class="tbl"><tr><th>When</th><th>Title</th><th>Body</th><th>Note</th></tr>{trs}</table>')
    S.append(L.rule('Lead time: set <code>SALE_PUSH_LEAD_MS</code> to 15 minutes', [
        'The words name a time ahead (“opens at 11 a.m.”). The cron runs every 15 minutes, so a push due at 10:45 lands between 10:45 and 11:00: always before the '
        'hour it names, never more than 15 minutes early. At 0 it would land up to 15 minutes <i>after</i> the pre-queue opened, under words that say it opens.',
        'At 0, a drop with no pre-queue never sends: its send instant is the sale itself, and <code>salePushDue</code> needs now to be before the sale.',
        'Hugh may prefer <b>B, sent as it opens</b> (lead 0): title “Pre-queue is open”, body “{title}. On sale at 12 p.m. on the US store.” That needs the '
        'no-pre-queue case fixed (send in the 15 minutes after the sale starts, “{title} is on sale”). Not recommended: it reaches the reader after the queue has formed.',
    ]))
    S.append(L.rule('What never sends', NEVER))
    return L.doc('Drop alerts · Push', HELM + K.CSS, ''.join(S), 1500)
