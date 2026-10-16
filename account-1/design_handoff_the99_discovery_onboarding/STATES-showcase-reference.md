# Discovery R2 · STATES · the showcase, the ?, the Reference

## A tool card

| State | When | Drawn | What shows |
|---|---|---|---|
| One deck fits | Exactly one deck meets the tool's `fits` | T2 | `Try it on <deck> →` |
| Several fit | Two or more | T2 | The press, plus `N more are over ▾` / `N more are full ▾` |
| None fits, no door | No deck meets it, and nowhere better to send them | T2 (Top off) | The dashed line saying what it needs, then `How it works ›` |
| None fits, a door | No deck meets it, and another screen helps | T2 (Friends' spares) | The dashed line, the door, then `How it works ›` |
| Needs no deck | Help me choose, Precons, Wishlist, Sync, Lineup, Friends | S1 | A press naming where it goes |
| Switch off | The tool's switch is off for this reader | L2 (not drawn) | No card. A group left empty is not drawn |
| Moment dismissed | R1's moment for the tool was spent | S1 | The card as usual |
| Fixture has no picture | Never ships: a test fails (E9) | — | — |

## Try it

| Step | What happens |
|---|---|
| Press | Navigates to the deck (or the tool's page) with `?tool=<id>` |
| Land | Scroll the control into view; R1's halo for 2.4s, with no bubble; spend the tool's R1 moment; strip `?tool` through `mirrorUrl` |
| Credit tool | Lands on its tile; the run press is never pressed |
| Deck gone since render | Lands on `/decks` with no halo (L2) |

## The ? panel (1280) and sheet (390)

| State | Drawn | Notes |
|---|---|---|
| Closed | H1 (390 header), every 1280 rail | The ? at rest: rail item `--fg-faint`; header press `--fg-muted` |
| Open, a row closed | H1–H3 | The ? pressed (`--elevated`, `--fg`) |
| Open, one row open | H1 (roles), H2 (stand-ins) | One open at a time |
| Show me | H1, H2 (390) | The panel closes, the control is haloed 2.4s, no bubble |
| Elsewhere chip pressed | Not drawn | The list swaps in place to that tab's entries; the eyebrow names it |
| Searching, results | H2 (`combo`) | Results name their screen in mono caps and mark the word |
| Searching, none | H3 (`sideboard`) | Two lines and `See every entry →` |
| A screen with no entries | Not drawn (G21) | `Nothing in About is about this screen yet.` above the search |
| Card details open | H3 note | Card details is its own screen; the panel opens beside the dialog at 1280 and over it at 390 |

## The Reference

| State | Drawn | Notes |
|---|---|---|
| Default | R1 | Search, then what's new (when there is any), then 21 screens, then How it works |
| Entry open | R1 (Cheaper stand-ins) | The screenshot with the halo, caption, keys, Try it (tools only) and `How the app reaches this ›` |
| A screen row closed (390) | R1 | Name, count, ⌄ |
| Results | R2 | Replace the list; what's new hides |
| None | R3 | The dashed box with `See every entry →` |
| Arrived from the Home banner | R1 (what's new at the top) | Scrolled to `#new` |
| Nothing new | Not drawn | The box is absent; search sits directly above Home |
