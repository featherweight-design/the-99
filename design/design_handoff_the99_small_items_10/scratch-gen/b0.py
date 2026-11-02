"""Main · every call of Small items 10 and the questions for Hugh."""
import lib10 as L
CSS = "<style>.board .grid9{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;max-width:1500px}</style>"


def build():
    b = L.head('Small items 10 · R1 · account 2 · 2026-11-02', 'Five follow-ups and an erratum: the calls',
               'Small follow-ups on shipped surfaces: buying credits, Hide a commander, game history filters, admin delete a group, and the app’s toasts. Each is drawn at 390 and 1300 over the shipped boards it extends; '
               'dashed outlines mark what changes. Sources: main @e9b6fce and the shipped components each board names.')
    b += '<div class="grid9">'
    b += L.rule('1 · Buying credits, 50 a month (<code>Plan</code>)', [
        'Plan-and-Cancel redrawn: <i>50 credits a month</i>, the crown’s diamond reads <b>50</b>, a month in Purchase history reads <i>50 credits</i>. $5, rollover, one-tap cancel unchanged.',
        'The app already reads both from <code>PLANS.monthly.units</code>; no build. The board’s UK spellings take the shipped US strings.'])
    b += L.rule('2 · Toasts, app-wide (<code>Toasts</code>)', [
        '<b>The shipped toast is the rule:</b> <code>ToastFrame</code>, min(420, window − 32), centered on the window, radius 10, one plain text press (Try again / Undo), bare ✕ only with no action.',
        'The deck and cart stacks keep the frame in their slots; /credits joins the center. Build: Hide’s Try again, social and admin Show actions, credits slot.'])
    b += L.rule('3 · Hide a commander (<code>Hide</code>)', [
        '<b>(a)</b> <i>Not ranked while hidden</i> in <code>--fg-faint</code> (as <i>Rank #N</i>): 5.1:1 to 5.9:1 across the six themes.',
        '<b>(b) Recommended:</b> Discover shows its normal no-match for a commander you own and hid; <i>Search your commanders</i> lands on For you’s held state.',
        '<b>(c) Recommended: yes,</b> the shipped one-line aside above For you’s rows.'])
    b += L.rule('4 · Game history filters (<code>Games-Filters</code>)', [
        'All four confirmed: one Played against value (friend wins), no most played under a deck filter, no low-games line under any filter, Clear all inert when nothing is on.',
        'Two small redraws: only the chosen Played against row carries the tick (no empty boxes), and the sheet’s inert Clear all reads inert (<code>--fg-locked</code>).'])
    b += L.rule('5 · Delete a group, trial off (<code>Groups-FlyerOff</code>)', [
        '<b>Recommended:</b> with the flyer trial off no code is live, so none blocks: the press works, <i>Flyer codes ›</i> never shows, the confirm names the ended code and that it loses its group.',
        'Alternative drawn (F4): keep the block, drop the link. Not recommended.'])
    b += L.rule('6 · Errata (<code>Errata</code>)', [
        'Small items 9 “centred” → “centered” (README, READINESS, four boards). Plan-and-Cancel’s UK forms. Earlier toast drawings yield to item 2.'])
    b += L.rule('Open for Hugh', [
        '3b: Discover’s normal no-match (recommended) or keep Discover’s “You hid it” with a new body?',
        '3c: the aside in For you (recommended), or leave For you silent when something else matched?',
        '5: trial off means no code blocks (recommended), or keep the block without the link?',
        '2: fold /credits into the center slot (recommended), or keep its bottom-left slot as the one exception?'])
    b += '</div>'
    return L.doc('Small items 10 · Calls', CSS, b, 1612)
