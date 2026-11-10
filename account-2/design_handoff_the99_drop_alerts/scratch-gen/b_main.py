import lib11 as L, kit as K

def a_rows(desk=False):
    R = K.DK_ROWS if desk else K.PH_ROWS
    return (K.day('Upcoming drops', new=True) + K.up_row(K.U['avatar'], desk) + K.up_row(K.U['shark'], desk)
            + K.day('Today') + K.unchg(R[1]) + K.day('Earlier') + K.unchg(R[2]) + K.foot(more=None))

def b_html():
    R = K.PH_ROWS
    up = (f'<h2 class="sh">Upcoming drops <em>· 2</em></h2><div class="fd chg">{K.up_row(K.U["avatar"], new=False)}{K.up_row(K.U["shark"], new=False)}</div>')
    wn = K.section(K.unchg(R[1]) + K.unchg(R[2]) + K.foot(more=None), "3 new")
    return (f'<div class="ph d4n" style="width:390px;height:auto;min-height:0;border-radius:18px;padding:16px;display:block;background:var(--bg)">'
            f'<div class="boxw">{up}<div style="height:6px"></div>{wn}</div></div>')

def c_rows():
    R = K.PH_ROWS
    c = dict(K.U['avatar']); c['when'] = '7d ago'
    return (K.day('Today') + K.unchg(R[1]) + K.day('Earlier') + K.unchg(R[2]) + K.up_row(c) + K.foot(more=None))

CALLS = [
    '<b>The row.</b> A (recommended): a group, <b>Upcoming drops</b>, at the top of What’s new on Home, soonest sale first, one row per announced drop whose sale '
    'has not started, gone an hour after it begins. The row is the shipped <code>FeedItemRow</code> for the same post (it leaves its place below, never drawn twice): '
    'the hero, the Secret Lair kicker with how far off in the age slot, the title, and the sale lines in place of the summary. It rides the post’s own seen state, '
    'diamond, ✕ and press. Outside the five-row count. The rest keeps the shipped Today and Earlier labels. <b>Archive:</b> no group; the post’s row in its month '
    'carries the same sale lines while the sale is ahead (board Archive).'
    ' B (own section above What’s new) and C (in place, no group) are drawn below for comparison.',
    '<b>Words.</b> Your time first: “On sale Mon Nov 16, 12 p.m. your time”, then the pre-queue as its own line, “Pre-queue opens at 11 a.m.” (no tooltip; '
    'nothing hovers on a phone), then the store’s clock in the mono line, “9 a.m. PT on the US store”. Day only: “On sale Mon Nov 23, time to be announced” and '
    '“US store”. Zone unknown, or the reader’s zone is the store’s: “On sale Mon Nov 16, 9 a.m. PT”. Kicker age slot: <i>in 6 days</i>, <i>tomorrow</i>, '
    '<i>today</i>, <i>pre-queue open</i> (<code>--accent-text</code>), <i>on sale now</i> (<code>--success</code>). No countdown.',
    '<b>The push.</b> One push per drop, as built, when the pre-queue opens or, with none, when the sale does. The hour is the headline: title '
    '“Pre-queue opens at 11 a.m.” (or “On sale at 12 p.m.”), body “Secret Lair x Avatar: The Last Airbender. On sale at 12 p.m. on the US store.” Words are future '
    'tense with whole times, so <b>set <code>SALE_PUSH_LEAD_MS</code> to 15 minutes</b>: with the 15-minute cron it always lands before the hour it names. (At 0 a '
    'drop with no pre-queue never sends: its send instant equals the sale.) No second push at the sale. No hour known: nothing sends; the announcement push '
    'already went (board Push).',
    '<b>The overnight hold.</b> Closed by Hugh: the drop push goes through it. Nothing drawn for held or missed.',
    '<b>Settings.</b> Rides the <code>secret-lair</code> ticks, no new toggle: In app governs the Upcoming drops row, Push the announcement and sale pushes. '
    'Two words change: the kind’s line, and the foot, which today promises “never 9pm to 9am” (board Settings).',
]

def build():
    S = [L.head('Drop alerts · R1 · account 2 · 2026-11-10 · start here',
                'When a drop goes on sale, in your time',
                'A light addendum on the Announcements handoff. Source: <code>docs/superpowers/design-briefs/2026-11-10-drop-alerts.md</code>. Closed by the brief: no '
                'per-drop “remind me”, no model call, no link to Wizards’ own “Get notified”; the drop push goes through the overnight hold. The data is live '
                '(<code>on_sale_date</code>, <code>on_sale_at</code>, <code>on_sale_zone</code>, <code>pre_queue_at</code>), and the push is built and off '
                '(<code>SALE_PUSH_LIVE</code>) until these words land. Copy is DRAFT for /copy-review.')]
    S.append(L.rule('The five calls (recommended)', CALLS))
    S.append(L.sec('Call 1 · where the row lives'))
    S.append(L.frames(
        L.fr('<span class="rec">Recommended</span><b>A</b> · a group in What’s new', K.box(a_rows(), 358, "3 new"),
             'One box, one place to look. The group heads the box because a sale is a date you act on, and a feed sorted by age would bury a drop announced three '
             'weeks ago under yesterday’s price drop.', w=390),
        L.fr('<b>B</b> · its own section above', b_html(),
             'A second head and box on Home. Clearer as a list of dates, but it is new chrome on a page that already has six blocks, and it splits one post across '
             'two places once the sale passes.', w=390),
        L.fr('<b>C</b> · in place, no group', K.box(c_rows(), 358, "2 new"),
             'The least change: the post keeps its place by age and only swaps its summary for the sale lines. A drop announced a week ago sits under '
             'everything newer, and past five rows it is behind Show all.', w=390),
    ))
    S.append(L.rule('Boards', [
        '<b>Home</b> · A on the shipped Home, 390 and 1300.',
        '<b>States</b> · day only, day and time (with and without a pre-queue), tomorrow, pre-queue open, sale live, sale passed, time changed, zone unknown, '
        'another day in your zone; each at 390 and 1300.',
        '<b>Archive</b> · the sale lines on the post’s own row in <code>/announcements</code>, 390 and 1300.',
        '<b>Push</b> · Android and iPhone, with and without a pre-queue, zone unknown; the words table and what never sends.',
        '<b>Settings</b> · the Secret Lair line and the foot, 390 and 1300.',
        '<b>Themes</b> · the group in all six themes.',
    ]))
    S.append(L.rule('Gaps for engineering', [
        '<b>Your zone.</b> The row is drawn on the server; your zone is the browser’s. First paint is state 7 (store zone only) unless the zone rides a cookie '
        'set on the first visit; recommend the cookie so the row does not change under the reader.',
        '<b>Push zone.</b> The words want the device’s zone (<code>push_subscriptions.time_zone</code>, the hold’s own). Where messages are built per reader, not '
        'per device, use the zone of the device being sent to; the stored default <code>UTC</code> counts as unknown and takes the store’s zone with its label.',
        '<b>Leaving.</b> The row leaves an hour after <code>on_sale_at</code>; a day-only drop leaves at the end of its sale day in the store’s zone.',
        '<b>Lead story.</b> A post that leads Home is not repeated in the group.',
    ]))
    return L.doc('Drop alerts · Main', K.HR_HELM + K.CSS, ''.join(S), 1900)
