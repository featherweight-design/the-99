# Gap report — Commander Explained (#342, folding in #366, #346, #347, #345)

**Scope:** the commander detail page's fit hero, its score denominator and legend, the new
"Why this commander" paragraph, the committed-card mark, the Role Coverage sort, and the
home hero card's stored sentence. Verified against
`docs/superpowers/design-tables/commander-explained.md`, enumerated from
`design/design_handoff_the99_commander_explained/`.

**Verdict: 0 gaps. Ready to ship.**

Twelve findings came out of the verify pass. All twelve are fixed in `68b0b8a`; the confirm
pass re-checked each one by file and line and returned zero remaining.

## Gaps found and fixed

**The committed-deck clause had no data behind it.** `prose.standingWithDeck` takes a count
of owned support cards already in a deck and the name of the deck holding them. Nothing on
the page could produce either. `overlapOwned` held EDHREC card *names*, and the committed
read is keyed on oracle ids, so the clause would have rendered its short form forever.

Fixed at the source rather than at the call site. `scoreCommander` already normalises the
pool's names to match EDHREC's front-face convention; that lookup became a `Map` to oracle
id instead of a `Set`, and the score now carries `overlapOwnedIds` alongside `overlapOwned`.
A new `committedSupport()` in `src/lib/decks/committed.ts` intersects those ids with the
committed read and names the alphabetically first deck — the same ordering
`readCommittedDecks` already imposes, so the sentence names the deck the marks below it
point at rather than whichever card happened to come first upstream.

The figure is only computed on the detail route. The list compute does not pay for it: no
list surface names a deck. That is why the detail page now scores to a
`CommanderDetailScore` rather than a `RankedCommander`.

**The committed row tinted its dot but not its border.** In the full-width row variant the
dot is small enough that an untinted border made a claimed card read as free at a glance,
while the chip beside it read correctly. Both now carry the amber.

**A recovered retry only ever reached the four role panels.** `CoverageSection`'s retry
re-runs the same server compute the page was rendered from, but it only wrote the role cards
back into local state. The score, the denominator, the legend and the hero note are all
server-rendered from that compute, so a successful retry left recovered chips beside a
degraded headline. The section now calls `router.refresh()` on success — and deliberately
not on failure, where there is nothing new to paint. Both branches are pinned by tests.

**The rest were measurements.** The phone column matching the design's both-widths values in
six places, the two legend swatches going `aria-hidden` (they are decoration beside text that
already says the same thing), and the home card reading its accessible name from the copy
file rather than restating the template inline.

## Deviations from the design table

These are shipped differently from what the table names, each for a reason recorded here so
a later change is checked against the reason rather than the table alone.

**1. `fit-legend.tsx`, not `fit-key.tsx`.** The plan named the file for the disclosure; the
component that shipped owns both the legend and the disclosure it opens, and the legend is
the part that always renders. Naming only.

**2. The score row uses an `sr-only` span, not an `aria-label` on a `<div>`.** The table
specifies the accessible name `"32 out of 40 measurable points"`. A `<div>` takes no
accessible name from `aria-label` without a role, so the name is carried by a visually
hidden span instead. Same string, same reading order, and it survives a role change.

**3. Role anchor ids are width-scoped.** The gap sentence links to the thinnest role's panel.
Both widths mount at once, so a single `#role-wipes` would put two of that id in the
document and the link would resolve to whichever came first — possibly the hidden one. The
ids are `role-desktop-wipes` and `role-phone-wipes`, and each `WhySection` links to the panel
for its own width.

**4. Figures inside the gap-link clause are not drawn at `--fg` / 600.** The table's figure
rule applies to figures in the paragraph. `gapFigures` is the *link text*, and drawing part
of a link at body-text colour and weight breaks the link's own colour treatment. The clause
keeps the link's styling throughout.

**5. `legend.segment` was deleted rather than implemented.** The table names a string form
`{points}/{weight}` — e.g. `12/15`. The two halves render in different colours
(`{points}` at `--fg`, `/{weight}` at `--fg-faint`), so no single string can carry the
figure; a caller receiving `"12/15"` could not split it back apart. The separator lives in
`fit-legend.tsx`, which is the one place that can render both. `legend.segmentAria` remains
and carries the whole figure for screen readers, which is the surface that does need one
string.

**6. `prose.gap` takes the role key, not the subject string.** The table gives the signature
`gap(roleSubject: string)`. The subject map was added to stop "board wipe are where you are
thinnest", but it only fixed the noun: three of the four subjects are mass nouns, so the shipped
string still read "Ramp are where you are thinnest". The verb has to vary with the same key the
subject does, so the key selects both and the copy module holds the copula beside the subject.
`gapLinkAria` still takes the subject string, where no verb is involved.

**7. The Role Coverage menu carries a viewport cap alongside its 340px width.** The table's width
is unchanged and is what renders at every width the design draws. Below a 372px viewport the fixed
width would push the page sideways, so `max-w-[calc(100vw-32px)]` bounds it. The cap is inert at
375px and above.

## Height budget (§7)

The ledger claims +355px on a 2,246px body at 375px, +16%, and says explicitly that the shape
matters more than the number: **no addition is a container.** Confirmed against the shipped
tree rather than re-measured, since the table's own figures are approximate and vary with
card-name length.

- The paragraph section unmounts entirely when it has nothing to say, heading included.
- The key is one trigger; its ~300px panel is opt-in and collapses.
- The sort is one control row for all four panels, not one per panel.
- The committed mark is a fill swap on an element that already existed. No height.
- The five legend lines are each `null` unless a visible chip carries the mark, so an
  unaffected panel pays nothing.

Every addition in the ledger is present, and nothing added a wrapper the ledger did not
account for.

## Copy

`/copy-review` ran over the new module in propose mode. **No actionable findings.** Every key
has a render site (no `DEAD` rows), no user-visible string is hardcoded in JSX, and the
strings themselves are transcribed from a merged handoff, which the project binding marks as
a frozen area. Rule 4 does not apply to this project by measurement.
