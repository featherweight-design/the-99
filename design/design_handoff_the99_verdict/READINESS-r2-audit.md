# Readiness audit — The verdict, R2 (Round 2 of 5)

**Verdict: 🟢 Green.** Audited 2026-09-21 against `main`, every claim checked against the shipped
tree rather than against the R1 audit's account of it. **Nothing here needs Design.** Everything
still open is engineering's to carry at build time, and the two things Design owed at R1 have both
landed.

This is a re-audit rather than a new one: Round 2 has been design-complete and unbuilt since
2026-09-20 while four rounds of rulings landed underneath it, and PR 4a is about to be built from
it. The question this pass answers is not "is the package good" — R1 settled that — but **"is R1's
errata list still true?"**

## Three corrections this audit owes first

**1. R1 does NOT predate the 3-vs-4 ruling.** The Tier B plan and the epic board both said it did,
and used that to justify this re-audit. False: R1 is dated 2026-09-20, the same day as the ruling,
and §2 of it covers the ruling explicitly — *"only 1/2 and 4/5 are ever ranges"* — concluding
**"nothing in this package needs redrawing"**. `permitsFor` shipping without `[3,4]` is the
package's expectation, not a surprise to it.

**2. There are twelve errata, not eleven.** R1's list numbers 1–10, then 12 and 13. There is no 11.
Every summary of this package since — including the plan's PR boundaries — has said eleven.

**3. R1's own §1a study is history, by its own words**, and the ringed `≈` it introduced was
carried to Round 3 as an open call rather than left here. Nothing in this pass revisits it.

## What has changed underneath the package

| Ruling | Effect on this package |
|---|---|
| **The mark is 16px everywhere**, fixed, not a prop (Hugh, 2026-09-21) | **Retires erratum 10.** `card-fact-mark.tsx` says so in its own header: *"This supersedes the handoff's 12px floor."* Nothing draws at 12px, so the lemniscate-vs-turn-again measurement at that floor has no subject. The distinctness question itself is not reopened — 16px is strictly more room than the pairing was ever going to get. |
| **The chip form exists** — five files, plus `ASSETS.md` | New asset class the package predates. It also carries a rule this package never stated: below 20px `BracketMark` draws the numeral alone and uses no file. Build from `ASSETS.md`, not from this canvas. |
| **The rank-5 mark is reissued** | **Closes erratum 8.** The old file (rank 4's geometry with a 5 in it) is gone rather than renamed. |
| **The declaration is off the cached profile** | No effect. Round 2's scope is explicitly held: no lean, no declaration interaction. |

## The twelve errata, re-checked

**Resolved since R1 — five.**

- **1 · the detection figure.** Fully resolved, and better than asked. `deckAnalysisCopy.detection`
  templates every sentence on `MLD_DETECTION` / `EXTRA_TURN_DETECTION` / `COMBO_DETECTION`, the
  miss slot takes the LIST (`knownMisses: ["Wave of Vitriol", "Cataclysm"]`), and the empty-list
  guard is on the assembled string with its reasoning recorded in place. A figure cannot desync
  from the constant again.
- **8 · the rank-5 reissue.** Delivered.
- **12 · the combo payload** — the mana and the steps half. `spellbook_variants` now carries
  `mana_needed`, `mana_value_needed`, `steps` and `notable_prerequisites`, and `ComboRef` carries
  all four on both reads. **The image-uri half is NOT met and deliberately so** — see below.
- **13 · `counted: false` reaching the client.** Shipped, as a member of the `BracketLimit` union
  in `src/lib/bracket/types.ts`.
- **13 · the single-card-loop caveat.** Shipped, and placed better than the erratum asked. It is a
  SENTENCE in `deck-analysis.ts` rather than a field on `COMBO_DETECTION`, because a card looping
  on itself is a shape the classifier does not attempt rather than one it attempts and gets wrong —
  so it is not a coverage figure and does not belong beside the coverage figures. The code says so.

**Retired — one.**

- **10 · measure the lemniscate at the 12px floor.** No floor, no subject. See the table above.

**Stale as written — one, and it is a new finding.**

- **7 · "`MarkKey` takes its entries as a prop, so the change is at the call site."** No longer
  true. The key split into two components in #776: `CollectionMarkKey` takes only `className` and
  builds its own entries, while the decklist builds a **presence-driven** key of its own — an
  entry is drawn only when a card on that surface carries the fact. Round 2's verdict block draws
  over a deck, so it inherits the decklist's rule, not the collection's. Build against
  `decklist.tsx`'s `buildMarkKeyEntries`, and expect neither component's signature to match what
  R1 described.

  The erratum's other two claims hold: tutors are at `profile.brackets.comboReach.tutors`
  (confirmed on `ComboReach`), and `--fact` is declared in all six themes (6 occurrences in
  `globals.css`).

**Unchanged and still owed at build time — five.** None needs a decision from anyone.

- **2 · hard-`99`** → the live count. One occurrence remains in the package's copy file.
- **3 · em dashes** → `/copy-review` before any of it lands in `src/lib/copy/`.
- **4 · the mass-land-denial glyph** comes from Round 1's adopted asset, never this canvas.
- **5 · the population line's three drawn variants against one copy constant.** R1's resolution
  stands and the shipped types support it exactly: `deckCount` is nullable, `declaredTotal` is
  not. Fuller form when the count is present, shorter when it is not, **denominator never dropped**.
- **6 · the canvas's §5 answer panel is stale.** Precedence unchanged: `HANDOFF.md` wins, then the
  Turn 4 canvas sections, then everything else. Confirmed still live — the canvas renders
  `"23 of 24 on a curated set"` and `known miss: Wave of Vitriol` in three places, against a
  shipped constant that says 22 of 24 with two misses. **Harmless if erratum 1's resolution is
  followed, and a trap if it is not**, because those strings are the ones a reader would copy.
- **9 · the two unnamed source citations** stay unnamed until engineering supplies names and URLs
  with the coverage constants. Inventing one is still refused, still correctly.

## The image uris, and why erratum 12 is only half met

R1 asked for an image uri on the refs the modal renders as tiles. `CardRef` is still
`{ oracleId, name }`, and that is the answer rather than an omission.

**Art is resolved at the DRAW, not carried on the profile.** The profile is cached under a
fingerprint; an image uri on it would be a per-reader value on a shared object, and this codebase
has already paid for that mistake twice — `getRankedList` was made to pay a 243-id join for 9 drawn
rows, and the rule that came out of it is that per-reader enrichment happens at the surface. A
printing a player OWNS is also reader-specific by definition, which is exactly what the commander
art work established.

So the modal's tiles resolve their own art from the oracle ids the refs already carry. Recorded on
the plan as PR 6's own line. **Nothing about the drawn modal changes.**

## One ruling this audit makes

**The modal gains a prerequisites line, under the steps.**

`notablePrerequisites` is now stored and is set on **64%** of variants — *"You control at least
five creatures with different powers."* It is the line that answers whether a combo works in THIS
deck, and Round 2 never asked for it because nobody knew it was in the feed.

Ruled here rather than sent to Design, per the round's own standard: it is one more line in a body
this package already draws, in the same type and the same column, with no new shape and no new
state. **Design may overrule it**, and the hook is small — the line is absent on 36% of combos
anyway, so the modal must already read correctly without it.

The mana beside it is drawn as a STATE and never a blank: pips above zero, *no mana needed* at
zero. 59% of combos need no mana to execute, and that zero is the more alarming reading of the two
— a free combo is the dangerous one. A blank slot would throw it away.

## Scope

**Held, unchanged.** No lean, no declaration interaction, no push line, no upgrade path.

## Clear to build

PR 4a may start. What it must carry from this pass: erratum 1's templating (already shipped — use
it), erratum 6's precedence, the new `MarkKey` reading, `ASSETS.md`'s sub-20px rule, and the
population line's null policy.
