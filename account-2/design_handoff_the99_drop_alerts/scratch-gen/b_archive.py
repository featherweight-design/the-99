import lib11 as L, kit as K, b3

def arow(key, when, desk=False):
    d = dict(K.U[key]); d['when'] = when; d['unseen'] = False
    return K.up_row(d, desk, xclose=False).replace('<small>', '<small style="display:inline;margin-left:0">', 1)

b3.POSTS['sched'] = b3.POSTS['sched'][:4] + (None, None)

def body(desk=False):
    return (b3.month("November 2026", 7, stk=True) + arow('shark', 'Nov 9', desk) + arow('avatar', 'Nov 3', desk) + b3.row("fdn") + b3.row("sched")
            + b3.month("October 2026", 25) + b3.row("tmnt") + b3.row("ghalta") + b3.row("bans")
            + '<div class="more9"><small>30 of 609</small><span>Show older</span></div>')

def build():
    S = [L.head('Drop alerts · R1 · account 2 · 2026-11-10 · surface 2 · the archive',
                'In the archive, the post’s own row carries its sale',
                'The archive (<code>/announcements</code>, small items 11) is a library, newest first under month heads, so it gets no Upcoming group: a drop is '
                'already near its top. While a post’s sale is ahead, its row swaps the summary for the same sale lines as Home; once the sale has passed it shows the '
                'summary again, as the October drop does. Kicker keeps the post’s date, as every archive row does; no diamond, no ✕.')]
    # the 2027 schedule row uses hero-aang too; give it the plate so one hero means one post
    S.append(L.frames(
        L.fr('<b>390</b> · All', b3.phone_page(body(), sub="609 posts from Wizards since Jan 2023").replace(' new9', ''),
             'Shark Week (day only) and the Avatar drop (hour and pre-queue) in their month, drawn as on Home with the date in the kicker. Under the Secret Lair '
             'segment the same rows show; the other segments never carry a sale.', w=390),
        L.fr('<b>1300</b>', b3.desk_page(body(True)).replace(' new9', '').replace('608 posts', '609 posts'),
             'The 860 column: the sale lines under the title, the press in the third column as shipped.', w=1300),
    ))
    return L.doc('Drop alerts · Archive', K.HR_HELM + b3.CSS + K.CSS, ''.join(S), 1900)
