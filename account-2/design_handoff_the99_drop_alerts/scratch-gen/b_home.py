import lib11 as L, kit as K

def rows(desk):
    R = K.DK_ROWS if desk else K.PH_ROWS
    up = K.day('Upcoming drops', new=True) + K.up_row(K.U['avatar'], desk) + K.up_row(K.U['shark'], desk)
    rest = K.day('Today') + K.unchg(R[1]) + K.day('Earlier') + K.unchg(R[2]) + K.unchg(R[4])
    return up + rest + K.foot(more=None)

def build():
    S = [L.head('Drop alerts · R1 · account 2 · 2026-11-10 · surface 1 · Home',
                'Upcoming drops lead What’s new, on Home',
                'Call 1, A (recommended). A Secret Lair post whose sale has not started leaves its place in the list for a group of its own at the top of What’s new, '
                '<b>Upcoming drops</b>, soonest sale first. Each is the shipped <code>FeedItemRow</code>: the hero, the Secret Lair kicker with how far off the sale is '
                'in the age slot, the post’s title, and the sale line in place of the summary. The rest of the list follows under the shipped Today and Earlier labels. '
                'Fixture: today is Tue Nov 10, the reader is in New York. Dashed outlines mark what is new; the app draws nothing there.')]
    S.append(L.frames(
        L.fr('<b>A</b> · 390 · Home, What’s new', K.phone_home(rows(False)),
             'Two drops ahead: one with its hour and pre-queue, one with only its day. They sit above the rest, outside the five-row count, '
             'and carry the diamond while unseen like any row. The ✕ hides the drop for good, as on every row. Press and picture open the post, as shipped.', w=390),
        L.fr('<b>A</b> · 1300 · the main column', K.desk_home(rows(True)),
             'From <code>md</code> the press and the ✕ take the third column, as on every row. The sale line sits in body ink one step brighter than a summary '
             '(<code>--fg</code>), the pre-queue line under it in body ink, the store’s own clock in the mono line.', w=1300),
    ))
    return L.doc('Drop alerts · Home', K.HR_HELM + K.CSS, ''.join(S), 1900)
