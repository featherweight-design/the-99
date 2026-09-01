# Gate 2 — forced-state runtime exercise, commitments roll-up (#43, Task 8)

Driven with `scripts/probe-rollup-ui.mjs` against local dev, signed in as the audit
user, at **390×844** and **1300×900**. Every figure below was read off the running
app after the cascade: the drawn text, the colour it resolved to, and the shell
geometry each line actually got.

## How the states were forced

Same seam as Task 4's gate, for the same reason: `over` needs a second *finished*
deck competing for a copy the player owns once, and no account on `local-dev` has
one. `loadAvailability` was temporarily made to rewrite its own output from an
`AVAIL_FORCE="<over>:<soft>[:anon]"` env var. **That stub is not in the diff** —
`src/lib/decks/availability-query.ts` is byte-identical to `main`.

Probe deck: `Avail gate 2` (`da3359f3-…`), 14 cards, seeded additively for the
audit account in the earlier gate. Twelve of its cards are owned and therefore
carry an availability row, which is why a forced soft count of 12 draws as 10 —
the roll-up counts cards it has figures for, not lines.

**Sign-in correction.** `.env`'s `E2E_AUDIT_USER_EMAIL` is a stale concert-crawl
address and no such user exists in this project's Clerk instance. The real fixture
account is `alpha-test+clerk_test@the99.app`, and it has no password we hold — it
takes Clerk's email-code path with the fixed `424242`. The probe handles both.

## What was forced, and what was seen

| Forced | Phone 390×844 | Desktop 1300×900 |
|---|---|---|
| `0 over · 0 soft` | **no region at all** | **no region at all** |
| `0 over · N soft` | one muted band, heading + **long** body | one muted card, heading + **long** body |
| `N over · 0 soft` | one red band, heading + `bodyMany` | one red card, heading + `bodyMany` |
| `1 over · N soft` | red band **above** muted, muted body is the **short** form | red card above muted, muted body is the **long** form |
| `1 over, claimants unnamed` | heading alone, **no body** | heading alone, **no body** |

Exact strings at `1 over · 12 soft`:

- `"1 card here is spoken for twice"` · `rgb(233,145,122)` · 12.5px/600 phone, 13px/600 desktop
- `"Command Tower is on 2 finished lists and you own one. Nothing's broken here — it's a shopping decision."` · `rgb(168,155,132)`
- `"9 more are in other brews too"` · `rgb(198,183,154)` — `more` fires only with a red line above, which is the disjointness of the two counts said out loud
- phone: `"Nothing to sort out yet — none of those lists is finished either."`
- desktop: the same, plus `"Whichever you sleeve first gets them."`

Geometry, both shells:

| | Phone | Desktop |
|---|---|---|
| Padding | `10px 16px` | `12px 16px` |
| Radius | `0px` (full-bleed band) | `10px` |
| Red accent / bg | `rgb(198,83,63)` / `rgb(33,28,21)` | same |
| Soft accent / bg | `rgb(74,64,51)` / `rgb(30,26,21)` | same |

All match the design table's `#C6533F` / `#211C15` / `#4A4033` / `#1E1A15`.

## The soft body's two forms

Rows 12.7/12.8 read as a straight width split. The runtime says otherwise, and so
do the drawings: the soft-only phone mock (A2CV:454) runs the **long** body, and so
does the desktop both-lines mock (A2CV:558). The short form is a
phone-**under-pressure** form — only a phone stacking two lines drops the trailing
"Whichever you sleeve first gets them." Implemented that way, tested both ways, and
flagged for Design to ratify since the table reads more absolutely than the mocks do.

## The one state that could not be forced here

**Row 12.15, the pre-99 window.** Closing the soft line needs a deck at 99 cards,
and seeding one would mutate a shared branch to prove a rendering claim. It is
covered instead by `src/components/decks/builder-rollup.test.tsx`, which drives the
real `BuilderShell` with a 99-card deck and asserts the soft line closes while the
shortfall line survives — because a finished deck does not buy the missing copy.

That file also covers the two other decisions the shell makes before the spine sees
a number and which no UI input can reach: the self-excluded vantage (a deck's own
claims must not read as a conflict with itself) and the unnamed-claimant fallback.
