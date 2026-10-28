"""Main: the eight calls, the decisions for Hugh, the gaps for engineering."""
import kit
from kit import doc, board_head

kit.CSS += r"""
.calls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;max-width:1700px}
.calls .note{display:flex;flex-direction:column;gap:6px}
.calls .note h4{margin:0;font:700 17px Cinzel,serif;color:var(--fg)}
.calls .note .ab{font:500 10.5px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--accent)}
.calls .note .ask{margin-top:4px;padding:9px 12px;border-radius:8px;background:color-mix(in oklab,var(--accent) 8%,transparent);border:1px solid var(--accent-shadow);color:var(--fg-body)}
.calls .note .ask b{color:var(--fg)}
.calls .note .rat{margin-top:4px;padding:9px 12px;border-radius:8px;background:color-mix(in oklab,var(--success) 8%,transparent);border:1px solid color-mix(in oklab,var(--success) 40%,transparent);color:var(--fg-body)}
"""

CALLS = [
    ("1 · About, Good to know", "Good-To-Know · 1a, 1b", "Ratification",
     "Ratify the build: two across from 768, three from 1280. At 768 a third of the page is 205px and the 250–300px diagrams clip; redrawing every plate smaller would shrink the app’s own shapes below recognition. Phone swipe row unchanged.",
     None, "Ratified by Hugh: two across at md."),
    ("2 · About, Try it on the phone", "Try-It · 2a–2d", "Drawn",
     "“2 more below ▾” keeps its type and becomes a 44 × 44 press; it opens the rest in place with focus on card 2; “Show fewer ▴” at the foot folds them back and returns focus to the press.",
     None, "Hugh: keep the ▾ / ▴ arrows."),
    ("3 · The seat picker’s “A deck not listed”", "Seat-Picker · 3a, 3c", "Drawn",
     "The row takes Rule 0’s dashed ? slot at 56 × 40. Another commander (search glyph) and Just Peter (his initials) take the same slot, so every row’s text lines up. It shows for every friend whose friend decks are on, so it says nothing about hidden decks. Your words unchanged.",
     None, "Hugh: all three rows get the dashed box."),
    ("4 · Answer sheet errata (small items, item 3)", "no board", "Ratification",
     "(a) The prose wins: opening marks the answer seen, so behind the open sheet the item has no diamond and What’s new loses its “· 1 new”. The frames were wrong to keep them. "
     "(b) Declined with no other spare shows the shipped Your requests line, <i>Nobody else you know has a spare of it.</i> (the frames only drew the case where someone does). "
     "(c) The scrim and Escape close the sheet, ModalChrome’s default, and focus returns to the Home item’s press; the design was silent and nothing changes visually.",
     None, "Ratified by Hugh: all three as built."),
    ("5 · The ledger’s numbers · #477", "Ledger · 5", "Drawn",
     "Each line reads “31 placed, 24 still here”, kept and removed after a · in the quiet ink. The header is unchanged and now equals the sum of the still-here figures. A fully undone pass keeps a quiet dashed line (“9 placed, none still here · undone”) with no presses.",
     None, "Hugh: an undone pass keeps its quiet line."),
    ("6a · Two filtered-empty states · #412", "Filtered-Empty · 6a", "Drawn",
     "One component: the commanders ZeroState geometry, the app’s common shape. Each surface keeps its words. Collection gains its one fix as the first press (Keep only search) and says Clear all filters.",
     None, "Hugh: the commanders layout is the shared design."),
    ("6b · Card details from quick-add · #412", "Quick-Add-Details · A1–A4, B1–B2", "Drawn",
     "A (recommended): the popup becomes a grid, each row a name cell (opens card details) and an Add cell; ↵ still adds the top match, → moves to details. B: quick-add offers no details, by rule.",
     None, "Hugh: A, opening the shipped card detail on a phone (A4, R2)."),
    ("7 · Add panel divergences and the consider tile · #182", "Consider-Tile · 7a, 7b", "Ratification",
     "The verdict file isn’t in the repo, so this reconciles PR #395’s three items against the record: the sort label and the role cell were already settled; the no-art tile keeps its plate (the Consider tiles handoff ratified it after the verdict).",
     None, "Ratified by Hugh: no change, keep the plate, close the item."),
    ("8 · Quick-add’s failed search · #172", "Quick-Add-Failed · 8a–8d", "Drawn",
     "The shared toast, lifted above the dock: “Couldn’t search just now.” with Try again. The bar is untouched (field keeps text and focus, no list, no count), so nothing claims a result.",
     None, "Hugh: the shared toast."),
]


def board():
    head = board_head("Small items 2 · account 1 · 2026-10-28 · approved",
                      "Eight open calls across About, the game log, Home and the deck builder",
                      "One board per item, drawn over the shipped surface it changes, at 390 and 1300 (768 too for item 1). Item 4 is a ratification with no board. "
                      "Handoff folder once approved: <code>design/design_handoff_the99_small_items_2/</code>, mirroring <code>design_handoff_the99_small_items/</code>. "
                      "Every string is shipped copy unless a board marks it new for /copy-review.", tag="R2")
    cards = []
    for t, ab, kind, what, ask, rat in CALLS:
        x = f'<p class="ask"><b>Yours:</b> {ask}</p>' if ask else ""
        r = f'<p class="rat"><b>Decided:</b> {rat}</p>' if rat else ""
        cards.append(f'<div class="note"><span class="ab">{ab} · {kind}</span><h4>{t}</h4><p>{what}</p>{x}{r}</div>')
    gaps = ('<div class="note" style="max-width:1700px"><h4 style="font:700 17px Cinzel,serif;margin-bottom:6px">For engineering, in one place</h4><ul>'
            '<li><b>1</b> nothing to build. <b>2</b> <code>try-it.tsx</code>: the fold, the glyphs, the focus moves. <b>3</b> <code>seat-picker.tsx</code>: the dashed slot on three rows.</li>'
            '<li><b>4</b> nothing to build. <b>5</b> <code>summariseFillPasses</code> keeps passes with no live cards; <code>provenance-line.tsx</code> sentences; a test that the still-here figures sum to the header.</li>'
            '<li><b>6a</b> share <code>ZeroState</code>, render it from <code>no-results.tsx</code>. <b>6b</b> (if A) the grid popup in <code>quick-add-bar.tsx</code> / <code>card-search-row.tsx</code>.</li>'
            '<li><b>7</b> close #182’s divergence item. <b>8</b> the toast from <code>use-card-search.ts</code> and the deck slot’s lift above the dock.</li>'
            '<li>Copy for /copy-review: Show fewer (2), the ledger sentences (5), Keep only search key and Clear all filters (6a), the grid hints (6b), Couldn’t search just now. / Try again (8).</li></ul></div>')
    return doc("Small items 2", head + f'<div class="calls">{"".join(cards)}</div>' + gaps, 1820)
