# Deck proxies — implementation plan

Spec: `docs/superpowers/specs/2026-09-14-deck-proxies-design.md` (merged, PR #625)
Handoff: `design/design_handoff_the99_proxies/` — R1 + R2 addendum, audited 🟢 Green
Branch line: one PR at a time off `main`, never stacked.

## Rulings this plan inherits

Five from the spec's brainstorm, four from the readiness audits:

| # | Ruling | Source |
|---|---|---|
| 1 | A proxied card claims nothing; the real copy goes to the other deck | spec |
| 2 | Proxying is outside versioning — immediate, no commit, never pending | spec |
| 3 | Commanders can be proxied | spec |
| 4 | Three surfaces: deck, receipt, `/collection/proxies` | spec |
| 5 | A proxy covers the whole ask; no quantity anywhere | spec |
| 6 | The mark is the glyph `P` plus a key under the decklist toolbar | R1 audit |
| 7 | `/collection/proxies` is read-only | R1 audit |
| 8 | The proxy count appears on the deck page **and** the `/decks` tile | R1 audit |
| 9 | `groupInBreakdown` gains a fourth term rather than under-summing | R2 audit |

## Route inventory

Written before implementation, ticked at close-out against the running app.

| Route | 390px | 1300px | Shares with | What must be there |
|---|---|---|---|---|
| `/decks/[id]` | ☐ | ☐ | — (origin) | `P` mark on a proxied row, mark key, commander caption mark, proxy count under the bar |
| `/decks/[id]` (Shopping view) | ☐ | ☐ | — | A proxied card is **absent** from the list entirely |
| `/decks/[id]/changes` | ☐ | ☐ | `/decks/[id]` (`ProxyTag` skin) | `proxied` chip, no buy tag, no price |
| `/decks` | ☐ | ☐ | — | `N proxies` in the tile's detail slot |
| card detail sheet (from a decklist row) | ☐ | ☐ | — | The tick control, deck-scoped |
| card detail sheet (from `/collection`) | ☐ | ☐ | — | **No** control — no deck context |
| card detail receipt | ☐ | ☐ | — | `Running a proxy` section, no figures |
| `/collection` | ☐ | ☐ | — | `Proxies` link in the rack, ungated |
| `/collection/proxies` | ☐ | ☐ | `/collection/sets` (row shell) | Rows, named decks, cost strip |
| `/collection/proxies` (empty) | ☐ | ☐ | — | Three branches: nothing proxied, no decks, no collection |

**Shares block** (`pnpm check:shared`): `ProxyTag` is rendered as-is by `decklist-row.tsx`,
`spine-desktop.tsx` and `update-diff-row.tsx` — three routes, one leaf, no wrapper between them.

## PR boundaries

Seven PRs. Each is independently mergeable and each is well under the ~20-file / ~800-line gate.

### PR 1 — the table and the claim model
- `deck_proxies` migration (+ `(oracle_id, deck_id)` index), schema entry.
- The anti-join in `all_claims` and in `own_claims` (`availability-query.ts`).
- The **second** anti-join in `list_claims` (`loadDeckBuyRows`) — a different query; without it
  a proxied card keeps a buy row and every money figure stays wrong.
- Membership-scoped reads, so an orphan row is inert.
- `pnpm probe:proxies` — the only proof any of this behaves.
- This plan document and the spec addendum.

### PR 2 — the readers
**Boundary amended mid-flight (round 6).** Two rendered outputs moved here from PR 7 because
this PR's data change made them wrong *now* rather than later: the review breakdown's fourth
term, and the pending banner's money sentence. With `proxied` excluded from `unfreeAdds`, a
proxy-only commit rendered *"Every card coming in has enough spare copies"* — a claim about
where cardboard is, over cards that have no copy anywhere — and the breakdown read
`0 free · 0 sleeved · 0 to buy` for a non-empty group. Leaving those for PR 7 would have
shipped a surface that lies in the interim. The review ROW (chip, `AvailabilitySlot`) is
untouched and stays PR 7's.
`proxied` on `DeckDetailCard` and each `DeckCommander`; a `proxied` count on `DeckListItem`;
the proxying-decks field on the card detail payload, loaded on **both** branches of
`loadCardDetail`; `isShoppingCard` testing proxied first; covered semantics in `deckCounts`
so `statusPill` can read `Complete`; the `"proxied"` member on `BucketedAdd.bucket` and
`bucketAdds` filing it. Unit tests throughout.

### PR 3 — the write
`setCardProxied` with deck authorization **and** membership validation in one transaction,
taking the deck row's lock (`select 1 from decks where id = $1 for update`) **before** it
validates — otherwise the validate-insert pair can straddle a concurrent removal's prune and
leave the orphan the prune exists to prevent;
`claimSurfaces` gaining the `/decks/[id]` pattern and the literal `/collection/proxies`;
`src/lib/copy/proxies.ts` transcribed from the handoff's copy file, with the two em-dash
strings recast and the ambiguous subtitle fixed.

### PR 4 — the deck page
`ProxyTag` (`row` + `band`), `deckRowTag`, `MarkKey`, the decklist row, the commander caption
(including the pair case), the proxy count under the progress bar. The inventory JSON and the
contact-sheet rows for this route land here.

### PR 5 — the sheet and the receipt
Deck context threaded through `CardDetailProvider.open`; `ProxyControl`; the receipt's
`Running a proxy` section on both branches of the card detail read.

### PR 6 — the list route and the two entry points
`/collection/proxies` with its three empty branches; the `Proxies` rack link (ungated);
the `N proxies` line in the `/decks` tile's detail slot.

### PR 7 — the review screen
`AvailabilitySlot` testing proxied before `!card.owned` (**a shipped defect** — the row draws a
buy tag on a proxied add today); the `proxied` chip as `bucketWord`'s fourth branch;
`proxiedA11y` on `describedBy`; the footer, commit sheet and pending banner excluding the row;
`groupInBreakdown`'s fourth term.

## Acceptance

- Contact sheet per PR for the routes it touches, in the PR body.
- `pnpm check:shared docs/superpowers/inventories/proxies.json` from PR 4 onward.
- At close: every inventory row walked in a real browser at both widths, `design-review`
  against the handoff, `pnpm probe:proxies` green.

## What this plan does not do

No quantities, no bulk marking, no proxy state in version history, no print/export, and no
per-deck unmark controls on the list (ruling 7).
