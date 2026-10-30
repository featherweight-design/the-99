# The 99 · Small items 6 (account 2, 2026-10-30)

Canvas: https://claude.ai/artifact/KwwT9g3hUxan4HQxqQTUtD
Status: APPROVED by Hugh on 2026-10-30 at R1d ("Please open a PR"). See READINESS.md.

Six small undrawn states and errata on shipped surfaces. Each is drawn over the shipped surface at 390 and 1300, with what shipped beside it. Brief: Hugh's "Small items 6" design prompt, 2026-10-30. Everything not listed here stays as shipped. Strings marked as drafts are for /copy-review.

Open `Main.dc.html` for the calls, or a board's page; each needs `support.js` and `art/` beside it. `scratch-gen/si6.py` builds Main and boards 1–5 over the overview_stages kit (`design_handoff_the99_overview_stages/scratch-gen/scg`) plus `design_handoff_the99_small_items_5/scratch-gen/tg.py`. `scratch-gen/w6.py` builds boards 6 and 6b over the announcements kit (on `design-assets`, `account-2/design_handoff_the99_announcements/scratch-gen`, `BMOD=w6 python3 build.py`).

Sources read: main @dd95b5c; PRs #2414, #2419, #2423, #2432, #2438; `src/components/cards/tagged-box.tsx`, `src/components/decks/{tuning-notes-field,tuning-panel,deck-description-field,spine-desktop,synopsis-stages}.tsx`, `src/components/intake/intake-form.tsx`, `src/components/about/pages/{rule-card,rule-diagrams,try-it}.tsx`, `src/lib/copy/{about-pages,discovery,feed}.ts`, `src/lib/feed/{home,prefs}.ts`, `src/components/home/whats-new.tsx`, `src/lib/synopsis/{stages,stages-view,prompt}.ts`.

| Board | Item |
|---|---|
| `Main.dc.html` | The calls |
| `Backup.dc.html` | 1 · Overview Game plan, the Backup line (#2432) |
| `Notes-Confirm.dc.html` | 2 · Tuning, Additional notes (#2414): confirm, nothing to build |
| `About-Errata.dc.html` | 3 · Suggested changes v2 About errata (#2438) |
| `Critical.dc.html` | 4 · Overview weaknesses, the Critical chip |
| `Tag-States.dc.html` | 5 · Tag-a-card box states a–f (#2423) |
| `Every-Kind-Off.dc.html` | 6 · What's new with every kind off (#2419) |
| `Offer-Stacked.dc.html` | 6b · The offer line: ✕ top right, Pick ▾ bottom right (R1b–R1d) |

## 1 · The Backup line

- One **Backup** card under Close, above a precon's Alternate commander: hollow diamond on the rail, the lead card image (52×72), a solid sunken card. Only when `plans.backups[0]` exists.
- The prompt's one-place rule: a backup combo's cards are named under Backup, not Close.
- **R1b, also an erratum to shipped `synopsis-stages.tsx`:** the timeline line stops at each stage label (Early, Mid, Close, Backup). Give the label `bg-[var(--surface-raised)] pr-[8px] relative z-[1]` so it masks the line. Today the line runs through the labels on desktop.

## 2 · Additional notes: confirm

#2414's description said it dropped the label row, but the row (`labelRow`, a2) was put back before it merged and is on main. Nothing to build. The label-less framed box is v2's request box, by design.

## 3 · Suggested changes v2 About errata

- **Good to know, the pick card:** one 250 column of compact real rows. Caption *Ghalta · add 2 of 3*; three adds (two picked, one *pick*, dashed), three cuts (two picked, one *pick*); foot *↓ apply 4 changes · stays at 99*. Text (draft): *Ask for two and you get three to add and three to cut; pick two of each.*
- **Credits rows:** with `!SUGGESTED_CHANGES_V2_ENABLED` the shipped *Came back empty-handed* row stays. With v2 on: *Came back short or empty* (credit back) and *Short by your price cap* (1 credit), both drafts. Dashed edge for the new rows; no part is translucent.
- **Try it:** the line follows the switch; with v2 on it is the v2 handoff's line.
- About rules hold: each diagram row sits in a column at least 250 wide, and that column is the diagram's only column.

## 4 · The Critical chip

Overview weaknesses get a **Critical** severity chip: ink `#E07A65`, edge `color-mix(in oklab, #C6533F 60%, transparent)`, same size and shape as the shipped chips. Critical lines sort first.

## 5 · Tag-a-card box states (`TaggedBox`)

- **(a) Over the cap, focused:** the frame is a 2px `--danger` edge; no outer ring on top.
- **(b) Dashed header description, focused:** the edge goes solid `--accent`.
- **(c) Describing in place:** accent edge on focus only.
- **(d) Label + ⓘ:** ⓘ 8px after the label; 6px label row → frame → help line.
- **(e) Locked intake (Help me choose):** the whole foot stays drawn and the key is disabled. Main today hides only the key (`[data-lock-hide]{visibility:hidden}`); keep that, the brief's "hide the foot" is not the call.
- **(f) The key:** focus-visible is the app's standard ring; disabled is `--border` edge and `--fg-locked` ink.

## 6 · What's new with every kind off

- **The ✕ sticks.** It saves an empty choice (`feed_offer_closed_at`), as it does with kinds on.
- After the ✕, and from the start for a reader who turned every kind off in Settings: the head gets **Choose what shows ›**, and the box reads *Nothing will show here. Every kind of news is off.* (draft).
- `loadHomeFeed`: with `on` empty, return the offer only while `neverChose(prefs)`; otherwise `{chosen:true, items:[], on:[]}`. Today it returns the offer whenever `on` is empty, so a reader who said no to everything is asked every visit.
- `closeAria` can say it sticks again. No migration.

## 6b · The offer line (R1b–R1d)

Hugh's notes: Pick ▾ and ✕ side by side read as two buttons for one thing, but keep the line's narrow height.

- The closed offer: the words on the left; the shipped `DismissButton` in the **top right** corner (44 on a phone, 32 from `md`), where the opened offer already puts its ✕; **Pick ▾ in the bottom right**, level with the words' last line.
- No extra row: the box is as tall as the words (min 72 on a phone, 64 from `md`), right padding keeps the words clear of both.
- The same in every place the offer stands: under rows, under the quiet line, alone. Feed rows keep their shipped action line (press, then ✕), since there the ✕ belongs to one row.
