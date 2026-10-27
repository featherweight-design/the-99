# The 99 — signature card (any card, any printing) and spare asks outside Shopping (design handoff · R1)

Account 2, 2026-10-27. Source of truth: Hugh's prompt in the project chat (no separate brief). A stateful addendum to
Social R1's face (G11, `design/design_handoff_the99_social_r1/`) plus one row in first-run onboarding
(`design/design_handoff_the99_first_run_onboarding/`), and Part 2: asking for a spare from a friend's Spares tab and
from the trade-match notification (`design/design_handoff_the99_menu_home/`, `design/design_handoff_the99_spare_requests/`).
Goes to main as `design/design_handoff_the99_avatar/` (mirroring `design_handoff_the99_printing_picker/`) only after Hugh approves.

Canvas: https://claude.ai/artifact/KC5YqYATfjhEwYLtFdYozK

**Status: R1, awaiting Hugh's audit.** Every string is a placeholder for `/copy-review`. Orange dashed outlines mark
what is new against the shipped page. Art is cut from the design folder (the canvas can't load Scryfall), so the
Mystical Tutor printing tiles share one picture; in the app each tile is its own printing.

## Hugh's rulings (2026-10-27), closed

- The face can be any card, not only one that can lead a deck: `setCommander`'s commander rule goes.
- The face can be any printing of that card. The printing is stored; a printing leaving the catalog falls back to the card's usual art.
- Players are asked to pick a face during onboarding.

## Calls

**1 · The label: "Signature card".** Not "your commander" any more, and "avatar" or "face" is app-speak. The head's
empty press reads **Choose your signature card**, the picker's title **Your signature card**, the face button's name
"Your signature card: Polyraptor. Change". The face itself is unchanged: art, no frame, no name.

**2 · The picker: the shipped one, two screens.** Same `SocialModal` (tall sheet on a phone, 520 dialog on desktop),
same search field, same **From your decks** row (each deck's own printing). Search finds **any card** (type line under
the name). A result with one printing saves on press, as today. A result with more reads **N printings ›** where the
identity pips sat, and opens a second screen (‹ back, as Add a friend's chooser does): a preview of the face on top,
then the printing picker's tiles (`design_handoff_the99_printing_picker` decision 1: 63/88 full-card tiles, set name,
set code) and its set search over 12. **Usual art** first, then newest set first. One press saves and closes, as today.

**3 · The crop: the printing's art crop, for every card.** A face is 16 to 64px; a full card at that size is a frame
with a smudge. Every card, commander or not, crops to its printing's art crop, centred, as faces do today. The tiles
show the whole card (cards at card shape); the preview shows the crop you get. Desktop hover or focus previews a tile.

**4 · Onboarding: after the upload, never in its way.** One unnumbered checklist row (`first-run.tsx`, the Friends
row's box), under the three steps and before **Add your friends**. Live from the first visit (never waits on the
upload) but after it in order, so step 1 stays the one thing the page asks first. The row opens the picker over Home.
**Skip** takes the row away for good (that is the "later": /friends keeps its + tile). Picked, the row turns done with
the face (✓, face, "Polyraptor. Change it any time on Friends.") and stays; its press reopens the picker.

**5 · Players who already have a profile: asked once.** A profile with no face that never pressed Skip gets one Home
strip in the welcome strip's shape: "Friends see your initials. **Choose your signature card**" and a bare ✕. It leaves
for good on a pick or the ✕. It also catches a new player who imported a deck before the checklist asked.

**6 · Edited in one place: /friends.** The head of /friends stays the one place, as with the name. Settings doesn't
get a copy (it holds no name either). The onboarding row and the Home strip open the same picker in place.

**7 · A printing that's gone.** Silent everywhere a face is drawn: the usual art, no mark. Only the picker tells, on
that card's printing screen: one line in a note box ("The printing you picked has left the catalog, so friends see the
usual art. Pick another any time.") and the usual-art tile reads **Shown now** (the printing picker's word for a fallback).

**8 · A friend's Spares tab: engineering's proposal, ratified.** A tile press opens the shipped spares-only modal
(`SparesSheet`, Friends with a spare) for that card, with Ask. Changes: the friend whose page you're on is **first**
(then the rest, most spares first); the box's kicker reads **on your wishlist** (or nothing) instead of "replacing";
the tab's line adds "Press one to ask for it."; the tile's caption carries **Requested** / **✓ Accepted** in the modal's
words. Card details stay one press away (the card's name in the box). ✕ returns focus to the tile.

**9 · A notification opens the modal by itself.** The trade-match push, its Home item (See Colin's spares) and its
Waiting on you row land on the friend's Spares tab **with that card's modal open**, the tile ringed behind. If the
spare has gone since: no modal, the tab as it is, and the shared toast "Colin no longer has a spare Ghalta, Primal Hunger."

## States (Picker board)

| Frame | State |
|---|---|
| P1 | Empty: search focused, From your decks, current face outlined |
| P2 | Results ("sw"): any card, type line, N printings › |
| P3 | No match: "No card matches “xqzv”." |
| P4 | A card with one printing: row press saves, row shows Saving, rest dims |
| P5 | Its printings: preview, set search, Usual art first |
| P6 | Saving: pick ring + spinner on the tile, rest dims, then close |
| P7 | Saved: /friends head with the new face (no toast; failure keeps the sheet and toasts "We couldn’t save your signature card. Try again.") |
| P8 | A printing that's gone: note line + Shown now |
| D1, D2 | Desktop: results; printings with hover preview |

## Gaps for engineering

- **G1 · setFace.** `setCommander` → `setFace(viewer, oracleId, printingId | null)`. `canBeFace`'s commander rule goes; any game card (`isGameCard`: no tokens, emblems or art cards). The printing must belong to that oracle id, else `notAPrinting`. Null printing = usual art.
- **G2 · the printing column.** `social_profiles.face_printing_id`, nullable. Face reads left-join the printing's art crop and fall back to `cards.art_crop_uri` when the printing is gone (no write). `commanderColumns` → `faceColumns`.
- **G3 · the reads.** `searchFaceCards(query)` over every game card, with a printing count; `listFacePrintings(oracleId)`: printings with an art crop, usual art first, then newest set first, with set name, code and full-card image. Over 12, the shipped set search.
- **G4 · ask once.** One account flag (`face_prompt_done_at`) set by Skip, the strip's ✕ or any pick; the checklist row and the Home strip read it. Whether a profile is made on first pick if none exists: engineering's call.
- **G5 · the deep link.** `/friends/{publicId}?spare={oracleId}` on the trade-match push url, its feed item and the Waiting row. The page opens `SparesSheet` on load when that friend still offers the card; it needs every friend's spare of that card and the reader's request state for it (the read Shopping's modal makes).
- **G6 · strings and switch.** Placeholders for `/copy-review`. A feature switch only if engineering sees a plausible regression.

## About

An **edit** to the `friends` entry's second paragraph (`about-entries.ts`), not a new entry:
"~~Pick a commander~~ **Pick a signature card, any card in any printing,** and its art becomes your face, beside your
name everywhere a friend sees you. …". Rides the next batched `ABOUT_VERSION` bump with no halo. If the face change
ships behind a switch, the sentence is a `keySwitches` pair on it.

## Boards

| File | What |
|---|---|
| `Main.dc.html` | The round: calls and gaps |
| `Picker.dc.html` | 1 · The picker, P1–P8 at 390, D1–D2 at 1300 |
| `Onboarding.dc.html` | 2 · The checklist row (todo, done, skipped), the Home strip, both widths |
| `Edit-About.dc.html` | 3 · /friends head (no face, a face), the About edit, Settings: no |
| `Spares.dc.html` | 4 · Spares tab tile → modal, asked, captions, push landing, spare gone, desktop |

`scratch-gen/` rebuilds the boards: `python3 build.py` (local art) or `python3 build.py blob <dir>` (canvas `/_blob/` urls
from `blobs.json`); `render.cjs` (node Playwright, React/Babel routed to local copies) measures each board and reports
broken images.
