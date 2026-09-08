# Gap report — R3 + R3.1 rulings

`design/design_handoff_the99_refresh/RULINGS-R3.md` · verified 2026-09-08

R3 and R3.1 are ratification rounds. No surface was redrawn, so this report checks conformance to
six written rules rather than a full property table.

## §1 · Accent is not an action fill

| Site | Before | After |
|---|---|---|
| `game-log-form.tsx` collapsed CTA | brass solid | `PRIMARY` (bone) in the empty state, hairline pill everywhere else |
| `game-log-form.tsx` save submit | accent fill | `PRIMARY` (bone) — the one filled button on that screen |
| `suggestion-tile.tsx` owned add | accent fill | hairline pill (see §4) |
| `app/page.tsx:61` signed-out CTA | accent fill | **unchanged** — the written exception, ratified in §1 |

Verified `app/page.tsx` is absent from the diff.

## §2 · Phone touch targets are a floor

The rule is general: no control that is the sole route to its action may sit under 44px on the
phone. The two sites R3 names, plus every sibling the same rule reaches:

| Site | Before | After |
|---|---|---|
| `facet-strip.tsx` chips | inline 11.5px / padded | 44px phone, 32px desktop; strip scrolls rather than wraps |
| `coverage-sort.tsx` trigger | 32px both widths | 44px phone, 32px desktop |
| `decks-view.tsx` search + Filters | 36px | 44px |
| `deck-filter-sheet.tsx` chips | 36px | 44px |
| `printing-region.tsx` finish chips | padding-derived | 44px phone, desktop unchanged |

Exempt, and why:

- `decks-view.tsx:202/213` — 28px removable chips and Clear. The filter sheet is a second, larger
  route to the same removals, which is the condition the tile-`…` exemption rests on.
- The 26px `…` on tile art — ratified in R3 §2 itself.
- `deck-sort-menu.tsx` — its wrapper is `hidden sm:block`. Desktop-only, so no phone target exists.

## §3 · Hairline side padding is 14px

`deck-sort-menu.tsx` trigger `px-[13px]` → `px-[14px]`, and gained `font-medium` to match the
ratified Default pill.

## §4 · The suggestion tile's two adds

One geometry, one weight, two labels — `Add` and `Add · to buy`. The owned/unowned distinction now
lives entirely in the label and the accessible name.

Design wrote "`GhostButton` is retired from this tile." In this codebase `GHOST` **is** the hairline
contract (transparent fill, 1px `--border-strong`), so retiring the component literally would mean
re-implementing it under another name. The substance of the ruling — one button, one geometry, one
weight — is satisfied with `GhostButton` retained.

`addUnownedAria` deviates from Design's draft string: the draft joined its clauses with an em dash,
which `decks-builder.test.ts` bans on this surface. A comma says the same thing.

## §5 · Two pill variants

Default and Dense chip, and nothing else. `facet-strip.tsx`'s resting chip border was `--border`,
from the PR #435 facet table; §5's Dense row says `--border-strong` and declares the pill table the
complete statement of this control's resting border. Ruled for `--border-strong`. Accent and the
dashed `All` remain state treatments layered on top — R3 did not reopen those.

## §6 · The `§1` tie-breaker

Ratified, untested. No code change: the log-form case §1 argued from turned out to be mutually
exclusive states, so the rule stands with a corrected premise.

## Verdict

0 gaps. Typecheck, lint, 3672 tests and the stub-DB build all pass.
