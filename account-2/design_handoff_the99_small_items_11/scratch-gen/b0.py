"""Main · every call of Small items 11 and the questions for Hugh."""
import lib11 as L
CSS = "<style>.board .grid9{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;max-width:1500px}</style>"


def build():
    b = L.head('Small items 11 · R1 · account 2 · 2026-11-08', 'Four small additions: the calls',
               'Role counts that open their cards, the Consider shelf when a role is over target, an archive of past Wizards announcements, and sign-in on Clerk. '
               'Each is drawn at 390 and desktop over the shipped pieces it extends; dashed copper outlines mark what is new, and DRAFT marks wording for <code>/copy-review</code>. '
               'Source: brief <code>docs/superpowers/design-briefs/2026-11-08-small-items-11.md</code>, main @ffc1795.')
    b += '<div class="grid9">'
    b += L.rule('1 · Role counts open their cards (<code>Role-Cards</code>)', [
        '<b>Surface:</b> the shipped sheet at 390 and modal at desktop (the pass sheet’s <code>SheetFrame</code>, rows are the shipped <code>DecklistRow</code>). Not the Jobs disclosure (names only, no press), not a jump to <i>By role</i> (one role per card, so its count can disagree).',
        '<b>One component</b> for the strip and What we counted. Head <i>{Role} · rec N</i>, title <i>N cards</i>, A to Z. A card that does two jobs sits in both lists.',
        '<b>Tuning hub re-ruled:</b> the free pass still ranks and recommends no card. A role row may open its cards behind a press, A to Z. No cut order, no Cut button, no reason line.',
        '<b>Cut:</b> the row’s ✕ is the deck list’s own remove with the shipped undo row; the name opens card detail.',
        '<b>Tiles:</b> at or over target → <i>cards →</i>. Under target keeps <i>consider →</i> / <i>suggest →</i>; land keeps its press; a role with no cards draws no press.'])
    b += L.rule('2 · Consider with a role over (<code>Consider-Over</code>)', [
        '<b>Collapse, not hide:</b> short shelves first, then <i>Synergy · Zimone</i>, then roles at target, then roles over, folded with the shipped shelf fold.',
        '<b>Clause:</b> at target keeps the shipped <i>you have 10 of 10</i>; over reads <i>you have 9 · 1 over · 6 to consider</i> (DRAFT).',
        '<b>Cut entry:</b> <i>your 9 →</i> on a met or over shelf’s head opens item 1’s list. One list for one job; no second control.',
        '<b>Every role met:</b> synergy leads, every role shelf folded below it.'])
    b += L.rule('3 · Past announcements (<code>Archive</code>)', [
        '<b>Own route</b> <code>/announcements</code>, reached from <i>Past announcements ›</i> in What’s new’s foot. A sheet cannot hold 608 posts or a month jump.',
        '<b>Row:</b> <code>FeedItemRow</code> as drawn, in its seen ink with the date, no ✕. Decklists posts keep their two presses and <i>N of M lists</i>.',
        '<b>Switched-off kinds show:</b> the archive is a library, not a feed. Dismissed posts show too. No new switch, no push, no Settings entry.',
        '<b>Navigation:</b> kind segment, sticky month heads, a month jump sheet with counts, and pages of 30 with <i>Show older</i>. Loading, failed and empty-month states drawn.'])
    b += L.rule('4 · Sign-in on Clerk (<code>Sign-In</code>)', [
        '<b>S4 and U4 stand as drawn</b> on Clerk’s transfer. S4’s button is <i>Use this email</i> (Small items 7’s cap fix), then U3 for the first name.',
        '<b>Invitation-only:</b> an uninvited proven email gets the shipped <code>inviteOnlyCopy</code> with <i>Use a different email</i>. The invitation link lands on U3 with no code.',
        '<b>No interstitial:</b> the press carries the wait (<i>Signing in…</i>, <i>Making your account…</i>); a refusal or expired code stays on the page under the press.',
        '<b>Methods:</b> email code only; the Clerk dashboard is set to match.'])
    b += L.rule('5 · Errata (<code>Errata</code>)', [
        'Tuning hub README:90 and its audit gain the role-list exception. Small items 7 S4 reads <i>Use this email</i> on the board. Add panel’s shelf order and the announcements foot gain this round’s lines.'])
    b += L.rule('Open for Hugh', [
        '1: tiles at or over target open the list (recommended), or every tile opens it with Consider / Suggest inside?',
        '2: fold met and over shelves below synergy (recommended), or hide the over shelf entirely?',
        '3: switched-off kinds show in the archive (recommended), or follow Settings?',
        '4: confirm email code only, with the Clerk dashboard set to match.'])
    b += '</div>'
    return L.doc('Small items 11 · Calls', CSS, b, 1612)
