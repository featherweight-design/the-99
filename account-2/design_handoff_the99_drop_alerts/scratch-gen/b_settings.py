import re, lib11 as L, lib10, kit as K

SRC = f"{K.ANN}/R1b-Settings.dc.html"
S0 = L.src(SRC)
HELM = L.src_helmet(SRC)
OLD_LINE = 'When Wizards announces a Secret Lair drop. On from the start.'
NEW_LINE = 'When Wizards announces a Secret Lair drop, and again before it goes on sale. On from the start.'
OLD_FOOT = '<b>Push</b>: only to devices you turn on, never 9pm to 9am. No email, ever.</p>'
NEW_FOOT = '<b>Push</b>: only to devices you turn on, never 9pm to 9am except a Secret Lair drop going on sale. No email, ever.</p>'

def screen(label):
    f = lib10.frame_by_label(S0, label)
    sc = lib10.screen(f)
    sc = sc.replace('<li class="chg">', '<li>')
    sc = lib10.sub1(sc, f'<li><span class="ct"><b>Secret Lair drops</b><span>{OLD_LINE}', f'<li class="chg"><span class="ct"><b>Secret Lair drops</b><span>{NEW_LINE}')
    sc = lib10.sub1(sc, '<p class="foot">', '<p class="foot chg" style="outline-offset:3px">')
    sc = lib10.sub1(sc, OLD_FOOT, NEW_FOOT)
    return sc

def build():
    S = [L.head('Drop alerts · R1 · account 2 · 2026-11-10 · call 5 · Settings',
                'No new switch: the Secret Lair ticks carry it',
                'The sale-time push rides the <code>secret-lair</code> Push tick (as built), and the Upcoming drops row rides its In app tick. A separate line would split '
                'one kind’s news across two switches for one extra push a drop. Two strings change, both drawn: the kind’s line says a second push comes before the sale, '
                'and the foot stops promising “never 9pm to 9am” without its one exception, since Hugh ruled the drop push goes through the hold. '
                'Copy is DRAFT for /copy-review.')]
    S.append(L.frames(
        L.fr('<b>390</b> · Settings, Notifications', screen('<b>A · columns</b> · 390 · all on'),
             '<code>feedCopy.news.kinds["secret-lair"].line</code>: “When Wizards announces a Secret Lair drop, and again before it goes on sale.” In app off: no row, no group. '
             'Push off: neither push. Foot: <code>pushSettingsCopy.foot</code> gains “except a Secret Lair drop going on sale”.', w=390),
        L.fr('<b>1300</b>', screen('<b>A · columns</b> · 1300 · this browser'), 'The same two strings in the 720 column.', w=1100),
    ))
    S.append(L.rule('The same promise elsewhere (errata, no board)', [
        'About, the push entry’s key: “Nothing comes between 9pm and 9am; it waits for the morning.” becomes “Nothing comes between 9pm and 9am, except a '
        'Secret Lair drop going on sale; the rest waits for the morning.” (<code>about-entries.ts</code>.)',
        'The push entry’s list of kinds gains nothing: Secret Lair drops are already news Home shows.',
    ]))
    return L.doc('Drop alerts · Settings', HELM + K.CSS, ''.join(S), 1900)
