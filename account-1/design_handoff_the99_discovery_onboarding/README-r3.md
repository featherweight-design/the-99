# The 99: Discovery and onboarding · R3, the first-run tour and tools where the need is (design handoff)

`design_handoff_the99_discovery_onboarding/` · 2026-10-16 · account 1 · beside R1 (`README.md`) and R2 (`README-r2.md`)

**Status: R3, for Hugh's audit.** This is the last round of the line. Source of truth: `docs/superpowers/design-briefs/2026-10-16-discovery-and-onboarding.md`
(main), §3 (tools where the need is), §5 (the tour), Style, Locked, and Open 7 and 4. Two rulings since the brief:

- **Friends on Home is a permanent section with no ✕.** With no friends it shows an invite; with friends, faces, Add a friend and a link to /friends. It is no longer a moment, so M16 and ruling 7 are gone.
- **About entries are paused** until this line closes.

R3 builds on R1's moments (#1919) and R2's showcase and "?" (#1927), and changes neither, except where G1 asked it to: M12's anchor.

The canvas is `The 99 - Discovery R3 · Tour and tools where the need is` (Design artifact, account 1). Its files are in `r3/`:

- `Main.dc.html`: the calls, the nudge/moment table, and the list of screens.
- The boards:
  - `Tour-Stops`: T1–T4.
  - `Tour-Theme`: T5, in three themes.
  - `Tour-End`: T6, X1 skip, F1 and F2 finished.
  - `Tour-Spotlight`: P1 and P2, the spotlight and the card.
  - `Need-Empty`: E1 and E2, each on and off.
  - `Need-Nudges`: N1–N3, each on and off.
  - `Forms`: one tool met five ways.
- The parts:
  - New: `TourCard`, `FirstRunDesk` / `FirstRunPhone`, `NeedDesk` / `NeedPhone`, `MoneyDesk`.
  - R2's, re-keyed or themed: `PhoneShot`, `ToolCard`, `HelpSheet`, `Rail`, `MobileHeader`, `TabBar`, `Moment`, `DeckDesk`.

**Theme.** Amonkhet, as in R2. The theme step is also drawn in Kaldheim and Eldraine, with every tour part themed token for token.

**Screens.**

- **Real captures**, read-only, of `staging.the-99.dev` at 390 (2x) on Hugh's account, 2026-10-16:
  - /commanders;
  - `HD Tune - Prismari Artistry`'s Recommended mix at 99 / 99 (Wipes 1 of 2, Land with `balance →`);
  - its Stats › Money card;
  - /discover with a search that matches nothing (to check what it already offers).
- **R2's captures:** a deck, Shopping and Collection.
- **Rebuilt from `src/`**, because no staging account is new or has zero decks (G26):
  - first-run Home;
  - /decks with no decks;
  - /commanders' first run;
  - R2's 1280 deck page;
  - the Money card at 1280.

## Brief locks, held

| Lock | How R3 holds it |
|---|---|
| 1. Five layers, in order | R3 is layers 3 and 5. It adds no moment, showcase card or Reference entry. |
| 2, 3, 4. The moments | Unchanged. The tour takes the visit's one moment slot (R1 Q2). M12 points at the new door on /commanders (G1, C8). |
| 6. Spotlights in the tour only; moments quiet | Only the tour dims the app. Nudges and empty-state doors have no surface, halo or motion. |
| 8. Entries stay; the banner is the channel | No entry or bump (entries are paused). The tour's last step lights the banner as the channel. |
| 9. Skippable, once, ends at the banner | ✕ on every card, and Esc. Spent when step 1 shows. Step 6 lights the banner. |
| Deck page: nothing added | N1 and N2 use the role cell's existing link slot. N3 rewords the Money card's existing Shopping line. No row, chip or line is added. |
| Credit tools never pressed | N1 lands on Suggested changes' tile. No tour step runs anything. |
| The theme saves as the picker saves | The step mounts the account menu's miniatures and `applyTheme`: the cookie, this browser. |
| "Select", never "tick" | No new string says tick. The ✓ is the picker's shipped mark. |

## The calls

### Q7 · The tour

- **C1 · When it opens.** On a new account's **first Home visit**, not its first sign-in, once the page settles plus 600ms (R1's arrival rule).
  - A first sign-in can land on a friend's invite link or a shared deck, and every spotlight points at Home.
  - **Shown once:** spent when step 1 appears, whatever ends it, per account.
  - **It takes the visit,** so no moment arrives that visit.
  - Accounts that exist at ship are marked seen (G24).
- **C2 · Six steps:** Collection, Commanders, Decks, Buying, Pick your look, What's new.
  - No welcome step: step 1 says `Six stops · about a minute · ✕ skips the tour`.
  - **Precons are inside step 1.** The light is on step 1's card, which already holds `No file? Start another way` → `Precons I own`, and one sentence names it (only with `PRECONS_ENABLED`).
  - The note closes step 6 rather than adding a seventh.
- **C3 · Skip is a bare ✕** on every card, named `Skip the tour`. Esc does the same.
  - There is no Skip text button and no confirm.
  - Skip and finish end alike: spent, and Home as it was. No toast.
- **C4 · The spotlight.**
  - A 66% scrim over the whole app, rail and tab bar included.
  - A cutout around the real control, with 5px of room on a slot (radius 14) and 8px on a card (radius 20).
  - Its ring is R1's halo (2px accent at 75%, 6px at 20%).
  - **Everything under it is inert, the lit control too.** Only the card is live.
  - The cutout glides 240ms on `--motion-ease-out`, and the card crossfades in 160ms. Under reduced motion both cut.
- **C5 · Locked stops carry a picture.** At zero cards Commanders and Decks are locked.
  - Their cards show a real capture of what opens there, captioned `once your cards are in`.
  - **Buying has no slot.** It is each deck's Shopping, so its light stays on Decks and its picture is Shopping.
- **C6 · Pick your look.**
  - The account menu's six `ThemeMiniature`s: 3×2 at 1280, 2×3 at 390.
  - The same radiogroup, `applyTheme`, cookie and status line (`First Frost applied.`).
  - Selecting repaints the whole app behind the scrim, which is the live preview.
  - The light is on the account button, where the picker lives afterwards.
  - Next keeps the selection, and skip keeps it too.
- **C7 · The ending.** Step 6 lights the Home banner, the new account's `What The 99 does:` line, as the place new things are announced.
  - Under a rule, the card closes with `A note from the creator`: its opening line and `Read the note ›` (R2b).
  - `Finish` ends the tour. `Read the note ›` ends it and opens the note: a dialog at 1280, a sheet at 390.
  - **Friends is not named,** because a new account's Home is the checklist, which has no Friends section (G25).
- **C8 · G1, Help me choose on /commanders.** A door at the end of the guided banner's line: `Not sure which? Help me choose →`.
  - R1's M12 points at it instead of at Discover in the rail.
  - Its trigger, the first /commanders visit with no decks, is exactly when the banner shows.

### §3 · Tools where the need is

- **C9 · A nudge** is 2–3 words and an arrow in the accent, in a slot the figure already has. It follows the shipped `consider →` and `balance mana →`.
  - The figure becomes the press: it opens the tool and never runs it.
  - It shows while the figure is short and goes once it is met.
  - Switch off: the slot shows what it shows today.
- **C10 · An empty-state door** is one quiet line under the empty state's own buttons, in /discover's shipped shape (`Not sure what you want? Help me choose →`). It is never a second button or a card, and it is absent with the switch off.
- **How a nudge differs from a moment.**
  - A moment floats: a surface, a shadow, a nib, a diamond and a sentence. It shows once, has a ✕ and is not a press.
  - A nudge is a word in place, with no surface, ✕ or halo. It is the press, and it stays.
  - A moment may point at a nudge, as M4 does at `balance mana →`.
  - `Forms` draws one tool in all five layers side by side.

### The list (L1)

| # | Where | Shows when | Says → opens | Switch |
|---|---|---|---|---|
| E1 | /decks with no decks, and Home's `No decks yet` (shared `DecksZeroActions`) | no decks | `Not sure what to build?` `Help me choose →` → Help me choose | `HELP_ME_CHOOSE_ENABLED` |
| E2 | /commanders' guided banner (G1) | first run: cards, no decks | `Not sure which?` `Help me choose →` → Help me choose | `HELP_ME_CHOOSE_ENABLED` |
| N1 | Recommended mix, a role cell | 99 / 99, the cell under target, no Consider shelf | `suggest swaps →` (390 `suggest →`) → Analysis, Suggested changes' tile | `TUNING_ENABLED` |
| N2 | Recommended mix, the Land cell | as shipped | `balance mana →` → Mana Balance, now on its own switch | `MANA_BALANCE_ENABLED` |
| N2b | `Proposed cuts →` under the over count | as shipped | unchanged; its own switch only | `PROPOSED_CUTS_ENABLED` |
| N3 | Stats › Money and ownership, the Shopping line | some to-buy copies over the deck's stand-in limit | `See the 15 in Shopping, 2 over $8 ⟶` → Shopping, first over row's ⇄ haloed | `SWAP_TOOLS_ENABLED` |

**Looked at and left alone** (Main, L1):

- **Already has a door:**
  - /discover's empty search (`Help me choose →`);
  - the empty Collection's ways;
  - Shopping's ⇄ and other-ways presses;
  - card details' Find a deck.
- **The Top off strip is already there:** a deck under 99, and an empty deck.
- **No tool fills it:**
  - Games, Results and Lineup's recency;
  - Wishlist, Proxies, History and /friends.
- **No slot without adding a line:** Stats › Mana colors and Against the average.

## About entries

None. Entries are paused until this line closes, and the tour and the doors are ways to reach tools that already have entries.

## Gaps for Hugh and the plan

- **G24 · Existing accounts.** The tour is for accounts made after it ships. Every account that exists then is marked seen. The alternative, showing it once to everyone, would put a first-run tour over Home's dashboard for players with decks. Hugh's call.
- **G25 · Friends on first-run Home.** The permanent Friends section lives on Home's dashboard. A new account sees the checklist, so step 6 has no Friends section beside the banner to name. If Hugh wants Friends on the checklist too, step 6 gains one sentence and a second light. Not drawn.
- **G26 · Rebuilt screens.** Those listed above are rebuilt from `src/`. Every picture inside a tour card, and every 390 nudge frame, is a real capture.
- **G27 · Pictures in one theme.** As R2's G11, the tour's pictures are Amonkhet captures. In another theme they stay Amonkhet inside the card.
- **G28 · N3's figure.** `2 over $8` on Prismari Artistry is illustrative. The count is Shopping's own over-limit count for that deck, read at build.
- **G29 · N2 and N2b drop the hub rule.** Today both shortcuts draw only while `tuningHubEnabled` (two of the three tools) is on. R3 has each follow its own switch. With the hub off, each opens its tool on the Analysis tab directly (R1 G2).
- **G30 · Is the Stats view "the deck page"?** N1 and N3 add no line, chip or row. They use a slot and a sentence that are already there. If Hugh reads the brief's "nothing added" as "nothing changed" on the deck page, N1 and N3 wait for the streamlining work.
- **G31 · Copy.** Every new string is a placeholder in `discovery-r3 · copy strings.ts` for `/copy-review`.

## Not done this round

- Nothing else in the line. R3 closes it, once the paused About entries are written as one batch at the line's close (AGENTS.md: a multi-round line batches its entries).
- Themes other than Amonkhet, Kaldheim and Eldraine are not drawn. Every part uses tokens every theme declares.
