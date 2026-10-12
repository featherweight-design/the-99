# Commander precons, R3 addendum: built-from link and v0

**Status: R1 approved (Hugh, 2026-10-12), with three R1 notes applied: superfluous copy swept (`basic lands not counted` and restated consequences removed), no built-from line in the deck header, and the v0 note full width. Build from these files.**

**Canvas:** `The 99 - Precons R3 · Built-from Link.dc.html`, sections K1–K16, every frame at 900 and 390.
**Frame:** `Precons Link.dc.html` (`scene`, `phone`, `theme`).
**Parent:** this folder's R2 (`The 99 - Precons (R2).dc.html`, `STATES-precons.md`). **Where this addendum and R2 disagree, this one wins.** The one place it overrides R2 is the row and open-precon "shared" line (R2, R6, O1, S1b): see §5.

Source: `docs/superpowers/design-briefs/2026-10-11-commander-precons.md`, "Addendum: built-from link and v0". Hugh's three rulings and "What engineering locks" are closed and are not reopened here. This round answers "What Design owns" and open question 2.

Fixtures are the addendum's: Eldrazi Unbound 86% (73 of 85), Counter Intelligence 70% (64 of 91) with a swapped commander, Mutant Menace 48% (41 of 85), and HD - Zombies against Wretched Ranks 19% (13 of 67), which gets no suggestion. Every share excludes basic lands, as R2's figures do. Illustrative: the deck name `HD - Eldrazi`, version notes and dates, diff card lists, anything in `‹ ›`, and Sultai Arisen's 52 against HD Tune - Mutant Menace (K15).

All copy is a placeholder for `/copy-review` (`precons-link · copy strings.ts`).

---

## 1 · The link control

**On the deck page, two doors.**
- **The suggestion's `Link it`** (K1, K2), when the shared rule holds. It opens a confirm (K3), the only link path that confirms, because the player hasn't read what a link does yet.
- **A dashed row at the foot of Versions** (K5): `Built from a precon?` with `Link a precon`. It sits where v0 will land, so the control and its result share a place. It opens the precon picker (K6), which names the selection and the consequence in its foot and links in one step.

There's **no standing header button**: of Hugh's 21 decks, six are precon builds, and a permanent control on the other fifteen would be noise. The header never changes for a link (§3).

*Gap G-R3-1:* an **unlinked brew with no suggestion** has no Versions tab, so it has no deck-page door. It links from the open precon (K7). Hugh to rule whether that's enough.

**On the open precon**, `Link a deck` is a ghost button beside `Start a deck from this` at 900. At 390 it's docked beside it, with Start the wider (K7). The picker lists the player's decks, most shared first, with radios: select / unselect, never tick. A deck already linked to another precon says `built from Counter Intelligence · linking moves it here`. Linking it there replaces the link and its v0 (lock 1: one link per deck). A Collector's Edition twin's page links to the plain edition (lock 1). The twin URL already redirects (R2 call 4).

## 2 · The suggestion line

- **Where:** one strip between the deck header and its tab row, in the arrival strip's shell (`--surface-rail`, border-strong, radius 10, ✕ at 44px). It shows on every tab until it's answered.
- **Words:** `Looks like this started as Eldrazi Unbound.` The meta line, mono, reads `73 of its 85 cards are in this deck · same commander`. A swapped commander is said in the sentence, `…, with a different commander.`, and the meta line names the precon's commander (K2).
- **No verdict word** on the share: it's a count of cards, never `close`, `strong`, `match` or a percentage with an adjective. No status colour.
- **Two precons (K15):** one strip, `Looks like this started as one of two precons`, with a row and a `Link` for each. Same-commander matches come first, then the rest by share. ✕ dismisses both. Linking either ends the strip, because a linked deck shows no suggestion (lock 2).
- **Dismissal:** ✕ hides it for that deck and precon, **remembered per browser** (keyed `deckId + fileName`), the way the deck sort is stored. Nothing is written to the database, which keeps lock 2's "never stored". A different precon crossing the rule later can still suggest. Versions' foot row stays as the way back. *Gap G-R3-2:* per account instead would stop it reappearing on a second device, at the cost of a stored dismissal. Design recommends per browser.

## 3 · The linked state

- **Deck (K4):** **Versions only.** The header is unchanged (Hugh, R1 feedback: the band has no room to spare). The link reads as v0, last in the rail, naming the precon; pressing it opens the precon or unlinks (K12).
- **Open precon (K8, K16):** the own box drops R2's `N basic lands not counted` note (R1 feedback: superfluous; the count's rule is said once on the list's sub line). R2's built sentence becomes `Your deck HD - Eldrazi was built from this. 73 of its 85 cards are still in it.`, with `Unlink` beside it. Other decks that only share follow in R2's words. The dock's summary names the linked deck.
- **List row (K9):** R2's line gains one clause: `your deck HD - Eldrazi · built from this · 73 shared`. With several decks, each gets its own line, the linked ones first. This replaces R6's single `your decks A and B` line once one of them is linked.

## 4 · Unlink

- **From:** the v0 panel in Versions (K12) and the precon's own box (K8). Never from the header.
- **The confirm (K13):** `Unlink HD - Eldrazi from Eldrazi Unbound?` It says v0, the precon's list, leaves the history and v1 goes back to having nothing before it. One fact row: History. `Unlink` is the bone fill, not `--danger`, because nothing the player made is lost (lock 5). Re-linking rebuilds v0 from the precon as it is then (relevant to engineering's open question 1); the confirm doesn't say so.

## 5 · v0 in Versions

- **Place:** the rail's last row, because it's newest first (lock 3). Do not reorder. A dashed divider above it reads `from the precon · before your first commit`.
- **The row:** a dashed `--border-dashed` box, transparent ground, `v0` in `--fg-faint`, with the note `Eldrazi Unbound, as the box lists it` in `--fg-body`. The meta is `the precon · CMM · released Aug 2023 · 100 cards`, using `released`, never `committed`, and never a games tally. The delta slot reads `the box`, in the same position and ink as `initial`.
- **v0 never reads as current (lock 4):** it never gets the accent left rule, the `current` marker, the accent number, or `--surface-rail` fill. Those stay on the newest committed version. With v0 alone (a brew, K14), no row is current.
- **v0 opened (K12):** a full-width note in the panel's place, dashed rather than InitialPanel's accent rule. It says what v0 is and that the deck is sleeved as vN. Its actions are `Open Eldrazi Unbound ›` and `Unlink from this precon`.
- **v1 (K10, K11):** no longer `initial`. It shows its delta against v0. `VersionDiff` is unchanged except for one dashed box above `todayNote`: `against v0 · Eldrazi Unbound, as the box lists it` and `73 of the precon's 85 cards kept`. A swapped commander needs nothing new, because the shipped commander line draws `Kilo, Apogee Mind → ‹…›` from v0's helm. The mana-value box compares against v0.

## 6 · Open question 2: does a linked brew get a Versions tab?

**Yes (K14).** It has one row, v0, and a line above it: `Not committed yet. Your first commit is v1, and it diffs against v0.` The tab count is 1. The deck is still a brew (lock 4), the status pill is unchanged, and `Commit as v1` is offered as today. Without the tab, a linked brew would have no place to show or unlink its link, and a deck started from a precon (PR 4) would hide its own v0 until first commit. Engineering: `builder-shell.tsx:210`'s brew test gains "or linked".

## What engineering checks this against

- Linking and unlinking change no card, printing, version, `since`, note, `committed_at`, status or claim (locks 3–6). K1–K4's decklist is drawn unchanged on purpose.
- `VersionRail`: `current` stays `i === 0` over **committed** rows only. v0's row is a third kind (`origin`) passed in, not inferred from `number === 0` inside the row. `initial` is false for v1 when a v0 exists.
- `VersionDiff`: v1's predecessor is v0 (lock 3). The v0 row opens the K12 note, not a diff.
- The suggestion is computed at read (lock 2). The dismissal is client-side.

## Files added

- `The 99 - Precons R3 · Built-from Link.dc.html`: the canvas.
- `Precons Link.dc.html`: the frame.
- `HANDOFF-R3 · built-from link.md`: this file.
- `precons-link · copy strings.ts`: proposed additions to `src/lib/copy/precons.ts` and `deck-versioning.ts`.
- `STATES-precons.md`: new §K (appended).
- `design-tables/precons.md`: new §K section (appended).
- `README.md`: status line and Files table point here.
- `about · precons.ts`: one key line added.

## Not done

- Not drawn as frames: the pending/failed link and unlink states, which follow R2's S1d/S1e (STATES §K). Also not drawn: a linked deck whose precon later fails to map a card (lock 3 of the parent). v0 then lists 99, and the v0 note says so.
- Drawn in Kaldheim only.
