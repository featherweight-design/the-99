# The 99 — deck page messages (design handoff · R1)

Account 2, 2026-10-22. Brief: `docs/superpowers/design-briefs/2026-10-21-deck-messages.md` (PR #2166, branch
`deck-messages-brief` until merged). Canvas: https://claude.ai/artifact/CKv1LdWeXgSdqikozFPNe2

**Status: R1, awaiting Hugh's audit.** Hugh ruled all four calls as drawn (2026-10-22) and asked for two divergent alternatives (Alt A, Alt B below) to compare. Every string is shipped copy or a placeholder for `/copy-review`. Nothing new is
said. No press is lost.

## The problem

Up to seven blocks sit between the deck header and the tabs, drawn in five families (bare text, the left-rule card in
three colours with three marks, the full-bleed arrival band, the labelled section, the bubble). The colour of a left
rule means three different things, and three different memories decide what a ✕ remembers.

## The system

Every element above the tabs belongs to one **level**. Each level has **one** treatment, and each treatment is a skin
the page already ships.

| Level | Elements | One treatment (shipped skin) | Place | Dismiss |
|---|---|---|---|---|
| Receipt | A10 precon arrival, A12 import arrival (plain, owned), A13 update, A11 precon suggestion | The arrival band (`ArrivalBandShell`): full-bleed `--surface-rail`, ✓ `--success` (none on A11), bare ✕ | Top of the column | ✕ |
| Warning | A6 spoken for twice, A4 over the 99 | The commitments band (`RollupBands`' over band): `--elevated-hover`, 3px `--danger` rule, heading `--avail-over-fg`, a lead mark per row | Under the receipt | Never |
| Action | A14 pending, A8 the last N (and its ran-out plate), A9 fill failed, A15 unresolved, A17 first run | The pending card (`PendingBanner` CARD): `--surface-rail`, `--border-strong`, 3px `--accent` rule, mono eyebrow `--accent-text`, one `--fg` primary | Under the warning | Never; leaves when done |
| Status | A14 quiet version strip, A3 proxies, A7 provenance, A6's soft claim | The version strip (`PendingBanner` STRIP): full-bleed `--surface-rail`, mono `--fg-faint`, one line | Under the action | Never; disclosures close |
| Mix | A16 | Unchanged (phone parity only) | Last before the tabs | Never |
| Moments | A18 M1–M4 | Unchanged bubble, anchored to its press | Over the page | ✕ (account) |
| Header | A2 notice tag, A5 Commit as v1 | Unchanged chip and primary button | Header | Never |
| Toast | A1 remove failure | `ToastFrame`, deck slot, `role="alert"` | Window foot | Times out |

**Left rules:** two colours, two meanings. `--danger` = warning, `--accent` = action. The `--warning` rule (A9, A15), the
dashed rule (soft band), the accent rule on the ledger and the exhausted plate, and the two "i" marks all go.

## Placement and order

Header · receipt · warning · action · status · mix · tabs. Same order at both widths. What just happened, what is
wrong, what to do, how it stands.

- **Out of the header:** the proxy line (A3 → status) and the over line with `Proposed cuts →` (A4 → warning). The phone
  header ends at the bar and count, then its actions row. The `+N` and the `Over` pill stay.
- **The guided banner (A17)** moves above the mix, into the action slot, merged with the top-off door (first run).
- **The remove failure (A1)** leaves the column for the deck toast the token refusal already uses: the shipped sentence as
  the title, the card name as the detail, no press (the row stays, its ✕ is the retry). Eight seconds, held on hover
  or focus; above a got-it receipt it lifts the way `TokenRefusalToast` does.

## Two or more at once

- **At most one block per level.** Two warnings share one block (over the 99 first, hairline between).
- **Actions share one card.** The first of *fill failed › unresolved › the last N › pending changes* leads in full. The
  rest are "also" rows at its foot: label, one line, every press it has today (pending keeps Review, Commit and
  Discard). Commit as v1 never meets another action, so it stays in the header.
- **Status is one line.** Segments joined by a dot, in order: version, proxies, provenance, other drafts. A segment with
  more to say is a disclosure (`--fg-body`, dotted, ▾); it opens below the line, one at a time: the shipped ledger
  (without its accent rule) or the soft claim's sentence.
- **Only status folds.** Warnings are never collapsed or put behind a press.

Measured at 390 (header to the tabs): Stack 1 1,355 → 1,114 px; Stack 2 952 → 970 px (the over line costs a little as a
block; the gain is one voice); Stack 3 1,611 → 1,196 px; first run 878 → 777 px; a quiet deck is unchanged.

## Dismissal and memory

- **Receipts last the visit they arrived with.** The page reads `?from=precon`, `?imported=1`, `?updated=` once and strips
  them, as `StripAddedParam` does for `added`; ✕ hides the receipt for the visit. Nothing is stored. A10 and A12 no
  longer share `arrivalDismissKey`; A13's component-state rule becomes everyone's.
- **The precon suggestion (A11)** is an offer that stands until linked: ✕ remembered on the account (`user_prefs`, like
  `moments_spent`), per deck and precon. Today localStorage. Hugh's call.
- **Moments:** unchanged. **Warnings, actions, status, mix:** no ✕; status disclosures and Why these numbers? stay
  closed only for the visit.

## Phone parity

- The mix's source line (`mixSourceLine`) and draft note ("· reading pending changes") join the phone's label row, in the
  desktop's inks. Under 360 they wrap under the label.
- The toolbar's draft note stays desktop-only: on the phone the brass-rule caption (B4) already says it above the list.

## Hugh's calls

1. Commit as v1: the header's primary (drawn) or an action card (needs a sentence).
2. Precon suggestion ✕: account (drawn) or keep localStorage.
3. Receipt above the warning (drawn) or below it.
4. The last N leads pending changes when both wait (drawn).

## Gaps

- G1 · Stripping the arrival flags: check nothing reads them after the first render (History links, the review page).
- G2 · M3 registers in both spines today (brief b.12). In the warning row it has one anchor at both widths.
- G3 · Copy for `/copy-review`: unresolved's "either tab below"; the partner "99" strings; the guided banner and
  `mixSourceLine` into `src/lib/copy`; the action eyebrows "2 lines unresolved" (new label for A15's card and also row).
- G4 · Fixtures: Thopter Works (Sai, Master Thopterist) and Big Stompy (Ghalta, Primal Hunger) stand in for Hugh's decks.
  Art from `design/design_handoff_the99_decks/addendum-phone-header/art/`; bracket marks from the deck notices assets.

## Files

- `Main.dc.html` — the system: levels, order, folding, dismissal, calls, gaps.
- `Stack-1.dc.html` — spoken for twice + provenance + pending + mix (Hugh's screenshot), today vs R1 at 390, R1 at 1300.
- `Stack-2.dc.html` — over the 99 + Proposed cuts moment + pending + mix.
- `Stack-3.dc.html` — the worst case (seven blocks).
- `Quiet-and-First-Run.dc.html` — the quiet deck and the first deck.
- `Elements-1.dc.html`, `Elements-2.dc.html` — every element in its level, 390 and the 1236 main column.
- `Alt-A.dc.html` — alternative A: one to-do card under the header (warnings are red rows, actions rows with their press, status in the foot, receipts become toasts).
- `Alt-B.dc.html` — alternative B: no stack; each message where it belongs (count line under the bar, spoken-for chip + red rows, save dock for pending, Versions tab for provenance, row marks, toasts).
- `Alt-A2.dc.html` — Hugh picked A (2026-10-22). Round 2: receipt band back on top; one press per row in one column; one "Next step" row (first of fill failed › unresolved › over › last N › pending; spoken for twice never) with the only filled press; Commit/Discard move into Review. Variant: next step as the card's head.
- `Alt-A3.dc.html` — every next step (fill failed, unresolved, over, last N, ran out, pending, first run) as a row vs in the card's head; the precon band trimmed to precon, owned count, History; the foot's ▾ segments opened inside the card (ledger, other drafts) at 390 and 1300.
- `Show-Cards.dc.html` — Hugh rejected next step in the head (keep A2's row). Show these made obvious: today's PassMark vs (1) filter and jump with a chip vs (2) the shipped sheet/modal listing the pass's cards with Undo in its foot (recommended; also answers other drafts).
- `STATES-deck-messages.md` — element by element: level, what changes, code.
- `art/`, `support.js`; `scratch-gen/` (generator: `python3 build.py local|blob`, `render.py` renders and measures with
  Playwright; `blobs.json` maps art to the canvas's asset ids).
