# READINESS — assigning a contested copy (R2)

Gates **PR 3** (summary route, chooser, assignment action) and **PR 4** (the second door) of
`docs/superpowers/specs/2026-09-14-card-assignments-design.md`. PRs 1 and 2 carry no design gate.

**Verdict: 🟠 amber** — two rulings needed, one of them on a shipped component, and one API shape
that decides whether a required state can be drawn at all.

## Blocking

1. **The marker becomes a tap target.** On the deck page the chooser hangs off the
   `over`-state availability marker. `availability-marker.tsx` rules the marker *"has no hover, no
   focus ring and is never a tap target"* and ships no `title` for the same reason. **This is the
   one shipped ruling R2 contradicts** and it needs ratifying. The alternative — a second control
   beside the marker — is exactly what the card-row floor (name + one availability slot) exists to
   refuse. README decision 10.

2. **The assignment action must return a named refusal cause.** Three of the spec's four causes are
   drawn and each has its own sentence, its own redraw and its own guidance:
   `claimant-no-longer-asks`, `no-supply-left`, `target-is-commander`. A single generic failure
   collapses them into the shipped transport treatment and the spec's *"reported on the row rather
   than swallowed"* goes unmet. The fourth (`not-your-deck`) is deliberately undrawn.

3. **A refusal response must carry the row's fresh state** — arrivals, committed claimants,
   allocation — from the transaction that refused. The write already re-reads all three; the row
   needs them to redraw correct numbers with the message in **one** round trip.

4. **`claims[].commander` must be per copy, not per claim.** The folded case (a deck holding the
   card as commander *and* as a list card) is a live row: the commander half is inert, the rest is
   pickable. If the flag cannot express the split, state 34 is undrawable and the row would have to
   go fully inert — hiding a legal choice.

5. **`IssueInspector` must be reachable after the confirm**, or the header's issues line keeps its
   counts and drops its link. The rows live on `csv_uploads` — the table the spec is already adding
   `summary_payload` to — but nothing reads them post-confirm today. **A scope call for PR 3.**

## Ratified by this handoff

5b. **The summary replaces one shipped line and no shipped screen.** `ReviewScreen` (step 2, file
   problems) and `ConfirmModal` (step 3) are untouched; only `replace-flow.tsx:39`'s
   `router.push("/collection")` changes. **An unmatched name gets its own reason clause**
   (`name didn't match`, `--warning`) because its remedy is *fix the file*, not *buy the card*.

5. No verb-button for giving; the heading carries the verb and the deck names are the control, each
   leading with the app's own single-select mark — **and the shape follows the cap: round at one
   copy, square above it, with the limit stated (`2 of 2 given`)** (README decision 3b). **The mark
   states allocation; brass and the `your call` plate state authorship** — nothing is brass until a
   pick. **The `your call` plate is withdrawn** (README 3c) — a picked row carried five signals for
   one bit of state and the plate was the weakest, since **the footer sentence is the same word
   carrier and names the deck**. In exchange, **the footer is required on every surface the chooser
   appears on** — it is the feature's only non-colour carrier of authorship. **Three outcome words,
   no quantities:** `gets it` / `buys it` / `keeps it` — the chooser
   allocates copies **across** decks, never within one, so **no stepper is needed or wanted.**
6. **The word `claim` appears in no string.**
7. **No sentence asserts where a card physically is** (`availability.ts`'s own rule).
8. `spoken for` not reused; `holds`/`wants` considered and rejected — allocation gets `gets it` /
   `buys it`. `still short` borrowed from `marker.over`.
9. `Pull it` untouched — border, pronoun, `Pulling…`, both guards.
10. One row component, three surfaces, no variant.
11. **Three summary sections** (`No longer to buy` / `Still to buy` / `Still short`) and **no prices
    or totals anywhere on the page.** The diff's three classes become two player outcomes; the
    third survives as a reason clause on the row. Prices live on each deck's Shopping list.
12. The summary renders for an empty result and replaces the bounce to `/collection`.
13. Money sections are the frozen payload; only the contested section is live.
14. Optimistic on success, authoritative on refusal; no in-flight state.
15. Picking the held deck **deletes** the reservation; a cleared row is indistinguishable from one
    never touched.
16. Nothing is brass while the default stands.
17. Commit order (`since`, per card), never re-sorted, own deck never promoted.
18. Brews are never options, are never counted in the supply line, and are named in a footnote.
19. The contested section never truncates; money sections truncate at four.
20. One new chip (`still short`) on the `/changes` strip.

## Metrics

- Deck option **44px one-line, 52px two-line**. The two-line form is chosen by **column width, not
  viewport width**: it is the 390px option *and* the deck-page panel's option at any width, since
  that panel's column is 345px — within a hair of the phone option's 336px — where a one-line
  option's fixed content (274px + 33px gaps + 20px padding) leaves the deck name 18px. Leading with `filter-panel.tsx`'s single-select
  mark at its shipped geometry: **16px desktop / 18px phone**, gap **11/12**, 1px ring, inner dot
  **6/7px**. `Back to first committed` 34px tall with a
  **44px target**. Receipt rows 44px desktop, 46px two-line phone.
- Radius 7 on options and rows, 11 on the row panel, 14 on the page card. Gap 4 between options,
  9 between contested rows.
- Type: card name 13.5/600, deck name 13px, outcomes and stamps mono 11px (10.5 phone), section
  headings mono 11px uppercase 0.16em, row heading mono 10px uppercase 0.13em.
- **Nothing below 10px**, and nothing below 12px carries a fact a player must read **in its own
  ink alone** — the 10–11px reason clauses and commit stamps are facts, so they take `--fg-faint`
  (4.57–5.12:1 across every ground used) rather than the sub-floor `--fg-locked` they were drawn in.
  The `your call`
  and `this deck` plates sit **on** the 10px floor, mono — both were 9.5px and were raised rather
  than excepted.

## Contrast

- **Full-opacity ink throughout, and every text node clears 4.5:1** — with two recorded exceptions
  below. `--fg-locked` is **not used for text anywhere in this feature**: `globals.css` records it
  as clearing only the 3:1 floor, and the reason clauses and per-option commit stamps are facts a
  player must read (`1 of 2 arrived`, `v7 · 2 Aug`). They take `--fg-faint`; in the theme cards,
  where Neon Rain's `--fg-faint` measures 3.81:1 on its own surface, they take `--fg-muted`.
- **`--danger` is never text.** It is a 3px rule or a plate ground; emphasis in prose takes
  `--avail-over-fg` (the danger red lifted for text, 7.48:1), which is the token the availability
  handoff minted for exactly this.
- ⚠ **One theme-level failure, flagged not patched:** in Oil Haze, `--accent` as small text is
  **4.39:1** on `--surface`, so `Back to first committed` is the one control in the feature that
  fails in one theme. **Every accent link in that theme inherits it**, so it is not this feature's
  to fix — the link can take `--accent-hover` if the ruling goes that way.
- `#6FA368` and `#E0913C` on `#1A1713` carry outcomes and clear 4.5:1 at mono 11px.
- `your call` is `#14110E` on `#C9A24B` — the brand's own inverse pairing.
- The deck-page trigger is the **shipped** `over` marker, unaltered: doubled `--danger` glyph with a
  seam-coloured left border on the front diamond, label `--avail-over-fg` (`#E9917A`). **No accent
  is spent** — it stays reserved for *in use* / *to buy*.
- Refusal note is `#C6B79A` / `#EDE6D8` on `#1A1310`; **the red is a 3px rule, never the text.**
- **Every price is gone from the summary** — no row prices, no section totals, nothing signed or
  hue-coded to mean a direction. The only money the feature touches is the shipped `/changes` count
  strip, which is not this page.
- Inert options carry a dashed border, a plate word **and** a dimmed mark fill. **Colour is never
  the only signal**, and the brass pick is carried by the `your call` word as well as the hue.
- ⚠ **The empty mark ring diverges from `--border-dashed`** (under 1.5:1 on a row ground) and takes
  **`--fg-faint`** — 4.72:1 in Low Sun, and a text-ramp token that clears the floor **in all six
  themes by construction**, so nothing is minted and nothing needs per-theme tuning. The shipped
  ring is defensible inside a dialog the player just opened; this chooser is inline on a page of
  receipts, where the ring is the only thing inviting a tap.
- **Every mark value is a token** — neutral fill `--fg-body`, picked fill `--accent`, empty ring and
  inert fill `--fg-faint`, dot `--bg`. Verified against all six `[data-theme]` blocks in frame 9.
  **No per-theme variant is needed anywhere in the feature.**
- ⚠ **Re-measure the empty ring against `--surface` after any surface change** — `globals.css`
  records that the text ramp holds almost no headroom in any theme.
- Mark-state ratios, measured: neutral fill `#C6B79A` 9.05:1 · brass fill `#C9A24B` on `#1E1A15`
  7.21:1 · dimmed inert fill `#8E8269` on `#161310` 4.89:1 · empty ring 4.72:1. The **inert** ring
  (`#3A3229`, 1.47:1) is exempt — an inactive control on a dashed row, carried by three non-colour
  signals rather than a ratio.

## New tokens, hexes, fonts, motion

**None.** Every mark, outcome and plate value is an existing token; frame 9 verifies the set against
all six `[data-theme]` blocks. No animation, no transition, no motion class, so no reduced-motion
state.

⚠ **The canvas itself is drawn on the retired brass `#C9A24B`.** Low Sun's real accent is `#CF8745`
and its `--bg` is `#14110E`. Inherited with this folder's brand sheet — the same rebase is already
filed against `design_handoff_the99_appshell`. **Build from frame 9 and `globals.css`, not from the
hexes in frames 1–8.**

## Accessibility

- **`aria-checked` is true for the brass option only.** Neutral mark fills are `aria-hidden` and
  each option's outcome carries the allocation into its accessible name — with two copies and three
  decks, two marks are filled and one radio is checked.
- `role=radiogroup` labelled by the row heading; arrows move, Space/Enter selects and (on the
  selected option) clears. Inert options are skipped and carry the tag word in their accessible
  name.
- **Two live-region messages, never more:** one per settled pick, naming both sides of the trade;
  one per refusal, verbatim.
- Focus: after a pick, the option tapped; after a refusal, the message; on the deck page, the
  marker trigger.
- `Done` is a link, not a submit.

## Open, non-blocking

- **`review.bucketFreeNote` says "in the box already"**, which `availability.ts` bans. R2 obeys the
  ban and flags the conflict; the shipped string is not edited here.
- **`review.lede` is wrong by two** — flagged, not edited.

## Not designed, deliberately

Bulk allocation · windowing on the contested section · any surface showing a reservation at rest ·
multi-user collections · an explainer, tooltip, coach mark or confirm for either verb · a pick from
the card detail modal · history or an audit trail of allocations · lifting the commander guard
(#470).
