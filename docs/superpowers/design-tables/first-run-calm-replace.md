# Design table: first run, calm replace (D9, D10, D11)

Sources (design files only, no `src/` read):

- `R` = `design/design_handoff_the99_first_run_onboarding/README.md` (D9 `:129-139`, D10 `:141-145`, D11 `:147-158`)
- `S` = `STATES-first-run-onboarding-r1.md` (§D `:43-52`, §E `:54-59`, tokens `:61-66`)
- `C` = `The 99 - First Run Onboarding (R1).dc.html` (4a `:596-626`, 4b `:628-648`, 4c `:650-673`, 5a `:679-716`, 5b `:718-746`)
- `A` = `READINESS-audit.md` (corrections 5, 6, 7 at `:155-161`)
- `K` = `first-run-onboarding · copy strings.ts` (copy keys only; wording is not a property here)

Frame ids follow the canvas and STATES: **5a is the embedded first-run review, 5b is `/collection/replace`**
(`C:679-681`, `C:718-720`, `S:58-59`).

Fidelity (`R:27-30`): the confirm, the replace note and the review foot are **high fidelity**. The review
page drawn under the scrims in 4a/4b is **scaffolding**, so 4b's review header row is not authoritative (5b is).

Mono = `'IBM Plex Mono', monospace` in the canvas (app: the mono font variable). Display = `var(--font-display)`.

---

## 1. Replace confirm: desktop dialog (4a) and phone sheet (4b)

| # | Element | Property | Desktop (1300) 4a | Mobile (390) 4b | Source |
|---|---|---|---|---|---|
| 1.1 | Scrim | background | `color-mix(in oklab, var(--bg) 74%, transparent)` | `color-mix(in oklab, var(--bg) 70%, transparent)` | C:609, C:634 |
| 1.1 | Scrim | inset | 0 (covers page) | 0 | C:609, C:634 |
| 1.2 | Container | kind | centred modal (`left:50%; top:50%; translate(-50%,-50%)`), `role="dialog"` | bottom sheet (`left:0; right:0; bottom:0`), `role="dialog"`; the existing sheet, no `Sheet` drag adoption | C:610, C:635, C:647, R:138 |
| 1.2 | Container | width | 520px | full width | C:610, C:635 |
| 1.2 | Container | padding | 30px top, 34px right, 30px bottom, 34px left | 12px top, 22px right, 30px bottom, 22px left | C:610, C:635 |
| 1.2 | Container | border-radius | 16px | 22px 22px 0 0 | C:610, C:635 |
| 1.2 | Container | background | `var(--surface-rail)` | `var(--surface-rail)` | C:610, C:635 |
| 1.2 | Container | border | 1px solid `var(--border-strong)` (all sides) | border-top 1px solid `var(--border-strong)` only | C:610, C:635 |
| 1.2 | Container | box-shadow | `0 40px 100px rgba(0,0,0,.7)` | `0 -20px 50px rgba(0,0,0,.5)` | C:610, C:635 |
| 1.2 | Container | icon | — (no icon) | — | R:131, C:623 |
| 1.2 | Container | `--danger` / `--warning` | — in idle and pending (see 1.10 for error) | — | R:131, A:157-161 |
| 1.3 | Sheet handle | size | — (not rendered) | 40px × 4px | C:636 |
| 1.3 | Sheet handle | margin | — | 0 auto 18px | C:636 |
| 1.3 | Sheet handle | radius / bg | — | 999px / `var(--border-strong)` | C:636 |
| 1.3 | Sheet handle | role | — | decorative (no drag) | C:647 |
| 1.4 | Title (`replaceConfirm.title`) | element | h2 | h2 | C:611, C:637 |
| 1.4 | Title | font-family | display | display | C:611, C:637 |
| 1.4 | Title | font-size / weight | 25px / 700 | 20px / 700 | C:611, C:637 |
| 1.4 | Title | line-height | 1.15 | 1.15 | C:611, C:637 |
| 1.4 | Title | color | `var(--fg)` | `var(--fg)` | C:611, C:637 |
| 1.4 | Title | margin | 0 | 0 | C:611, C:637 |
| 1.5 | Figure pair box | margin-top | 18px | 16px | C:612, C:638 |
| 1.5 | Figure pair box | display | grid, `minmax(0,1fr) auto minmax(0,1fr)`, align-items center | same | C:612, C:638 |
| 1.5 | Figure pair box | gap | 14px | 12px | C:612, C:638 |
| 1.5 | Figure pair box | padding | 14px top/bottom, 16px left/right | 12px top/bottom, 14px left/right | C:612, C:638 |
| 1.5 | Figure pair box | radius | 10px | 10px | C:612, C:638 |
| 1.5 | Figure pair box | background | `var(--surface-sunken)` | `var(--surface-sunken)` | C:612, C:638, R:132 |
| 1.5 | Figure pair box | border | 1px solid `var(--border)` | 1px solid `var(--border)` | C:612, C:638 |
| 1.6 | Figure label (`replaceConfirm.now` / `.after`) | font | mono 10px | mono 10px | C:613, C:639 |
| 1.6 | Figure label | letter-spacing | .12em | .12em | C:613, C:639 |
| 1.6 | Figure label | text-transform | uppercase (drawn `NOW`/`AFTER`; keys are `Now`/`After`) | uppercase | C:613, K:35-36 |
| 1.6 | Figure label | color | `var(--fg-faint)` | `var(--fg-faint)` | C:613, C:639 |
| 1.7 | Figure number (now = current count; after = matched count) | font | mono 21px / 600 | mono 19px / 600 | C:613, C:639, R:132 |
| 1.7 | Figure number | margin-top | 4px | 3px | C:613, C:639 |
| 1.7 | Figure number | color | `var(--fg)` | `var(--fg)` | C:613, C:639 |
| 1.8 | Figure caption (`nowCaption` / `afterCaption(file)`) | font-size | 12px (sans) | 11.5px (sans) | C:613, C:639 |
| 1.8 | Figure caption | margin-top | 2px | 2px | C:613, C:639 |
| 1.8 | Figure caption | color | `var(--fg-muted)` | `var(--fg-muted)` | C:613, C:639 |
| 1.8 | Figure caption | copy | full captions | shortened captions (no key in K; see contradictions) | C:613, C:639, K:37-38 |
| 1.9 | Arrow `→` | font | mono 15px | mono 14px | C:614, C:640 |
| 1.9 | Arrow | color | `var(--fg-faint)` | `var(--fg-faint)` | C:614, C:640 |
| 1.10 | Body sentence (`replaceConfirm.body` / `.bodyShort`) | copy key | `body` | `bodyShort` | C:617, C:643, K:39-40 |
| 1.10 | Body | margin-top | 18px | 16px | C:617, C:643 |
| 1.10 | Body | font-size / line-height | 15px / 1.65 | 13.5px / 1.6 | C:617, C:643 |
| 1.10 | Body | color | `var(--fg-body)` | `var(--fg-body)` | C:617, C:643 |
| 1.10 | Body | text-wrap | pretty | pretty | C:617, C:643 |
| 1.11 | Error line (no copy key in K) | font-size | 13px | 13px | S:49 |
| 1.11 | Error line | color | `var(--danger)` (the one place red appears) | same | S:49, A:157-161 |
| 1.11 | Error line | position | under the body | same | S:49 |
| 1.11 | Error line | renders | on any failed confirm: a failed replace, or a failed first import, which opens this dialog to report it (#1097) | same | S:49 |
| 1.12 | Button group | margin-top | 24px | 20px | C:618, C:644 |
| 1.12 | Button group | direction / gap | row, gap 12px | column, gap 10px | C:618, C:644 |
| 1.12 | Button group | order | Keep current, then Replace | Replace (primary) on top, then Keep current | C:618, C:644, S:47 |
| 1.13 | Keep current (`replaceConfirm.keep`) | height | 46px | 44px | C:618, C:644, R:138 |
| 1.13 | Keep current | width | content (inline-flex, padding 0 22px) | full width (flex, centred) | C:618, C:644 |
| 1.13 | Keep current | border-radius | 8px | 10px | C:618, C:644 |
| 1.13 | Keep current | border | 1px solid `var(--border-strong)` (hairline) | same | C:618, C:644 |
| 1.13 | Keep current | background | — (none) | — | C:618, C:644 |
| 1.13 | Keep current | color | `var(--fg)` | `var(--fg)` | C:618, C:644 |
| 1.13 | Keep current | font-size / weight | 14px / 600 | 14px / 600 | C:618, C:644 |
| 1.13 | Keep current | focus | initial focus on open | initial focus on open (S:47 names it for 1300 only; R:137 unqualified) | R:137, S:47 |
| 1.13 | Keep current | pending | disabled | disabled | S:48 |
| 1.14 | Replace with N cards (`replaceConfirm.confirm(matched)`) | N | matched count (what the player gets) | same | R:134, C:624 |
| 1.14 | Replace | height | 46px | 48px | C:618, C:644 |
| 1.14 | Replace | width | flex: 1 | full width | C:618, C:644 |
| 1.14 | Replace | border-radius | 8px | 10px | C:618, C:644 |
| 1.14 | Replace | background / color | `var(--fg)` / `var(--bg)` (bone fill) | same | C:618, C:644, R:133 |
| 1.14 | Replace | font-size / weight | 14px / 600 | 15px / 600 | C:618, C:644 |
| 1.14 | Replace | pending | label becomes `replaceConfirm.pending`; disabled | same | S:48, K:43 |
| 1.15 | Dialog | Escape / backdrop | close when idle; refused while pending | same | R:137, S:48, C:624 |
| 1.16 | Type-to-confirm input | renders | — (removed) | — (removed) | R:130, K:44 |
| 1.17 | Dialog | renders | on a replace (collection already has cards), and on a FAILED first import, where it reports the error in its import variant (`replaceCopy.importConfirm`); a first import that succeeds never opens it | same | S:50 |
| 1.18 | Hover states | — | — (not drawn) | — | — |

## 2. Replace note on the upload entry (4c, and the phone mirror)

| # | Element | Property | Desktop (1300) 4c | Mobile (390) | Source |
|---|---|---|---|---|---|
| 2.1 | Note (`replaceNote(current)`) | renders | only when `currentCardCount > 0` | same | R:145, S:52, C:672 |
| 2.1 | Note | zero-collection sentence | — (dropped) | — | C:672 |
| 2.1 | Note | margin-top | 20px (below the h1) | not drawn; mirror desktop (correction 5) | C:661, A:155 |
| 2.1 | Note | padding | 14px top/bottom, 18px left/right | mirror | C:661 |
| 2.1 | Note | border-radius | 10px | 10px | C:661, R:142 |
| 2.1 | Note | background | `var(--surface-sunken)` | `var(--surface-sunken)` | C:661, R:142 |
| 2.1 | Note | border | 1px solid `var(--border)` (all sides; no left rule) | same | C:661, R:142-144 |
| 2.1 | Note | font-size / line-height | 14px / 1.6 | 14px (R:143); line-height mirror | C:661, R:143 |
| 2.1 | Note | color | `var(--fg-body)` | `var(--fg-body)` | C:661, R:143 |
| 2.1 | Note | text-wrap | pretty | mirror | C:661 |
| 2.1 | Note | icon ⚠ | — | — | R:144 |
| 2.1 | Note | `--elevated-hover`, amber, left rule | — | — | R:144, C:672 |
| 2.2 | Count span | color / weight | `var(--fg)` / 600 | same | C:661, R:143 |
| 2.3 | Context (unchanged) | page column | max-width 760px, padding 28px 48px 0 | — | C:659 |
| 2.3 | Context | drop zone below | margin-top 18px (unchanged component) | — | C:662 |

## 3. Phone review exit (5a embedded, 5b `/collection/replace`)

Both are 390 only. Desktop (1300) column: "—" means D11 does not change desktop; the desktop review keeps
its current `md:sticky` bar and header (C:745).

### 3a. Embedded in the first-run step-1 card (5a)

| # | Element | Property | Mobile (390) 5a | Desktop (1300) | Source |
|---|---|---|---|---|---|
| 3.1 | Review header row ("Review import" + ‹) | renders | — (never mid-card) | — | R:151, C:713, S:58 |
| 3.1 | Shell mobile header (THE 99) | renders | yes (shell chrome, unchanged) | — | C:683 |
| 3.2 | Kicker (`step(1, 3)`) | font | mono 10px, letter-spacing .16em, `var(--fg-faint)` | — | C:684, S:15 |
| 3.2 | Kicker | padding | 10px 16px 0 | — | C:684 |
| 3.3 | Step-1 card | margin | 8px 16px 0 | — | C:686 |
| 3.3 | Step-1 card | radius | 14px | — | C:686 |
| 3.3 | Step-1 card | border | 1px solid `var(--accent)` | — | C:686 |
| 3.3 | Step-1 card | background | `var(--surface-inset)` | — | C:686 |
| 3.3 | Step-1 card | overflow | hidden | — | C:686 |
| 3.3 | Step-1 card | alignment | left-aligned (not centred) | — | R:152, C:713 |
| 3.3 | Step-1 card body | padding | 14px 14px 0 | — | C:687 |
| 3.4 | Card fan | renders | — (hidden while reviewing) | — | R:152, C:713, S:11 |
| 3.5 | Card title (step-1 title key, unchanged) | font | display 17px / 600, `var(--fg)` | — | C:687 |
| 3.6 | REVIEWING line (`firstRun.step1Reviewing(file, rows)`) | font | mono 10px | — | C:688 |
| 3.6 | REVIEWING line | letter-spacing | .04em | — | C:688 |
| 3.6 | REVIEWING line | text-transform | uppercase (key is sentence case) | — | C:688, K:19 |
| 3.6 | REVIEWING line | color | `var(--fg-faint)` | — | C:688 |
| 3.6 | REVIEWING line | margin-top | 4px | — | C:688 |
| 3.6 | REVIEWING line | renders | while a preview is in hand (state A2) | — | S:11 |
| 3.7 | Review body (matched card, stats, issue rows, View all) | — | existing review content, unchanged; preview 8 rows in build | — | C:713 |
| 3.8 | Confirm foot | position | card's foot, in flow, not sticky | — | R:153, C:714, S:58 |
| 3.8 | Confirm foot | margin-top | 14px | — | C:699 |
| 3.8 | Confirm foot | padding | 12px top, 14px right, 14px bottom, 14px left | — | C:699 |
| 3.8 | Confirm foot | background | `var(--surface-rail)` | — | C:699 |
| 3.8 | Confirm foot | border-top | 1px solid `var(--border-strong)` | — | C:699 |
| 3.9 | Summary line (existing key) | font | 11.5px, centred, `var(--fg-faint)` | — | C:700 |
| 3.10 | Button row | margin-top / gap | 10px / 10px, row | — | C:701 |
| 3.11 | Cancel (`review.cancel`) | position | left of Continue | — | R:148, C:701 |
| 3.11 | Cancel | height | 46px | — | C:701, R:148 |
| 3.11 | Cancel | padding | 0 18px (content width) | — | C:701 |
| 3.11 | Cancel | radius | 10px | — | C:701 |
| 3.11 | Cancel | border | 1px solid `var(--border-strong)` (hairline) | — | C:701 |
| 3.11 | Cancel | background | — | — | C:701 |
| 3.11 | Cancel | color / font-size | `var(--fg)` / 14px | — | C:701 |
| 3.11 | Cancel | font-weight | — (not set; regular) | — | C:701 |
| 3.11 | Cancel | action | `onCancel`: returns step 1 to its two buttons, discards the preview | — | R:154, C:714, S:58 |
| 3.12 | Continue (existing key) | layout | flex: 1, height 46px, radius 10px | — | C:701 |
| 3.12 | Continue | fill | `var(--fg)` bg, `var(--bg)` text, 15px / 600 | — | C:701 |
| 3.13 | Hover / disabled / pending of Cancel | — | — (not drawn) | — | — |

### 3b. `/collection/replace` (5b)

| # | Element | Property | Mobile (390) 5b | Desktop (1300) | Source |
|---|---|---|---|---|---|
| 3.20 | ‹ chevron | renders | — (removed) | — | R:148, R:156, C:743 |
| 3.21 | Header row | display | flex, align-items baseline, gap 12px | — | C:723 |
| 3.21 | Header row | padding | 18px top, 18px right, 14px bottom, 18px left | — | C:723 |
| 3.21 | Header row | border-bottom | 1px solid `var(--border)` | — | C:723 |
| 3.21 | Header row | flex | none | — | C:723 |
| 3.22 | Header title ("Review import", existing key) | font | display 18px / 600, `var(--fg)` | — | C:723 |
| 3.23 | Header filename | font | mono 10px, `var(--fg-faint)` | — | C:723 |
| 3.23 | Header filename | margin-left | auto (right-aligned) | — | C:723 |
| 3.24 | Content | padding | 16px 18px | — | C:724 |
| 3.24 | Content | bottom reserve | 104px (the bar's height) | — | R:157, C:745 |
| 3.25 | Confirm bar | position | sticky on phone, `bottom: var(--tabbar-h)` (canvas: absolute at 74px) | unchanged `md:sticky` | R:157, C:734, C:745, S:59 |
| 3.25 | Confirm bar | padding | 12px top, 18px right, 14px bottom, 18px left | — | C:734 |
| 3.25 | Confirm bar | background | `var(--surface-rail)` | — | C:734 |
| 3.25 | Confirm bar | border-top | 1px solid `var(--border-strong)` | — | C:734 |
| 3.26 | Summary line (existing key) | font | 11.5px, centred, `var(--fg-faint)` | — | C:735 |
| 3.27 | Button row | margin-top / gap | 10px / 10px, row | — | C:736 |
| 3.28 | Cancel (`review.cancel`) | geometry and ink | identical to 3.11 (46px, padding 0 18px, radius 10, 1px `--border-strong`, `--fg` 14px, weight unset) | — | C:736 |
| 3.28 | Cancel | action | `onCancel`: back to the upload entry | — | S:59, R:148 |
| 3.29 | Continue (existing key) | layout / fill | identical to 3.12 | — | C:736 |
| 3.30 | Design table row | — | add the phone Cancel row to `collection.md:2062` (correction 6) | — | A:156 |

---

## State coverage

| State | Triggering condition | What renders | Source |
|---|---|---|---|
| Confirm idle | Continue pressed on the review of a replace (current collection has cards) | modal 520 (1300) / sheet (390): title, now → after pair, body, Keep current + Replace with N cards; focus on Keep current; no icon, no `--danger`/`--warning` | S:47, R:129-138 |
| Confirm pending | Replace pressed, action in flight | primary reads `replaceConfirm.pending`; both buttons disabled; Escape and backdrop refused | S:48, R:137 |
| Confirm error | replace action fails | 13px `--danger` line under the body; rest as idle (buttons re-enabled implied, not drawn) | S:49, A:157-161 |
| First import | collection empty when Continue is pressed | no dialog; Continue commits directly | S:50 |
| Replace note shown | `/collection/replace` upload entry with `currentCardCount > 0` | sunken note with the count in `--fg` 600 | R:145, S:52 |
| Replace note hidden | `currentCardCount === 0` | nothing (the zero-collection sentence is dropped) | C:672 |
| E1 embedded review (A2) | first run, `uniqueCards === 0`, a preview in hand, 390 | no review header; step-1 card title + REVIEWING line; fan hidden; card left-aligned; confirm bar as card foot in flow with Cancel + Continue | S:11, S:58, R:150-154 |
| E1 Cancel | Cancel pressed in E1 | preview discarded; step 1 returns to its two buttons (Upload a CSV / Paste a list) | S:58, C:714 |
| E2 `/collection/replace` review | preview in hand on the replace route, 390 | "Review import" + filename header, no ‹; bar sticky at `bottom: var(--tabbar-h)`; content reserves 104px | S:59, R:155-157 |
| E2 Cancel | Cancel pressed in E2 | back to the upload entry (what the ‹ did) | S:59, R:148 |
| Desktop review | ≥ md | unchanged by D11 | C:745 |

---

## Contradictions and gaps between sources

1. **Frame numbering in the request vs the sources.** The canvas and STATES both have 5a = embedded
   first run and 5b = `/collection/replace` (`C:679-681`, `C:718-720`, `S:58-59`). This table follows the sources.
2. **Correction 7's citation is wrong.** `A:158` says the 13px `--danger` error line is at "README `:121`";
   `R:121` is the issues-sheet scroll body. The error line is only in `S:49` (plus the token list `S:65-66`).
   No canvas frame draws it and K carries no copy key for it.
3. **4b review header vs 5b.** 4b draws the header row `align-items:center; padding:20px 18px 14px`
   (`C:632`); 5b draws `align-items:baseline; padding:18px 18px 14px` (`C:723`). 4b is scaffolding under a scrim
   (`R:29-30`), so 5b is taken.
4. **Phone figure captions have no copy key.** 4b draws shortened captions (`C:639`) where K has only
   `nowCaption` / `afterCaption` (`K:37-38`); there is no phone variant, unlike `body` / `bodyShort`.
5. **Focus at 390.** `S:47` names initial focus on Keep current only in the 1300 column; `R:137` states it
   without a width qualifier. Treated as both widths.
6. **Figure numeral size.** `R:132` says mono 21/600; that is 4a only. 4b draws 19/600 (`C:639`).
7. **104px reserve vs the drawn bar.** `R:157` / `C:745` reserve 104px; the 5b bar's drawn parts sum to
   about 100px (12 + ~17 line + 10 + 46 + 14 + 1 border, `C:734-736`). Not a hard conflict; 104 is the stated figure.
8. **Correction 5 gives no phone numbers.** 4c is 1300 only; the phone note mirrors D10's tokens, and no
   390 padding or margin is specified.
9. **Cancel weight.** Keep current is 600 (`C:618`, `C:644`) but Cancel sets no weight (`C:701`, `C:736`),
   though both are "hairline" secondaries. Recorded as drawn.
