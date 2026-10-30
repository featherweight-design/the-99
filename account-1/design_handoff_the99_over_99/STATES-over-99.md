# STATES — decks over 99

Every state of the two surfaces across the whole range of `built`, so the audit can check that
nothing under 99 moved and that nothing over 99 was left undrawn.

`built` is matched deck cards. Unresolved lines never count toward it (deck-import handoff §C),
so a 104-line import with two failures is a **102** deck carrying two unresolved rows.

## 1. The range

| `built` | pill | count | bar | extra line | drawn |
|---|---|---|---|---|---|
| 0 | `Draft` | `0 / 99` | empty track, no fill element | — | shipped |
| 1–54 | `Building` | `n / 99` | `--danger` fill | — | shipped |
| 55–98 | `Building` | `n / 99` | `--warning` fill | — | shipped, canvas A1/A2 |
| **99**, gaps or unresolved | `Playable` | `99 / 99` | 100% `--success` | unresolved marker if any | shipped, canvas B1 |
| **99**, all owned, none unresolved | `Complete` | `99 / 99` | 100% `--success` | — | shipped, canvas B1 |
| **100** | **`Over`** | `100 / 99` **+1** | 99% `--success` / 1% `--warning` | `1 to cut` | **new** — singular, see §3 |
| **101–120** | **`Over`** | `104 / 99` **+5** | 95.2% / 4.8% | `5 to cut` | **new**, canvas A1/A2/B2/C1 |
| **121+** | **`Over`** | `137 / 99` **+38** | 72.3% / 27.7% | `38 to cut` | **new**, canvas A2 (bar only) |

Nothing in the first five rows changes. That is the point of the table.

## 2. The two surfaces × the four elements

| | deck card, desktop | deck card, 390px | spine, desktop | spine, 390px |
|---|---|---|---|---|
| pill | `Over`, top-right | `Over`, top-right | — (spine has no pill) | — |
| built figure | 15px `--warning` | 13px `--warning` | 20px `--warning` | 14px `--warning` |
| `/ 99` | shipped, `--fg-faint` | **returns** (hidden ≤99) | shipped | shipped |
| `+n` | ✓ | **absent** — `n to cut` carries it | ✓ | ✓ |
| bar | 7px, two segments | 6px, two segments | 6px, two segments, 170px wide | 5px, two segments, full width |
| line | `n to cut`, mono 10.5px | `n to cut`, mono 10px | trim line, 3 clauses | trim line, 2 clauses |

## 3. Edge cases

| case | behaviour |
|---|---|
| **`built === 100`** | Singular throughout: `+1`, `1 to cut`, *"One over the ninety-nine. Cut one and it is legal."* The copy file carries both forms; no `1 cards`. |
| **Over **and** unresolved rows** | Both lines render, `n to cut` first. Pill is `Over` — the unresolved guard only ever blocked `Complete`, and `Over` outranks it on the same argument (`built`) before ownership is consulted. |
| **Over **and** an over-committed card** | `RollupBands` renders below the spine exactly as it does now, unchanged and unrelated. Two amber-ish facts on one page, one about arithmetic and one about your collection; they are a rule apart and read as different families (band vs. inline line). |
| **Over, then the player removes a card to 100** | Everything re-derives from `built`. No transition, no animation on the bar (nothing in the builder animates a bar today). |
| **Over → 99 by hand** | Pill flips to `Complete`/`Playable`, bar becomes one full green fill, both lines unmount, **the completion reveal fires**. See README decision 10. |
| **Over → 99 by removing an unresolved line** | Deleting an unresolved line does not change `built`, so this cannot happen. Stated because `deleteUnresolvedRow`'s own comment says "100 becomes 99", which is about *line* totals, not `built`. |
| **Arrived over 99 from an import** | Pill `Over` on first render. Arrival strip (or the reimport amendment's update strip) renders above it. **No celebration** — not Complete. |
| **A fill runs on an over deck** | Cannot: `planLastSlots` returns an empty plan at `openSlots <= 0`, so both last-31 controls are absent. The 68-card fill's provenance strip is likewise gone. Nothing renders a zero-slot control. |
| **Adding a card at 104** | Succeeds. `add-validation` no longer refuses, the singleton and colour-identity rules still do. The count goes to 105 and `5 to cut` becomes `6 to cut`. |
| **`ownedCount === built` at 104** | Not `Complete`. `Over` is tested first, and the ownership test never runs. |
| **Export at 104** | Enabled, brass. One extra line inside the dialog. |
| **Availability** | Claims are **hard** (`MATURE_DECK_SIZE >= 99`). Unchanged, deliberately — README decision 8. |

## 4. What is NOT a state

- **No error state.** No `--danger`, no `role="alert"`, no warning triangle, no red left rule.
- **No blocked state.** No control is disabled by being over. Not Add, not Export, not the
  quick-add bar, not resolution.
- **No confirm step.** Crossing 99 asks nothing.
- **No toast, no live region.** The player performed the add.
- **No ceiling.** There is no state above `Over`.
