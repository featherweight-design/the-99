import lib11 as L, kit as K

def pair(key, extra_phone='', extra_desk='', count="", foot=True, label=True, rows=None):
    def r(desk):
        if rows is not None:
            return rows(desk)
        return (K.day('Upcoming drops') if label else '') + K.up_row(K.U[key], desk) + extra_desk * desk + extra_phone * (not desk) + (K.foot(more=None) if foot else '')
    return ('<div style="display:flex;gap:28px;align-items:flex-start">' + K.box(r(False), 358, count) + K.box(r(True), 642, count, desk=True) + '</div>')

def rest(desk):
    R = K.DK_ROWS if desk else K.PH_ROWS
    return K.day('Today') + K.seen(R[1])

def build():
    S = [L.head('Drop alerts · R1 · account 2 · 2026-11-10 · the seven states',
                'One row, from the day it is announced to an hour after the sale',
                'Each state at 390 and in the 1300 main column, as What’s new draws it: its head, the Upcoming drops group and the shipped foot. '
                'The reader is in New York (ET) unless the frame says otherwise. Times are whole clock times in the reader’s zone, never a countdown: the push '
                'and the row are accurate to the 15-minute cron. Copy is DRAFT for /copy-review.')]
    S.append(L.sec('Before the sale'))
    S.append(L.frames(
        L.fr('<b>1</b> · Day only', pair('shark', count=""),
             'Wizards named the day, not the hour. The line says the day and <b>time to be announced</b>, never a guessed hour; the mono line names the store alone. '
             'When the hour lands in the post, the row takes it (state 2) and nothing is sent for the change.', w=1100)))
    S.append(L.frames(
        L.fr('<b>2</b> · Day and time, with a pre-queue', pair('avatar', count="1 new"),
             'The sale in <b>your</b> time first, since that is when you act; the store’s own clock in the mono line under it, with the store named. '
             'The pre-queue is its own line (not a tooltip: there is no hover on a phone), in your time, read from the post rather than assumed an hour early. '
             'The kicker’s age slot says how far off: <i>in 6 days</i>, <i>tomorrow</i>, <i>today</i>.', w=1100)))
    S.append(L.frames(
        L.fr('<b>2b</b> · Day and time, no pre-queue, no hero', pair('ue', count=""),
             'No pre-queue line when the post names none. A post with no hero takes the shipped post-glyph plate, as every announcement row does.', w=1100)))
    S.append(L.frames(
        L.fr('<b>2c</b> · Tomorrow', pair('tomorrow', count=""),
             'Sun Nov 15: the kicker says <i>tomorrow</i>; the lines keep the date, so the row reads the same once the day turns.', w=1100)))
    S.append(L.sec('Pre-queue and sale'))
    S.append(L.frames(
        L.fr('<b>3</b> · Pre-queue open · Mon 11:20 a.m.', pair('queue', count=""),
             'From the pre-queue’s opening to the sale, the kicker’s age slot says <b>pre-queue open</b> in <code>--accent-text</code> and the line turns to '
             '<i>Pre-queue opened at 11 a.m.</i> The press is the post, unchanged: Wizards’ own page links its store, and the brief closes linking anything else.', w=1100)))
    S.append(L.frames(
        L.fr('<b>4</b> · Sale live · Mon 12:20 p.m.', pair('live', count=""),
             '<b>on sale now</b> in <code>--success</code>, and one line, <i>On sale since 12 p.m. your time</i>. The row leaves the group an hour after the sale '
             'begins (1 p.m. here); it says nothing about how much is left, which the app cannot know.', w=1100)))
    def gone(desk):
        R = K.DK_ROWS if desk else K.PH_ROWS
        return (K.day('Today') + K.seen(R[1]) + K.day('Earlier') + K.up_row(K.U['passed'], desk, new=False) + K.seen(R[2]) + K.foot(more=None))
    S.append(L.frames(
        L.fr('<b>5</b> · Sale passed · Mon 1:05 p.m.', pair(None, rows=gone),
             'The group is gone (with no other drop ahead, its label goes too). The post goes back to being the shipped Secret Lair row, in its place by age '
             'with its summary, while the feed’s window still holds it. Nothing marks it as sold.', w=1100)))
    S.append(L.sec('Changes and zones'))
    S.append(L.frames(
        L.fr('<b>6</b> · Time changed · before', pair('avatar', count="", foot=False), 'Tue Nov 10: the post says 9 a.m. PT.', w=1100)))
    S.append(L.frames(
        L.fr('<b>6</b> · Time changed · after', pair('moved', count="", foot=False),
             'Wizards edits the post to 11 a.m. PT. The row follows the stored value at the next read: new lines, no mark, no “changed” tag (the app keeps no old '
             'value to compare), and <b>no new push</b>. Before its push has gone, the push simply goes at the new time with the new words; after, nothing more is sent.', w=1100)))
    S.append(L.frames(
        L.fr('<b>7</b> · Your zone unknown', pair('nozone', count=""),
             'Before the browser says its zone (the first paint), or where it reports none, the row falls back to the store’s zone alone: '
             '<i>9 a.m. PT</i> on both lines and the mono line says the store. A reader in Pacific time sees exactly this, since their time is the store’s.', w=1100)))
    S.append(L.frames(
        L.fr('<b>7b</b> · A reader in Tokyo', pair('tokyo', count=""),
             'Your time can fall on another day than the store’s. The line gives your day (<i>Tue Nov 17, 2 a.m.</i>) and the mono line the store’s day with its clock, '
             'so the two never read as a contradiction. The kicker counts days in your zone.', w=1100)))
    return L.doc('Drop alerts · States', K.HR_HELM + K.CSS, ''.join(S), 1900)
