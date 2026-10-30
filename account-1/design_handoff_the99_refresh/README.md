# The 99 — UI refresh · Home, Decks, and the chrome

`design/design_handoff_the99_refresh/` · R3.1 · 2026-09-08

## What this package is

A refresh of the **navigation chrome, Home, and Decks** — and an explicit decision **not** to
redesign Commander detail, the Commanders list, the Builder, or Card detail. Those four keep their
shipped layouts; §Conformance lists the only changes they take.

| File | What it holds |
|---|---|
| `The 99 - Refresh · Home and Decks.dc.html` | The deliverable. Home desktop, Decks desktop, three phone frames, conformance notes. |
| `The 99 - Refresh · Theme Matrix.dc.html` | Home + Decks in all six R6 themes, rendered from `tokens.r6.json`. |
| `The 99 - Refresh · Explorations (1a-1c).dc.html` | The three packages the direction was chosen from. Kept for the record — **not** a spec. |
| `tokens.r6.json` | Copy of `design_handoff_the99_theme_replacement/tokens.json`, R6. The matrix reads these values. |
| `STATES-deck-statuses.md` | The six statuses, their tokens, and what each card shows. |
| `CHROME-rail-and-tabs.md` | Rail, tab bar, and the one shipped adjudication this retires. |
| `refresh · copy strings.ts` | Production strings for the two refreshed surfaces. |
| `RULINGS-R3.md` | The calls PRs #437/#438 left open, ruled — §1–§3 (R3) and §4–§6 (R3.1). Read with `CHROME-rail-and-tabs.md`. |
| `READINESS.md` | What blocks a green. |

## Decisions

**1 · Scope was cut, deliberately.** The first pass covered seven surfaces. Client review kept two
(Home, Decks) and the chrome, and judged the existing UI better at carrying information on the other
four — Commander detail's Role Coverage chips and EDHREC Synergy in particular. The Tuning panel
drawn in that pass is **withdrawn**: it proposed a feature that does not exist.

**2 · One filled button per screen, and it is bone, not accent.** `--fg` on `--bg` for the single
primary; everything else is a 32px hairline pill (`--border-strong`, 12.5px label, 14px side
padding — about 40% less mass than the shipped button). Accent is not available for actions because
it means *in use / to buy*. **Scope, ruled in R3:** the rule binds every surface reachable with a
session; the signed-out front door is outside it and keeps accent (`RULINGS-R3.md` §1).

**3 · Colour is status, and status only.** Draft `--fg-faint` · Building `--fg-body` ·
Over `--danger` · Unresolved `--warning` · To buy `--accent` · Complete `--success`. No other
element on either surface is tinted. The six values and their thresholds are the shipped set — see
`STATES-deck-statuses.md`.

**4 · Deck tiles have no CTA.** The status pill names the state and the whole tile is the target;
a per-card button repeated the status in verb form and added a second `…`. One `…` remains, in the
tile's top-right, carrying the three shipped items: Update from a list, Rename, Delete.
**Home's resume rows follow the same rule** — status pill, count, no button; the row itself opens
the builder. There is no resume-action string in `refresh · copy strings.ts` because there is no
control.

**5 · Filtering is live. There is no Apply.** Ticking a filter re-filters immediately; the only
commitment control is **Clear**. Per-filter counts are gone — they doubled the width of every row
and the result count in the header already says what changed. Search moved *into* the filter column
(desktop) and the sheet (phone) — it was a filter behaving like a separate tool.

**6 · Import survives as a peer button.** `ImportDeckButton` stays in the Decks header, hairline,
immediately left of the bone-fill `New deck` — it does not move into the overflow and it does not
become an icon. On phone the two sit full-width under the header row, New deck first. It also
appears in the zero-deck state and in first run, because a player arriving with a decklist and no
CSV would otherwise be stuck.

**7 · Commander art leads.** Every card that names a commander shows its art: full-bleed behind
Ready-to-build (250px, scrim from `--bg` at 15% → 96%), a 118px header on deck tiles, a 30×42
spine in list rows. Art is **not** themed — it is photography.

**8 · Copy is labels and figures.** Reassuring or jokey lines were removed on request
("Nothing's broken here…", "Type it or tick it…"). Counts keep their denominators
(`99 / 99`, `74 /100 fit`, `312 of 1,284`); no percentages.

**9 · The rail gains icons.** Four 19px stroke icons at 1.5px, order per `src/components/shell/nav.tsx`
— Home, Collection, Commanders, Decks — and the same four in a 52px phone tab bar. This retires
`nav.tsx`'s adjudication #1 (diamond + label only); see `CHROME-rail-and-tabs.md`.

## Conformance — the four surfaces we are not redesigning

| Surface | Change |
|---|---|
| Commander detail | Chips and EDHREC Synergy untouched, full sections retained. `Order` and category controls take the 32px hairline pill. Rail replaces the page's back chrome. |
| Commanders list | Every figure stays. Search moves in with the filters, filtering goes live with Clear, no token query. |
| Builder | Unchanged. Tuning withdrawn. Buttons to 32px hairline, one filled primary. Header status pill uses the six values. |
| Card detail | No change beyond inherited button and field styles. |

## Gaps

**1 · Canopy's three greens are still unratified.** `--accent` `#A3C445`, `--success` `#6FA368`
and `--g` `#4B7A46` sit in one palette, and the deck grid is the surface that puts To buy beside
Complete at size. The matrix renders it — that is the screenshot
`design_handoff_the99_theme_replacement/READINESS.md` asked for — but **someone still has to
accept or reject it.** Design's read: it holds, and a slightly darker Complete fill in Canopy only
would settle it.

**2 · Accent loudness is not even across the set.** Neon Rain's accent is chroma 0.22 and
Oil Haze's is 0.054, so *in use* and *to buy* shout on one theme and murmur on another. Not fixed
here: the fix is a minimum separation between `--accent` and `--fg-body`, which is a token
question, not a screen question.

**3 · Collection is not in this package.** It is the second rail item and it did not get a frame.

**6 · Zero states are drawn (R2).** Home at first run — three-step checklist, step 1 live, steps 2–3
locked with the reason stated, rail and tab bar dimmed to `#4A4033` — and Decks at zero decks,
card-fan mark with Browse commanders and Import a deck. Both viewports each.

**7 · A Draft deck has a commander.** `decks.commander_oracle_id` is NOT NULL, so the Draft tile
carries commander art like every other tile; the placeholder art block and the *no commander yet*
string are gone from the frames, `STATES-deck-statuses.md` and the copy file.

**4 · Closed: phone Ready-to-build is a stacked list.** Two art-led cards at 170px, then
`7 more scored 70 or better` + **All commanders**. The carousel is withdrawn — it hid eight of nine
candidates behind a gesture, which is the hidden-content problem the refresh set out to remove.

The stacked list costs vertical space the carousel did not, so **phone Home's deck list is two rows
and carries no footer** — the route to the full list is the Decks tab, which is on screen at all
times, so a second link to it was paying 30px for nothing. Desktop keeps four rows and its
`All decks` link.

That is a budget, not a preference: at 390×800 the frame holds *what you can build* and *a glance at
what you own* only if the second list is truncated. **Every phone frame in this package is 390×800
and nothing may exceed it** — a mock that only fits at 890px is not showing a phone. Anything added
to phone Home has to name what it displaces.

**5 · Loading states not re-checked.** They keep their layouts, but they were never re-rendered
against the new display faces and the 32px button. Worth one pass before build.
