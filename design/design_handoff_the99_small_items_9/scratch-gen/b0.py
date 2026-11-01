"""Main · every call of Small items 9 and the questions for Hugh."""
import lib9 as L
CSS = "<style>.board .grid9{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;max-width:1500px}</style>"


def build():
    b = L.head('Small items 9 · R1 · account 2 · 2026-11-01', 'Seven undrawn states and ten shipped defaults: the calls',
               'Light addendum on shipped surfaces. (A) is drawn at 390 and 1300 over the shipped boards each item extends; (B) is the Errata board. '
               'Strings marked DRAFT go to <code>/copy-review</code>. Sources: main @b616d77; game history addendum A1 on design-assets (c7abb39).')
    b += '<div class="grid9">'
    b += L.rule('1 · Game history, filters that match nothing (<code>Games-NoMatch</code>)', [
        '<b>No games match</b> + <b>Clear filters</b>, the shipped Decks filter empty’s words; chips, Clear all filters and <i>0 games</i> stay; headline and month heads go.',
        'The sheet never disables an option; <i>Show 0 games</i> lands here. Same frames as addendum A1 (Z1–Z3).'])
    b += L.rule('2 · Report a problem (<code>Report</code>)', [
        '<b>(a)</b> Signed in, /report is a shell page: no <code>CrashWordmark</code>, no newcomer frame, the 520 form under the shell header.',
        '<b>(b)</b> Signed out, the Fan Content notice stays under the page (every page carries it).',
        '<b>(c)</b> Signed out only, between the attachment line and Send: <i>Reports sent while signed out are deleted after 90 days.</i> DRAFT.'])
    b += L.rule('3 · Launch list CSV fails (<code>CSV-Failed</code>)', [
        'The admin’s inline <code>role="alert"</code> line under the launch card’s top row, in <code>--danger</code>: refused (no retry), switched off (reload), lost (<b>Try again</b>). DRAFT lines.'])
    b += L.rule('4 · Kill a feature flag (<code>Flags-Kill</code>)', [
        'Page renamed <b>Feature flags</b>; the env column gone. App-wide segment gains <b>Killed</b> (danger), behind a confirm every time: <i>Kill {flag} for everyone?</i>',
        'Killed in the list: App-wide <i>Killed</i> in the kill ink, a <b>KILLED</b> tag by the name, Resolved Off + <i>killed</i>. On the page: the kill banner, a first Killed rung, overrides refused. Lifting: On, Off or Not set, no confirm.'])
    b += L.rule('5 · Rule 0 defaults (<code>Rule0</code>)', [
        'Seat toast: names never clipped, wraps. Seat push over 40: title <i>{host} seated you</i>, pod moves to the body. DRAFT.',
        'Closing: <i>Closing…</i> on the danger button, everything held at 60%. Home 1300 with no table: as shipped, no slot. First run 1300: the table card above the About line and checklist.'])
    b += L.rule('6 · Add a card (<code>Add-Card</code>)', [
        '(a) Ring: 2s hold + 400ms fade, reduced motion cuts. (b) No Remove while nothing is owned. (c) Desktop: the card modal returns on the same card, ×1, Edit copies. (d) On a deck page the save toast joins the deck stack, 10px above the dock.'])
    b += L.rule('7 · Delete a group, admin (<code>Groups-Delete</code>)', [
        '<b>Delete this group</b> at the group page’s foot, under History: a <code>--danger</code> text press. Only an empty group (no members, no flyer codes) can go; its flag settings go with it.',
        'Refused: the press dimmed, the reason in place (members, a code, or both) + <i>Flyer codes ›</i>. Confirm <i>Delete {group}?</i> (Keep it / Delete the group). After: Groups, toast <i>Deleted {group}.</i>, no Undo. DRAFT lines.'])
    b += L.rule('Errata B (<code>Errata</code>)', [
        'All ten confirmed as built: the shared switch, toast, sheet, 16px inputs, text link, modal and sheet chrome, toast column, MarkKey and SheetLoading. Recorded in the three handoffs.'])
    b += L.rule('Open for Hugh', [
        '4: one segment with Killed (drawn) or a separate danger <i>Kill</i> button under App-wide? Recommended: the segment (one control per decision).',
        '5: split the seat push past 40 (drawn) or let the push layer cut the pod name? Recommended: split.',
        '6a: add the 400ms fade, or keep the shipped 2s cut with no motion? Recommended: the fade, with reduced motion as today.',
        '7: a revoked flyer code still names its group, so as locked a flyer group can never be deleted. Count live codes only (a revoked code’s group goes blank on delete)? Recommended: yes, live codes only; drawn as locked until you say.'])
    b += '</div>'
    return L.doc('Small items 9 · Calls', CSS, b, 1612)
