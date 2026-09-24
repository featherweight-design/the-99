# Readiness audit: Help me choose (sub-project 8), R1

**Audited:** 2026-09-24, against `origin/main` at `6c0b07be`. Every file:line below was read on that commit.
**Brief:** `docs/superpowers/design-briefs/2026-09-24-intake-to-deck.md` (§2 and §5 locked, §3.0 readings, §4 open,
§6 engineering's), including #937's addition on a never-stocked build-around card.
**Package:** this folder, committed as delivered. `HANDOFF.md` is the source, and it records three review passes
with Hugh (R1.1 to R1.3). Design's own `READINESS.md` is answered in §5.

## Verdict: Green

Build it, with the engineering corrections below. Design answered all seven §4 calls. Every state the brief asks
for is drawn at 1300 and 390: all 26 frame ids in `STATES-help-me-choose.md` are mounted by the canvas, once at
1300 and once with `phone` (`The 99 - Help Me Choose.dc.html:94-101`). Every CSS token the package names is
declared in `globals.css`. Nothing goes back to Design.

Two departures from the brief's wording come from Hugh's own review passes, as `README.md` records, so they are
confirmations for the record rather than open questions (§4 H1, H2). The copy file lags the final `HANDOFF.md` in
four places (F6), which is a `/copy-review` job and not a design round.

---

## 1 · Against the brief

### The seven §4 calls

| § | Question | Design's call | Where |
|---|---|---|---|
| 4.1 | One page or steps | One form, then a separate results screen on submit. Nothing is shown before submit. Steps were tried and dropped | HANDOFF §2, README "Tried and dropped" |
| 4.2 | How the credit reads | On the results, in a *Want a closer fit?* panel: a `1 credit` pill inside the button, first in reading order and in the accessible name (*1 credit. Look deeper.*), with the allowance line under it. Seven states | HANDOFF §3; STATES 3a–3g and "Credit line, by allowance" |
| 4.3 | The chips | Matched: hairline. Card: bold, opens the card, with its ownership mark. From the deeper look: dashed accent edge plus a `deeper` tag. Not used: quoted text, not a chip | HANDOFF §3 table |
| 4.4 | Several figures on one row | Every figure shown. The lowest is lit and tagged `SETS RANK`, the rest dimmed. No tag with one answer | HANDOFF §4 |
| 4.5 | Too narrow | One or two options, each one press that drops or widens one answer and searches again, with the count it brings back. The most-restoring option is filled | HANDOFF §5 |
| 4.6 | Hand-off, answers on the new deck | `CreatePreFilled` with a *Built from your answers* block. On the deck, the answers go into the existing seeded intent line. No new arrival UI | HANDOFF §6 |
| 4.7 | How many, and more | 12, then *Show 12 more*. Trial fills run only for rows on screen | HANDOFF §4 |

All seven are answered.

### §2 rulings

| Ruling | Held | Note |
|---|---|---|
| 1: commander, then a deck | Yes | 6a–6d |
| 2: five optional inputs, more detail helps | Yes | HANDOFF §2; a blank submit still searches (2a) |
| 3: free match first, a model read only on request | Yes, **reworded by Hugh** | Chips appear read-only on the results, edited through *Change answers*, where the brief said editable before any results. The offer shows whenever the submit had words, not only when words went unused, and it is *Look deeper*, not *Read it properly*. `README.md` attributes all three to Hugh's R1.1 and R1.2 reviews. §4 H1, H2 |
| 4: a credit only for the read, cost named first | Yes | The pill comes first in the button and its accessible name. Submitting and the free match show no credit line (HANDOFF §8.1) |
| 5: fit order, never collection | Yes | Ownership orders only the no-theme, no-card case (4f), and never breaks a tie (HANDOFF §8.4) |
| 6: colors and bracket filter, budget caps the fill | Yes | 5a and 5b; a Game Changer build-around card at bracket 2 empties the list with a reason line, which is the brief's §6 reading of "outside the bracket" |
| 7: ownership is a fact on the row | Yes | `you own N of its 99 · about $X to buy[, inside $cap]` |
| 8: too narrow is named | Yes | HANDOFF §5 |
| 9: two doors | Yes | 1a, 1b |
| 10: single commanders only | Yes | STATES invariants |

### §3.0 readings, §5 and #937

The readings are drawn as written. Colors are never read from words. A build-around card goes in whichever
commander is picked (HANDOFF §4, *card* order). A never-stocked build-around card is placed anyway and each row says
so (4e). The row does not yet say its buy figure leaves that card out, which #937 added to the brief after this
package was drawn (F8). §5 holds: nothing in the package names a commander from the model, and there is no score.

### The switch

The brief ships this behind `HELP_ME_CHOOSE_ENABLED` (§7, #938). The package does not mention it, which is correct
for a drawing. What it gates is F3.

### AI budget rulings

- **Allowance:** owner 10, friends 3, on a rolling 24 hours (`src/lib/model/allowance-rule.ts:24-27`). The frames'
  `3 of 3 left` is the friend figure. The owner sees 10. Nothing in the package assumes a calendar day: the spent
  line names *Next credit at {reopensAt}*.
- **Spend:** a $10 budget with alarms, and a $20 hard stop (`src/lib/model/spend-rule.ts:25-29`). 3g draws the
  stop as `creditsCopy.paused`. The owner's $5 share (`spend-rule.ts:31`) is in the credit-line table as
  `creditsCopy.ownerShare` but has no frame of its own; it is the same disabled button as 3g with a different line.
- **Only a delivered answer spends:** a failed or stopped run is refunded (`allowance-rule.ts:6-7`,
  `allowance.ts:34`). Design adds that a read returning no valid chip is refunded too (READINESS reading 1). That is
  the same rule, since no answer was delivered. F4 says where the decision lands.

### The wording rule

The UI never says AI, model or LLM (HANDOFF §3). The copy file holds none of those words.

### About entry

The brief batches this line's About entry at launch (§7), and the package agrees (`README.md`, last line). No plan
exists yet for sub-project 8 in `docs/superpowers/plans/`. **The plan must name the batched About task**, as
`2026-09-23-synopsis.md:214` does for its round.

---

## 2 · Against the code

### Components the handoff reuses

| Named | Exists | Where |
|---|---|---|
| `OwnershipDot` | Yes | `src/components/ui/ownership-dot.tsx:43` |
| `AvailabilityGlyph` | Yes | `src/components/ui/availability-marker.tsx:177` |
| `BuyTag` | Yes | `src/components/decks/buy-tag.tsx:135` |
| `CommanderThumb` | Yes | `src/components/ui/commander-thumb.tsx:52` |
| `CreatePreFilled` | Yes, and it already passes `selectedOracleIds` to `createDeck` | `src/components/decks/create-pre-filled.tsx:31`, `:38`, `:63` |
| `DeckIntentLine` and the seeded flag | Yes. A player's save clears the flag | `src/components/decks/deck-intent-line.tsx:20-21`, `:26` |
| `seededBrief` | Yes, through `seededIntent`'s fallback chain | `src/lib/copy/deck-tuning.ts:56-57`; `src/lib/tuning/limits.ts:47-56` |
| `FillFailedBanner`, `ProvenanceLedger` | Yes | `src/components/decks/provenance-line.tsx:394`, `:53` |
| `fillDeck` | Yes, taking a deck id only | `src/app/decks/actions.ts:677` |
| `lane-params` `c` / `m` | Yes. `m=exact` means Exactly | `src/lib/commanders/lane-params.ts:69`, `:80`, `:89-90` |
| `colorLabel` | Yes | `src/lib/decks/format.ts:60` |
| Discover's result line | Yes. The rack builds its sentence per lane, and the chassis draws it | `src/components/commanders/rack/result-line.tsx:41`, `filter-rack.tsx:91`; drawn by `src/components/ui/result-line.tsx:24` through `filter-chassis.tsx:23` |
| `createPicker.sub` | Yes: *Choose a commander from your collection.* | `src/lib/copy/decks-builder.ts:379` |
| `creditsCopy.standing`, `.spent`, `.paused`, `.ownerShare` | Yes | `src/lib/copy/credits.ts:34`, `:51-52`, `:57`, `:64` |

### The model read

`ModelFeature` is `"tuning" | "synopsis"` (`allowance-rule.ts:52`). A third feature touches that union,
`FEATURE_CALLS` (`src/lib/model/prices.ts:74`) and the `model_calls_feature_check` constraint, which is now at
`src/db/schema.ts:1611` (the brief cites `:1600`).

### Tokens

Every `--token` in the package's `.md` and `.html` files is declared in `src/app/globals.css`.

---

## 3 · Findings

All findings are engineering's. There are no Design findings.

| # | Sev | Evidence (origin/main) | Finding and correction | Owner |
|---|---|---|---|---|
| F1 | Medium | `actions.ts:677`; `deck-intent-line.tsx:20-21` | **The fill-failed retry cannot recover the answers.** HANDOFF §6 has the banner's retry call `fillDeck` "with the stored answers", but `fillDeck` takes a deck id alone, and the only place the answers land is the intent line, which is free text the player can overwrite. The build-around card is lost the same way today, since `selectedOracleIds` reaches `createDeck` and nothing else. **Correction:** store the answers as structured data with the deck (budget, bracket, build-around card), and have `fillDeck` read them. The intent line stays a sentence written from them | eng |
| F2 | Medium | `deck-tuning.ts:51` (`maxLength: 120`); `limits.ts:47-56` | **The answers sentence can pass the intent cap.** *Built around {commander}: {theme}, with {card}, under {$cap}, bracket {n}.* with two themes and a long card name runs past 120 characters. `seededIntent` falls back to a short form, then an ellipsis. **Correction:** give the answers variant the same fallback chain: the full sentence, then the commander and themes, then `seededBriefShort` | eng |
| F3 | Medium | `src/lib/decks/analysis-flag.ts`; brief §7 | **`HELP_ME_CHOOSE_ENABLED` gates the route and both doors.** With the switch off, `/decks/new/choose` answers not-found and neither the `/decks/new` door nor Discover's link renders. **Correction:** one reader in the `analysis-flag.ts` pattern, read by the route and by both door sites | eng |
| F4 | Medium | `allowance.ts:161`, `:197`; `allowance-rule.ts:6-7` | **Where "an empty read is refunded" is decided.** The run is reserved, then settled `spent` or `refunded`. A reply that parses but yields no chip surviving validation against the tag vocabulary and the catalog must settle `refunded`, so validation runs before the settle, not after it. *Stop* refunds, as tuning's does (`allowance.ts:34`) | eng |
| F5 | Low | `ui/result-line.tsx:24`, drawn by `filter-chassis.tsx:23`; the rack's sentence at `rack/result-line.tsx:41` | **The Discover link goes into a shared result line.** One `ResultLine` draws the line for every chassis route, and the rack builds one sentence for both `/commanders` and `/discover`. **Correction:** add a slot the Discover lane alone fills, and carry `c` and `m` into the link. No other route's result line changes | eng |
| F6 | Low | `help-me-choose · copy strings.ts:17`, `:27-28`, `:61`, `:83` | **The copy file lags the final handoff in four places.** `wordsCaption` says *Matched as you type, for free*, where HANDOFF §2 and §3 say nothing is matched while typing. `dock` and `dockZero` are R1's dropped dock. `results.head` and `moreLine` print a total, which HANDOFF §2 and §4 forbid. **Correction:** build from `HANDOFF.md`; drop those keys and take `wordsCaption` from HANDOFF §2, at `/copy-review` | eng, `/copy-review` |
| F7 | Low | READINESS readings 4 and 8; HANDOFF §5 | **Too narrow is "fewer than 3" in one place and "fewer than 4" in two.** **Correction:** fewer than 4. That is the point where best fits cannot show, and the bar takes their place | eng |
| F8 | Low | brief §3.0, §3.3 (#937); copy `results.unpriced` | **The unpriced row does not say its buy figure leaves the card out.** The brief now asks for that, and for the price to read unknown, never $0. The row line says *no price on record, placed anyway*, and the chip says `buy · no price`. **Correction:** at `/copy-review`, the row line adds that the buy figure does not count the card | eng, `/copy-review` |
| F9 | Low | `credits.ts:17`, `:31`, `:51-52`; `decks-builder.ts:379` | **Three shipped strings widen.** `creditsCopy.spent` names *overview and suggestions*, and its word is Hugh's (`credits.ts:17`). `PAUSED_REASON` names two features. `createPicker.sub` becomes Design's *Pick a commander from your collection, or let us help.* All three go through `/copy-review`, and the first is Hugh's word | `/copy-review` |
| F10 | Low | `create-pre-filled.tsx:115`, `:215`, `:307` | **`CreatePreFilled` writes its strings inline.** The new back link, *Back to results*, both subs and the answers block belong in the copy module, so they pass `check:copy-drift`. The existing inline strings can move in the same change | eng |
| F11 | Low | STATES "Credit line, by allowance" | **The owner-share state has no frame.** It is 3g's disabled button with `creditsCopy.ownerShare` as the line, and precedence follows the tuning panel: paused, then owner share, then spent. **Correction:** derive it from 3g | eng |

### Engineering notes, not findings

- The free match runs on the server in the submit request, because the card index is too big to ship
  (HANDOFF §3). The theme vocabulary floor, the sample floor for theme fit and the card-first index are the brief's
  §6, unchanged.
- The route is `/decks/new/choose` (HANDOFF §1, eng's call) and parses colors with `lane-params`, so a Discover
  URL's `c` and `m` carry over unchanged.
- `createDeck` gains the budget and bracket beside `selectedOracleIds` (`actions.ts:253`), and `PlanFillArgs`
  gains both (`src/lib/decks/fill.ts:73`), as the brief's §6 says.

---

## 4 · For Hugh

Both are confirmations of changes Design attributes to his own review passes. Neither holds the verdict.

- **H1 (ruling 3, R1.1).** After a submit, the answers show as read-only chips with *Change answers*. The brief
  said the chips could be edited before any results appeared. Is that the change you asked for?
- **H2 (ruling 3, R1.2).** *Look deeper* is offered whenever the player typed words, even when every word matched,
  because a literal match can still miss what they meant. The brief offered it only when words were left over.
  Confirm?

## 5 · Design's READINESS, answered

| Item | Answer |
|---|---|
| Reading 1 (empty read refunded) | Accepted. It is the allowance's own rule (F4) |
| Reading 2 (the control beats the words) | Accepted |
| Reading 3 (stop words) | Accepted. Eng owns the list |
| Reading 4 (fewer than 3) | Superseded by reading 8 (F7) |
| Readings 5 and 9 (answers on the deck) | Reading 9 stands: the seeded intent line. The retry also needs them stored as data (F1) |
| Reading 6 (offer whenever words) | H2 |
| Reading 7 (*Look deeper*) | Accepted |
| Reading 8 (best fits need 4) | Accepted |
| Copy that needs widening | F9 |
| Depends on | Accepted, with F1 for `fillDeck` and F2 for the seeded variant |
| Not verified: *Commit as v1* on a phone | Out of scope for this feature. The deck page is unchanged |
| Not verified: `createPicker.sub` | It is *Choose a commander from your collection.* (F9) |
| Not verified: the Discover rack | F5 |
