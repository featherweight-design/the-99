# The 99 · What's new, nothing new (account 2, 2026-11-03)

Canvas: https://claude.ai/artifact/PqDhfsAtR7UhKRYhkhkFrM
Status: **R1 B APPROVED by Hugh 2026-11-03** ("I like B as well").

Home's What's new box when kinds are on and nothing is in the window. Today it names every kind on in one run-on sentence
(all nine for a reader with everything on). Hugh's ask: redraw it for phone and desktop, with restraint, teasing a couple of
kinds rather than listing them, and rename the head's link to **Choose your notifications**. Drawn at 390 and 1300 over the
shipped Home (`src/components/home/whats-new.tsx` `Quiet`, `src/lib/copy/feed.ts`). New pieces carry a dashed copper outline.
Strings marked DRAFT go through `/copy-review`.

To view a board, open `Main.dc.html` or `States.dc.html` with `support.js` and `art/` beside them. `scratch-gen/wn.py` is the
generator, over the announcements kit on `design-assets` (`account-2/design_handoff_the99_announcements/scratch-gen`, plus
`small_items_6/scratch-gen/w6.py`): `BMOD=wn python3 build.py local`.

| Board | What |
|---|---|
| `Main.dc.html` | Today, A, B (approved), C at 390; B, A, C at 1300; the calls |
| `States.dc.html` | B in every state that reaches the quiet box |

## The approved design: B

- **The fan.** Two of the feed row's 46x64 picture plates, the shipped post-glyph plate (`PostPicture`'s plate: radius 4,
  1px `--border-strong`, `--surface-raised`, glyph in `--fact`), fanned in a 72x72 box: the back plate at left 0,
  rotated -9deg, its glyph in `--fg-faint` and pushed to the left edge (padding-left 6) so it shows past the front plate;
  the front plate at left 24, rotated +6deg, with a 6px `--accent` dot 6px in from its top right corner (the unseen mark).
  Both plates carry `0 2px 6px rgba(0,0,0,.35)`. Decorative: `aria-hidden`.
- **The words**, beside the fan (gap 14, box padding 12/14, items centered): the bold lead on its own line
  (13.5px, 600, `--fg`, 2px under it), then the tease line (13px / 1.55, `--fg-body`). Same box (`--surface-inset`,
  radius 14) as shipped.
- **Same at 1300.** The box is wider; nothing else changes.
- **The head's link** reads *Choose your notifications ›* (DRAFT) in every state that draws it (rows, quiet, every kind
  off). It still goes to `/settings`.

## Copy (DRAFT, `/copy-review`)

- Lead, as shipped: *Nothing new right now.*
- Tease: *We'll tell you here when {a} or {b}.* `{a}`, `{b}` are the first two kinds on, in this order:
  new-precon, trade-match, secret-lair, spare-request, price-drop, new-set, commander-decklists, combo, wizards-news
  (catalog and friend news alternate). One kind on: *We'll tell you here when {a}.*

| Kind | Phrase | Plate glyph |
|---|---|---|
| new-precon | a precon drops | Decks nav glyph |
| trade-match | a friend has a spare you want | Friends nav glyph |
| secret-lair | a Secret Lair drop is announced | post glyph |
| spare-request | a friend asks for your spare | Friends nav glyph |
| price-drop | a wishlist card gets cheaper | down arrow |
| new-set | a new set comes out | Collection nav glyph |
| commander-decklists | Commander decklists go up | post glyph |
| combo | you can make a new combo | combo glyph |
| wizards-news | Wizards has news | post glyph |

Everything on: *We'll tell you here when a precon drops or a friend has a spare you want.* The four defaults:
*…when a Secret Lair drop is announced or a friend asks for your spare.* The front plate carries `{a}`'s glyph, the back
plate `{b}`'s; with one kind on, the back plate carries the post glyph.

## States (`States.dc.html`)

1. **Never chose, defaults on:** B, then the shipped stacked offer line under its rule. No head link, as shipped.
2. **One kind on:** one phrase; back plate on the post glyph.
3. **Every kind off:** no kind to tease, so no fan: the shipped off line (*Nothing will show here. Every kind of news is
   off.*) unchanged, and the renamed link.
4. **With rows:** rows unchanged; only the link's words.

Not drawn, unchanged: the lead-story-only case (the head stands over no box, as shipped).
