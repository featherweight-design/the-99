from kit import *
from b_rail import rail

LOCKS = [
    ("1 · The job", "Any catalog card by name; a result opens card details, unchanged.", "Rows open the shipped card sheet and 820 modal. Nothing in card details is redrawn (H1–H3, D7)."),
    ("2 · Name only", "No color, type or set filters.", "One field, no chips, no toggles, no sort. The field’s only control is its ✕."),
    ("3 · What a result shows", "Art, name, the reader’s ownership: owned N, in deck X, on your wishlist.", "Rows board: every case at both widths."),
    ("4 · Placement A", "Desktop: a field at the top of the rail, ⌘K / Ctrl K. Phone: an icon by the account button opening a full-screen sheet.", "D1–D8, HP1–HP3, S1–S7."),
    ("5 · Quick return", "Away on scroll down, back on a small scroll up, on every phone screen. Not sticky, not top-only.", "Q1–Q5 and the rule."),
    ("6 · Two searches on the deck page", "“Search all cards” for global; “Add a card” for the deck’s own field.", "DP1–DP4, DD1–DD2."),
    ("7 · No collision", "The deck page’s bottom controls and the returning header never meet.", "DP2 (582px apart), DP3 (suspended while typing)."),
    ("8 · The reader’s own data", "Never another player’s ownership, decks or wishlist.", "Every row and every recent card. Recents are per account."),
]

CALLS = [
    ("1 · The sheet’s states", "Full screen, field focused with the keyboard up. Empty: R2’s graphic A (the brand fan under a pink lens) over one sentence, or recent cards. Typing: 2 characters, 150ms, a 2px bar and skeletons. Results up to 20, best match first. No results and failed in the shipped words, failed with Try again. Offline: the field still types and search runs when the connection returns.", "S1–S7"),
    ("2 · The result row", "Art at card shape (40×56 phone, 30×42 desktop), name in two lines at most with typed letters in the accent, then one mono line: ×N owned or not owned, then the first deck and +N. The wishlist is a filled bookmark at the end. One press, no other control.", "Rows"),
    ("3 · Quick return’s edges", "In the page at the top. Away after 8px down past it, back after 12px up, over the page with a shadow. Sticky heads ride under it. Frozen under a sheet. Suspended while a page field has focus. Only the reader’s own scrolling moves it.", "Q1–Q5"),
    ("4 · The rail field", "R2: a plain rail slot under the mark, above Home, with no shortcut at rest (R-A). ⌘K lives in the slot’s name tag, at the open field’s right edge and in the panel’s foot line. A press or ⌘K opens the field beside the rail, as the lock note opens, with results in a dropdown under it.", "D1–D8"),
    ("5 · Recent cards", "Yes: the last 8 cards opened from search, newest first, per account on this device, cleared on sign-out, with one Clear. Not every card opened anywhere, which would fill it with browsing.", "S2, D2"),
    ("6 · The header icon", "A bare 20px glyph on a 44px press, left of the account button. Fits all three cluster controls at 390 with 21px to spare. Below 390, while offline, the install slot steps aside.", "HP1–HP3"),
    ("7 · Accessibility", "Focus to the field on open (the keyboard rises in the same tap). Combobox with a listbox. A polite live region with the count after 500ms. Escape clears, then closes; Back closes in one. ⌘K on a Mac and Ctrl K elsewhere, never Ctrl K on a Mac. Focus returns to the icon or wherever ⌘K was pressed.", "D-keys note, Q rule"),
    ("8 · The handover", "A result closes search and opens card details on its own, unstacked, paging the results. Find a deck stays with no change to card details. Closing the card brings search back as it was, focus on the row.", "H1–H3, D7–D8"),
]

GAPS = [
    ("G1", "A switch for the feature, named here <code>CARD_SEARCH_ENABLED</code>: the icon, the rail slot, ⌘K, quick return and the About entry follow it.", "Eng"),
    ("G2", "Card details mounted once in the shell (the brief’s own note), so any page can open it, and a close callback so search can come back after it.", "Eng"),
    ("G3", "The catalog read orders by name today. Search wants: the name starts with the query, then a word does, then any match, then by name. Same read, same limit of 20.", "Eng"),
    ("G4", "Quick return must tell the reader’s scrolling from the app’s (reveal(), scroll restore on Back). One way: ignore scroll for 300ms after a programmatic scroll or a navigation.", "Eng"),
    ("G5", "The install slot hides while offline below 390px. A change to <code>InstallSlot</code>, so worth a yes from Hugh.", "Hugh"),
    ("G6", "Each row needs the reader’s deck names per card and the wishlist flag beside <code>owned</code>. Recent cards need the same read by oracle id when the field opens.", "Eng"),
    ("G7", "Recent cards live in local storage keyed by account id and are removed on sign-out. No new table.", "Eng"),
    ("G8", "Every new string is in <code>card-search · copy strings.ts</code> for /copy-review. Reused shipped strings are marked as reused.", "Note"),
    ("G9", "These boards are repo files, not a live Design canvas: the art is under <code>art/</code> by relative path. On the canvas they need uploading as assets.", "Note"),
]


def table(rows, heads):
    th = "".join(f"<th>{h}</th>" for h in heads)
    tr = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f'<table class="t"><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table>'


def board():
    strip = (
        '<div style="display:flex;gap:30px;align-items:flex-start">'
        '<div style="width:390px;border:1px solid var(--border-strong);border-radius:14px;overflow:hidden">' + header() + '</div>'
        '<div style="height:170px;width:64px;border:1px solid var(--border-strong);border-radius:12px;overflow:hidden;position:relative">'
        '<div style="position:absolute;inset:0;display:flex">' + rail("rest") + '</div></div>'
        '<div class="dres" style="width:430px;padding:0">' + row("ashling", "ash", first=True) + '</div></div>')
    body = (
        '<div class="bh"><span class="k">Card search · round 2 · approved by Hugh 2026-10-16</span><h2>Card search R2: calls, locks and gaps</h2>'
        '<p class="cap" style="max-width:1500px">Brief: <code>docs/superpowers/design-briefs/2026-10-16-card-search.md</code>. '
        '<b>The answer in one line:</b> a quiet search glyph by the account button on the phone and a search slot at the top of the rail (or ⌘K) on desktop both open one name-only search, '
        'whose rows say what the reader owns and where; a result hands over to card details exactly as it ships, and closing the card brings the search back.</p></div>'
        + strip +
        '<div class="sec"><h3>The eight locks, and where each is honoured</h3>' + table(LOCKS, ["Lock", "Says", "Drawn in"]) + '</div>'
        '<div class="sec"><h3>The eight open items, called</h3>' + table(CALLS, ["Open item", "Called", "Boards"]) + '</div>'
        '<div class="sec"><h3>Gaps</h3>' + table(GAPS, ["#", "Gap", "Who"]) + '</div>'
        '<div class="note" style="max-width:1500px"><b>Round 2 (Hugh, 2026-10-16)</b><ul>'
        '<li>The empty state uses a graphic, not card art: <b>option A</b>, the brand fan with a pink lens over the 99 card (S1, D2n). Options A–D are on <code>R2 - Options</code>.</li>'
        '<li>The rail’s search is a <b>plain slot (R-A)</b>; ⌘K is not shown at rest. It stays in the name tag, the open field and the panel’s foot line.</li>'
        '<li>Approved as drawn otherwise, including the bookmark marker on rows (A) and G5. Where the About entry ships (with the feature or the discovery showcase) stays Hugh’s call at build time.</li></ul></div>'
        '<div class="note" style="max-width:1500px"><b>Boards</b><ul>'
        '<li><code>R1 - Header-Phone</code>: the icon in the cluster and quick return.</li>'
        '<li><code>R2 - Sheet-Phone</code>: the sheet’s seven states and the handover.</li>'
        '<li><code>R2 - Rail-Desktop</code>: the rail slot, ⌘K, results and the handover.</li>'
        '<li><code>R2 - Deck-Page</code>: both searches, the header over the bottom controls, desktop beside the add field.</li>'
        '<li><code>R1 - Rows</code>: the row’s anatomy and every ownership case.</li>'
        '<li><code>The 99 - About · Card Search Entry</code>: the About entry.</li>'
        '<li><code>R2 - Options</code>: the empty-state graphics A–D and the rail slot R-A/B/C Hugh picked from.</li>'
        '<li><code>R1 - *</code> and <code>The 99 - Card Search (R1)</code>: round 1, superseded where R2 redraws them.</li></ul></div>'
    )
    return doc("Card search R2", body, 1700, 2600)
