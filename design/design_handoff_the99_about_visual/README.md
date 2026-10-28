# The 99 — About as six visual pages (design handoff · R3)

Account 2, 2026-10-27. Source of truth: Hugh's prompt in the project chat, and the three files on
`docs-about-visual` (PR #2283), `docs/superpowers/about-visual/`: `workshop-2026-10-27.md` (Hugh's six rulings),
`audit-2026-10-27.md` (the content list) and `walk-rulings-2026-10-27.md` (voice rules and approved text).
Replaces About's 83 text entries, the ? panel and the release banner's wording. Lives on main as
`design/design_handoff_the99_about_visual/`, beside `design_handoff_the99_about/`.

Canvas: https://claude.ai/artifact/2xkvoZtTrCqsXYRg5RPhV9

**Status: R3 APPROVED by Hugh 2026-10-28** ("Were we able to get screenshots of everything? If not, engineering can handle this during development"). See `READINESS.md`. R3 (Hugh, 2026-10-27): Good to know and Try it headings carry more weight (a ruled line above, Cinzel 18, the mark, a muted sub-line). Most "not in today's capture" flags are gone: fresh captures at both widths (`captures-r3/` on `design-assets`, taken on Hugh's Mac against his local server, nothing written), and a screen may now use a second shot of itself, `(captureKey, box)` in the generator's `data.py`, numbered on in reading order. Two flags remain because they need data the audit account lacks: phone Analysis "What is in this deck" (no stored analysis) and desktop Friends "Rule 0 check" (no pod). Engineering's capture fixtures (G1) cover both.

Earlier, R2: R2 (Hugh, 2026-10-27): a reader sees captures of the device they are on, never the other width; on desktop each screen is three separate blocks, the labelled screen, then Good to know, then Try it, so Good to know sits right under the screen. Every picture is a real capture: phone from `public/about/shots/amonkhet`,
desktop 1300 from the contact sheets. Every string is a draft for `/copy-review` (`copy-strings.ts`).

## Boards

| Board | What it shows |
|---|---|
| Main | The calls below, the six pages' counts, the gaps for engineering |
| 1 · Decks in full · phone | The densest page top to bottom at 390, seven screens, in three frames |
| 2 · Decks in full · desktop | The same at 1300 |
| 3 · How a label points | Pin anchoring, a pressed label, the 3 / 5 / 8 crowding study |
| 4 · The other five pages · phone | Home, Collection, Commanders, Shopping, Friends at 390, labels and rules placed |
| 4b · The other five pages · desktop | The same five at 1300, desktop captures only |
| 5 · Index, banner, landing, ? | The /about index, the banner (one and two launches, phone and desktop), the landing with the new label lit, the ? |
| 6 · States | A label switched off, a capture loading, a page with no hidden rules |
| 7 · Copy | Every label and rule with its region and switch |

## Calls (the four Hugh left to Design, plus what follows from them)

0. **The picture matches the device (Hugh, R2).** Phone readers see phone captures and desktop readers see desktop captures: the pages, the tool card pictures (a desktop tool card crops its screen's desktop capture around the control, lit with the halo), the index tiles and the banner crop. Desktop sections are three blocks in order: labelled screen (capture 700 wide, labels beside it), Good to know (row of three), Try it (row of three tool cards).

1. **How a label points: numbered pins, words in a list.** A pin (24px accent disc, its number) sits on its
   region's top-left corner, nudged 14px inside the picture; the list is beside the shot on desktop, under it on a
   phone. No words on the picture, so a re-taken capture never re-wraps. Pressing a label (or pin) lights its region
   with the tool cards' halo. **Five pins a picture at most**; more means the screen becomes two shots.
2. **Good to know: a card with a small diagram** built from the app's own shapes (a card row, a deck tile, a buy tag,
   a bracket medal, a role cell), then one or two sentences. It sits in the section of the screen it belongs to, so a
   ? lands on that screen's labels and rules together. Phone: a swipe row with dots. Desktop: a grid of three.
   Kicker carries the banner's diamond mark. 15 rules on four pages; Home and Commanders have none.
3. **Six pages and an index, not one scroll.** `/about` is six tiles (each its page's first capture). Every page has
   the six in a strip (the shipped tab strip) and **On this page** chips (the ? panel's chip) for its screens.
4. **Menu: unchanged.** "About The 99" stays first in the account menu. No new row.
5. **The ? opens its area's page, scrolled to that screen**, with a **‹ Back to {screen}** bar held at the top. The
   ? panel and its search retire (one source, as ruled).
6. **Tool cards: shipped, one change.** "How it works ›" pointed at the Reference, which goes; it becomes **Show me ›**
   (the panel's shipped Show me). The card's press is still Try it. A section's tools follow its labels; phone shows
   the first and "N more below".
7. **Banner: shipped band, the diamond swapped for a crop** of the new label's region (64x48 phone, 56x38 desktop):
   "New on Decks: Matchups splits …" + Show me. Two or more: the shipped "New in the app" band, a crop per line.
   Show me lands on the page with the label lit, marked **New**, and its tool card directly under it.
8. **States.** Feature off for the reader: the label is gone (pin, line, its rule card) and numbers close up; never
   greyed. Capture loading: the frame at the capture's known size, a quiet skeleton, no pins; labels read without it.
   No hidden rules: no Good to know heading, no empty state.

## Gaps for engineering

- **G1 · Capture inventory.** Each section's capture must hold every label region, at both widths. Today the phone deck
  shots are taken with the tabs at the top (no Recommended mix, no commit band), the desktop deck shot predates Lock
  cards, and the two Analysis captures are different decks. The canvas marks each such label
  "not in today's capture".
- **G2 · Desktop captures.** `capture:about` shoots 390x844 only. Each section adds 1300x900, all six themes, plus a
  desktop crop per tool. The canvas's desktop frames come from contact sheets and three fresh 1300 shots
  (`captures-desktop/`). Note: at desktop the drop zone reads "Drop your new collection CSV here"; the phone reads
  "Drop your new CSV".
- **G3 · Anchors.** Each label names a region (`data-about-region`, or today's locator in `about-locators.mjs`) measured
  per capture into `shots.generated.ts`, as the locator boxes are now. A visible label with no box fails readiness.
- **G4 · Seen and launches.** The announced unit becomes the label or rule (audit option B), each with its switch and
  `since`; legacy seen ids are translated so nobody is re-told (README errata 3 on the docs branch).
- **G5 · Tool cards.** Show me targets a label id; the cut entry ids the showcase hangs on need new targets first
  (audit decision 4).
- **G6 · Pins.** Two pins under 28px apart: the later slides right along its region's top edge. Fully overlapping
  regions are one label.
- **Launch rule** stays discretionary, as ruled.

## Files

- `*.dc.html`, `canvas.json`, `support.js`: the canvas boards. Open a `.dc.html` from disk; images load from `art/`.
- `art/`: the captures and crops the boards use (webp; the raw PNG captures stay on `design-assets`).
- `copy-strings.ts`: every label, rule and page string, with region and switch. Reference only, never imported.
- The generator (`scratch-gen/`) and the raw captures (`captures-desktop/`, `captures-r3/`) stay on `design-assets`
  under `account-2/design_handoff_the99_about_visual/`.
