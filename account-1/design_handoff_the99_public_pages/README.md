# The 99 — Public card page and public commander page (design handoff, R1)

`design/design_handoff_the99_public_pages/` · 2026-10-17 · account 1 · **for Hugh's audit, not yet a PR**

Source of truth: `docs/superpowers/design-briefs/2026-10-17-public-card-and-commander-pages.md` (main, PR #2031). Locked
and Decided items are not reopened here. Structural siblings: `design_handoff_the99_card_detail/` (the card sheet whose
catalog-only parts these reuse) and `design_handoff_the99_commander_explained/` (the prose section and the absent/degraded
notes). Canvas: `canvas/` (21 artboards, `canvas/canvas.json` is the index; `Main.dc.html` is A1).

**The one-line summary:** *one shell for both pages — a brand mark on the left, the Scryfall hand-off where a search box
would be on the right, the card in a left column with The 99's one quiet block under it, and the catalog in the right
column, in the order a stranger reads it.*

---

## The eight calls (§Open)

| # | Question | Call |
|---|---|---|
| 1 | Card page contents and order | Name + cost + type → rules text → **Bracket facts** (only when the card has any) → facts row **Identity · Rarity · Commander** → **Printings** → the commander cross-link (only when the card has a commander page) → one link out, **"Rulings, prices and every printing on Scryfall ↗"**. Dropped as noise: keywords as a separate list (they are already bolded in the text), mana value, the per-printing tile art. |
| 2 | A flipped card with no zoom sheet | **The shipped flip**, not both faces side by side. The 44px turn control sits under the card on both widths (the sheet's phone geometry), with a mono `Front` / `Back` caption. The heading carries both names (`Valki, God of Lies` then `// Tibalt, Cosmic Impostor`), the type line both halves, the cost both halves, and the rules block both faces split by a `// Tibalt, Cosmic Impostor` rule. Everything a reader needs is in text, so the flip is personality, not a gate. |
| 3 | Commander page contents, prose placement | The prose **leads the right column** — it takes the slot the per-user Fit Hero holds signed in, under the shipped heading `Why this commander`, one size up (17.5px). Then **On EDHREC** (rank and deck count, the Fit Hero's card chrome), **Themes**, **Brackets**, **Most played with {name}**, **Similar commanders**. The score, the gap line, sentences 2–3, The Pool, Role Coverage and owned art are gone; the stats card and the two lists take their place. **Engine is dropped**: it is a regex heuristic no surface renders, and a stranger cannot read `tap`. **Budget counts are dropped**: EDHREC's budget and expensive buckets come back equal (1,168 / 1,168 for Zimone), which reads as a bug. |
| 4 | The signed-out block | **One block, same slot on both pages: under the card in the left column** (where the commander page's Build button sits signed in), and **last before the footer at 390**. Mark, `This is The 99`, one sentence on what it does with your collection, one on how the invite works, one **Sign in** link, fine print `Have an invitation? Open its link.` No field, no form, never "Sign up". |
| 5 | The Scryfall hand-off | **In the top bar, where a search box would be**: `Find another card on Scryfall ↗` at 1300, `Search Scryfall ↗` at 390 (44px target). Shipped `ExternalLink` style, new tab. It is on both pages and on the not-found page. |
| 6 | Moving between pages | Catalog-only links only. **Commander → its card page** (`The card, its text and printings →`), **→ each Most-played card**, **→ each similar commander**. **Card → its own commander page** only when it has one (`Rootha as a commander →`). **No "commanders this card fits"** in the first cut: it needs a reverse index across ~30,000 cards that no loader has. |
| 7 | Empty and unavailable | Drawn: no image (identity gradient, no caption, no stand-in art), absent, degraded, no prose, blank rank / both blank (fragments), not Commander-legal (fragments), unknown address. See STATES. |
| 8 | Link previews | Card: the card over its own blurred art, name, cost, type, lockup; description = type line + rules text cut near 155 chars. Commander: the art crop, name, **the prose sentence as the description**, rank and decks, lockup. Table on C2. |

---

## Decisions that need Hugh's eye (artboard → frame)

1. **The block under the card, not under the text** — A1 and B1, left column. It is the commander page's Build slot, so the
   thing a member would do is where a visitor learns how to become one. If it reads as crowding the card, the fallback is
   the 390 placement at both widths (after the last section).
2. **The flip over two faces** — A2. Both faces' text is always visible, so nothing is behind the turn.
3. **Prose as the lead, one size up** — B1 right column, top. Signed in it sits under the Fit Hero at 13.5px; here it is
   the only writing of ours, so it goes first.
4. **Printings collapse to 8 at 390** with `Show all 21` (A3 390). At 1300 they all show (≤ 40).
5. **Engine and budget counts dropped** — B1.

## Engineering notes the design depends on (not decided here)

- **Printing count.** `PublicCard.printings` is capped at 40 with no total, so a capped card says `first 40` and ends in
  `More on Scryfall ↗` (A4). A `printingsTotal` would let it say `145`.
- **Back-face rules text.** A2 draws both faces in the rules block. The loader notes the catalog holds no separate
  back-face text; if `oracleText` holds only the front for `transform` layouts, the block shows the front only and the
  `//` rule drops. The faces' names and type lines come from `faces[]` either way.
- **Prose in `degraded`.** `loadPublicCommander` nulls prose whenever the state is not `ok`. B4 draws that. The sentence is
  stored and does not depend on EDHREC answering, so showing it in `degraded` (as the signed-in page does) would keep the
  page from reading empty; Hugh's call.
- **Similar commanders without a public page.** The loader returns up to 12 with slugs; a similar commander with no support
  row would 404. The list should hold only those that resolve.
- **Scryfall links per printing** are `https://scryfall.com/card/{set}/{collector_number}` — both fields are in
  `PublicPrinting`.

## Canvas-only gaps

- **A2's card faces are placeholders.** No double-faced scan is in the design folder and this session could not reach
  Scryfall's image host. Every other board uses scans from the design folder. To finish A2: drop the two faces into the
  folder (or allow `cards.scryfall.io` for the session) and they replace the plates one-for-one.
- **The A0 footer is a labelled stub** at its brief's height (it is not built yet; `src/` has no component).
- The Zimone sentence on B1 and C2 is **a sample in the 110–160 band**, written for the board, not the stored row.

## Not drawn, by design

No price anywhere. No search box. No wall, modal, gate, toast or sticky bar. No skeletons: the page is cached HTML, so there
is no loading state to draw. No "Sign up". Nothing that varies by visitor.
