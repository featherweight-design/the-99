"""Main: every call, and what Hugh is asked."""
import lib as L
S = L.mh()
CSS = """<style>
.zg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;width:1500px}
.zg .zrule{max-width:none}
</style>"""


def build():
    body = L.head('Rule 0 revisions · the calls',
                  'Rule 0 after the first friend game',
                  'Hugh’s six rulings (2026-10-31) from <code>docs/superpowers/design-briefs/2026-10-31-rule-zero-revisions.md</code>, drawn over the shipped table, picker and Home in the Low Sun theme. '
                  'Extends <code>design/design_handoff_the99_rule_zero/</code>; its decisions not named here are not reopened. Every changed state is at 390 and desktop. Strings marked DRAFT go to <code>/copy-review</code>.')
    cards = [
        L.rule('1 · The read’s key (Key board)', [
            'Shared <code>MarkKey</code>, <b>two columns</b>, all five marks, always (a zero is still drawn on every seat).',
            'Desktop keeps the grid in the read’s 392px column: MarkKey gains an opt-in to keep columns from <code>md</code>. <code>CountsKey</code> retires.']),
        L.rule('2 + 3 · Your deck tonight (Picker board)', [
            '<code>seated</code> in a fixed 38px slot left of the chip on every row, so chips end on one edge.',
            'From <code>md</code>: <code>ModalChrome</code> 480 over the scrim; it opens at once with <code>SheetLoading</code>, says a failed load inside with Try again; a pick closes it and swaps (toast with Undo as shipped). Phone sheet unchanged.']),
        L.rule('4 · Home (Home board)', [
            'Seated at an open table, the shipped card is <b>first on Home</b>, under the page head, above the lead and every strip; on first run above the checklist. It leaves Friends.',
            'Desktop: one row across the top of the main column. Two tables: two cards, soonest closing first. No table: no gap.']),
        L.rule('5 · Close and the end (Table board)', [
            '<b>Close the table</b> at the table’s foot under Log this game, setter only; never on Home’s card. Confirmed (sheet / ModalChrome), since it can’t be reopened.',
            'Closed copy differs: <i>Colin closed Thursday night’s table at 11:52 pm.</i> against <i>…closed the morning after Colin set it.</i> Guests find it on the next check; no toast.']),
        L.rule('6 · The notice (Notice board, Home H9–H10)', [
            'In the app: the shared toast with the table glyph, <i>Colin seated you at Thursday night’s table.</i>, Open and ✕, no clock, one per table. On Home the card arriving is the notice.',
            'Push: the same words on the lock screen with your deck under; lands on the table. Never both: in front, the page shows the toast instead of a system notification. A changed or removed seat sends nothing.']),
        L.rule('Errata (Errata board)', [
            'The four places the brief names, plus README line 9 and the R1 calls board, from 24 hours to the morning after. Closing time reads <i>open until 6:00 am tomorrow</i>.']),
    ]
    body += '<div class="zg">' + ''.join(cards) + '</div>'
    body += L.rule('For Hugh', [
        '<b>Log this game after a host closes</b> (Table C3, C4): keep it for seated players until the morning time the table would have reached? Recommended, so a host closing on the way out strands nobody. Otherwise the closed page has Back to Friends only, as shipped.',
        '<b>The seat push skips the 21:00–09:00 hold</b> and has no Settings tick (Notice board). Held, a 9 pm seat would arrive at 9 am, after the table closed. Recommended.',
        '<b>MarkKey’s columns from <code>md</code></b> (Key board): a small opt-in on the shared component so the read keeps its grid on desktop. Recommended over letting the desktop key wrap.'])
    return L.doc('Rule 0 revisions · Calls', L.helmet(S) + CSS, body, 1640)
