# Close-out walk: upcoming precons and the arrivals banner

**Walked:** 2026-10-14, on `origin/main` at `6d0c654` (#1755 data, #1758 the Announced group, #1767 the banner and the About entry). Two walks:

- **Local.** `next start` of a production build on a free port, against local-dev (`br-patient-hall-a6nbonvo`), with `PRECONS_ENABLED`, `UPCOMING_PRECONS_ENABLED`, `LIST_CACHE_ENABLED` and `ABOUT_SHEET_ENABLED` on. Fixtures were the probes' own sets: `zqa` and `zqb` from `probe:upcoming-precons-ui`, and `pqaset`, `pqalist` and the listed precon from `probe:arrivals-banner`. Each state (an unseen set, one arrival, two arrivals, the About entry unseen) was set before its contact-sheet run. Every fixture was removed afterwards, and the audit account's `user_prefs` row was read back equal to its prior value.
- **Deployed staging.** `staging.the-99.dev` served `dpl_86GwjZ1x`, the deployment GitHub records for `6d0c654`. Sign-in used a Clerk sign-in token for `THE_99_E2E_AUDIT_USER_EMAIL`, the same way `measure:load` signs in under `MEASURE_DEPLOYED=1`. The walk made no database writes of its own. Its Precons visits wrote the account's upcoming seen keys, which any reader's visit does.

Both walks ran Chromium at 390×844 (touch) and 1300×900.

Results:

- **Probes:** `probe:upcoming-precons-ui` passed all 54 checks at both widths, and `probe:arrivals-banner` passed all 76.
- **Contact sheets** (`scripts/contact-sheet.mjs`): every cell in both inventories was reached at both widths. `contact-sheets/upcoming-precons-closeout/local.png` lays out 14 rows at 390 and 1300. `contact-sheets/upcoming-precons-closeout/staging.png` does the same for 9 rows. The directory is gitignored.
- **Defects found:** none.

Plan: `docs/superpowers/plans/2026-10-14-upcoming-precons.md`. Handoff: `design/design_handoff_the99_upcoming_precons/` (R2 over R1). Inventories: `docs/superpowers/inventories/upcoming-precons.json`, `upcoming-precons-banner.json`.

## Route inventory

| Surface | State | 390 | 1300 | Seen by |
|---|---|---|---|---|
| `/decks/precons` tiles | C1 closed: `Announced · 3 sets · next Nov 13` | ✓ | ✓ | sheet, probe |
| `/decks/precons` tiles, an unseen arrival | C2 opens by itself, `new` on the set, revealed strip (T4, T5), the plate for a set with none (T2) | ✓ | ✓ | sheet, probe |
| `/decks/precons` tiles | C2 after a head press, the press remembered | ✓ | ✓ | sheet, probe |
| `/decks/precons?q=chapel` | T6: narrowed to the matching commander, and the result line names the set | ✓ | ✓ | sheet |
| `/decks/precons?sort=newest#announced` | Opens by itself, and beats a saved Most owned | ✓ | ✓ | sheet, probe |
| `/decks/precons?view=rows` | Q1 and Q2 dashed rows; R2: a set with nothing revealed does not open | ✓ | ✓ | sheet, probe |
| `/decks/precons?view=rows`, a row pressed | Q3: its cards under a dashed rule | ✓ | ✓ | sheet, probe |
| `/decks/precons?sort=owned` | T7: the group is hidden | ✓ | ✓ | sheet, probe |
| `/` | H1: no arrival, no banner (and none with the switch off) | ✓ | ✓ | sheet, probe |
| `/` | H2: one set announced | ✓ | ✓ | sheet, probe |
| `/` | H3: one arrival whose decklists are listed, and its link to the year's head | ✓ | ✓ | probe |
| `/` | H4: two arrivals under a count heading, one link and one ✕ (44 at 390, 32 at 1300) | ✓ | ✓ | sheet, probe |
| `/` | H5: the banner in the page and the About sheet up beside it, neither yielding | ✓ | ✓ | sheet |
| `/` | H6: after ✕ no slot is held, a reload draws none (E5), and a Precons visit or the link also clears it (rule 6) | ✓ | ✓ | sheet, probe |
| `/` | H8: focus moves to the h1 after ✕, by click and by Enter; the 2px accent ring on the link and on ✕ | ✓ | ✓ | probe |
| `/`, first-run account | H7: no banner, and nothing marked seen | ✓ | ✓ | probe |
| `/about#upcoming-precons` | `Commander sets on the way` in chapter 03 after `Starting from a precon`, with one announced set as its specimen | ✓ | ✓ | sheet, probe |

The sheet's `h7` row signs in as the audit account and shows H1. Only the probe's temporary Clerk test user shows a true first run. Neither the H3 state nor the H8 focus has a contact-sheet verb, so the probe's presses are their evidence.

## Deployed staging

| Check | 390 | 1300 | Saw |
|---|---|---|---|
| `/` with no real arrival (H1) | ✓ | ✓ | No banner. The About sheet was not up. |
| `/decks/precons`, C1 | ✓ | ✓ | The head read `Announced 2 sets · next Nov 13`, closed (`aria-expanded=false`); there was no news for this account. |
| The head pressed (C2) | ✓ | ✓ | It opened to Star Trek Commander and Darkhold Destiny Commander, with 16 revealed commanders between them. |
| `?q=Christine` (T6) | ✓ | ✓ | It narrowed to one set block holding one card. The result line read `0 of 181 decklists · 1 announced set`. |
| `?sort=newest#announced` | ✓ | ✓ | Arrived open. |
| `?view=rows` (Q2) | ✓ | ✓ | Two rows, one per set. |
| A set row pressed (Q3) | ✓ | ✓ | Star Trek's row opened to its cards. |
| `?sort=owned` (T7) | ✓ | ✓ | No `#announced`. |
| `/about#upcoming-precons` | ✓ | ✓ | `Commander sets on the way` is drawn after `#precons`, with the Darkhold specimen. |

The staging walk could not reach the banner states H2 to H8 and the C2 auto-open. They need an arrival stamped after the baseline, and staging has none until the catalog gains a set or a precon. They are proved on the local fixtures above.

## The About entry

`upcoming-precons` draws in chapter 03 after `precons`, locally and on staging, at both widths. It follows `UPCOMING_PRECONS_ENABLED` through `AboutSwitch`, and the probe confirmed it is absent with the switch off. It is `since: 14`, the current `ABOUT_VERSION`. A switched entry is announced when its switch flips, so it bumped nothing; this is the same convention as `deck-tokens`. The H5 walk showed it working: with the entry unseen, the sheet reads `1 new in About · Commander sets on the way` beside the banner.

## Known gaps carried forward

- **`new ·` on tiles only.** The rows view does not carry the `new` tag. The grid tiles carry it.
- **H5 was not exercised by the probe.** Both probe runs logged `the About sheet is not due for this account`. This walk drew H5 itself, by clearing `upcoming-precons` from the account's seen About ids on local-dev before the row: the banner and the sheet stand together at both widths. The probe still has no H5 assertion of its own.
- **About key line 2 copy nuance.** The line reads `A set that's out stays under Announced until its decklists arrive.` The rule keeps a released set only for 30 days (`RELEASED_GRACE_DAYS`) while no `precons` row lists it. A set whose decklists never arrive leaves Announced after the grace period, which the line does not say. This needs a pass through `/copy-review`, not Design.
- **Phase 2: About on the banner.** The banner does not yet link to its About entry. That is a follow-up.

## Seen, not changed

- local-dev's head counts three sets (`Star Trek` plus the two fixtures), and staging's counts two. That is the data, not the UI.
- local-dev holds no `catalog_first_seen` rows outside a probe run, so the banner draws there only on fixtures.
