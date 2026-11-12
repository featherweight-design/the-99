# Where credits work · addendum: onboarding

`design_handoff_the99_welcome_credits/addendum-onboarding/` · 2026-11-12 · account 2

**Status: R1b, approved by Hugh 2026-11-12.** R1b applies his one note: `Try it ›` sits above the cost pill. Canvas: https://claude.ai/artifact/FrRgypPHqeaBWLMocRLBoa

**Brief (Hugh, 2026-11-12).** Light addendum: the shipped `Where credits work` sheet gets an Upgrade row and a place in first-run onboarding.
1. Add Upgrade this precon as a sixth row. It's the only tool that costs a flat 2 credits, so its cost pill has to say that without breaking the row pattern.
2. Show the sheet during first-run onboarding, as "here's where your credits go", after the 15 credits are granted. Design calls where it sits in the onboarding and whether it's the same sheet or an inline list.

**Locked:** welcome credits stay 15, no bundle or recipe; the sheet keeps name, where and cost; today it opens from Home's welcome strip and from the /credits Welcome cell.

**How it was drawn.** Every frame is a PNG of the shipped components rendered with the shipped CSS in Low Sun (`WhereCreditsWork` in `SocialModal`, `FirstRunChecklist` with `WelcomeStrip`, the locked `MobileHeader`, `TabBar` and `NavRail`), from a scratch copy of main with `scratch-gen/wopatch.diff` applied. The diff is the proposal as code, for reference only. The tour card is `TourRun`'s markup copied into `scratch-gen/render.tsx` (TourRun needs a browser); `post.js` places it and cuts out the strip the way `placeCard` and `cutoutFor` do. The recipe is the A3 one (`design_handoff_the99_public_landing/scratch-gen/a3/`); the boards use the precon-upgrade `kit.py`. Copy marked DRAFT goes through `/copy-review`.

| File | Holds |
|---|---|
| `Main.dc.html` | The calls, the gaps, and one frame of each change |
| `S-Sheet.dc.html` | The six-row sheet before a collection, with cards and no deck, and with a deck (390 and 1300), with the shipped sheet for reference |
| `O-First-Run.dc.html` | First-run Home as shipped, and the tour's new Credits stop (390 and 1300) |
| `STATES-onboarding.md` | Every state, with Must-nots |
| `copy strings.ts` | DRAFT strings |
| `scratch-gen/` | `wopatch.diff`, the render scripts and the board generator (`wo.py`) |

## Design's calls

0. **R1b · Try it above the pill (Hugh's note).** A row with a landing puts `Try it ›` at the right of the name's line and moves its pill to the right of the where line. A row without one keeps the shipped layout (pill beside the name). `wopatch.diff` carries the change to `Row` in `where-credits-work.tsx`.

1. **The sixth row is `Upgrade this precon`, where `A precon's page`, priced `2 per run`.**
   - Same row, same pill, same ink. The five 1-credit pills stay bare (`each`, `per run`, `per search`, `per read`).
   - A number leads a pill only where a run can cost more than 1, as Suggested changes' shipped `1 or 2 per run` already does. So the 2 is the first thing in its pill and nothing new is added to say it.
   - A screen reader hears `2 credits per run` (the row's `cost`).
   - The name is the press's and the landing row's (`Upgrade this precon · 2 credits`, credits-path addendum).
2. **Where the row sits.**
   - With a deck: last, as on the landing, with `Try it ›` to the precon list (`/decks/precons`), where a run starts on the precon the player picks.
   - With cards and no deck: it leads beside Help me choose, over the `Needs a deck, and you have none yet.` line, because it needs no deck of the player's: the precon is the deck.
   - Before a collection: under the lock line with the other five, as Decks is locked then.
3. **First run: a stop in the first-run tour, not a sheet that opens itself.**
   - `5 of 7 · Credits`, after Buying (what a deck costs) and before Your look.
   - It lights the welcome strip, the way What's new lights the About line.
   - Its card is the inline list: title `Where your credits go`, R4's line with the free-credit-first clause, then the six rows as name and cost.
   - The where lines and `Try it` stay in the sheet: nothing runs before a collection, and the card must stay short enough to sit over the page on a phone.
   - Its foot points at the lit strip's `Where they work`, which opens the full sheet any time.
4. **Why not the same sheet:** opening by itself over the first-run Home, it would be a moment, and the tour already takes the first visit. Opened from the tour, it's a sheet over the scrim, two layers to close. **Why not a list in the checklist:** that was welcome credits R1, ruled too large.
5. **On a phone the stop brings the strip to the top** (as step 1 already scrolls its card up), so the docked card sits under it, never over it.
6. **The stop shows only while the strip draws** (a live lot, not closed). Without it the tour is the shipped six stops and its foot says `Six stops`. The tour taken again from the account menu gets the stop while the dashboard's strip draws.

## Gaps for engineering

- **G25 · The row follows the reader's switch.** `writtenForYou` takes the reader's `PRECON_UPGRADE_ENABLED` and leaves the row out when it's off. The landing's own claim is in the credits-path addendum.
- **G26 · Try it and the no-deck lead.** `welcomeSheet` puts `upgrade` in `lead` beside `help-me-choose` with no deck; its `tryHref` is `/decks/precons` whenever rows are live.
- **G27 · The tour stop.** A `credits` step (banner cutout, below-start, target `tour:welcome` registered by the strip) between `buying` and `look`. `stepsFor` drops it when the strip has no target, so the kicker and diamonds count 6 or 7; the step-1 foot reads `footSeven` with it. At 390 its scroll brings the strip to 14px under the top, as step 1's does.
- **G28 · About.** If About's tour entry counts six stops, it says seven while the stop can show. Hugh's call at the next About batch.

## Not drawn
- Themes other than Low Sun; the tour taken again on the dashboard (same card, same rule).
- The /credits Welcome cell's sheet: the same sheet, the S boards apply unchanged (no teaser there, as shipped).
