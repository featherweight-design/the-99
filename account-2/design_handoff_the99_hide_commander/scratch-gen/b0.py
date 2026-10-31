import lib as L
CSS = '<style>.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;max-width:1500px}</style>'
def build():
    body = L.head('Hide a commander · R1 · account 2 · 2026-10-31', 'Hide a commander: the calls (R1b)',
        'Brief <code>docs/superpowers/design-briefs/2026-10-31-hide-a-commander.md</code> and Hugh’s rulings (hidden until undone, a Hidden list, out of For you, Discover and Help me choose, '
        'the page still opens with Unhide). Every state at 390 and 1300, drawn over the shipped captures (<code>public/about/pages/amonkhet</code>) and the shipped components each board names. '
        'Strings marked DRAFT go to <code>/copy-review</code>. Sources: main @7bf3c89.')
    body += CSS + '<div class="grid">'
    body += L.rule('1 · The control (<code>Rows</code>)', [
        '<b>R1b: at the foot of the row</b>, the right end of the figures line, at both widths. Hugh: the top-right plate drew the eye from the commander. Not a menu (the row has none), not a swipe (can’t be found), not page-only.',
        'A bare eye-slash glyph, 16px, <code>--fg-faint</code>, no plate, in a 44px target that adds no height. After the <i>manapool</i> stamp in Discover. Always drawn, not hover-only.',
        'It sits above the row’s stretched link, so pressing it never opens the page. <code>aria-label</code> and <code>title</code>: <i>Hide {name}</i>.'])
    body += L.rule('2 · Confirmation and undo (<code>Undo</code>)', [
        '<b>No confirm.</b> “Hidden until undone” is safe because undoing is one press, twice over: right there, and in Hidden any time later.',
        '<b>The row turns into the builder’s shipped Undo row</b> (<i>Ghalta, Primal Hunger hidden</i> · <b>Undo</b>): no toast, no timer, gone when the reader leaves the tab, one per hide. Rows below keep their numbers until the next load.',
        'Failure: a refused hide puts the row back and raises the shared toast with Try again; a refused undo drops its button and says <i>Unhide it from Hidden</i>, as the builder’s does.'])
    body += L.rule('3 · Where Hidden lives (<code>Hidden</code>)', [
        '<b>A fourth tab on the Commanders strip: For you · Discover · Help me choose · Hidden</b>, at <code>/commanders/hidden</code>. It sits beside the lists it takes from, it is there before anything is hidden (so a reader finds it, and its empty state is real), and it carries the strip’s shipped count once something is.',
        'Not Settings: these are commanders, not a preference, and Settings would hold a list of cards. Not the user menu.',
        'Rows are Help me choose’s result row with <b>Unhide</b> in place of the figures; newest first; the row opens the page. Unhide turns the row into the same Undo row: <i>back in For you</i> or <i>back in Discover</i>.'])
    body += L.rule('4 · The commander’s page (<code>Page</code>)', [
        '“From search” is the lists’ own search: card search opens card details, not this page. A hidden match lands on Discover’s shipped <b>held</b> state (or its aside above a live list) with a new cause, <i>you hid it</i>, and <b>Open its page</b>.',
        'Hidden: the hero’s shipped note shape leads the body with <b>Unhide</b>; the kicker reads <i>Hidden</i> and the hero <i>Not ranked while hidden</i>. Fit and Build stay.',
        '<b>The page offers Hide too</b>: a quiet <i>Hide from my lists</i> line, under the hero on the phone and under the build note on desktop. Nothing over the art.'])
    body += L.rule('5 · Help me choose, pairs, short lists (<code>Edges</code>)', [
        'Help me choose: filtered in the candidates’ own statement, before the read picks. Nothing drawn, no count, never named.',
        '<b>Pairs:</b> Hide acts on the card. A two-faced commander is one card (named by both faces, as the row does). Partners are two cards and two rows: hiding one leaves the other. Decks are never touched.',
        'Short list: fewer rows, nothing else. All hidden: the shared zero state, <i>Everything here is hidden</i>, with <b>See hidden</b>. Counts (title line and count line) leave hidden commanders out.'])
    body += L.rule('6 · Name and words', [
        '<b>Hide</b>, <b>Hidden</b>, <b>Unhide</b>: the words of the control, the tab and the way back are the same family, and “Not interested” reads as a verdict on the commander, which Hugh’s ruling says it is not.',
        'DRAFT strings: the held heading and body, the page note, Hide from my lists, the empty state, all-hidden state and the three failure lines. The Undo row reuses <code>undo.action</code>.'])
    body += L.rule('Open for Hugh', [
        '<b>Where Hidden lives:</b> the fourth tab (drawn) or, quieter, no tab and a <i>3 hidden</i> link at the end of For you’s and Discover’s count line (not drawn; the empty state would then have no way in).',
        '<b>The tab’s count</b>: drawn, using the strip’s shipped count. Drop it if it reads as a nag.',
        '<b>A Help me choose run in History</b> from before a hide: recommended, drop the hidden row silently there too (a past run re-reads its rows), rather than keep it as a record.',
        '<b>Hide on the page</b>: the quiet text line at both widths (drawn, R1b).'], style='grid-column:1 / -1')
    body += '</div>'
    return L.doc('Hide a commander · Calls', body, 1612)
